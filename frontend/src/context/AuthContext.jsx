import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api, { clearApiCache } from "@/lib/axios";
import echoInstance from "@/lib/echo";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Determine if Remember Me was selected for cross-browser-restart persistence
  const isInitiallyRemembered = (() => {
    try {
      return localStorage.getItem("fsuu_remember_me") === "true";
    } catch {
      return false;
    }
  })();

  // If NOT remembered, immediately purge any legacy/leftover staff credentials sitting in localStorage
  if (!isInitiallyRemembered) {
    try {
      localStorage.removeItem("staff_token");
      localStorage.removeItem("staff_user");
    } catch {}
  }

  const [rememberMe, setRememberMe] = useState(isInitiallyRemembered);

  const [token, setToken] = useState(() => {
    try {
      const sessionTok = sessionStorage.getItem("staff_token");
      if (sessionTok) return sessionTok;
      if (isInitiallyRemembered) {
        return localStorage.getItem("staff_token") || null;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const sessionUser = sessionStorage.getItem("staff_user");
      if (sessionUser) return JSON.parse(sessionUser);
      if (isInitiallyRemembered) {
        const localUser = localStorage.getItem("staff_user");
        return localUser ? JSON.parse(localUser) : null;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Track if we are currently validating the token against the backend on boot
  const [isValidating, setIsValidating] = useState(() => {
    const sessionTok = sessionStorage.getItem("staff_token");
    const localTok = isInitiallyRemembered ? localStorage.getItem("staff_token") : null;
    return Boolean(sessionTok || localTok);
  });

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const rememberMeRef = useRef(rememberMe);
  rememberMeRef.current = rememberMe;

  // Keep storage in sync whenever state changes
  useEffect(() => {
    if (token) {
      if (rememberMe) {
        localStorage.setItem("staff_token", token);
        sessionStorage.removeItem("staff_token");
      } else {
        sessionStorage.setItem("staff_token", token);
        localStorage.removeItem("staff_token");
      }
    } else {
      sessionStorage.removeItem("staff_token");
      localStorage.removeItem("staff_token");
    }
  }, [token, rememberMe]);

  useEffect(() => {
    if (user) {
      const serialized = JSON.stringify(user);
      if (rememberMe) {
        localStorage.setItem("staff_user", serialized);
        sessionStorage.removeItem("staff_user");
      } else {
        sessionStorage.setItem("staff_user", serialized);
        localStorage.removeItem("staff_user");
      }
    } else {
      sessionStorage.removeItem("staff_user");
      localStorage.removeItem("staff_user");
    }
  }, [user, rememberMe]);

  // Browser Exit Detection: Send Beacon on tab/window close if not "Remember Me"
  useEffect(() => {
    const handlePageHide = () => {
      const currentTok = tokenRef.current;
      const isRemembered = rememberMeRef.current;

      // If session is NOT configured to persist across browser restarts, revoke token on exit
      if (currentTok && !isRemembered) {
        try {
          const beaconUrl = `${api.defaults.baseURL || '/api'}/auth/logout-beacon`;
          const formData = new FormData();
          formData.append("token", currentTok);
          if (navigator.sendBeacon) {
            navigator.sendBeacon(beaconUrl, formData);
          }
        } catch {}
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  // Cross-tab sync: if another tab logs out, sync immediately
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "staff_token" && !e.newValue) {
        setUser(null);
        setToken(null);
        clearApiCache();
      }
      if (e.key === "fsuu_auth_broadcast" && e.newValue === "logout") {
        setUser(null);
        setToken(null);
        clearApiCache();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Validate active token with backend on boot or token change
  useEffect(() => {
    if (token) {
      setIsValidating(true);
      api.get("/user")
        .then(res => {
          if (res.data) {
            setUser(res.data);
          }
        })
        .catch(err => {
          if (err.response?.status === 401 || err.response?.status === 403) {
            clearAdminCaches();
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => {
          setIsValidating(false);
        });
    } else {
      setUser(null);
      setIsValidating(false);
    }
  }, [token]);

  const clearAdminCaches = () => {
    // Flush in-memory axios cache
    clearApiCache();

    // Leave any active Echo WebSocket channels
    try {
      echoInstance?.leave("admin-notifications");
      echoInstance?.leave("equipment-inventory");
    } catch {}

    // Flush all staff auth session storage cache keys (preserve catalog data)
    const keysToClean = [
      "staff_user",
      "staff_token",
      "fsuu_remember_me",
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
    ];

    keysToClean.forEach(k => {
      try {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      } catch {}
    });

    try {
      sessionStorage.clear();
    } catch {}

    // Broadcast logout to any other open tabs
    try {
      localStorage.setItem("fsuu_auth_broadcast", "logout");
      localStorage.removeItem("fsuu_auth_broadcast");
    } catch {}
  };

  const login = useCallback((userData, tokenValue, shouldRemember = false) => {
    clearAdminCaches();
    setRememberMe(Boolean(shouldRemember));
    if (shouldRemember) {
      localStorage.setItem("fsuu_remember_me", "true");
    } else {
      localStorage.removeItem("fsuu_remember_me");
    }
    setUser(userData);
    setToken(tokenValue);
  }, []);

  const logout = useCallback(async (redirectPath = "/login") => {
    try {
      await api.post("/logout");
    } catch {
      // ignore
    } finally {
      clearAdminCaches();
      setUser(null);
      setToken(null);
      if (redirectPath) {
        window.location.replace(redirectPath);
      }
    }
  }, []);

  const updateAuthUser = useCallback((updatedUserData) => {
    setUser(prev => {
      const next = { ...prev, ...updatedUserData };
      const serialized = JSON.stringify(next);
      if (rememberMeRef.current) {
        localStorage.setItem("staff_user", serialized);
      } else {
        sessionStorage.setItem("staff_user", serialized);
      }
      return next;
    });
  }, []);

  const isAdmin  = user ? ["admin", "head", "super_admin"].includes(user.role) : false;
  const isStaff  = user?.role === "staff";
  const officeId = user?.office_id ?? null;
  const officeType = user?.office?.type ?? null; // 'avr' | 'sco'

  return (
    <AuthContext.Provider value={{ user, token, rememberMe, isValidating, isAdmin, isStaff, officeId, officeType, login, logout, updateAuthUser }}>
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
