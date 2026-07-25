import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';

const memoryCache = {};

/**
 * Stale-While-Revalidate (SWR) React Memory Cache Hook
 * - If cache exists in memory: Returns cached data INSTANTLY (0ms UI latency).
 * - Background revalidation: Silently checks for fresh backend data without flickering loading states.
 */
export function useDataCache(cacheKey, apiEndpoint, options = {}) {
  const { forceRefresh = false, ttl = 600000 } = options; // Default 10 minutes TTL

  const getValidCache = useCallback(() => {
    const item = memoryCache[cacheKey];
    if (item && (Date.now() - item.timestamp < ttl)) {
      return item.data;
    }
    return null;
  }, [cacheKey, ttl]);

  const cachedData = getValidCache();
  const [data, setData] = useState(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (skipCache = false) => {
    if (!apiEndpoint) return;

    const currentCached = getValidCache();
    
    // If valid cache exists and we aren't forcing a fresh fetch:
    if (!skipCache && currentCached) {
      setData(currentCached);
      setLoading(false);
      
      // Perform silent background revalidation without setting loading = true
      try {
        const res = await api.get(apiEndpoint);
        memoryCache[cacheKey] = { data: res.data, timestamp: Date.now() };
        setData(res.data);
      } catch {
        // Keep serving cached data silently if background fetch encounters a network hiccup
      }
      return;
    }

    // Initial fetch when no cache exists
    if (!currentCached) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await api.get(apiEndpoint);
      memoryCache[cacheKey] = { data: res.data, timestamp: Date.now() };
      setData(res.data);
    } catch (err) {
      if (!currentCached) {
        setError(err?.response?.data?.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, apiEndpoint, getValidCache]);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  const refresh = useCallback(() => {
    delete memoryCache[cacheKey];
    return fetchData(true);
  }, [cacheKey, fetchData]);

  const mutate = useCallback((updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      memoryCache[cacheKey] = {
        data: next,
        timestamp: Date.now(),
      };
      return next;
    });
  }, [cacheKey]);

  return { data, loading, error, refresh, mutate };
}

export function clearMemoryCache(key) {
  if (key) {
    delete memoryCache[key];
  } else {
    Object.keys(memoryCache).forEach(k => delete memoryCache[k]);
  }
}
