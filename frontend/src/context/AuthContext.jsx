import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { clearApiCache } from "@/lib/axios";
import echoInstance from "@/lib/echo";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("staff_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("staff_token"));

  // Keep localStorage in sync whenever state changes
  useEffect(() => {
    if (token) localStorage.setItem("staff_token", token);
    else localStorage.removeItem("staff_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("staff_user", JSON.stringify(user));
    else localStorage.removeItem("staff_user");
  }, [user]);

  // Cross-tab sync: if another tab logs out, sync immediately
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "staff_token" && !e.newValue) {
        setUser(null);
        setToken(null);
        clearApiCache();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (token && !user) {
      api.get("/user").then(res => {
        if (res.data) {
          setUser(res.data);
        }
      }).catch(err => {
        if (err.response?.status === 401) {
          clearAdminCaches();
          setUser(null);
          setToken(null);
        }
      });
    }
  }, [token, user]);

  const clearAdminCaches = () => {
    // Flush in-memory axios cache
    clearApiCache();

    // Leave any active Echo WebSocket channels
    try {
      echoInstance?.leave("admin-notifications");
      echoInstance?.leave("equipment-inventory");
    } catch {}

    // Flush all staff auth session localStorage cache keys (preserve catalog data)
    const keysToClean = [
      "staff_user",
      "staff_token",
      "fsuu_admin_profile",
      "fsuu_sysad_profile",
      "fsuu_venue_availability",
      "fsuu_cache_admin_venue_bookings",
      "fsuu_cache_admin_equipment_borrowings",
      "fsuu_cache_admin_dashboard",
      "fsuu_cache_sysad_users",
      "fsuu_cache_sysad_offices",
      "fsuu_venue_overrides",
      "fsuu_venue_maintenance",
      "fsuu_read_notification_ids",
      "fsuu_read_sysad_notification_ids",
    ];
    keysToClean.forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });

    try {
      sessionStorage.clear();
    } catch {}
  };

  const login = useCallback((userData, tokenValue) => {
    clearAdminCaches();
    setUser(userData);
    setToken(tokenValue);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } catch {
      // ignore
    } finally {
      clearAdminCaches();
      setUser(null);
      setToken(null);
    }
  }, []);

  const updateAuthUser = useCallback((updatedUserData) => {
    setUser(prev => {
      const next = { ...prev, ...updatedUserData };
      localStorage.setItem("staff_user", JSON.stringify(next));
      return next;
    });
  }, []);

  const isAdmin  = user ? ["admin", "head", "super_admin"].includes(user.role) : false;
  const isStaff  = user?.role === "staff";
  const officeId = user?.office_id ?? null;
  const officeType = user?.office?.type ?? null; // 'avr' | 'sco'

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, isStaff, officeId, officeType, login, logout, updateAuthUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
