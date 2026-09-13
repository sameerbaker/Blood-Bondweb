import api from './client';

// Blood Requests & Matching endpoints
//   POST   /api/bloodrequests               (create)
//   GET    /api/bloodrequests/mine          (my requests)
//   GET    /api/bloodrequests/active?city=  (active by city)
//   GET    /api/bloodrequests/by-bank/{bankId}  (manager view — needs backend route)
//   GET    /api/bloodrequests/{id}
//   PATCH  /api/bloodrequests/{id}/cancel
//   PATCH  /api/bloodrequests/{id}/fulfill
//   POST   /api/bloodrequests/{id}/notify
export const bloodRequestsApi = {
  create: (payload) => api.post('/api/bloodrequests', payload),
  mine: () => api.get('/api/bloodrequests/mine'),
  activeByCity: (city) => api.get('/api/bloodrequests/active', { params: { city } }),
  // Manager / admin view — requests in the bank's city
  byBank: (bankId) => api.get(`/api/bloodrequests/by-bank/${bankId}`),
  get: (id) => api.get(`/api/bloodrequests/${id}`),
  cancel: (id) => api.patch(`/api/bloodrequests/${id}/cancel`),
  fulfill: (id) => api.patch(`/api/bloodrequests/${id}/fulfill`),
  notify: (id) => api.post(`/api/bloodrequests/${id}/notify`),
};
