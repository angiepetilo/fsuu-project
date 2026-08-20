<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BookingStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $type, // 'venue_booking' | 'equipment_borrowing'
        public string $referenceCode,
        public string $status,
        public int $id,
        public ?string $remarks = null,
        public ?array $extra = null
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('admin-notifications'),
            new Channel('booking.' . $this->referenceCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'booking.status_updated';
    }

    public function broadcastWith(): array
    {
        return [
            'id'             => $this->id,
            'type'           => $this->type,
            'reference_code' => $this->referenceCode,
            'status'         => $this->status,
            'remarks'        => $this->remarks,
            'extra'          => $this->extra,
            'updated_at'     => now()->toISOString(),
        ];
    }
}
