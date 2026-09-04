import api from './client';

// Ratings & Reviews endpoints
//   POST /api/ratings                  (add a rating)
//   GET  /api/ratings/by-bank/{bankId}
//   GET  /api/ratings/mine/{bankId}
//   GET  /api/ratings/stats/{bankId}
export const ratingsApi = {
  add: (payload) => api.post('/api/ratings', payload),
  byBank: (bankId) => api.get(`/api/ratings/by-bank/${bankId}`),
  mine: (bankId) => api.get(`/api/ratings/mine/${bankId}`),
  stats: (bankId) => api.get(`/api/ratings/stats/${bankId}`),
};
