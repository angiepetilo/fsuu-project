import { useEffect, useRef } from "react";

/**
 * useRealtimeSync - Unified silent real-time polling and window event synchronization hook.
 * 
 * @param {Function} fetchCallback - Function to call to refresh data (receives isSilent boolean)
 * @param {Object} options - Configuration options
 * @param {number} [options.interval=30000] - Polling interval in ms (default: 30s)
 * @param {boolean} [options.enabled=true] - Whether synchronization is active
 * @param {boolean} [options.initialSilent=false] - Whether initial fetch on mount should be silent
 * @param {string[]} [options.customEvents=["equipment_inventory_updated"]] - Window events that trigger sync
 * @param {Array} [options.deps=[]] - Extra dependencies to re-trigger initial fetch
 */
export function useRealtimeSync(fetchCallback, options = {}) {
  const {
    interval = 30000,
    enabled = true,
    initialSilent = false,
    customEvents = ["equipment_inventory_updated"],
    deps = [],
  } = options;

  const callbackRef = useRef(fetchCallback);
  callbackRef.current = fetchCallback;

  const lastFetchTimeRef = useRef(0);
  const isFetchingRef = useRef(false);
  const eventsKey = JSON.stringify(customEvents);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    const executeFetch = async (isSilent = false) => {
      if (!isMounted) return;
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;
      lastFetchTimeRef.current = Date.now();
      try {
        await callbackRef.current?.(isSilent);
      } catch (err) {
        // Suppress unhandled errors during background sync
      } finally {
        if (isMounted) {
          isFetchingRef.current = false;
        }
      }
    };

    // Trigger initial fetch
    executeFetch(initialSilent);

    // Recurring timer — pause when tab is hidden, run silently
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      executeFetch(true);
    }, interval);

    // Event handler for window focus and custom events with cooldown
    const handleSyncEvent = (evt) => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      
      const now = Date.now();
      // For focus and visibilitychange, require at least 25 seconds cooldown since last fetch
      if (evt?.type === "focus" || evt?.type === "visibilitychange") {
        if (now - lastFetchTimeRef.current < 25000) return;
      }
      
      executeFetch(true);
    };

    window.addEventListener("focus", handleSyncEvent);
    window.addEventListener("visibilitychange", handleSyncEvent);

    const parsedEvents = (() => {
      try { return JSON.parse(eventsKey); } catch { return ["equipment_inventory_updated"]; }
    })();

    parsedEvents.forEach((evtName) => {
      window.addEventListener(evtName, handleSyncEvent);
    });

    return () => {
      isMounted = false;
      clearInterval(timer);
      window.removeEventListener("focus", handleSyncEvent);
      window.removeEventListener("visibilitychange", handleSyncEvent);
      parsedEvents.forEach((evtName) => {
        window.removeEventListener(evtName, handleSyncEvent);
      });
    };
  }, [enabled, interval, eventsKey, initialSilent, ...deps]);
}

export default useRealtimeSync;
