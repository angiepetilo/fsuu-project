import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";

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

  const login = useCallback((userData, tokenValue) => {
    localStorage.removeItem("fsuu_admin_profile");
    setUser(userData);
    setToken(tokenValue);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("fsuu_admin_profile");
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
