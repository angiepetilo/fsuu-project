<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FeeMatrixController extends Controller
{
    public function __construct()
    {
        // Table initialization guard
        if (!Schema::hasTable('fee_matrices')) {
            Schema::create('fee_matrices', function ($table) {
                $table->id();
                $table->string('classification')->default('external'); // academic, student_org, external, commercial
                $table->string('item_type')->default('venue'); // venue, equipment, penalty, cleaning
                $table->string('name');
                $table->decimal('rate_per_hour', 10, 2)->default(0.00);
                $table->decimal('flat_fee', 10, 2)->default(0.00);
                $table->decimal('penalty_rate', 10, 2)->default(0.00);
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }
    }

    public function index(): JsonResponse
    {
        $fees = DB::table('fee_matrices')->latest()->get();
        return response()->json($fees);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        if (!$user || !$user->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized. Super Admin access required.'], 403);
        }

        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'classification' => 'nullable|string|max:50',
            'item_type'      => 'nullable|string|max:50',
            'rate_per_hour'  => 'nullable|numeric|min:0',
            'flat_fee'       => 'nullable|numeric|min:0',
            'penalty_rate'   => 'nullable|numeric|min:0',
            'description'    => 'nullable|string',
        ]);

        $id = DB::table('fee_matrices')->insertGetId([
            'name'           => $validated['name'],
            'classification' => $validated['classification'] ?? 'external',
            'item_type'      => $validated['item_type'] ?? 'venue',
            'rate_per_hour'  => $validated['rate_per_hour'] ?? 0,
            'flat_fee'       => $validated['flat_fee'] ?? 0,
            'penalty_rate'   => $validated['penalty_rate'] ?? 0,
            'description'    => $validated['description'] ?? null,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        return response()->json(DB::table('fee_matrices')->find($id), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = auth()->user();
        if (!$user || !$user->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized. Super Admin access required.'], 403);
        }

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'classification' => 'nullable|string|max:50',
            'item_type'      => 'nullable|string|max:50',
            'rate_per_hour'  => 'nullable|numeric|min:0',
            'flat_fee'       => 'nullable|numeric|min:0',
            'penalty_rate'   => 'nullable|numeric|min:0',
            'description'    => 'nullable|string',
        ]);

        $updateData = array_merge($validated, ['updated_at' => now()]);
        DB::table('fee_matrices')->where('id', $id)->update($updateData);

        return response()->json(DB::table('fee_matrices')->find($id));
    }

    public function destroy(int $id): JsonResponse
    {
        $user = auth()->user();
        if (!$user || !$user->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized. Super Admin access required.'], 403);
        }

        DB::table('fee_matrices')->where('id', $id)->delete();
        return response()->json(['message' => 'Fee matrix entry deleted successfully']);
    }
}
