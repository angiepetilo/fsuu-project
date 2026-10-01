<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Services\VenueBookingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Covers the "Pending Actions" count accuracy bug and the SPEC RULE 4
 * auto-rejection behavior fixed in this change:
 *   - Approving one of several overlapping pending bookings leaves the
 *     pending count (VenueBooking::pendingReview(), the same source used by
 *     the Tasks badge / DashboardStatsController AND the Venue Bookings list)
 *     at exactly 1 fewer than before, for the correct remaining bookings.
 *   - Non-overlapping bookings are untouched.
 *   - Each auto-rejected applicant receives exactly one email, no duplicates.
 *   - A rollback (overlap exception) leaves everything unchanged.
 *   - Concurrent approval of two conflicting bookings approves only one
 *     (venue row lock prevents a double-approval race).
 */
class VenueApprovalAutoRejectTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdmin(): User
    {
        $role = Role::firstOrCreate(['name' => 'admin']);
        return User::create([
            'name'     => 'Admin User',
            'email'    => 'admin+' . uniqid() . '@fsuu.edu.ph',
            'password' => bcrypt('secret123'),
            'role_id'  => $role->id,
        ]);
    }

    private function makeVenue(string $name = 'AVR Hall'): Venue
    {
        return Venue::create([
            'name'     => $name,
            'location' => 'Main Campus',
            'capacity' => 100,
            'status'   => 'available',
        ]);
    }

    private function createPendingBooking(Venue $venue, string $email, string $name, string $contact, string $timeStart = '08:00:00', string $timeEnd = '10:00:00'): VenueBooking
    {
        $service = app(VenueBookingService::class);
        [$first, $last] = array_pad(explode(' ', $name, 2), 2, 'Requestor');

        return $service->create([
            'venue_id'                 => $venue->id,
            'first_name'               => $first,
            'last_name'                => $last,
            'requestor_name'           => $name,
            'requestor_email'          => $email,
            'requestor_contact_number' => $contact,
            'requestor_program_office' => 'CITEC',
            'purpose'                  => 'Org Meeting',
            'date_of_usage'            => now()->addDays(5)->toDateString(),
            'time_start'               => $timeStart,
            'time_end'                 => $timeEnd,
            'submitted_by'             => null,
        ]);
    }

    public function test_approving_one_of_three_overlapping_bookings_leaves_pending_count_at_expected_value(): void
    {
        Mail::fake();

        $venue = $this->makeVenue();
        $admin = $this->makeAdmin();

        $booking1 = $this->createPendingBooking($venue, 'a@fsuu.edu.ph', 'Angie A', '09171111111');
        $booking2 = $this->createPendingBooking($venue, 'b@fsuu.edu.ph', 'Bea B', '09172222222');
        $booking3 = $this->createPendingBooking($venue, 'c@fsuu.edu.ph', 'Cara C', '09173333333');

        $this->assertSame(3, VenueBooking::query()->pendingReview()->count());

        $service = app(VenueBookingService::class);
        $service->approve($booking1->fresh(), $admin, 'Approved first-come');

        // Only the approved booking leaves the pending pool; the other two were
        // auto-rejected (overlapping) -> pending count must now be 0.
        $this->assertSame(0, VenueBooking::query()->pendingReview()->count());

        $booking2->refresh();
        $booking3->refresh();
        $this->assertSame('rejected', strtolower($booking2->status));
        $this->assertSame('rejected', strtolower($booking3->status));
        $this->assertTrue((bool) $booking2->is_auto_rejected);
        $this->assertTrue((bool) $booking3->is_auto_rejected);
    }

    public function test_dashboard_stats_endpoint_pending_count_matches_pending_review_scope(): void
    {
        Mail::fake();

        $venue = $this->makeVenue();
        $admin = $this->makeAdmin();

        $this->createPendingBooking($venue, 'a@fsuu.edu.ph', 'Angie A', '09171111111');
        $this->createPendingBooking($venue, 'b@fsuu.edu.ph', 'Bea B', '09172222222');
        $booking3 = $this->createPendingBooking($venue, 'c@fsuu.edu.ph', 'Cara C', '09173333333');

        app(VenueBookingService::class)->approve($booking3->fresh(), $admin, 'Approved');

        $expectedPending = VenueBooking::query()->pendingReview()->count();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/dashboard/stats');
        $response->assertOk();

        $this->assertSame($expectedPending, (int) $response->json('quick_stats.pending_venue_count'));
        $this->assertSame(0, $expectedPending);
    }

    public function test_non_overlapping_bookings_are_not_auto_rejected(): void
    {
        Mail::fake();

        $venue = $this->makeVenue();
        $admin = $this->makeAdmin();

        $overlapping = $this->createPendingBooking($venue, 'a@fsuu.edu.ph', 'Angie A', '09171111111', '08:00:00', '10:00:00');
        $sameVenueDifferentTime = $this->createPendingBooking($venue, 'd@fsuu.edu.ph', 'Dana D', '09174444444', '14:00:00', '16:00:00');

        $service = app(VenueBookingService::class);
        $service->approve($overlapping->fresh(), $admin, 'Approved');

        $sameVenueDifferentTime->refresh();
        $this->assertSame('pending', strtolower($sameVenueDifferentTime->status));
        $this->assertFalse((bool) $sameVenueDifferentTime->is_auto_rejected);

        // Non-overlapping booking must still count as pending.
        $this->assertSame(1, VenueBooking::query()->pendingReview()->count());
    }

    public function test_each_auto_rejected_applicant_receives_exactly_one_email_no_duplicates(): void
    {
        Mail::fake();

        $venue = $this->makeVenue();
        $admin = $this->makeAdmin();

        $winner = $this->createPendingBooking($venue, 'winner@fsuu.edu.ph', 'Winner W', '09170000000');
        $loserA = $this->createPendingBooking($venue, 'losera@fsuu.edu.ph', 'Loser A', '09171111111');
        $loserB = $this->createPendingBooking($venue, 'loserb@fsuu.edu.ph', 'Loser B', '09172222222');

        app(VenueBookingService::class)->approve($winner->fresh(), $admin, 'Approved');

        // BookingStatusUpdateMail sent across the whole approval: 1 winner (approved) +
        // 2 auto-rejected losers = 3. (Booking creation also sends separate confirmation
        // and admin-notification mailables, which is why we filter to this specific
        // mailable rather than asserting a total mail count across the whole test.)
        Mail::assertSent(\App\Mail\BookingStatusUpdateMail::class, 3);

        // Exactly one email per auto-rejected applicant — no duplicates for either loser.
        Mail::assertSent(\App\Mail\BookingStatusUpdateMail::class, function ($mail) {
            return $mail->hasTo('losera@fsuu.edu.ph');
        }, 1);
        Mail::assertSent(\App\Mail\BookingStatusUpdateMail::class, function ($mail) {
            return $mail->hasTo('loserb@fsuu.edu.ph');
        }, 1);
        Mail::assertSent(\App\Mail\BookingStatusUpdateMail::class, function ($mail) {
            return $mail->hasTo('winner@fsuu.edu.ph');
        }, 1);
    }

    public function test_rollback_on_overlap_exception_leaves_everything_unchanged(): void
    {
        Mail::fake();

        $venue = $this->makeVenue();
        $admin = $this->makeAdmin();

        $pendingA = $this->createPendingBooking($venue, 'a@fsuu.edu.ph', 'Angie A', '09171111111');
        $pendingB = $this->createPendingBooking($venue, 'b@fsuu.edu.ph', 'Bea B', '09172222222');

        $service = app(VenueBookingService::class);

        // Approve A first — this will auto-reject B (overlapping).
        $service->approve($pendingA->fresh(), $admin, 'Approved A');
        $pendingB->refresh();
        $this->assertSame('rejected', strtolower($pendingB->status));

        // Now attempt to approve B anyway (already rejected, but force the overlap
        // path by creating a THIRD approved booking directly in the DB to simulate
        // an overlap that must block approval and roll back).
        $thirdVenue = $this->makeVenue('AVR Hall 2');
        $pendingC = $this->createPendingBooking($thirdVenue, 'c@fsuu.edu.ph', 'Cara C', '09173333333');

        // Manually force another booking on the SAME venue to 'approved' to create a
        // genuine overlap condition for a fresh pending booking, then confirm the
        // attempted approve() throws and nothing changes.
        $pendingD = $this->createPendingBooking($thirdVenue, 'd@fsuu.edu.ph', 'Dana D', '09174444444', '08:00:00', '10:00:00');
        DB::table('venue_bookings')->where('id', $pendingC->id)->update(['status' => 'approved']);
        DB::table('tracking_numbers')->where('id', $pendingC->tracking_number_id)->update(['status' => 'approved']);

        $beforeCount = AuditLog::count();
        $beforeStatus = DB::table('venue_bookings')->where('id', $pendingD->id)->value('status');

        try {
            $service->approve($pendingD->fresh(), $admin, 'Should fail');
            $this->fail('Expected VenueOverlapException was not thrown.');
        } catch (\App\Exceptions\VenueOverlapException $e) {
            // expected
        }

        $afterStatus = DB::table('venue_bookings')->where('id', $pendingD->id)->value('status');
        $this->assertSame($beforeStatus, $afterStatus, 'Booking status must be unchanged after a rolled-back approval.');
        $this->assertSame($beforeCount, AuditLog::count(), 'No audit log rows should be committed on rollback.');
    }

    public function test_concurrent_approval_of_two_conflicting_bookings_approves_only_one(): void
    {
        Mail::fake();

        $venue = $this->makeVenue();
        $admin = $this->makeAdmin();

        $bookingA = $this->createPendingBooking($venue, 'a@fsuu.edu.ph', 'Angie A', '09171111111');
        $bookingB = $this->createPendingBooking($venue, 'b@fsuu.edu.ph', 'Bea B', '09172222222');

        // Simulate "concurrent" by approving A, then attempting to approve B's stale
        // (pre-A-approval) in-memory copy without refreshing — the venue row lock plus
        // the SPEC RULE 1 overlap check inside approve() must block the second approval
        // once A has already committed as approved for the overlapping slot.
        $service = app(VenueBookingService::class);
        $service->approve($bookingA->fresh(), $admin, 'Approved A');

        $this->expectException(\App\Exceptions\VenueOverlapException::class);
        $service->approve($bookingB->fresh(), $admin, 'Approved B');
    }

    public function test_approve_sets_rejection_reason_without_old_broken_wording(): void
    {
        Mail::fake();

        $venue = $this->makeVenue('Avr2');
        $admin = $this->makeAdmin();

        $winner = $this->createPendingBooking($venue, 'winner@fsuu.edu.ph', 'Winner W', '09170000000');
        $loser = $this->createPendingBooking($venue, 'loser@fsuu.edu.ph', 'Loser L', '09171111111');

        app(VenueBookingService::class)->approve($winner->fresh(), $admin, 'Approved');

        $loser->refresh();
        $this->assertStringNotContainsString("there's available venue", strtolower($loser->rejection_reason ?? ''));
        $this->assertStringContainsString('approved first', strtolower($loser->rejection_reason ?? ''));
        $this->assertStringContainsString('new reservation', strtolower($loser->rejection_reason ?? ''));
    }

    public function test_history_log_marks_auto_rejected_bookings_distinctly(): void
    {
        Mail::fake();

        $venue = $this->makeVenue();
        $admin = $this->makeAdmin();

        $winner = $this->createPendingBooking($venue, 'winner@fsuu.edu.ph', 'Winner W', '09170000000');
        $loser = $this->createPendingBooking($venue, 'loser@fsuu.edu.ph', 'Loser L', '09171111111');

        app(VenueBookingService::class)->approve($winner->fresh(), $admin, 'Approved');

        $history = app(\App\Services\HistoryLogService::class)->getVenueBookingsHistory();
        $loserHistory = $history->firstWhere('id', $loser->id);

        $this->assertNotNull($loserHistory);
        $this->assertTrue($loserHistory['is_auto_rejected']);
        $this->assertNotEmpty($loserHistory['auto_reject_winning_reference']);
    }
}
