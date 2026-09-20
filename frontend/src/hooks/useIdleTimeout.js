import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";

/**
 * Enterprise Idle Timeout Hook
 * Tracks user interaction (mouse, keyboard, touch, scroll) and tab visibility.
 * Displays a warning modal before auto-logout.
 *
 * @param {Object} options
 * @param {number} options.idleTimeoutMs - Total inactivity time before auto-logout (default 30 mins)
 * @param {number} options.warningTimeMs - Warning duration before logout (default 60 seconds)
 * @param {boolean} options.enabled - Whether idle tracking is active
 */
export function useIdleTimeout({
  idleTimeoutMs = 30 * 60 * 1000, // 30 minutes default
  warningTimeMs = 60 * 1000,      // 60 seconds countdown
  enabled = true,
} = {}) {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.ceil(warningTimeMs / 1000));

  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const logoutTimerRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  }, []);

  const stayLoggedIn = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();
    setSecondsRemaining(Math.ceil(warningTimeMs / 1000));

    // Ping backend to refresh Sanctum token last_used_at timestamp
    api.get("/user").catch(() => {});

    // Restart the main idle timer
    startIdleCycle();
  }, [warningTimeMs, clearAllTimers]);

  const logoutNow = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    logout();
  }, [clearAllTimers, logout]);

  const triggerWarning = useCallback(() => {
    setShowWarning(true);
    let timeLeft = Math.ceil(warningTimeMs / 1000);
    setSecondsRemaining(timeLeft);

    countdownIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setSecondsRemaining(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
        logoutNow();
      }
    }, 1000);
  }, [warningTimeMs, logoutNow]);

  const startIdleCycle = useCallback(() => {
    clearAllTimers();
    if (!enabled || !user) return;

    const timeUntilWarning = Math.max(0, idleTimeoutMs - warningTimeMs);

    warningTimerRef.current = setTimeout(() => {
      triggerWarning();
    }, timeUntilWarning);
  }, [enabled, user, idleTimeoutMs, warningTimeMs, clearAllTimers, triggerWarning]);

  // Setup Activity Listeners
  useEffect(() => {
    if (!enabled || !user) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    startIdleCycle();

    let lastThrottled = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle activity checks to once every 1.5 seconds
      if (now - lastThrottled > 1500) {
        lastThrottled = now;
        lastActivityRef.current = now;

        // Active interaction automatically cancels any warning and extends the session
        if (showWarning) {
          stayLoggedIn();
        } else {
          startIdleCycle();
        }
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "wheel"];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Detect when tab/window visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= idleTimeoutMs) {
          // Exceeded full timeout while in background: present warning modal with grace period
          triggerWarning();
        } else if (elapsed >= idleTimeoutMs - warningTimeMs) {
          triggerWarning();
        } else {
          startIdleCycle();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearAllTimers();
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, user, idleTimeoutMs, warningTimeMs, showWarning, startIdleCycle, clearAllTimers, logoutNow, triggerWarning]);

  return {
    showWarning,
    secondsRemaining,
    stayLoggedIn,
    logoutNow,
  };
}
