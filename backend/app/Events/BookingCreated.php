<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BookingCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $type,
        public string $referenceCode,
        public string $filerName,
        public string $programOffice,
        public string $placeOfUse,
        public string $dateOfUsage,
        public string $timeStart,
        public string $timeEnd,
        public int $id
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('admin-notifications'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'booking.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id'             => $this->id,
            'type'           => $this->type,
            'reference_code' => $this->referenceCode,
            'filer_name'     => $this->filerName,
            'program_office' => $this->programOffice,
            'place_of_use'   => $this->placeOfUse,
            'date_of_usage'  => $this->dateOfUsage,
            'time_start'     => $this->timeStart,
            'time_end'       => $this->timeEnd,
            'created_at'     => now()->toISOString(),
        ];
    }
}
