<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(\App\Http\Middleware\CorsMiddleware::class);
        $middleware->alias([
            'idempotency' => \App\Http\Middleware\IdempotencyMiddleware::class,
        ]);
        // Apply idempotency to all API routes automatically
        $middleware->appendToGroup('api', \App\Http\Middleware\IdempotencyMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                $origin = $request->header('Origin') ?: '*';
                $corsHeaders = [
                    'Access-Control-Allow-Origin'      => $origin,
                    'Access-Control-Allow-Methods'     => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers'     => 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key, Accept, Origin, Application',
                    'Access-Control-Allow-Credentials' => 'true',
                ];

                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json(['message' => 'Unauthenticated.'], 401, $corsHeaders);
                }
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'message' => $e->getMessage(),
                        'errors'  => $e->errors(),
                    ], 422, $corsHeaders);
                }
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                    return response()->json([
                        'message' => $e->getMessage() ?: 'HTTP Error',
                    ], $e->getStatusCode(), $corsHeaders);
                }

                return response()->json([
                    'message' => $e->getMessage(),
                    'error'   => $e->getMessage(),
                    'file'    => $e->getFile(),
                    'line'    => $e->getLine(),
                ], 500, $corsHeaders);
            }
        });
    })->create();
