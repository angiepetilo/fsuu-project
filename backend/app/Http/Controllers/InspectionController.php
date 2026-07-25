<?php

namespace App\Http\Controllers;

use App\Http\Requests\Staff\StoreInspectionRequest;
use App\Services\InspectionService;
use Illuminate\Http\JsonResponse;

class InspectionController extends Controller
{
    public function __construct(private InspectionService $service) {}

    public function store(StoreInspectionRequest $request): JsonResponse
    {
        $inspection = $this->service->record(
            $request->input('reference_type'),
            $request->input('reference_id'),
            $request->user(),
            $request->input('inspection_type'),
            $request->input('condition_notes'),
            $request->boolean('has_damage'),
            $request->input('damage_charge_amount'),
            $request->file('evidences')
        );

        return response()->json($inspection, 201);
    }
}
