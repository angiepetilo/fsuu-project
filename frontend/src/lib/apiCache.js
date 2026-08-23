/**
 * Lightweight in-memory TTL cache for frontend API queries.
 * Prevents duplicate simultaneous requests and avoids re-querying
 * static lookups (e.g., equipment types, venue catalog, system settings)
 * on every tab navigation.
 */

const cacheStore = new Map();
const inFlightPromises = new Map();

export async function fetchWithCache(key, fetcher, ttlMs = 3 * 60 * 1000) {
  const now = Date.now();

  // 1. Return fresh cached item if valid
  if (cacheStore.has(key)) {
    const item = cacheStore.get(key);
    if (now - item.timestamp < item.ttl) {
      return item.data;
    }
    cacheStore.delete(key);
  }

  // 2. If identical request is already in-flight, return the existing promise (deduplication)
  if (inFlightPromises.has(key)) {
    return inFlightPromises.get(key);
  }

  // 3. Execute fetcher and store result
  const promise = (async () => {
    try {
      const data = await fetcher();
      cacheStore.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
      return data;
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, promise);
  return promise;
}

export function invalidateCache(keyPrefix = null) {
  if (!keyPrefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      cacheStore.delete(key);
    }
  }
}
