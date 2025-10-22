import { api } from './apiClient';

export const apiSettings = {
  getCompany: () => api.get('/settings/company'),
  updateCompany: (body: any) => api.put('/settings/company', body),
  getApp: () => api.get('/settings/app'),
  updateApp: (body: any) => api.put('/settings/app', body),
};

