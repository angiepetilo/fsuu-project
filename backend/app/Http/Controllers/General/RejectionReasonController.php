<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\RejectionReason;
use Illuminate\Http\Request;

class RejectionReasonController extends Controller
{
    public function index()
    {
        return response()->json(RejectionReason::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:rejection_reasons,name',
        ]);

        $reason = RejectionReason::create($validated);
        return response()->json($reason, 201);
    }

    public function destroy($id)
    {
        $reason = RejectionReason::find($id);
        if ($reason) {
            $reason->delete();
        }
        return response()->json(['message' => 'Deleted successfully']);
    }
}
