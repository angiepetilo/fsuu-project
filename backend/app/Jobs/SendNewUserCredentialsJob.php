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
        if (empty($recipient)) {
            Log::warning('[MAIL] SendNewUserCredentialsJob: No recipient email provided.');
            return;
        }

        try {
            Log::info("[MAIL] Attempting to send credentials email to: {$recipient} via port 587...");
            Mail::to($recipient)->send(new NewUserCredentialsMail($this->user, $this->password));
            Log::info("[MAIL] SUCCESS: Credentials email delivered to: {$recipient}");
        } catch (\Throwable $e) {
            Log::error("[MAIL] Primary attempt (587 TLS) failed: " . $e->getMessage() . ". Retrying via SSL port 465 fallback...");

            // Automatic fallback using SSL on port 465 if port 587 was blocked or timed out by cloud host
            try {
                config([
                    'mail.mailers.smtp.port' => 465,
                    'mail.mailers.smtp.encryption' => 'ssl',
                ]);
                app('mail.manager')->forgetMailers();
                Mail::to($recipient)->send(new NewUserCredentialsMail($this->user, $this->password));
                Log::info("[MAIL] SUCCESS: Credentials email delivered via SSL 465 fallback to: {$recipient}");
            } catch (\Throwable $e2) {
                Log::error("[MAIL] FAILED: Email delivery failed on both ports (587 & 465)", [
                    'recipient'      => $recipient,
                    'primary_error'  => $e->getMessage(),
                    'fallback_error' => $e2->getMessage(),
                ]);
            }
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
