import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * useKioskGuard
 * Protects public kiosk and walk-in reservation terminals by:
 * 1. Disabling context menu (Right Click -> Inspect / View Page Source)
 * 2. Blocking developer shortcut keys (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
 * 3. Preventing accidental webpage save or browser shortcut conflicts on public touchscreens & keyboards.
 *
 * Runs automatically on public kiosk routes (/book-venue, /borrow-equipment, /track, /)
 * to maintain a secure, locked-down terminal environment for university filers.
 */
export function useKioskGuard() {
  const location = useLocation();

  useEffect(() => {
    // Only guard public kiosk pages (do not interfere with authenticated staff dashboards)
    const publicKioskPaths = [
      "/",
      "/book-venue",
      "/borrow-equipment",
      "/track",
      "/track-booking",
    ];

    const isPublicKiosk = publicKioskPaths.some(p =>
      p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)
    );

    if (!isPublicKiosk) return;

    const handleContextMenu = (e) => {
      // Prevent Right-Click -> Inspect on public kiosk screens
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = (e.key || "").toLowerCase();

      // Block F12 (DevTools toggle)
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl+Shift+I / Cmd+Option+I (Inspect)
      // Block Ctrl+Shift+J / Cmd+Option+J (Console)
      // Block Ctrl+Shift+C / Cmd+Option+C (Element Inspector)
      if (isCtrlOrMeta && e.shiftKey && (key === "i" || key === "j" || key === "c")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl+U / Cmd+Option+U (View Page Source)
      if (isCtrlOrMeta && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl+S (Save webpage to disk)
      if (isCtrlOrMeta && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [location.pathname]);
}

