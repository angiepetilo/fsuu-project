<?php

namespace App\Http\Controllers;

use App\Models\AvrVenueBooking;
use App\Models\EquipmentBorrowing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvrHistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $type      = $request->type;      // 'venue' | 'equipment' | null (both)
        $status    = $request->status;
        $dateFrom  = $request->date_from;
        $dateTo    = $request->date_to;
        $perPage   = 20;

        $program   = $request->program;

        // Subquery closure for the completeness check on completed records
        $completenessCheck = function ($query) {
            $query->whereNotIn('status', ['completed', 'completed_with_damage'])
                  ->orWhere(function ($q) {
                      $q->whereIn('status', ['completed', 'completed_with_damage'])
                        ->whereHas('inspections', function ($iq) {
                            $iq->where('has_damage', false)
                               ->orWhere(function ($dq) {
                                   $dq->where('has_damage', true)
                                      ->whereHas('documents', function ($docQ) {
                                          $docQ->where('document_type', 'evidence');
                                      });
                               });
                        });
                  });
        };

        if (! $type || $type === 'venue') {
            $venueRows = AvrVenueBooking::with('venue')
                ->where($completenessCheck)
                ->when($program,  fn($q) => $q->where('requestor_program_office', $program))
                ->when($status,   fn($q) => $q->where('status', $status))
                ->when($dateFrom, fn($q) => $q->where('start_datetime', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('start_datetime', '<=', $dateTo . ' 23:59:59'))
                ->get()
                ->map(fn($b) => [
                    'id'           => 'vb-' . $b->id,
                    'raw_id'       => $b->id,
                    'type'         => 'Venue Booking',
                    'tracking_no'  => $b->reference_code ?? ('VB-' . str_pad($b->id, 5, '0', STR_PAD_LEFT)),
                    'filer'        => $b->requestor_name,
                    'program'      => $b->requestor_program_office,
                    'venue'        => $b->venue?->name,
                    'equipment'    => null,
                    'start'        => $b->start_datetime?->toIso8601String(),
                    'end'          => $b->end_datetime?->toIso8601String(),
                    'status'       => $b->status,
                    'condition'    => null,
                    'created_at'   => $b->created_at?->toIso8601String(),
                    'updated_at'   => $b->updated_at?->toIso8601String(),
                ]);
        }

        if (! $type || $type === 'equipment') {
            $borrowingRows = EquipmentBorrowing::with('items.equipmentType')
                ->where($completenessCheck)
                ->when($program,  fn($q) => $q->where('requestor_program_office', $program))
                ->when($status,   fn($q) => $q->where('status', $status))
                ->when($dateFrom, fn($q) => $q->where('start_datetime', '>=', $dateFrom))
                ->when($dateTo,   fn($q) => $q->where('start_datetime', '<=', $dateTo . ' 23:59:59'))
                ->get()
                ->map(fn($b) => [
                    'id'           => 'eb-' . $b->id,
                    'raw_id'       => $b->id,
                    'type'         => 'Equipment Borrowing',
                    'tracking_no'  => $b->reference_code ?? ('EB-' . str_pad($b->id, 5, '0', STR_PAD_LEFT)),
                    'filer'        => $b->requestor_name,
                    'program'      => $b->requestor_program_office,
                    'venue'        => null,
                    'equipment'    => $b->items->map(fn($i) => $i->equipmentType?->name)->filter()->join(', '),
                    'start'        => $b->start_datetime?->toIso8601String(),
                    'end'          => $b->end_datetime?->toIso8601String(),
                    'status'       => $b->status,
                    'condition'    => $b->status === 'completed_with_damage' ? 'Damaged' : ($b->status === 'completed' ? 'Good' : null),
                    'created_at'   => $b->created_at?->toIso8601String(),
                    'updated_at'   => $b->updated_at?->toIso8601String(),
                ]);
        }

        // Merge & sort by created_at desc
        $all = $venueRows->merge($borrowingRows)
            ->sortByDesc('created_at')
            ->values();

        // Manual pagination
        $page    = $request->integer('page', 1);
        $total   = $all->count();
        $sliced  = $all->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data'         => $sliced,
            'current_page' => $page,
            'last_page'    => (int) ceil($total / $perPage) ?: 1,
            'total'        => $total,
            'per_page'     => $perPage,
        ]);
    }
}
