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

    public int $tries = 3;
    public array $backoff = [30, 60, 120];
    public int $timeout = 30;

    public function __construct(
        public readonly mixed $user,
        public readonly string $password
    ) {}

    public function handle(): void
    {
        $recipient = $this->user->personal_email ?? $this->user->email;
        if (empty($recipient)) {
            Log::warning('[MAIL] SendNewUserCredentialsJob: No recipient email provided.');
            return;
        }

        try {
            Log::info("[MAIL] Sending credentials email to: {$recipient}");
            Mail::to($recipient)->send(new NewUserCredentialsMail($this->user, $this->password));
            Log::info("[MAIL] SUCCESS: Credentials email delivered to: {$recipient}");
        } catch (\Throwable $e) {
            Log::error("[MAIL] FAILED: SendNewUserCredentialsJob failed to deliver to {$recipient}: " . $e->getMessage());
        }
    }

    /**
     * Called after all retries are exhausted.
     */
    public function failed(\Throwable $e): void
    {
        Log::error('[MAIL] SendNewUserCredentialsJob permanently failed', [
            'user_id'   => $this->user->id ?? null,
            'recipient' => $this->user->personal_email ?? $this->user->email ?? null,
            'error'     => $e->getMessage(),
        ]);
    }
}
