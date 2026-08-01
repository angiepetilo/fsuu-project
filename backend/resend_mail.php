<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::where('email', 'angie.petilo@urios.edu.ph')->first();

if (!$user) {
    $adminRole = App\Models\Role::firstOrCreate(['name' => 'admin']);
    $user = App\Models\User::create([
        'name' => 'Maria Santos',
        'email' => 'angie.petilo@urios.edu.ph',
        'username' => 'mariasantos',
        'password' => Illuminate\Support\Facades\Hash::make('C2wM9007'),
        'role_id' => $adminRole->id,
        'is_active' => true,
    ]);
} else {
    $user->username = 'mariasantos';
    $user->save();
}

$user->load(['office', 'role']);

App\Jobs\SendNewUserCredentialsJob::dispatch($user, 'C2wM9007');

echo "✅ Email dispatched successfully to " . $user->email . " with Username: " . $user->username . "\n";
