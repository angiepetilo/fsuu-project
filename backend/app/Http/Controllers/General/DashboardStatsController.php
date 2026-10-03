<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;
use App\Services\EquipmentCategoryService;

class DashboardStatsController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            return response()->json($this->getAvrStats($user));
        } catch (\Throwable $e) {
            Log::error("DashboardStatsController Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
            return response()->json([
                'quick_stats' => [
                    'total_venue_bookings' => 0,
                    'total_equip_borrows' => 0,
                    'pending_bookings' => 0,
                    'pending_borrowings' => 0,
                    'pending_approval' => 0,
                    'available_equipment' => 0,
                    'damage_reports' => 0,
                    'overdue_returns' => 0,
                    'completed_today' => 0,
                    'total_equipment_damages' => 0,
                    'total_equipment_lost' => 0,
                    'top_violating_department' => 'None',
                ],
                'top_departments' => [],
                'top_equipment' => [],
                'programs_with_violations' => [],
                'calendar_bookings' => [],
                'error' => $e->getMessage(),
            ], 200);
        }
    }

    private function getAvrStats($user)
    {
        // 1. Auto-synchronize physical unit condition/status before computing statistics
        try {
            EquipmentCategoryService::autoSyncUnitConditions();
        } catch (\Throwable $e) {
            Log::warning("autoSyncUnitConditions warning: " . $e->getMessage());
        }

        $now = Carbon::now();

        // ── Resolve the active academic term ──────────────────────────────────
        // All booking/borrowing stats are scoped to the ACTIVE semester only.
        // When a new semester becomes active, counts reset to 0 for that semester.
        $activeTermId = DB::table('academic_terms')
            ->where('is_active', true)
            ->value('id');

        // 2. Total Venue Bookings — scoped to active term only
        $vbQuery = DB::table('venue_bookings')->whereNull('archived_at');
        if ($activeTermId) {
            $vbQuery->where('academic_term_id', $activeTermId);
        }
        $totalVenueBookings = $vbQuery->count();

        // 3. Total Equipment Borrows — scoped to active term only
        $ebQuery = DB::table('equipment_borrows')->whereNull('archived_at');
        if ($activeTermId) {
            $ebQuery->where('academic_term_id', $activeTermId);
        }
        $totalEquipBorrows = $ebQuery->count();

        // 4. Pending Venue Bookings — scoped to active term (includes incomplete review requests)
        // Uses VenueBooking::pendingReview(), the SAME single source of truth the Venue
        // Bookings list page's own pending filter is built on, so the Tasks badge, the
        // "Pending Actions" dropdown, and the list can never disagree on this count.
        $pendingVbQuery = \App\Models\VenueBooking::query()->pendingReview();
        if ($activeTermId) {
            $pendingVbQuery->where('venue_bookings.academic_term_id', $activeTermId);
        }
        $pendingVb = $pendingVbQuery->count();

        // 4b. Pending Equipment Borrows — scoped to active term
        $pendingEbQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['pending', 'incomplete']);
        if ($activeTermId) {
            $pendingEbQuery->where('equipment_borrows.academic_term_id', $activeTermId);
        }
        $pendingEb = $pendingEbQuery->count();

        // 4c. Post-Inspection Pending — scoped to active term
        $postVbQuery = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('venue_bookings.archived_at')
            ->whereIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['ongoing', 'on-going', 'post-inspection']);
        if ($activeTermId) {
            $postVbQuery->where('venue_bookings.academic_term_id', $activeTermId);
        }
        $postInspectionPendingVenue = $postVbQuery->count();

        $postEbQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['ongoing', 'on-going', 'borrowed', 'post-inspection']);
        if ($activeTermId) {
            $postEbQuery->where('equipment_borrows.academic_term_id', $activeTermId);
        }
        $postInspectionPendingEquip = $postEbQuery->count();

        $pendingApproval = $pendingVb + $pendingEb;

        // 5. Physical Equipment Units Count (NOT semester-scoped — reflects real inventory state)
        $unitCounts = DB::table('equipment_units')
            ->whereNull('archived_at')
            ->select(
                DB::raw("SUM(CASE WHEN LOWER(COALESCE(equipment_units.condition, 'good')) NOT IN ('damaged', 'lost', 'under repair', 'under_repair', 'worn', 'minor wear') AND LOWER(COALESCE(equipment_units.status, 'available')) NOT IN ('damaged', 'maintenance', 'unavailable', 'lost', 'decommissioned', 'released', 'in-use', 'in_use', 'borrowed', 'reserved') THEN 1 ELSE 0 END) as available_count"),
                DB::raw("SUM(CASE WHEN LOWER(COALESCE(equipment_units.condition, 'good')) IN ('damaged', 'maintenance', 'worn', 'under repair') OR (LOWER(equipment_units.status) IN ('damaged', 'maintenance') AND LOWER(COALESCE(equipment_units.condition, '')) != 'lost') THEN 1 ELSE 0 END) as damage_count"),
                DB::raw("SUM(CASE WHEN LOWER(COALESCE(equipment_units.condition, '')) = 'lost' OR LOWER(equipment_units.status) IN ('lost', 'decommissioned') THEN 1 ELSE 0 END) as lost_count")
            )
            ->first();

        $availableEquipment = (int) ($unitCounts->available_count ?? 0);
        $physicalDamages    = (int) ($unitCounts->damage_count ?? 0);
        $physicalLost       = (int) ($unitCounts->lost_count ?? 0);

        // 5b. Disabled units count (soft-deleted)
        $disabledUnits = DB::table('equipment_units')
            ->whereNotNull('archived_at')
            ->count();

        // 5c. Total active units
        $totalActiveUnits = DB::table('equipment_units')
            ->whereNull('archived_at')
            ->count();

        // 5d. Released / In-Use units
        $releasedUnits = DB::table('equipment_units')
            ->whereNull('archived_at')
            ->whereRaw("LOWER(COALESCE(status,'')) IN ('released','in-use','in_use','borrowed','reserved')")
            ->count();

        // 6. Total Equipment Damaged and Lost counts
        // Directly reflects real-time physical inventory units in damaged/lost condition.
        // When staff repairs, recovers, or updates a unit back to 'good' & 'available' in Manage Equipment,
        // the dashboard counts immediately update to reflect current availability.
        $totalEquipmentDamages = $physicalDamages;
        $totalEquipmentLost    = $physicalLost;

        // 7. Overdue Returns & Completed Today — scoped to active term
        $overdueQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['on-going', 'ongoing'])
            ->where('equipment_borrows.date_of_usage', '<', $now->toDateString());
        if ($activeTermId) {
            $overdueQuery->where('equipment_borrows.academic_term_id', $activeTermId);
        }
        $overdueReturns = $overdueQuery->count();

        $completedQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['completed', 'late return', 'returned late', 'damaged', 'lost'])
            ->whereDate('tracking_numbers.updated_at', $now->toDateString());
        if ($activeTermId) {
            $completedQuery->where('equipment_borrows.academic_term_id', $activeTermId);
        }
        $completedToday = $completedQuery->count();

        // 8. Top 5 Borrowed Equipment Types — scoped to active term
        $topEquipment = [];
        try {
            $topEquipQuery = DB::table('equipment_borrow_items')
                ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                ->join('equipment_types', 'equipment_borrow_items.equipment_type_id', '=', 'equipment_types.id')
                ->select(
                    'equipment_types.eq_name as name',
                    DB::raw('count(*) as total_borrows')
                )
                ->groupBy('equipment_types.id', 'equipment_types.eq_name')
                ->orderByDesc('total_borrows')
                ->limit(5);

            if ($activeTermId) {
                $topEquipQuery->where('equipment_borrows.academic_term_id', $activeTermId);
            }

            $topEquipmentData = $topEquipQuery->get();

            $topEquipment = $topEquipmentData->map(function ($item, $index) {
                return [
                    'rank' => $index + 1,
                    'name' => $item->name,
                    'count' => $item->total_borrows . ' borrows'
                ];
            })->all();
        } catch (\Throwable $e) {}

        // 9. Department with Most Bookings — scoped to active term
        $topBookedDeptsMap = [];
        try {
            $vbDeptsQuery = DB::table('venue_bookings')
                ->whereNull('archived_at')
                ->select('program_office', DB::raw('count(*) as total'))
                ->groupBy('program_office');
            if ($activeTermId) {
                $vbDeptsQuery->where('academic_term_id', $activeTermId);
            }
            $vbDepts = $vbDeptsQuery->get();

            foreach ($vbDepts as $row) {
                $p = trim($row->program_office ?: 'General');
                if ($p) $topBookedDeptsMap[$p] = ($topBookedDeptsMap[$p] ?? 0) + (int)$row->total;
            }

            $ebDeptsQuery = DB::table('equipment_borrows')
                ->whereNull('archived_at')
                ->select('program_office', DB::raw('count(*) as total'))
                ->groupBy('program_office');
            if ($activeTermId) {
                $ebDeptsQuery->where('academic_term_id', $activeTermId);
            }
            $ebDepts = $ebDeptsQuery->get();

            foreach ($ebDepts as $row) {
                $p = trim($row->program_office ?: 'General');
                if ($p) $topBookedDeptsMap[$p] = ($topBookedDeptsMap[$p] ?? 0) + (int)$row->total;
            }
        } catch (\Throwable $e) {}

        arsort($topBookedDeptsMap);
        $topBookedDepts = [];
        foreach (array_slice($topBookedDeptsMap, 0, 5, true) as $name => $count) {
            $topBookedDepts[] = [
                'name' => $name,
                'bookings' => (int) $count,
                'count' => (int) $count,
            ];
        }

        // 10. Department with Most Violations — scoped to active term
        $deptViolationsMap = [];
        try {
            $inspsQuery = DB::table('inspections')
                ->leftJoin('venue_bookings', function($j) {
                    $j->on('inspections.inspectable_id', '=', 'venue_bookings.id')
                      ->where(function($q) {
                          $q->where('inspections.inspectable_type', \App\Models\VenueBooking::class)
                            ->orWhere('inspections.inspectable_type', 'venue_booking')
                            ->orWhere('inspections.inspectable_type', 'avr_venue_booking');
                      });
                })
                ->leftJoin('equipment_borrows', function($j) {
                    $j->on('inspections.inspectable_id', '=', 'equipment_borrows.id')
                      ->where(function($q) {
                          $q->where('inspections.inspectable_type', \App\Models\EquipmentBorrow::class)
                            ->orWhere('inspections.inspectable_type', 'equipment_borrow')
                            ->orWhere('inspections.inspectable_type', 'avr_equipment_borrowing');
                      });
                })
                ->select(
                    DB::raw("COALESCE(equipment_borrows.program_office, venue_bookings.program_office, 'General') as program_office"),
                    'inspections.condition',
                    'inspections.violation_type',
                    'inspections.is_late',
                    'inspections.timeliness'
                );

            if ($activeTermId) {
                $inspsQuery->where(function($q) use ($activeTermId) {
                    $q->where('venue_bookings.academic_term_id', $activeTermId)
                      ->orWhere('equipment_borrows.academic_term_id', $activeTermId);
                });
            }

            $insps = $inspsQuery->get();

            foreach ($insps as $insp) {
                $p = trim($insp->program_office ?: 'General');
                if (!isset($deptViolationsMap[$p])) {
                    $deptViolationsMap[$p] = ['late' => 0, 'violations' => 0];
                }
                $isLate = $insp->is_late == 1 || strtolower((string)$insp->timeliness) === 'late' || str_contains(strtolower((string)$insp->violation_type), 'late');
                $isViolation = in_array(strtolower((string)$insp->condition), ['damaged', 'lost']) || !empty($insp->violation_type);
                if ($isLate) $deptViolationsMap[$p]['late'] += 1;
                if ($isViolation) $deptViolationsMap[$p]['violations'] += 1;
            }

            // Direct check from equipment_borrows tracking status — scoped to active term
            $ebBreachesQuery = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNull('equipment_borrows.archived_at')
                ->select('equipment_borrows.program_office', 'tracking_numbers.status as tracking_status');
            if ($activeTermId) {
                $ebBreachesQuery->where('equipment_borrows.academic_term_id', $activeTermId);
            }
            $ebBreaches = $ebBreachesQuery->get();

            foreach ($ebBreaches as $eb) {
                $p = trim($eb->program_office ?: 'General');
                $tStatus = strtolower((string)($eb->tracking_status ?? ''));
                $isLate = str_contains($tStatus, 'late');
                $isViolation = str_contains($tStatus, 'damaged') || str_contains($tStatus, 'lost');
                if ($isLate || $isViolation) {
                    if (!isset($deptViolationsMap[$p])) {
                        $deptViolationsMap[$p] = ['late' => 0, 'violations' => 0];
                    }
                    if ($isLate && $deptViolationsMap[$p]['late'] === 0) $deptViolationsMap[$p]['late'] += 1;
                    if ($isViolation && $deptViolationsMap[$p]['violations'] === 0) $deptViolationsMap[$p]['violations'] += 1;
                }
            }
        } catch (\Throwable $e) {}

        $programsList = [];
        foreach ($deptViolationsMap as $pName => $counts) {
            $late = $counts['late'];
            $violations = $counts['violations'];
            if ($late === 0 && $violations === 0) continue;

            $status = ($violations > 0 || $late > 2) ? 'Watch List' : ($late > 0 ? 'Warning' : 'Clear');

            $programsList[] = [
                'program' => $pName,
                'late' => $late,
                'violations' => $violations,
                'count' => $violations + $late,
                'status' => $status,
            ];
        }

        usort($programsList, fn($a, $b) => ($b['violations'] + $b['late']) <=> ($a['violations'] + $a['late']));
        $topViolatingDept = !empty($programsList) ? $programsList[0]['program'] : 'None';

        // Sort by late count for Top Late Department
        $lateSortedPrograms = $programsList;
        usort($lateSortedPrograms, fn($a, $b) => $b['late'] <=> $a['late']);
        $topLateDept = (!empty($lateSortedPrograms) && $lateSortedPrograms[0]['late'] > 0) ? $lateSortedPrograms[0]['program'] : 'None';

        // 10b. Borrowers with Late Returns — scoped to active term, fully unique real records
        $violatingStudents = [];
        try {
            $lateRecords = collect();

            // Source A: Late equipment inspections (using correct model and polymorphic types)
            if (Schema::hasTable('inspections')) {
                $equipInspQuery = DB::table('inspections')
                    ->join('equipment_borrows', 'inspections.inspectable_id', '=', 'equipment_borrows.id')
                    ->leftJoin('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                    ->where(function ($q) {
                        $q->where('inspections.inspectable_type', \App\Models\EquipmentBorrow::class)
                          ->orWhere('inspections.inspectable_type', 'equipment_borrow')
                          ->orWhere('inspections.inspectable_type', 'avr_equipment_borrowing')
                          ->orWhere('inspections.inspectable_type', 'like', '%EquipmentBorrow%');
                    })
                    ->where(function ($q) {
                        $q->where('inspections.is_late', 1)
                          ->orWhere(DB::raw('LOWER(inspections.timeliness)'), 'like', '%late%')
                          ->orWhere(DB::raw('LOWER(inspections.violation_type)'), 'like', '%late%')
                          ->orWhere('inspections.minutes_late', '>', 0);
                    })
                    ->whereNull('equipment_borrows.archived_at')
                    ->select(
                        'inspections.id as inspection_id',
                        'inspections.condition',
                        'inspections.violation_type',
                        'inspections.is_late',
                        'inspections.minutes_late',
                        'inspections.timeliness',
                        'inspections.created_at as incident_date',
                        'equipment_borrows.id as record_id',
                        'equipment_borrows.first_name',
                        'equipment_borrows.middle_name',
                        'equipment_borrows.last_name',
                        'equipment_borrows.suffix',
                        'equipment_borrows.filer_name',
                        'equipment_borrows.program_office',
                        'tracking_numbers.reference_code',
                        DB::raw("'Equipment Loan' as transaction_type")
                    );

                if ($activeTermId) {
                    $equipInspQuery->where(function($q) use ($activeTermId) {
                        $q->where('equipment_borrows.academic_term_id', $activeTermId)
                          ->orWhereNull('equipment_borrows.academic_term_id');
                    });
                }

                $lateRecords = $lateRecords->concat($equipInspQuery->get());

                // Source B: Late venue inspections
                $venueInspQuery = DB::table('inspections')
                    ->join('venue_bookings', 'inspections.inspectable_id', '=', 'venue_bookings.id')
                    ->leftJoin('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                    ->where(function ($q) {
                        $q->where('inspections.inspectable_type', \App\Models\VenueBooking::class)
                          ->orWhere('inspections.inspectable_type', 'venue_booking')
                          ->orWhere('inspections.inspectable_type', 'avr_venue_booking')
                          ->orWhere('inspections.inspectable_type', 'like', '%VenueBooking%');
                    })
                    ->where(function ($q) {
                        $q->where('inspections.is_late', 1)
                          ->orWhere(DB::raw('LOWER(inspections.timeliness)'), 'like', '%late%')
                          ->orWhere(DB::raw('LOWER(inspections.violation_type)'), 'like', '%late%')
                          ->orWhere('inspections.minutes_late', '>', 0);
                    })
                    ->whereNull('venue_bookings.archived_at')
                    ->select(
                        'inspections.id as inspection_id',
                        'inspections.condition',
                        'inspections.violation_type',
                        'inspections.is_late',
                        'inspections.minutes_late',
                        'inspections.timeliness',
                        'inspections.created_at as incident_date',
                        'venue_bookings.id as record_id',
                        'venue_bookings.first_name',
                        'venue_bookings.middle_name',
                        'venue_bookings.last_name',
                        'venue_bookings.suffix',
                        'venue_bookings.filer_name',
                        'venue_bookings.program_office',
                        'tracking_numbers.reference_code',
                        DB::raw("'Venue Booking' as transaction_type")
                    );

                if ($activeTermId) {
                    $venueInspQuery->where(function($q) use ($activeTermId) {
                        $q->where('venue_bookings.academic_term_id', $activeTermId)
                          ->orWhereNull('venue_bookings.academic_term_id');
                    });
                }

                $lateRecords = $lateRecords->concat($venueInspQuery->get());
            }

            // Source C: Borrows explicitly marked as 'late return' or 'returned late' in tracking status
            $directLateEbQuery = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNull('equipment_borrows.archived_at')
                ->whereRaw("LOWER(TRIM(tracking_numbers.status)) IN ('late return', 'returned late')")
                ->select(
                    DB::raw("NULL as inspection_id"),
                    DB::raw("'good' as `condition`"),
                    DB::raw("'Late Return' as violation_type"),
                    DB::raw("1 as is_late"),
                    DB::raw("15 as minutes_late"),
                    DB::raw("'late' as timeliness"),
                    'tracking_numbers.updated_at as incident_date',
                    'equipment_borrows.id as record_id',
                    'equipment_borrows.first_name',
                    'equipment_borrows.middle_name',
                    'equipment_borrows.last_name',
                    'equipment_borrows.suffix',
                    'equipment_borrows.filer_name',
                    'equipment_borrows.program_office',
                    'tracking_numbers.reference_code',
                    DB::raw("'Equipment Loan' as transaction_type")
                );
            if ($activeTermId) {
                $directLateEbQuery->where(function($q) use ($activeTermId) {
                    $q->where('equipment_borrows.academic_term_id', $activeTermId)
                      ->orWhereNull('equipment_borrows.academic_term_id');
                });
            }
            $lateRecords = $lateRecords->concat($directLateEbQuery->get());

            // Source D: Currently overdue ongoing equipment borrows (past date_of_usage and time_end)
            $overdueEbQuery = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNull('equipment_borrows.archived_at')
                ->whereRaw("LOWER(TRIM(tracking_numbers.status)) IN ('ongoing', 'on-going')")
                ->where(function ($q) use ($now) {
                    $q->where('equipment_borrows.date_of_usage', '<', $now->toDateString())
                      ->orWhere(function ($q2) use ($now) {
                          $q2->where('equipment_borrows.date_of_usage', '=', $now->toDateString())
                             ->where('equipment_borrows.time_end', '<', $now->toTimeString());
                      });
                })
                ->select(
                    DB::raw("NULL as inspection_id"),
                    DB::raw("'good' as `condition`"),
                    DB::raw("'Overdue (Active)' as violation_type"),
                    DB::raw("1 as is_late"),
                    DB::raw("TIMESTAMPDIFF(MINUTE, CONCAT(equipment_borrows.date_of_usage, ' ', equipment_borrows.time_end), NOW()) as minutes_late"),
                    DB::raw("'late' as timeliness"),
                    DB::raw("NOW() as incident_date"),
                    'equipment_borrows.id as record_id',
                    'equipment_borrows.first_name',
                    'equipment_borrows.middle_name',
                    'equipment_borrows.last_name',
                    'equipment_borrows.suffix',
                    'equipment_borrows.filer_name',
                    'equipment_borrows.program_office',
                    'tracking_numbers.reference_code',
                    DB::raw("'Equipment Loan' as transaction_type")
                );
            if ($activeTermId) {
                $overdueEbQuery->where(function($q) use ($activeTermId) {
                    $q->where('equipment_borrows.academic_term_id', $activeTermId)
                      ->orWhereNull('equipment_borrows.academic_term_id');
                });
            }
            $lateRecords = $lateRecords->concat($overdueEbQuery->get());

            // Deduplicate by transaction (reference_code or transaction_type + record_id)
            $seenKeys = [];
            $uniqueViolating = [];
            foreach ($lateRecords as $row) {
                $refCode = $row->reference_code ?: ("TRK-" . ($row->transaction_type === 'Equipment Loan' ? 'EB' : 'VB') . "-{$row->record_id}");
                $dedupKey = $refCode;
                if (isset($seenKeys[$dedupKey])) {
                    continue;
                }
                $seenKeys[$dedupKey] = true;

                $fullName = trim(implode(' ', array_filter([$row->first_name ?? '', $row->last_name ?? ''])));
                if (empty($fullName)) {
                    $fullName = trim((string)($row->filer_name ?? ''));
                }
                if (empty($fullName)) {
                    $fullName = 'Borrower';
                }

                $department = trim((string)($row->program_office ?? ''));
                if (empty($department)) {
                    $department = 'Academic Dept';
                }

                $minLate = max(0, (int)($row->minutes_late ?? 0));
                $violationLabel = $row->violation_type;
                if (empty($violationLabel) || strtolower($violationLabel) === 'good' || strtolower($violationLabel) === 'clean') {
                    $violationLabel = $minLate > 0 ? "Late Return ({$minLate} mins)" : "Late Return";
                } elseif ($minLate > 0 && !str_contains($violationLabel, (string)$minLate)) {
                    $violationLabel = "{$violationLabel} ({$minLate} mins)";
                }

                $dt = Carbon::parse($row->incident_date ?? now());

                $uniqueViolating[] = [
                    'id'             => "late-{$row->record_id}-" . ($row->inspection_id ?? 'direct'),
                    'record_id'      => $row->record_id,
                    'name'           => $fullName,
                    'department'     => $department,
                    'reference_code' => $refCode,
                    'type'           => $row->transaction_type,
                    'violation'      => $violationLabel,
                    'is_late'        => true,
                    'minutes_late'   => $minLate,
                    'date'           => $dt->format('M d, Y h:i A'),
                ];
            }

            $violatingStudents = array_slice($uniqueViolating, 0, 25);
        } catch (\Throwable $e) {
            Log::error("violatingStudents error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
        }

        // 11. Schedule Overview Calendar Data — scoped to active term
        $calVbQuery = DB::table('venue_bookings')
            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
            ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
            ->whereNull('venue_bookings.archived_at')
            ->whereIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['pending', 'approved', 'ongoing', 'on-going', 'post-inspection', 'completed', 'late return', 'returned late', 'damaged', 'lost'])
            ->select(
                'venue_bookings.id',
                'venue_bookings.filer_name',
                'venue_bookings.program_office',
                'venue_bookings.date_of_usage',
                'venue_bookings.reservation_end_date',
                'venue_bookings.time_start',
                'venue_bookings.time_end',
                'venue_bookings.purpose',
                'venue_bookings.equipment_notes',
                'venues.name as venue_name',
                'tracking_numbers.reference_code',
                'tracking_numbers.status'
            )
            ->orderBy('venue_bookings.date_of_usage', 'asc')
            ->limit(50);
        if ($activeTermId) {
            $calVbQuery->where('venue_bookings.academic_term_id', $activeTermId);
        }
        $calendarVenueBookings = $calVbQuery->get();

        $calEbQuery = DB::table('equipment_borrows')
            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
            ->whereNull('equipment_borrows.archived_at')
            ->whereIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['pending', 'approved', 'ongoing', 'on-going', 'completed', 'late return', 'returned late', 'damaged', 'lost'])
            ->select(
                'equipment_borrows.id',
                'equipment_borrows.filer_name',
                'equipment_borrows.program_office',
                'equipment_borrows.date_of_usage',
                'equipment_borrows.date_of_usage as reservation_end_date',
                'equipment_borrows.time_start',
                'equipment_borrows.time_end',
                'equipment_borrows.purpose',
                DB::raw("NULL as equipment_notes"),
                DB::raw("'Equipment Loan' as venue_name"),
                'tracking_numbers.reference_code',
                'tracking_numbers.status'
            )
            ->orderBy('equipment_borrows.date_of_usage', 'asc')
            ->limit(50);
        if ($activeTermId) {
            $calEbQuery->where('equipment_borrows.academic_term_id', $activeTermId);
        }
        $calendarEquipBorrowings = $calEbQuery->get();

        $calendarBookings = $calendarVenueBookings->concat($calendarEquipBorrowings);

        // ── 12. Today's Scheduled Reservations (Venues & Equipment) ────────
        $todayReservations = [
            'venues'    => [],
            'equipment' => [],
            'all'       => [],
        ];
        try {
            $todayDate = $now->toDateString();

            // A. Today's Scheduled Venue Bookings
            $todayVbQuery = DB::table('venue_bookings')
                ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                ->leftJoin('venues', 'venue_bookings.venue_id', '=', 'venues.id')
                ->whereNull('venue_bookings.archived_at')
                ->where(function ($q) use ($todayDate) {
                    $q->where('venue_bookings.date_of_usage', '=', $todayDate)
                      ->orWhere(function ($q2) use ($todayDate) {
                          $q2->where('venue_bookings.date_of_usage', '<=', $todayDate)
                             ->whereRaw("COALESCE(venue_bookings.reservation_end_date, venue_bookings.date_of_usage) >= ?", [$todayDate]);
                      })
                      ->orWhereIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['ongoing', 'on-going', 'post-inspection']);
                })
                ->whereNotIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['cancelled', 'rejected', 'cancelled_by_user'])
                ->select(
                    'venue_bookings.id',
                    'venue_bookings.first_name',
                    'venue_bookings.middle_name',
                    'venue_bookings.last_name',
                    'venue_bookings.suffix',
                    'venue_bookings.filer_name',
                    'venue_bookings.classification',
                    'venue_bookings.program_office',
                    'venue_bookings.date_of_usage',
                    'venue_bookings.reservation_end_date',
                    'venue_bookings.time_start',
                    'venue_bookings.time_end',
                    'venue_bookings.purpose',
                    'venues.name as venue_name',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status'
                )
                ->orderBy('venue_bookings.time_start', 'asc');

            if ($activeTermId) {
                $todayVbQuery->where(function($q) use ($activeTermId) {
                    $q->where('venue_bookings.academic_term_id', $activeTermId)
                      ->orWhereNull('venue_bookings.academic_term_id');
                });
            }

            $todayVbList = $todayVbQuery->get()->map(function ($row) {
                $fullName = trim(implode(' ', array_filter([$row->first_name, $row->middle_name, $row->last_name, $row->suffix])));
                if (empty($fullName)) {
                    $fullName = trim((string)($row->filer_name ?: 'Client'));
                }
                $vName = $row->venue_name ?: ($row->purpose ?: 'Campus Facility');
                return [
                    'id'                   => $row->id,
                    'type'                 => 'venue',
                    'itemType'             => 'venue',
                    'reference_code'       => $row->reference_code ?: "TRK-VB-{$row->id}",
                    'first_name'           => $row->first_name,
                    'last_name'            => $row->last_name,
                    'filer_name'           => $fullName,
                    'name'                 => $fullName,
                    'classification'       => $row->classification ?: 'student',
                    'program_office'       => $row->program_office ?: 'Academic Dept',
                    'department'           => $row->program_office ?: 'Academic Dept',
                    'facility_or_item'     => $vName,
                    'venue_name'           => $row->venue_name,
                    'date_of_usage'        => $row->date_of_usage,
                    'reservation_end_date' => $row->reservation_end_date ?: $row->date_of_usage,
                    'time_start'           => $row->time_start ?: '08:00',
                    'time_end'             => $row->time_end ?: '17:00',
                    'status'               => strtolower((string)$row->status),
                    'purpose'              => $row->purpose,
                ];
            });

            // B. Today's Scheduled Equipment Borrowings
            $todayEbQuery = DB::table('equipment_borrows')
                ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                ->whereNull('equipment_borrows.archived_at')
                ->where(function ($q) use ($todayDate) {
                    $q->where('equipment_borrows.date_of_usage', '=', $todayDate)
                      ->orWhere(function ($q2) use ($todayDate) {
                          $q2->where('equipment_borrows.date_of_usage', '<=', $todayDate)
                             ->whereRaw("COALESCE(equipment_borrows.extend_of_date_returned, equipment_borrows.date_of_usage) >= ?", [$todayDate]);
                      })
                      ->orWhereIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['ongoing', 'on-going', 'late return', 'returned late']);
                })
                ->whereNotIn(DB::raw('LOWER(TRIM(tracking_numbers.status))'), ['cancelled', 'rejected', 'cancelled_by_user'])
                ->select(
                    'equipment_borrows.id',
                    'equipment_borrows.first_name',
                    'equipment_borrows.middle_name',
                    'equipment_borrows.last_name',
                    'equipment_borrows.suffix',
                    'equipment_borrows.filer_name',
                    'equipment_borrows.classification',
                    'equipment_borrows.program_office',
                    'equipment_borrows.date_of_usage',
                    'equipment_borrows.extend_of_date_returned',
                    'equipment_borrows.time_start',
                    'equipment_borrows.time_end',
                    'equipment_borrows.purpose',
                    'tracking_numbers.reference_code',
                    'tracking_numbers.status'
                )
                ->orderBy('equipment_borrows.time_start', 'asc');

            if ($activeTermId) {
                $todayEbQuery->where(function($q) use ($activeTermId) {
                    $q->where('equipment_borrows.academic_term_id', $activeTermId)
                      ->orWhereNull('equipment_borrows.academic_term_id');
                });
            }

            $rawEb = $todayEbQuery->get();
            $ebIds = $rawEb->pluck('id')->all();

            // Fetch equipment items for these borrowings
            $itemsByBorrowId = [];
            if (!empty($ebIds) && Schema::hasTable('equipment_borrow_items')) {
                $items = DB::table('equipment_borrow_items')
                    ->leftJoin('equipment_types', function($j) {
                        $j->on('equipment_borrow_items.equipment_type_id', '=', 'equipment_types.id')
                          ->orOn('equipment_borrow_items.equipment_types_id', '=', 'equipment_types.id');
                    })
                    ->whereIn('equipment_borrow_items.equipment_borrow_id', $ebIds)
                    ->select(
                        'equipment_borrow_items.equipment_borrow_id',
                        'equipment_borrow_items.quantity_requested',
                        DB::raw("COALESCE(equipment_types.equipment_types_name, equipment_types.eq_name, equipment_types.name, 'Equipment') as eq_name")
                    )
                    ->get();
                foreach ($items as $it) {
                    $name = $it->eq_name ?: 'Equipment';
                    $qty = $it->quantity_requested ?: 1;
                    $itemsByBorrowId[$it->equipment_borrow_id][] = "{$name} ({$qty})";
                }
            }

            $todayEbList = $rawEb->map(function ($row) use ($itemsByBorrowId) {
                $fullName = trim(implode(' ', array_filter([$row->first_name, $row->middle_name, $row->last_name, $row->suffix])));
                if (empty($fullName)) {
                    $fullName = trim((string)($row->filer_name ?: 'Client'));
                }
                $equipStr = isset($itemsByBorrowId[$row->id]) ? implode(', ', $itemsByBorrowId[$row->id]) : '';
                return [
                    'id'                   => $row->id,
                    'type'                 => 'equipment',
                    'itemType'             => 'equipment',
                    'reference_code'       => $row->reference_code ?: "TRK-EB-{$row->id}",
                    'first_name'           => $row->first_name,
                    'last_name'            => $row->last_name,
                    'filer_name'           => $fullName,
                    'name'                 => $fullName,
                    'classification'       => $row->classification ?: 'student',
                    'program_office'       => $row->program_office ?: 'Academic Dept',
                    'department'           => $row->program_office ?: 'Academic Dept',
                    'facility_or_item'     => $equipStr ?: ($row->purpose ?: 'Audio-Visual Equipment Loan'),
                    'equipment_name'       => $equipStr,
                    'date_of_usage'        => $row->date_of_usage,
                    'reservation_end_date' => $row->extend_of_date_returned ?: $row->date_of_usage,
                    'time_start'           => $row->time_start ?: '08:00',
                    'time_end'             => $row->time_end ?: '17:00',
                    'status'               => strtolower((string)$row->status),
                    'purpose'              => $row->purpose,
                ];
            });

            $todayReservations = [
                'venues'    => $todayVbList->all(),
                'equipment' => $todayEbList->all(),
                'all'       => $todayVbList->concat($todayEbList)->values()->all(),
            ];
        } catch (\Throwable $e) {}

        // ── Recent Inventory Changes (from audit logs) ──────────────────────
        $recentInventoryChanges = [];
        try {
            if (Schema::hasTable('audit_logs')) {
                $recentInventoryChanges = DB::table('audit_logs')
                    ->whereIn('action', [
                        'EQUIPMENT_UNIT_UPDATED',
                        'EQUIPMENT_UNIT_CREATED',
                        'EQUIPMENT_UNIT_DELETED',
                        'EQUIPMENT_UNIT_ENABLED',
                        'EQUIPMENT_UNIT_BATCH_CREATED',
                        'EQUIPMENT_UNIT_BULK_IMPORTED',
                    ])
                    ->orderByDesc('created_at')
                    ->limit(12)
                    ->get()
                    ->map(function ($log) {
                        $meta = [];
                        try {
                            $raw = $log->metadata;
                            if (is_string($raw)) $meta = json_decode($raw, true) ?: [];
                            elseif (is_array($raw)) $meta = $raw;
                        } catch (\Throwable $e) {}

                        $actionLabel = match($log->action) {
                            'EQUIPMENT_UNIT_UPDATED'      => 'Unit Updated',
                            'EQUIPMENT_UNIT_CREATED'      => 'Unit Added',
                            'EQUIPMENT_UNIT_DELETED'      => 'Unit Disabled',
                            'EQUIPMENT_UNIT_ENABLED'      => 'Unit Re-enabled',
                            'EQUIPMENT_UNIT_BATCH_CREATED'=> 'Batch Added',
                            'EQUIPMENT_UNIT_BULK_IMPORTED'=> 'Bulk Imported',
                            default                       => $log->action,
                        };

                        $trigger = $meta['description'] ?? $meta['trigger'] ?? $actionLabel;
                        $barcode = $meta['barcode'] ?? null;
                        $condition = $meta['condition'] ?? null;
                        $status = $meta['status'] ?? null;
                        $reason = $meta['reason'] ?? null;
                        $count = $meta['count'] ?? $meta['imported_count'] ?? null;

                        return [
                            'id'          => $log->id,
                            'action'      => $log->action,
                            'label'       => $actionLabel,
                            'barcode'     => $barcode,
                            'condition'   => $condition,
                            'status'      => $status,
                            'reason'      => $reason,
                            'count'       => $count,
                            'trigger'     => $trigger,
                            'created_at'  => Carbon::parse($log->created_at)->diffForHumans(),
                            'raw_date'    => $log->created_at,
                        ];
                    })->all();
            }
        } catch (\Throwable $e) {}

        return [
            'quick_stats' => [
                'total_venue_bookings'         => $totalVenueBookings,
                'total_equip_borrows'          => $totalEquipBorrows,
                'pending_bookings'             => $pendingVb,
                'pending_borrowings'           => $pendingEb,
                'pending_approval'             => $pendingApproval,
                'pending_approval_count'       => $pendingVb,
                'pending_venue_count'          => $pendingVb,
                'pending_equipment_count'      => $pendingEb,
                'pending_borrow_count'         => $pendingEb,
                'post_inspection_pending_venue'  => $postInspectionPendingVenue,
                'post_inspection_pending_equip'  => $postInspectionPendingEquip,
                'available_equipment'          => $availableEquipment,
                'damage_reports'               => $physicalDamages,
                'overdue_returns'              => $overdueReturns,
                'completed_today'              => $completedToday,
                'total_equipment_damages'      => $totalEquipmentDamages,
                'total_equipment_lost'         => $totalEquipmentLost,
                'top_violating_department'     => $topViolatingDept,
                'top_late_department'          => $topLateDept,
                'active_term_id'               => $activeTermId,
            ],
            'equipment_inventory' => [
                'total_active'  => $totalActiveUnits,
                'available'     => $availableEquipment,
                'damaged'       => $physicalDamages,
                'lost'          => $physicalLost,
                'released'      => $releasedUnits,
                'disabled'      => $disabledUnits,
            ],
            'recent_inventory_changes' => $recentInventoryChanges,
            'top_departments'         => $topBookedDepts,
            'top_equipment'           => $topEquipment,
            'programs_with_violations' => array_slice($programsList, 0, 5),
            'violating_students'      => $violatingStudents,
            'today_reservations'      => $todayReservations,
            'calendar_bookings'       => $calendarBookings,
        ];
    }
}
