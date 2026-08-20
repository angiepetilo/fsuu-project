import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // adjust this if your backend runs on a different port
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // For Sanctum CSRF cookies if we use them later
});

export default api;
