import { api } from './apiClient';

export const apiInventory = {
  fetchSessions: () => api.get('/inventory-sessions'),
  startSession: (storeId: string) => api.post('/inventory-sessions', { storeId }),
  updateCounts: (id: string, items: { variationId: string; countedQuantity: number }[], finalize?: boolean) => api.patch(`/inventory-sessions/${id}/items`, { items, finalize }),
  confirm: (id: string) => api.post(`/inventory-sessions/${id}/confirm`),
};

