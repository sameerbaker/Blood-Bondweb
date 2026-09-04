import api from './client';

// Monetary Donations (Stripe) endpoints
//   POST /api/monetarydonations/create-intent
//   GET  /api/monetarydonations/mine
//   GET  /api/monetarydonations/total/mine
//   GET  /api/monetarydonations/by-bank/{bankId}
export const monetaryApi = {
  createIntent: (payload) => api.post('/api/monetarydonations/create-intent', payload),
  mine: () => api.get('/api/monetarydonations/mine'),
  myTotal: () => api.get('/api/monetarydonations/total/mine'),
  byBank: (bankId) => api.get(`/api/monetarydonations/by-bank/${bankId}`),
};
