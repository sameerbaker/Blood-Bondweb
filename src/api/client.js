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

// RFC 4122 v4 UUID. The browser's crypto.randomUUID is the right tool;
// we add a small fallback for older runtimes / test environments.
function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Generate a fresh idempotency key for one logical user action
// (donation, monetary donation, blood request, etc.). The backend uses
// (userId, idempotencyKey) as a uniqueness check so an accidental
// double-click or a slow-network retry can never produce a duplicate
// charge or appointment.
export function getFreshIdempotencyKey(prefix = 'bb') {
  return `${prefix}_${uuidv4()}`;
}

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
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register') && !path.startsWith('/forgot')) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
