import api from './client';

// Events endpoints — match the .NET `EventsController` exactly.
// Public: upcoming + by id. Auth required: register, cancel, checkin, mine.
// Manager/Admin only: create, update, delete, by-bank, attendees.
//
// DTOs (C#):
//   BloodDriveEventRequest { BloodBankId, Title, Location, EventDate, Description?, Capacity }
//   BloodDriveEventResponse { Id, BloodBankId, BloodBankName, Title, Location,
//                              EventDate, Description, Capacity, RegisteredCount, CreatedAt }
//   EventAttendanceResponse { EventId, EventTitle, UserId, UserName, Status, RegisteredAt, CheckedInAt }
export const eventsApi = {
  // Public
  upcoming: () => api.get('/api/events/upcoming'),
  get: (id) => api.get(`/api/events/${id}`),

  // Authenticated user
  mine: () => api.get('/api/events/mine'),
  register: (id) => api.post(`/api/events/${id}/register`),
  cancel: (id) => api.post(`/api/events/${id}/cancel`),
  checkIn: (id) => api.post(`/api/events/${id}/checkin`),

  // Manager / Admin
  byBank: (bankId) => api.get(`/api/events/by-bank/${bankId}`),
  attendees: (id) => api.get(`/api/events/${id}/attendees`),
  create: (payload) => api.post('/api/events', payload),
  update: (id, payload) => api.put(`/api/events/${id}`, payload),
  remove: (id) => api.delete(`/api/events/${id}`),
};
