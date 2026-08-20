<?php

namespace App\Services;

use App\Models\AcademicTerm;
use App\Models\User;
use App\Models\VenueBooking;
use App\Models\EquipmentBorrow;
use App\Models\Inspection;
use Illuminate\Support\Facades\DB;

class AcademicTermService
{
    /**
     * Get or automatically initialize the active academic term.
     */
    public function getActiveTerm(): AcademicTerm
    {
        $active = AcademicTerm::active()->first();

        if (!$active) {
            $active = AcademicTerm::create([
                'name'          => '1st Semester AY 2026-2027',
                'academic_year' => '2026-2027',
                'semester'      => '1st Semester',
                'start_date'    => '2026-08-01',
                'end_date'      => '2026-12-20',
                'is_active'     => true,
            ]);

            // Associate any unassigned existing bookings to this initial active term
            try {
                VenueBooking::whereNull('academic_term_id')->update(['academic_term_id' => $active->id]);
                EquipmentBorrow::whereNull('academic_term_id')->update(['academic_term_id' => $active->id]);
            } catch (\Throwable $e) {}
        }

        return $active;
    }

    /**
     * Get current statistical snapshot for a given term.
     */
    public function getTermStats(AcademicTerm $term): array
    {
        try {
            $venueCount = VenueBooking::where('academic_term_id', $term->id)
                ->orWhere(function ($q) use ($term) {
                    $q->whereNull('academic_term_id')
                      ->whereBetween('date_of_usage', [$term->start_date, $term->end_date]);
                })->count();

            $equipmentCount = EquipmentBorrow::where('academic_term_id', $term->id)
                ->orWhere(function ($q) use ($term) {
                    $q->whereNull('academic_term_id')
                      ->whereBetween('date_of_usage', [$term->start_date, $term->end_date]);
                })->count();

            $endDateStr = $term->closed_at ? $term->closed_at->toDateTimeString() : now()->toDateTimeString();
            $breachCount = Inspection::where('condition', '!=', 'good')
                ->whereBetween('inspected_at', [$term->start_date . ' 00:00:00', $endDateStr])
                ->count();

            return [
                'venue_bookings_count'       => $venueCount,
                'equipment_borrowings_count' => $equipmentCount,
                'breaches_count'             => $breachCount,
                'total_transactions'         => $venueCount + $equipmentCount,
            ];
        } catch (\Throwable $e) {
            return [
                'venue_bookings_count'       => 0,
                'equipment_borrowings_count' => 0,
                'breaches_count'             => 0,
                'total_transactions'         => 0,
            ];
        }
    }

    /**
     * Close the current active academic term and launch the next semester slate.
     */
    public function closeCurrentTermAndStartNext(array $nextTermData, User $actor): AcademicTerm
    {
        return DB::transaction(function () use ($nextTermData, $actor) {
            $currentTerm = $this->getActiveTerm();
            $stats = $this->getTermStats($currentTerm);

            // 1. Tag all active/completed bookings that belong to this timeframe
            try {
                VenueBooking::whereNull('academic_term_id')->update(['academic_term_id' => $currentTerm->id]);
                EquipmentBorrow::whereNull('academic_term_id')->update(['academic_term_id' => $currentTerm->id]);
            } catch (\Throwable $e) {}

            // 2. Seal and archive current term
            $currentTerm->update([
                'is_active'                  => false,
                'total_venue_bookings'       => $stats['venue_bookings_count'],
                'total_equipment_borrowings' => $stats['equipment_borrowings_count'],
                'total_breaches'             => $stats['breaches_count'],
                'closed_at'                  => now(),
                'closed_by'                  => $actor->id,
            ]);

            // 3. Create and activate the new term
            $name = $nextTermData['name'] ?? ($nextTermData['semester'] . ' AY ' . $nextTermData['academic_year']);
            $nextTerm = AcademicTerm::create([
                'name'          => $name,
                'academic_year' => $nextTermData['academic_year'],
                'semester'      => $nextTermData['semester'],
                'start_date'    => $nextTermData['start_date'],
                'end_date'      => $nextTermData['end_date'],
                'is_active'     => true,
            ]);

            // 4. Log audit trail
            \App\Models\AuditLog::create([
                'user_id'        => $actor->id,
                'action'         => 'semester_archived_and_initialized',
                'reference_type' => 'academic_term',
                'reference_id'   => $nextTerm->id,
                'description'    => "Closed {$currentTerm->name} (Archived to TiDB) and initialized {$nextTerm->name}.",
                'ip_address'     => request()->ip() ?? '127.0.0.1',
                'user_agent'     => request()->userAgent() ?? 'System',
            ]);

            return $nextTerm;
        });
    }
}
