import api from './client';

// Badges & Gamification endpoints
//   GET /api/badges
//   GET /api/badges/mine
//   GET /api/badges/me/rank
//   GET /api/badges/leaderboard?top=10
export const badgesApi = {
  list: () => api.get('/api/badges'),
  mine: () => api.get('/api/badges/mine'),
  myRank: () => api.get('/api/badges/me/rank'),
  leaderboard: (top = 10) => api.get('/api/badges/leaderboard', { params: { top } }),
};
