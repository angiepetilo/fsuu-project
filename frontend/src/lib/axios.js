import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

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

// Auto-clear token on 401 or invalid session so the UI never gets stuck
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.message || '';
    if (status === 401 || (status === 500 && typeof msg === 'string' && (msg.includes('Unauthenticated') || msg.includes('encryption key')))) {
      localStorage.removeItem('staff_token');
      localStorage.removeItem('staff_user');
      if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/activate')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
