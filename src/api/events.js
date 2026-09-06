import api from './client';

// Events endpoints — wire these up on the backend as soon as they're ready.
// The frontend is already wired to call these shapes; if a 404 is returned
// the page shows an "API not available yet" state instead of crashing.
export const eventsApi = {
  list: () => api.get('/api/events'),
  upcoming: () => api.get('/api/events/upcoming'),
  get: (id) => api.get(`/api/events/${id}`),
  create: (payload) => api.post('/api/events', payload),
  update: (id, payload) => api.put(`/api/events/${id}`, payload),
  remove: (id) => api.delete(`/api/events/${id}`),
  rsvp: (id) => api.post(`/api/events/${id}/rsvp`),
  cancelRsvp: (id) => api.delete(`/api/events/${id}/rsvp`),
  attendees: (id) => api.get(`/api/events/${id}/attendees`),
};
