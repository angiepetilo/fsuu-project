<?php

namespace App\Http\Controllers;

use App\Models\EquipmentType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminEquipmentTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $types = EquipmentType::with([
                'office',
                'units' => function ($q) {
                    $q->whereNull('archived_at');
                }
            ])
            ->latest()
            ->get()
            ->map(function ($e) {
                // Calculate units released in ACTIVE ON-GOING venue bookings or equipment borrowings ONLY
                $borrowedCount = 0;
                try {
                    if (\Illuminate\Support\Facades\Schema::hasTable('equipment_borrow_items') && \Illuminate\Support\Facades\Schema::hasTable('equipment_borrows') && \Illuminate\Support\Facades\Schema::hasTable('tracking_numbers')) {
                        $borrowedCount = DB::table('equipment_borrow_items')
                            ->join('equipment_borrows', 'equipment_borrow_items.equipment_borrow_id', '=', 'equipment_borrows.id')
                            ->join('tracking_numbers', 'equipment_borrows.tracking_number_id', '=', 'tracking_numbers.id')
                            ->where('equipment_borrow_items.equipment_type_id', $e->id)
                            ->whereNull('equipment_borrows.archived_at')
                            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['on-going', 'ongoing', 'borrowed'])
                            ->sum('equipment_borrow_items.quantity_requested');
                    }
                } catch (\Throwable $th) {
                    $borrowedCount = 0;
                }

                $venueCount = 0;
                try {
                    if (\Illuminate\Support\Facades\Schema::hasTable('venue_bookings') && \Illuminate\Support\Facades\Schema::hasTable('tracking_numbers')) {
                        $query = DB::table('venue_bookings')
                            ->join('tracking_numbers', 'venue_bookings.tracking_number_id', '=', 'tracking_numbers.id')
                            ->whereNull('venue_bookings.archived_at')
                            ->whereIn(DB::raw('LOWER(tracking_numbers.status)'), ['on-going', 'ongoing']);

                        $venueCount = $query->get()
                            ->sum(function ($vb) use ($e) {
                                $eqText = strtoupper($vb->equipment_notes ?? '');
                                $typeName = strtoupper($e->eq_name ?? $e->name ?? '');
                                $typeId = (string) $e->id;

                                // Match by numeric type ID: "5 (Qty: 1)"
                                if (preg_match('/(?:^|,\s*)' . preg_quote($typeId, '/') . '\s*\(Qty:\s*(\d+)\)/i', $eqText, $m)) {
                                    return (int)$m[1];
                                }
                                // Match by type name: "PROJECTOR SCREEN (Qty: 1)" or "PROJECTOR SCREEN"
                                if ($typeName && str_contains($eqText, $typeName)) {
                                    preg_match('/' . preg_quote($typeName, '/') . '[^\d]*(\d+)/i', $eqText, $m);
                                    return isset($m[1]) ? (int)$m[1] : 1;
                                }
                                return 0;
                            });
                    }
                } catch (\Throwable $th) {
                    $venueCount = 0;
                }

                $releasedTotal = (int) ($borrowedCount + $venueCount);
                $totalQty = (int) ($e->calculated_total ?? $e->total_quantity ?? 0);

                // Physical unit status counts
                $damagedCount = 0;
                $lostCount = 0;
                try {
                    if (\Illuminate\Support\Facades\Schema::hasTable('equipment_units')) {
                        $damagedCount = DB::table('equipment_units')
                            ->where('equipment_type_id', $e->id)
                            ->whereNull('archived_at')
                            ->where(function($q) {
                                $q->whereIn(DB::raw('LOWER(status)'), ['damaged', 'maintenance'])
                                  ->orWhereIn(DB::raw('LOWER(condition)'), ['damaged', 'maintenance']);
                            })
                            ->count();

                        $lostCount = DB::table('equipment_units')
                            ->where('equipment_type_id', $e->id)
                            ->whereNull('archived_at')
                            ->where(function($q) {
                                $q->whereIn(DB::raw('LOWER(status)'), ['decommissioned', 'lost'])
                                  ->orWhereIn(DB::raw('LOWER(condition)'), ['lost']);
                            })
                            ->count();
                    }
                } catch (\Throwable $th) {}

                $availCount = max(0, $totalQty - $releasedTotal - $damagedCount - $lostCount);

                return [
                    'id'              => $e->id,
                    'office_id'       => $e->office_id,
                    'eq_name'         => $e->eq_name ?? $e->name,
                    'eq_type'         => $e->eq_type ?? $e->category,
                    'barcode'         => $e->barcode,
                    'avatar'          => $e->avatar,
                    'total_quantity'  => $totalQty,
                    'available_count' => $availCount,
                    'released_count'  => $releasedTotal,
                    'damaged_count'   => $damagedCount,
                    'lost_count'      => $lostCount,
                    'date_purchased'  => $e->date_purchased,
                    'lifespan_years'  => $e->lifespan_years ?? 5,
                    'status'          => $e->status ?? 'available',
                    'description'     => $e->description,
                    'office'          => $e->office,
                    'created_at'      => $e->created_at,
                ];
            });

        return response()->json($types);
    }

    public function show($id): JsonResponse
    {
        $type = EquipmentType::with(['office', 'units'])->findOrFail($id);
        return response()->json($type);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'office_id'        => 'required|integer',
            'eq_name'          => 'required|string|max:255',
            'eq_type'          => 'required|string|max:255',
            'barcode'          => 'nullable|string|max:255',
            'avatar'           => 'nullable|string',
            'total_quantity'   => 'required|integer|min:0',
            'available_count'  => 'nullable|integer|min:0',
            'date_purchased'   => 'nullable|date',
            'lifespan_years'   => 'nullable|integer|min:1',
            'status'           => 'nullable|string',
            'description'      => 'nullable|string',
        ]);

        $type = EquipmentType::create($validated);
        return response()->json($type, 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $type = EquipmentType::findOrFail($id);
        $type->update($request->all());
        return response()->json($type);
    }

    public function destroy($id): JsonResponse
    {
        $type = EquipmentType::findOrFail($id);
        $type->delete();
        return response()->json(['message' => 'Equipment type deleted']);
    }
}
