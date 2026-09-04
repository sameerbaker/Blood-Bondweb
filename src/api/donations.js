import api from './client';

// Donations & Eligibility endpoints
//   POST   /api/eligibility                  (run check)
//   GET    /api/eligibility/latest
//   POST   /api/donations                    (schedule)
//   GET    /api/donations/mine
//   GET    /api/donations/by-bank/{bankId}
//   PATCH  /api/donations/{id}/approve       (manager)
//   PATCH  /api/donations/{id}/complete      (manager)
export const donationsApi = {
  checkEligibility: (payload) => api.post('/api/eligibility', payload),
  latestEligibility: () => api.get('/api/eligibility/latest'),
  schedule: (payload) => api.post('/api/donations', payload),
  mine: () => api.get('/api/donations/mine'),
  byBank: (bankId) => api.get(`/api/donations/by-bank/${bankId}`),
  approve: (id) => api.patch(`/api/donations/${id}/approve`),
  complete: (id, payload) => api.patch(`/api/donations/${id}/complete`, payload),
};
