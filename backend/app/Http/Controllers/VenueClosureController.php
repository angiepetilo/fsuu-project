<?php

namespace App\Http\Controllers;

use App\Models\VenueClosure;
use Illuminate\Http\Request;

class VenueClosureController extends Controller
{
    public function index()
    {
        return response()->json(VenueClosure::with('venue')->orderBy('start_time', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'venue_id' => 'required|exists:venues,id',
            'type' => 'required|in:maintenance,closed',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'reason' => 'nullable|string',
        ]);

        $closure = VenueClosure::create($validated);
        return response()->json($closure->load('venue'), 201);
    }

    public function destroy(VenueClosure $venueClosure)
    {
        $venueClosure->delete();
        return response()->json(null, 204);
    }
}
