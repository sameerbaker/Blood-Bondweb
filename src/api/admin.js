import api from './client';

// Admin endpoints
//   POST   /api/admin/register-first
//   POST   /api/admin/create
//   POST   /api/admin/change-password
//   GET    /api/admin/users
//   GET    /api/admin/users/{id}
//   PATCH  /api/admin/users/{id}/block
//   PATCH  /api/admin/users/{id}/unblock
//   PATCH  /api/admin/users/{id}/role
//   GET    /api/admin/analytics
export const adminApi = {
  registerFirst: (payload) => api.post('/api/admin/register-first', payload),
  create: (payload) => api.post('/api/admin/create', payload),
  changePassword: (payload) => api.post('/api/admin/change-password', payload),
  users: () => api.get('/api/admin/users'),
  user: (id) => api.get(`/api/admin/users/${id}`),
  block: (id) => api.patch(`/api/admin/users/${id}/block`),
  unblock: (id) => api.patch(`/api/admin/users/${id}/unblock`),
  setRole: (id, role) => api.patch(`/api/admin/users/${id}/role`, { role }),
  analytics: () => api.get('/api/admin/analytics'),
};
