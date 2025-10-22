import { api } from './apiClient';

function qs(params?: Record<string, any>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v!==undefined && v!==null && v!=='') sp.append(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const apiStock = {
  fetchStock: (params?: any) => api.get('/stock' + qs(params)),
  adjust: (variationId: string, storeId: string, newQuantity: number) => api.patch('/stock/adjust', { variationId, storeId, newQuantity }),
  transfer: (fromStoreId: string, toStoreId: string, items: { variationId: string; quantity: number }[]) => api.post('/stock/transfers', { fromStoreId, toStoreId, items }),
};
