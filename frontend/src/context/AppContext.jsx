import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';

const AppContext = createContext();

export function AppProvider({ children }) {
  // 1. Instant hydration from localStorage (0ms delay!)
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); }
    catch { return null; }
  });

  const [bootstrapData, setBootstrapData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_bootstrap') || 'null'); }
    catch { return null; }
  });

  const [loading, setLoading] = useState(!bootstrapData);

  const fetchBootstrap = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    const endpoint = token ? '/bootstrap' : '/bootstrap/public';
    try {
      const res = await api.get(endpoint);
      setBootstrapData(res.data);
      if (res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('auth_user', JSON.stringify(res.data.user));
      }
      localStorage.setItem('app_bootstrap', JSON.stringify(res.data));
    } catch {
      // Keep cached bootstrap data if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
  }, [fetchBootstrap]);

  const value = {
    user,
    setUser,
    offices: bootstrapData?.offices || [],
    venues: bootstrapData?.venues || [],
    equipmentTypes: bootstrapData?.equipment_types || [],
    loading,
    refreshBootstrap: fetchBootstrap,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
