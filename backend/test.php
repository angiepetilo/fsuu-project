<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$admin = \App\Models\User::where('role_id', 2)->first();
$request = \Illuminate\Http\Request::create('/api/admin/history-log', 'GET');
$request->setUserResolver(function() use ($admin) { return $admin; });

$controller = $app->make(\App\Http\Controllers\Admin\HistoryLogController::class);
$response = $controller->index($request);
echo json_encode($response->getData());
