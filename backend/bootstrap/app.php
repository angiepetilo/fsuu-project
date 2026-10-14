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
                $origin = $request->header('Origin');
                // Match origin whitelist safely
                $allowedOrigins = array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', ''))));
                $frontend = config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173'));
                if ($frontend) $allowedOrigins[] = rtrim($frontend, '/');
                $isLocalDev = config('app.debug', false) || app()->environment('local', 'testing');

                $isAllowed = false;
                if (!empty($origin)) {
                    $norm = rtrim($origin, '/');
                    if (in_array($norm, $allowedOrigins, true)) {
                        $isAllowed = true;
                    } elseif ($isLocalDev && (
                        preg_match('/^http:\/\/localhost(:\d+)?$/', $norm) ||
                        preg_match('/^http:\/\/127\.0\.0\.1(:\d+)?$/', $norm)
                    )) {
                        $isAllowed = true;
                    }
                }

                $corsHeaders = [
                    'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key, Accept, Origin, Application',
                ];
                if ($isAllowed) {
                    $corsHeaders['Access-Control-Allow-Origin'] = $origin;
                    $corsHeaders['Access-Control-Allow-Credentials'] = 'true';
                } elseif (!$origin) {
                    $corsHeaders['Access-Control-Allow-Origin'] = '*';
                }

                if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                    return response()->json([
                        'success'    => false,
                        'error_code' => 'UNAUTHENTICATED',
                        'message'    => 'Unauthenticated. Please log in to proceed.',
                    ], 401, $corsHeaders);
                }
                if ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json([
                        'success'    => false,
                        'error_code' => 'VALIDATION_FAILED',
                        'message'    => $e->getMessage(),
                        'errors'     => $e->errors(),
                    ], 422, $corsHeaders);
                }
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                    $status = $e->getStatusCode();
                    $codeMap = [
                        403 => 'FORBIDDEN',
                        404 => 'NOT_FOUND',
                        405 => 'METHOD_NOT_ALLOWED',
                        429 => 'TOO_MANY_REQUESTS',
                    ];
                    return response()->json([
                        'success'    => false,
                        'error_code' => $codeMap[$status] ?? 'HTTP_ERROR',
                        'message'    => $e->getMessage() ?: 'HTTP Error occurred.',
                    ], $status, $corsHeaders);
                }

                $isDebug = config('app.debug', false);
                $errorResponse = [
                    'success'    => false,
                    'error_code' => 'SERVER_ERROR',
                    'message'    => $isDebug ? $e->getMessage() : 'An unexpected server error occurred. Please try again or contact system support.',
                ];
                if ($isDebug) {
                    $errorResponse['error'] = $e->getMessage();
                    $errorResponse['file']  = $e->getFile();
                    $errorResponse['line']  = $e->getLine();
                }

                return response()->json($errorResponse, 500, $corsHeaders);
            }
        });
    })->create();
