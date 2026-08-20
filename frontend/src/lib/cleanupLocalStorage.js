/**
 * Purges legacy mock data keys and stale cache items from localStorage
 * so that all components fetch real data directly from backend database APIs.
 */
export function cleanupLocalStorage() {
  try {
    const keysToRemove = [
      "fsuu_cache_public_venues",
      "fsuu_cache_public_equipment",
      "fsuu_cache_admin_dashboard",
      "fsuu_venue_availability",
      "fsuu_venue_bookings",
      "fsuu_equipment_borrowings",
      "fsuu_equipment_inventory",
      "fsuu_equipment_types",
      "fsuu_history_venue_bookings",
      "fsuu_history_equipment_borrowings",
      "fsuu_damaged_equipment_log",
      "fsuu_breaches_log",
      "fsuu_venue_overrides",
      "fsuu_venue_maintenance",
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Also remove any key starting with fsuu_assigned_units_
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("fsuu_assigned_units_")) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn("Could not clean up localStorage keys:", e);
  }
}
