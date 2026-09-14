import api from './client';

// Monetary Donations (Stripe) endpoints
//   POST /api/monetarydonations/create-intent
//   GET  /api/monetarydonations/mine
//   GET  /api/monetarydonations/total/mine
//   GET  /api/monetarydonations/by-bank/{bankId}          (existing — manager-only total)
//   GET  /api/monetarydonations/by-bank-detail/{bankId}    (manager — list donations for their bank)
//   POST /api/monetarydonations/confirm                    (webhook / manual approve)
//   GET  /api/monetarydonations/all                         (admin only — needs backend route)
export const monetaryApi = {
  createIntent: (payload) => api.post('/api/monetarydonations/create-intent', payload),
  mine: () => api.get('/api/monetarydonations/mine'),
  myTotal: () => api.get('/api/monetarydonations/total/mine'),
  byBank: (bankId) => api.get(`/api/monetarydonations/by-bank/${bankId}`),
  byBankDetail: (bankId) => api.get(`/api/monetarydonations/by-bank-detail/${bankId}`),
  confirm: (paymentIntentId, status) =>
    api.post('/api/monetarydonations/confirm', null, { params: { paymentIntentId, status } }),
  all: () => api.get('/api/monetarydonations/all'),
};


