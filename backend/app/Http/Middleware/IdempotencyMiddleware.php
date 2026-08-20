<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Idempotency Middleware
 *
 * Prevents double-submission on POST requests by caching responses
 * keyed to an X-Idempotency-Key header provided by the client.
 *
 * If the same key is submitted again within 5 minutes, the cached
 * response is returned instead of processing the request twice.
 */
class IdempotencyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Only applies to state-changing methods
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            return $next($request);
        }

        $key = $request->header('X-Idempotency-Key');

        // No key provided — process normally
        if (! $key) {
            return $next($request);
        }

        $cacheKey = 'idempotency_' . hash('sha256', $key . '|' . $request->path());

        // Return cached response if this key was already used
        if ($cached = Cache::get($cacheKey)) {
            return response()->json(
                $cached['body'],
                $cached['status'],
                ['X-Idempotency-Replayed' => 'true']
            );
        }

        // Process the request
        $response = $next($request);

        // Cache successful responses for 5 minutes
        if ($response->getStatusCode() < 500) {
            Cache::put($cacheKey, [
                'status' => $response->getStatusCode(),
                'body'   => json_decode($response->getContent(), true),
            ], now()->addMinutes(5));
        }

        return $response;
    }
}
