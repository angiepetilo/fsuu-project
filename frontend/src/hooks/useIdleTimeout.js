import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";

const STORAGE_LAST_ACTIVITY = "fsuu_last_activity";
const STORAGE_EXTEND_BROADCAST = "fsuu_session_extend_broadcast";

/**
 * Enterprise Idle Timeout Hook
 * Tracks user interaction, cross-tab activity, and tab visibility.
 * Enforces strict inactivity limits and displays a countdown warning modal before auto-logout.
 *
 * @param {Object} options
 * @param {number} options.idleTimeoutMs - Total inactivity time before auto-logout
 * @param {number} options.warningTimeMs - Warning countdown duration before logout (default 60 seconds)
 * @param {boolean} options.enabled - Whether idle tracking is active
 */
export function useIdleTimeout({
  idleTimeoutMs = 30 * 60 * 1000,
  warningTimeMs = 60 * 1000,
  enabled = true,
} = {}) {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.ceil(warningTimeMs / 1000));

  // Refs to avoid dependency cycles and keep timers accurate
  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const isWarningActiveRef = useRef(false);
  const idleTimeoutMsRef = useRef(idleTimeoutMs);
  const warningTimeMsRef = useRef(warningTimeMs);

  // Keep refs synchronized with incoming options
  idleTimeoutMsRef.current = idleTimeoutMs;
  warningTimeMsRef.current = warningTimeMs;

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    isWarningActiveRef.current = false;
  }, []);

  const logoutNow = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    logout();
  }, [clearAllTimers, logout]);

  const triggerWarning = useCallback((initialSeconds) => {
    if (isWarningActiveRef.current) return;
    isWarningActiveRef.current = true;
    setShowWarning(true);

    let timeLeft = typeof initialSeconds === "number" && initialSeconds > 0
      ? initialSeconds
      : Math.ceil(warningTimeMsRef.current / 1000);

    setSecondsRemaining(timeLeft);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setSecondsRemaining(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        isWarningActiveRef.current = false;
        logoutNow();
      }
    }, 1000);
  }, [logoutNow]);

  const scheduleWarning = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (isWarningActiveRef.current) return;

    const now = Date.now();
    let lastActive = lastActivityRef.current;
    try {
      const stored = localStorage.getItem(STORAGE_LAST_ACTIVITY);
      if (stored) {
        const t = parseInt(stored, 10);
        if (!isNaN(t) && t > lastActive) {
          lastActive = t;
          lastActivityRef.current = t;
        }
      }
    } catch {}

    const elapsed = now - lastActive;
    const timeout = idleTimeoutMsRef.current;
    const warning = warningTimeMsRef.current;

    if (elapsed >= timeout) {
      // Inactivity exceeded limit
      logoutNow();
      return;
    }

    if (elapsed >= timeout - warning) {
      // Already in the warning countdown window
      const secsLeft = Math.ceil((timeout - elapsed) / 1000);
      triggerWarning(secsLeft);
      return;
    }

    const delay = timeout - warning - elapsed;
    warningTimerRef.current = setTimeout(() => {
      triggerWarning();
    }, delay);
  }, [logoutNow, triggerWarning]);

  const stayLoggedIn = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    isWarningActiveRef.current = false;
    setShowWarning(false);

    const now = Date.now();
    lastActivityRef.current = now;
    setSecondsRemaining(Math.ceil(warningTimeMsRef.current / 1000));

    try {
      localStorage.setItem(STORAGE_LAST_ACTIVITY, String(now));
      localStorage.setItem(STORAGE_EXTEND_BROADCAST, String(now));
    } catch {}

    // Refresh backend Sanctum token timestamp with timeout protection
    api.get("/user", { timeout: 8000 }).catch(() => {});

    scheduleWarning();
  }, [scheduleWarning]);

  // Main lifecycle: Setup listeners and heartbeat polling
  useEffect(() => {
    if (!enabled || !user) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    // Initialize activity timestamp from localStorage if newer
    try {
      const stored = localStorage.getItem(STORAGE_LAST_ACTIVITY);
      if (stored) {
        const t = parseInt(stored, 10);
        if (!isNaN(t) && t > lastActivityRef.current) {
          lastActivityRef.current = t;
        }
      }
    } catch {}

    scheduleWarning();

    // 1. User activity listener (mouse, keyboard, scroll, touch)
    let lastThrottled = Date.now();
    const handleUserActivity = () => {
      // If the security warning countdown is active, passive movements do NOT dismiss it
      if (isWarningActiveRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastThrottled > 2000) {
        lastThrottled = now;

        // Security check: if elapsed time already exceeded timeout, log out immediately
        const elapsedSinceLast = now - lastActivityRef.current;
        if (elapsedSinceLast >= idleTimeoutMsRef.current) {
          logoutNow();
          return;
        }

        lastActivityRef.current = now;
        try {
          localStorage.setItem(STORAGE_LAST_ACTIVITY, String(now));
        } catch {}

        scheduleWarning();
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "wheel"];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // 2. Cross-tab activity synchronization via storage events
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_LAST_ACTIVITY && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime) && remoteTime > lastActivityRef.current) {
          lastActivityRef.current = remoteTime;
          if (isWarningActiveRef.current) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            isWarningActiveRef.current = false;
            setShowWarning(false);
          }
          scheduleWarning();
        }
      } else if (e.key === STORAGE_EXTEND_BROADCAST && e.newValue) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        isWarningActiveRef.current = false;
        setShowWarning(false);
        lastActivityRef.current = Date.now();
        scheduleWarning();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // 3. Tab visibility / Window focus / Online reconnection
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        scheduleWarning();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("online", handleVisibilityOrFocus);

    // 4. Liveness heartbeat (every 10 seconds) - handles sleep/wake, tab throttling & elapsed time checks
    const heartbeatInterval = setInterval(() => {
      if (!isWarningActiveRef.current) {
        const now = Date.now();
        let lastActive = lastActivityRef.current;
        try {
          const stored = localStorage.getItem(STORAGE_LAST_ACTIVITY);
          if (stored) {
            const t = parseInt(stored, 10);
            if (!isNaN(t) && t > lastActive) {
              lastActive = t;
              lastActivityRef.current = t;
            }
          }
        } catch {}

        const elapsed = now - lastActive;
        const timeout = idleTimeoutMsRef.current;
        const warning = warningTimeMsRef.current;

        if (elapsed >= timeout) {
          clearInterval(heartbeatInterval);
          logoutNow();
        } else if (elapsed >= timeout - warning) {
          const secsLeft = Math.ceil((timeout - elapsed) / 1000);
          triggerWarning(secsLeft);
        }
      }
    }, 10000);

    return () => {
      clearAllTimers();
      clearInterval(heartbeatInterval);
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("online", handleVisibilityOrFocus);
    };
  }, [enabled, user?.id, scheduleWarning, logoutNow, triggerWarning, clearAllTimers]);

  return {
    showWarning,
    secondsRemaining,
    stayLoggedIn,
    logoutNow,
  };
}
