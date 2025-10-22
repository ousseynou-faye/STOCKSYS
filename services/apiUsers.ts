import { api } from './apiClient';

function qs(params?: Record<string, any>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v!==undefined && v!==null && v!=='') sp.append(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const apiUsers = {
  fetchUsers: (params?: any) => api.get('/users' + qs(params)),
  createUser: (body: any) => api.post('/users', body),
  updateUser: (id: string, body: any) => api.patch(`/users/${id}`, body),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  fetchRoles: () => api.get('/roles'),
};
