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
  '/public/verification-pin-settings',
  '/public/departments',
  '/public/venue-overrides',
];

export const clearApiCache = () => {
  memoryCache.clear();
};

// Intercept requests
api.interceptors.request.use((config) => {
  const isRemembered = localStorage.getItem('fsuu_remember_me') === 'true';
  const token = sessionStorage.getItem('staff_token') || (isRemembered ? localStorage.getItem('staff_token') : null);
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

// Clean, human-friendly error message translator
function humanizeErrorMessage(error) {
  const status = error.response?.status;
  const rawMsg = error.response?.data?.message || error.response?.data?.error || '';
  const str = String(rawMsg).toLowerCase();

  // 1. Upload size limits (PHP PostTooLargeException / 413)
  if (status === 413 || str.includes('too large') || str.includes('post data') || str.includes('max_filesize')) {
    return 'The uploaded image or file is too large. Please select a photo or file under 10MB.';
  }

  // 2. Database & SQL errors (SQLSTATE, PDOException, QueryException)
  if (str.includes('sqlstate') || str.includes('syntax error') || str.includes('queryexception') || str.includes('integrity constraint') || str.includes('foreign key constraint')) {
    return 'A database error occurred while processing your request. Please refresh the page and try again.';
  }

  // 3. Network & Connection errors
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  // 4. Rate Limiting (429)
  if (status === 429) {
    return rawMsg || 'Too many requests. Please wait a moment before trying again.';
  }

  // 5. Gateway & Server downtime (502, 503, 504)
  if (status === 502 || status === 503 || status === 504) {
    return 'The server is temporarily unavailable or restarting. Please wait a moment and try again.';
  }

  // 6. Generic 500 Server error with code traces
  if (status >= 500 && (str.includes('exception') || str.includes('stack trace') || str.includes('.php') || str.includes('call to undefined'))) {
    return 'An unexpected server error occurred. Please try again or contact system support.';
  }

  return rawMsg;
}

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
    const isAdminRoute = window.location.pathname.startsWith('/general') || window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/sysad');

    if (status === 401 || (status === 500 && typeof msg === 'string' && (msg.includes('Unauthenticated') || msg.includes('encryption key')))) {
      localStorage.removeItem('staff_token');
      localStorage.removeItem('staff_user');
      sessionStorage.removeItem('staff_token');
      sessionStorage.removeItem('staff_user');
      clearApiCache();
      if (isAdminRoute) {
        window.location.href = '/login';
      }
    }

    // Automatically translate technical errors into human-readable messages across all pages & modals
    if (error.response?.data) {
      const friendly = humanizeErrorMessage(error);
      if (friendly) {
        error.response.data.message = friendly;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
