import { api } from './apiClient';

export const apiStores = {
  fetchStores: () => api.get('/stores'),
  createStore: (body: any) => api.post('/stores', body),
  updateStore: (id: string, body: any) => api.patch(`/stores/${id}`, body),
  deleteStore: (id: string) => api.delete(`/stores/${id}`),
};

