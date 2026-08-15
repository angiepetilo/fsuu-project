<?php

use Illuminate\Support\Facades\Route;

// Explicit storage file handler so uploads and endorsements are always served seamlessly
Route::get('/storage/{folder}/{filename}', function ($folder, $filename) {
    $path = storage_path("app/public/{$folder}/{$filename}");
    if (!file_exists($path)) {
        $path = storage_path("app/private/documents/{$filename}");
    }
    if (!file_exists($path)) {
        abort(404, 'Document or attachment not found.');
    }
    return response()->file($path, [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, OPTIONS',
    ]);
})->where('filename', '.*');

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
