import axios from 'axios';
import { API_BASE_URL, TOKEN_KEY, USER_KEY } from '../config';

// Single axios instance for the whole app.
// - Always sends JSON
// - Injects Bearer token if present
// - On 401 → clears stored auth and redirects to /login
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Avoid redirect loops if we're already on auth pages
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register') && !path.startsWith('/forgot')) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
