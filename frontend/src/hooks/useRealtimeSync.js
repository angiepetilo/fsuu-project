import { useEffect, useRef } from "react";

/**
 * useRealtimeSync - Unified real-time polling and window event synchronization hook.
 * 
 * @param {Function} fetchCallback - Function to call to refresh data
 * @param {Object} options - Configuration options
 * @param {number} [options.interval=10000] - Polling interval in ms (default: 10s)
 * @param {boolean} [options.enabled=true] - Whether synchronization is active
 * @param {string[]} [options.customEvents=["equipment_inventory_updated"]] - Window events that trigger sync
 * @param {Array} [options.deps=[]] - Extra dependencies to re-trigger initial fetch
 */
export function useRealtimeSync(fetchCallback, options = {}) {
  const {
    interval = 30000,
    enabled = true,
    customEvents = ["equipment_inventory_updated"],
    deps = [],
  } = options;

  const callbackRef = useRef(fetchCallback);
  callbackRef.current = fetchCallback;

  const lastFetchTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const executeFetch = () => {
      lastFetchTimeRef.current = Date.now();
      callbackRef.current?.();
    };

    // Trigger initial fetch
    executeFetch();

    // Recurring timer — pause when tab is hidden
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      executeFetch();
    }, interval);

    // Event handler for window focus and custom events with a cooldown to prevent spam
    const handleSyncEvent = (evt) => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      
      const now = Date.now();
      // For focus and visibilitychange, require at least 25 seconds cooldown since last fetch
      if (evt?.type === "focus" || evt?.type === "visibilitychange") {
        if (now - lastFetchTimeRef.current < 25000) return;
      }
      
      executeFetch();
    };

    window.addEventListener("focus", handleSyncEvent);
    window.addEventListener("visibilitychange", handleSyncEvent);

    customEvents.forEach((evtName) => {
      window.addEventListener(evtName, handleSyncEvent);
    });

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", handleSyncEvent);
      window.removeEventListener("visibilitychange", handleSyncEvent);
      customEvents.forEach((evtName) => {
        window.removeEventListener(evtName, handleSyncEvent);
      });
    };
  }, [enabled, interval, ...deps]);
}

export default useRealtimeSync;
