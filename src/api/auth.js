import api from './client';

// Auth & Account endpoints — match the Postman collection exactly.
//   POST /api/Account/Register
//   POST /api/Account/login
//   POST /api/Account/forgot-password
//   POST /api/Account/reset-password
//   GET  /api/Account/me
export const authApi = {
  register: (payload) => api.post('/api/Account/Register', payload),
  login: (payload) => api.post('/api/Account/login', payload),
  forgotPassword: (email) => api.post('/api/Account/forgot-password', { email }),
  resetPassword: (payload) => api.post('/api/Account/reset-password', payload),
  me: () => api.get('/api/Account/me'),
};
