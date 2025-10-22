import { api } from './apiClient';
import { fromApiPurchaseOrderStatus, toApiPurchaseOrderStatus } from './apiMappers';

export const apiPurchases = {
  fetchPOs: async () => {
    const res: any = await api.get('/purchase-orders');
    if (Array.isArray(res)) {
      return res.map((po: any) => ({ ...po, status: fromApiPurchaseOrderStatus(po.status) }));
    }
    if (res && Array.isArray(res.data)) {
      return { ...res, data: res.data.map((po: any) => ({ ...po, status: fromApiPurchaseOrderStatus(po.status) })) };
    }
    return res;
  },
  createPO: (body: any) => api.post('/purchase-orders', body?.status ? { ...body, status: toApiPurchaseOrderStatus(body.status) } : body),
  updatePO: (id: string, body: any) => api.put(`/purchase-orders/${id}`, body?.status ? { ...body, status: toApiPurchaseOrderStatus(body.status) } : body),
  receivePO: (id: string, items: { variationId: string; quantity: number }[]) => api.post(`/purchase-orders/${id}/receive`, { items }),
};
