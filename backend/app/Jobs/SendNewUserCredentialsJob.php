<?php

namespace App\Jobs;

use App\Mail\NewUserCredentialsMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendNewUserCredentialsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Max attempts before moving to failed_jobs */
    public int $tries = 3;

    /** Seconds to wait before retry: 30s, 60s, 120s */
    public array $backoff = [30, 60, 120];

    /** Max seconds a single attempt may run */
    public int $timeout = 30;

    public function __construct(
        public readonly mixed $user,
        public readonly string $password
    ) {}

    public function handle(): void
    {
        $recipient = $this->user->personal_email ?? $this->user->email;
        Mail::to($recipient)->send(new NewUserCredentialsMail($this->user, $this->password));
    }

    /**
     * Called after all retries are exhausted.
     */
    public function failed(\Throwable $e): void
    {
        Log::error('SendNewUserCredentialsJob permanently failed', [
            'user_id'   => $this->user->id ?? null,
            'recipient' => $this->user->personal_email ?? $this->user->email ?? null,
            'error'     => $e->getMessage(),
        ]);
    }
}
