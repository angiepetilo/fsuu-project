<?php

use Illuminate\Support\Facades\Route;

// Explicit storage file handler so uploads and endorsements are always served seamlessly with CORS
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path("app/public/{$path}");
    if (!file_exists($fullPath)) {
        $fullPath = storage_path("app/private/documents/{$path}");
    }
    if (!file_exists($fullPath)) {
        $filename = basename($path);
        $fullPath = storage_path("app/private/documents/{$filename}");
    }
    if (!file_exists($fullPath)) {
        abort(404, 'Document or attachment not found.');
    }
    return response()->file($fullPath, [
        'Access-Control-Allow-Origin'  => '*',
        'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers' => '*',
    ]);
})->where('path', '.*');

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
