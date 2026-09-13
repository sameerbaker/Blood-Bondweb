import api from './client';

// Monetary Donations (Stripe) endpoints
//   POST /api/monetarydonations/create-intent
//   GET  /api/monetarydonations/mine
//   GET  /api/monetarydonations/total/mine
//   GET  /api/monetarydonations/by-bank/{bankId}
//   POST /api/monetarydonations/confirm                  (webhook/manual)
//   GET  /api/monetarydonations/all                       (admin only — needs backend route)
export const monetaryApi = {
  createIntent: (payload) => api.post('/api/monetarydonations/create-intent', payload),
  mine: () => api.get('/api/monetarydonations/mine'),
  myTotal: () => api.get('/api/monetarydonations/total/mine'),
  byBank: (bankId) => api.get(`/api/monetarydonations/by-bank/${bankId}`),
  confirm: (paymentIntentId, status) =>
    api.post('/api/monetarydonations/confirm', null, { params: { paymentIntentId, status } }),
  // Admin only — needs `GET /api/monetarydonations/all` route on the backend.
  // If not yet deployed, this will return 404/403 and the page will show a notice.
  all: () => api.get('/api/monetarydonations/all'),
};


