<?php

namespace App\Http\Controllers;

use App\Models\EquipmentBorrowing;
use App\Models\AvrVenueBooking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class AvrReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $now = Carbon::now();

        // ── Borrowings by Program ─────────────────────────────────────────────
        $borrowingsByProgram = EquipmentBorrowing::select(
                'requestor_program_office',
                DB::raw('count(*) as total')
            )
            ->groupBy('requestor_program_office')
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => [
                'program' => $r->requestor_program_office ?: 'Other',
                'total'   => $r->total,
            ]);

        // ── Top 5 Borrowed Equipment ──────────────────────────────────────────
        $top5 = DB::table('equipment_borrowing_items')
            ->join('equipment_types', 'equipment_borrowing_items.equipment_type_id', '=', 'equipment_types.id')
            ->select('equipment_types.name', DB::raw('count(*) as total_borrows'))
            ->groupBy('equipment_types.id', 'equipment_types.name')
            ->orderByDesc('total_borrows')
            ->limit(5)
            ->get()
            ->map(fn($r, $i) => [
                'rank'  => $i + 1,
                'name'  => $r->name,
                'total' => $r->total_borrows,
            ]);

        // ── Damage Trends by Month (last 6 months) ────────────────────────────
        $sixMonthsAgo = $now->copy()->subMonths(5)->startOfMonth();
        $rawTrends = EquipmentBorrowing::where('status', 'completed_with_damage')
            ->where('updated_at', '>=', $sixMonthsAgo)
            ->selectRaw("DATE_FORMAT(updated_at, '%b %Y') as month_label, count(*) as total_count")
            ->groupBy('month_label')
            ->pluck('total_count', 'month_label');

        $damageTrends = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = $now->copy()->subMonths($i)->format('M Y');
            $damageTrends[] = [
                'month' => $m,
                'count' => (int) ($rawTrends[$m] ?? 0),
            ];
        }

        // ── Borrowing Records (detailed) ──────────────────────────────────────
        $perPage   = 20;
        $page      = $request->integer('page', 1);
        $status    = $request->status;
        $program   = $request->program;

        $query = EquipmentBorrowing::with('items.equipmentType')
            ->when($status,  fn($q) => $q->where('status', $status))
            ->when($program, fn($q) => $q->where('requestor_program_office', 'like', '%' . $program . '%'))
            ->latest();

        $total    = $query->count();
        $records  = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

        $rows = $records->map(fn($b, $idx) => [
            'no'            => (($page - 1) * $perPage) + $idx + 1,
            'tracking_no'   => $b->reference_code ?? ('EB-' . str_pad($b->id, 5, '0', STR_PAD_LEFT)),
            'program'       => $b->requestor_program_office ?? '—',
            'filer'         => $b->requestor_name,
            'type'          => $b->requestor_identity_type ?? '—',
            'equipment'     => $b->items->map(fn($i) => $i->equipmentType?->name)->filter()->join(', '),
            'start'         => $b->start_datetime?->format('Y-m-d'),
            'time'          => $b->start_datetime?->format('H:i'),
            'status'        => $b->status,
            'return_status' => match($b->status) {
                'completed'              => 'Returned',
                'completed_with_damage'  => 'Returned w/ Damage',
                'in_use'                 => $b->end_datetime < now() ? 'Overdue' : 'In Use',
                default                  => ucfirst(str_replace('_', ' ', $b->status)),
            },
            'condition' => match($b->status) {
                'completed'             => 'Good',
                'completed_with_damage' => 'Damaged',
                default                 => '—',
            },
        ]);

        return response()->json([
            'borrowings_by_program' => $borrowingsByProgram,
            'top_5_equipment'       => $top5,
            'damage_trends'         => $damageTrends,
            'records' => [
                'data'         => $rows,
                'current_page' => $page,
                'last_page'    => (int) ceil($total / $perPage) ?: 1,
                'total'        => $total,
            ],
        ]);
    }

    public function sendEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'to'      => 'required|email',
            'subject' => 'nullable|string|max:255',
            'body'    => 'nullable|string',
        ]);

        try {
            Mail::raw(
                ($data['body'] ?? 'Please find the AVR system report attached.'),
                function ($message) use ($data) {
                    $message->to($data['to'])
                        ->subject($data['subject'] ?? 'AVR System Report');
                }
            );
            return response()->json(['message' => 'Report sent via email.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to send email: ' . $e->getMessage()], 500);
        }
    }
}
