<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\Office;
use App\Models\Venue;
use App\Models\EquipmentType;

class BootstrapController extends Controller
{
    /**
     * Single Bootstrap Endpoint
     * 
     * Combines user profile, office dropdowns, venue lists, and equipment types
     * into 1 single ultra-fast HTTP response, eliminating the "Waterfall Network Effect".
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        // 1-hour memory cache for static reference data
        $offices = Cache::remember('bootstrap_offices', 3600, function () {
            return Office::select(['id', 'name', 'code', 'type'])->get();
        });

        $venues = Cache::remember('bootstrap_venues', 3600, function () {
            return Venue::all();
        });

        $equipmentTypes = Cache::remember('bootstrap_equipment_types', 3600, function () {
            return EquipmentType::all();
        });

        return response()->json([
            'user'             => $user,
            'offices'          => $offices,
            'venues'           => $venues,
            'equipment_types'  => $equipmentTypes,
            'timestamp'        => now()->toIso8601String(),
        ])->header('Cache-Control', 'public, max-age=300');
    }

    /**
     * Public Bootstrap Endpoint (unauthenticated venue & equipment catalog)
     */
    public function publicBootstrap()
    {
        $venues = Cache::remember('public_bootstrap_venues', 3600, function () {
            return Venue::all();
        });

        $equipmentTypes = Cache::remember('public_bootstrap_equipment_types', 3600, function () {
            return EquipmentType::all();
        });

        return response()->json([
            'venues'          => $venues,
            'equipment_types' => $equipmentTypes,
        ])->header('Cache-Control', 'public, max-age=3600');
    }
}
