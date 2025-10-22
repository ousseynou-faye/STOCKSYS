import { api } from './apiClient';

export const apiRoles = {
  fetchRoles: () => api.get('/roles'),
  createRole: (body: any) => api.post('/roles', body),
  updateRole: (id: string, body: any) => api.patch(`/roles/${id}`, body),
  deleteRole: (id: string) => api.delete(`/roles/${id}`),
};

