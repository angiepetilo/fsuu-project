<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts settings-catalog write actions (create / update / delete) to
 * Super Admins, Staff/Admins, or users granted the "settings" permission area.
 *
 * Student Assistants and custom roles without Settings access receive 403,
 * even if they call the API directly (bypassing the hidden frontend tabs).
 */
class EnsureCanManageSettings
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $allowed = $user && (
            $user->isSuperAdmin()
            || $user->isAdmin()
            || $user->hasPermission('settings')
        );

        if (!$allowed) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to modify system settings.',
            ], 403);
        }

        return $next($request);
    }
}

