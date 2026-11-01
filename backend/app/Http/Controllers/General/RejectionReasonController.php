<?php

namespace App\Http\Controllers\General;

use App\Http\Controllers\Controller;
use App\Models\RejectionReason;
use Illuminate\Http\Request;

use App\Http\Middleware\EnsureCanManageSettings;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class RejectionReasonController extends Controller implements HasMiddleware
{
    /**
     * Settings write actions require Super Admin, Staff/Admin, or 'settings' permission.
     */
    public static function middleware(): array
    {
        return [
            new Middleware(EnsureCanManageSettings::class, except: ['index']),
        ];
    }

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
