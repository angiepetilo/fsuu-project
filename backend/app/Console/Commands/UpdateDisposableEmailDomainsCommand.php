<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UpdateDisposableEmailDomainsCommand extends Command
{
    protected $signature = 'email:update-disposable-domains {--source= : Custom URL to fetch domains from}';
    protected $description = 'Download and update the 75,000+ disposable email domains dataset to prevent throwaway/temp emails';

    protected string $defaultSource = 'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt';

    public function handle(): int
    {
        $url = $this->option('source') ?: $this->defaultSource;
        $this->info("Fetching latest disposable email domains list from: {$url}...");

        try {
            $response = Http::timeout(30)->withoutVerifying()->get($url);

            if (!$response->successful()) {
                $this->error("Failed to fetch disposable domains. HTTP Status: " . $response->status());
                return 1;
            }

            $content = trim($response->body());
            $lines = preg_split("/\r\n|\n|\r/", $content);
            $count = count($lines);

            if ($count < 1000) {
                $this->error("Downloaded list seems too short ({$count} domains). Aborting to prevent overwriting with bad data.");
                return 1;
            }

            $storageDir = storage_path('app');
            if (!is_dir($storageDir)) {
                @mkdir($storageDir, 0755, true);
            }

            $filePath = storage_path('app/disposable_domains.txt');
            file_put_contents($filePath, $content);

            // Clear cache
            Cache::forget('disposable_email_domains_map');

            $this->info("Successfully updated disposable email domains list!");
            $this->info("Total active disposable domains: {$count}");
            $this->info("Saved to: {$filePath}");

            Log::info("Updated disposable email domains dataset with {$count} entries.");
            return 0;
        } catch (\Throwable $e) {
            $this->error("Exception while updating disposable domains: " . $e->getMessage());
            Log::error("Failed to update disposable email domains: " . $e->getMessage());
            return 1;
        }
    }
}
