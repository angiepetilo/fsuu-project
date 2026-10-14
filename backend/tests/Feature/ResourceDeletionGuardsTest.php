<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Venue;
use App\Models\VenueBooking;
use App\Models\TrackingNumber;
use App\Models\EquipmentType;
use App\Models\EquipmentUnit;
use App\Models\Brand;
use App\Models\User;
use App\Models\Role;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ResourceDeletionGuardsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::create(['name' => 'admin']);
        $this->admin = User::create([
            'name' => 'Admin Officer',
            'email' => 'admin@urios.edu.ph',
            'password' => bcrypt('password123'),
            'role_id' => $role->id,
        ]);
    }

    public function test_cannot_delete_venue_with_active_or_pending_reservations(): void
    {
        $venue = Venue::create([
            'name' => 'Main Auditorium',
            'location' => 'Main Bldg',
            'capacity' => 500,
            'status' => 'available',
        ]);

        $tracking = new TrackingNumber();
        $tracking->reservation_type = 'venue_booking';
        $tracking->reservation_id = 0;
        $tracking->reference_code = 'TRK-20261014-001';
        $tracking->status = 'pending';
        $tracking->save();

        $booking = new VenueBooking([
            'venue_id' => $venue->id,
            'tracking_number_id' => $tracking->id,
            'filer_name' => 'Prof Smith',
            'email_address' => 'smith@urios.edu.ph',
            'contact_number' => '09171234567',
            'classification' => 'internal',
            'no_of_person' => 50,
            'purpose' => 'Seminar',
            'date_of_usage' => now()->addDays(5)->toDateString(),
            'time_start' => '09:00:00',
            'time_end' => '12:00:00',
            'status' => 'pending',
        ]);
        $booking->save();
        $tracking->update(['reservation_id' => $booking->id]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/general/venues/{$venue->id}");

        $response->assertStatus(422)
            ->assertJson([
                'message' => "Cannot delete venue '{$venue->name}' because it has active or pending bookings. You can disable the venue instead."
            ]);

        $this->assertNull($venue->fresh()->archived_at);
    }

    public function test_can_delete_venue_without_active_reservations(): void
    {
        $venue = Venue::create([
            'name' => 'Old Conf Room',
            'location' => 'Annex',
            'capacity' => 20,
            'status' => 'available',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/general/venues/{$venue->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => "Venue '{$venue->name}' deleted successfully."
            ]);

        $this->assertNull(Venue::find($venue->id));
        $this->assertNotNull(Venue::withTrashed()->find($venue->id)->archived_at);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'VENUE_DELETED',
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_cannot_delete_equipment_category_with_attached_units(): void
    {
        $category = EquipmentType::create([
            'eq_name' => 'Projector Category',
            'status' => 'available',
        ]);

        EquipmentUnit::create([
            'equipment_type_id' => $category->id,
            'serial_number' => 'PRJ-UNIT-001',
            'status' => 'available',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/general/equipment-types/{$category->id}");

        $response->assertStatus(422)
            ->assertJson([
                'message' => "Cannot delete equipment category '{$category->eq_name}' because 1 physical equipment unit(s) are associated with it. Please disable the category or delete the units first."
            ]);

        $this->assertNull($category->fresh()->archived_at);
    }

    public function test_can_delete_equipment_category_without_units(): void
    {
        $category = EquipmentType::create([
            'eq_name' => 'Empty Category',
            'status' => 'available',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/general/equipment-types/{$category->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => "Equipment category '{$category->eq_name}' deleted successfully."
            ]);

        $this->assertNull(EquipmentType::find($category->id));
        $this->assertNotNull(EquipmentType::withTrashed()->find($category->id)->archived_at);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'EQUIPMENT_CATEGORY_DELETED',
            'user_id' => $this->admin->id,
        ]);
    }

    public function test_cannot_delete_brand_with_attached_units(): void
    {
        $category = EquipmentType::create([
            'eq_name' => 'Cameras',
            'status' => 'available',
        ]);

        $brand = Brand::create([
            'name' => 'SONY PRO',
            'equipment_type_id' => $category->id,
            'status' => 'active',
        ]);

        EquipmentUnit::create([
            'equipment_type_id' => $category->id,
            'brand' => $brand->name,
            'brand_id' => $brand->id,
            'serial_number' => 'SONY-CAM-001',
            'status' => 'available',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/general/brands/{$brand->id}");

        $response->assertStatus(422)
            ->assertJson([
                'message' => "Cannot delete brand '{$brand->name}' because 1 physical equipment unit(s) are associated with it. Deactivate the brand instead."
            ]);

        $this->assertDatabaseHas('brands', ['id' => $brand->id]);
    }

    public function test_can_delete_brand_without_units(): void
    {
        $category = EquipmentType::create([
            'eq_name' => 'Monitors',
            'status' => 'available',
        ]);

        $brand = Brand::create([
            'name' => 'DELL DISPLAYS',
            'equipment_type_id' => $category->id,
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/general/brands/{$brand->id}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => "Brand '{$brand->name}' removed successfully."
            ]);

        $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'BRAND_DELETED',
            'user_id' => $this->admin->id,
        ]);
    }
}
