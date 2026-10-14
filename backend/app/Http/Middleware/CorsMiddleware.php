<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin');
        $allowedOrigins = array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', ''))));
        
        $configuredFrontend = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));
        if ($configuredFrontend) {
            $allowedOrigins[] = rtrim($configuredFrontend, '/');
        }

        // Standard local development origins
        $isLocalDev = config('app.debug', false) || app()->environment('local', 'testing');
        
        $isAllowed = false;
        if (!empty($origin)) {
            $normalizedOrigin = rtrim($origin, '/');
            if (in_array($normalizedOrigin, $allowedOrigins, true)) {
                $isAllowed = true;
            } elseif ($isLocalDev && (
                preg_match('/^http:\/\/localhost(:\d+)?$/', $normalizedOrigin) ||
                preg_match('/^http:\/\/127\.0\.0\.1(:\d+)?$/', $normalizedOrigin)
            )) {
                $isAllowed = true;
            }
        }

        $allowOriginHeader = $isAllowed ? $origin : ($origin ? '' : '*');
        $allowCredentials = $isAllowed;

        // Handle preflight OPTIONS requests immediately
        if ($request->isMethod('OPTIONS')) {
            $preflight = response('', 204)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key, Accept, Origin, Application')
                ->header('Access-Control-Max-Age', '86400');

            if ($allowOriginHeader) {
                $preflight->header('Access-Control-Allow-Origin', $allowOriginHeader);
            }
            if ($allowCredentials) {
                $preflight->header('Access-Control-Allow-Credentials', 'true');
            }

            return $preflight;
        }

        $response = $next($request);

        if ($allowOriginHeader) {
            $response->headers->set('Access-Control-Allow-Origin', $allowOriginHeader);
        }
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key, Accept, Origin, Application');
        if ($allowCredentials) {
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
    }
}
