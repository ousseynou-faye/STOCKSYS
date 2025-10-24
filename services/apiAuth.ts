import { api } from './apiClient';

export const apiAuth = {
  profile: () => api.get('/auth/profile'),
  changePassword: (currentPass: string, newPass: string) =>
    api.put('/auth/change-password', { currentPass, newPass }),
};

