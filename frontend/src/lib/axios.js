import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
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

  // If sending FormData, we must delete Content-Type to allow the browser to auto-set the boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Auto-clear token on 401 so the UI never gets stuck with a stale token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('staff_token');
      localStorage.removeItem('staff_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
