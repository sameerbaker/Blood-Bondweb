import api from './client';

// Events endpoints (match the .NET `EventsController` exactly).
//   GET    /api/events                          (admin: list all)
//   GET    /api/Events/upcoming                 (public: upcoming)
//   GET    /api/events/{id}
//   POST   /api/events                          (Manager/Admin)
//   PUT    /api/events/{id}                     (Manager/Admin)
//   DELETE /api/events/{id}                     (Manager/Admin)
//   GET    /api/events/by-bank/{bankId}         (Manager/Admin)
//   GET    /api/events/mine                     (auth — events I registered for)
//   POST   /api/events/{id}/register            (auth — RSVP)
//   POST   /api/events/{id}/cancel              (auth — cancel RSVP)
//   POST   /api/events/{id}/checkin             (auth — mark attended)
//   GET    /api/events/{id}/attendees           (Manager/Admin)
export const eventsApi = {
  list: () => api.get('/api/events'),
  upcoming: () => api.get('/api/events/upcoming'),
  get: (id) => api.get(`/api/events/${id}`),
  create: (payload) => api.post('/api/events', payload),
  update: (id, payload) => api.put(`/api/events/${id}`, payload),
  remove: (id) => api.delete(`/api/events/${id}`),
  byBank: (bankId) => api.get(`/api/events/by-bank/${bankId}`),
  mine: () => api.get('/api/events/mine'),
  register: (id) => api.post(`/api/events/${id}/register`),
  cancel: (id) => api.post(`/api/events/${id}/cancel`),
  checkIn: (id) => api.post(`/api/events/${id}/checkin`),
  attendees: (id) => api.get(`/api/events/${id}/attendees`),
};
