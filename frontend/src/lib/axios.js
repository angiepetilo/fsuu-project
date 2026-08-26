import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// In-flight request deduplication & memory cache for static public endpoints
const memoryCache = new Map();
const inFlightRequests = new Map();

// Endpoints safe to cache for 60 seconds (reduces redundant API roundtrips)
const CACHEABLE_ENDPOINTS = [
  '/public/system-settings',
  '/public/operating-hours',
  '/public/booking-requirements',
  '/public/verification-pin-settings',
  '/public/departments',
  '/public/venue-overrides',
];

export const clearApiCache = () => {
  memoryCache.clear();
};

// Intercept requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('staff_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Wrap api.get with deduplication & caching for cacheable public endpoints
const originalGet = api.get.bind(api);
api.get = function(url, config = {}) {
  const cleanUrl = url.split('?')[0];
  const isCacheable = CACHEABLE_ENDPOINTS.includes(cleanUrl) && !config.bypassCache;

  if (isCacheable) {
    const cacheKey = `${url}_${JSON.stringify(config.params || {})}`;
    const cached = memoryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 60000) {
      return Promise.resolve(cached.response);
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const requestPromise = originalGet(url, config)
      .then((res) => {
        memoryCache.set(cacheKey, { response: res, timestamp: Date.now() });
        inFlightRequests.delete(cacheKey);
        return res;
      })
      .catch((err) => {
        inFlightRequests.delete(cacheKey);
        throw err;
      });

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  return originalGet(url, config);
};

// Response interceptor: auto-clear cache on mutations & handle 401s
api.interceptors.response.use(
  (response) => {
    // If a modifying HTTP method succeeds, invalidate cached GET data immediately
    const method = (response.config?.method || '').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      clearApiCache();
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.message || '';
    const isAdminRoute = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/sysad');

    if (status === 401 || (status === 500 && typeof msg === 'string' && (msg.includes('Unauthenticated') || msg.includes('encryption key')))) {
      if (isAdminRoute) {
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_user');
        clearApiCache();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
