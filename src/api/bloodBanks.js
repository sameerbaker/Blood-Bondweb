import api from './client';

// Blood Banks & Inventory endpoints
//   GET    /api/bloodbanks
//   GET    /api/bloodbanks/verified
//   GET    /api/bloodbanks/{id}
//   GET    /api/bloodbanks/low-stock
//   POST   /api/bloodbanks                  (create)
//   GET    /api/bloodbanks/mine             (manager's own bank)
//   PUT    /api/bloodbanks/{id}             (update)
//   PUT    /api/bloodbanks/{id}/inventory   (replace inventory)
//   PATCH  /api/bloodbanks/{id}/approve     (admin)
//   PATCH  /api/bloodbanks/{id}/reject      (admin)
export const bloodBanksApi = {
  list: () => api.get('/api/bloodbanks'),
  listVerified: () => api.get('/api/bloodbanks/verified'),
  get: (id) => api.get(`/api/bloodbanks/${id}`),
  lowStock: () => api.get('/api/bloodbanks/low-stock'),
  mine: () => api.get('/api/bloodbanks/mine'),
  create: (payload) => api.post('/api/bloodbanks', payload),
  update: (id, payload) => api.put(`/api/bloodbanks/${id}`, payload),
  setInventory: (id, payload) => api.put(`/api/bloodbanks/${id}/inventory`, payload),
  approve: (id) => api.patch(`/api/bloodbanks/${id}/approve`),
  reject: (id) => api.patch(`/api/bloodbanks/${id}/reject`),
};
