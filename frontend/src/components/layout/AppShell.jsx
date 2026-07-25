import React from 'react';
import { Outlet } from 'react-router-dom';
import { usePusherCacheInvalidator } from '@/hooks/usePusherCacheInvalidator';

/**
 * AppShell — Persistent layout shell that mounts ONCE across all page navigation.
 * Hosts all Pusher real-time cache-invalidation listeners so they run globally.
 */
export default function AppShell() {
  // 📡 1. Venue booking events → invalidate both office caches + dashboards
  usePusherCacheInvalidator(
    'venue-bookings',
    '.BookingCreated',
    ['avr_venue_bookings_pending_1', 'sysad_venue_bookings_1', 'avr_dashboard_stats']
  );

  // 📡 2. Equipment borrowing events → invalidate borrowing + dashboard caches
  usePusherCacheInvalidator(
    'equipment-borrowings',
    '.BorrowingCreated',
    ['avr_equipment_borrowings_1', 'sysad_equipment_borrowings_1', 'avr_dashboard_stats']
  );

  // 📡 3. Inventory updates → invalidate equipment list + reports cache
  usePusherCacheInvalidator(
    'equipment-inventory',
    '.EquipmentUpdated',
    ['avr_equipment_list', 'avr_reports_1', 'sysad_equipment_borrowings_1']
  );

  // 📡 4. User management events → invalidate user list cache
  usePusherCacheInvalidator(
    'user-management',
    '.UserUpdated',
    ['sysad_users']
  );

  return (
    <div className="flex h-screen bg-[#f3f6fa] overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}

