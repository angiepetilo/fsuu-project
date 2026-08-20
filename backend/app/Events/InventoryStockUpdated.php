<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InventoryStockUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ?int $equipmentTypeId = null,
        public ?string $action = 'updated', // 'released' | 'returned' | 'damaged' | 'lost' | 'registered'
        public ?array $details = null
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('equipment-inventory'),
            new Channel('admin-notifications'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'inventory.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'equipment_type_id' => $this->equipmentTypeId,
            'action'            => $this->action,
            'details'           => $this->details,
            'timestamp'         => now()->toISOString(),
        ];
    }
}
