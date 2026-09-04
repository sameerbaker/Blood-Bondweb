// Centralized config — read from Vite env at build time.
// Vite injects only variables prefixed with VITE_.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://blood-bond.runasp.net';

// Storage keys
export const TOKEN_KEY = 'bb_token';
export const USER_KEY = 'bb_user';
