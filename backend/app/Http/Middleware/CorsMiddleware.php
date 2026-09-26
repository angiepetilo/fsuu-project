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
        $allowOrigin = $origin ?: '*';
        $allowCredentials = !empty($origin);

        // Handle preflight OPTIONS requests immediately
        if ($request->isMethod('OPTIONS')) {
            $preflight = response('', 204)
                ->header('Access-Control-Allow-Origin', $allowOrigin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key, Accept, Origin, Application')
                ->header('Access-Control-Max-Age', '86400');

            if ($allowCredentials) {
                $preflight->header('Access-Control-Allow-Credentials', 'true');
            }

            return $preflight;
        }

        $response = $next($request);

        $response->headers->set('Access-Control-Allow-Origin', $allowOrigin);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key, Accept, Origin, Application');
        if ($allowCredentials) {
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
    }
}
