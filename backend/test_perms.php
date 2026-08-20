<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$user = \App\Models\User::where('email', 'jay.trubias@urios.edu.ph')->first();
if (!$user) {
    $user = \App\Models\User::where('role_id', 3)->first();
}
echo json_encode(['permissions' => $user->permissions, 'type' => gettype($user->permissions)]);
