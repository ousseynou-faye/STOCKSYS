import { api } from './apiClient';

export const apiNotifications = {
  fetch: () => api.get('/notifications'),
  markAllRead: () => api.post('/notifications/mark-all-read'),
};

