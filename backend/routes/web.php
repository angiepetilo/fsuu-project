<?php

use Illuminate\Support\Facades\Route;

Route::get('/{any}', function () {
    return view('app'); // 'app.blade.php' should load your SPA (React/Vue)
})->where('any', '.*');
