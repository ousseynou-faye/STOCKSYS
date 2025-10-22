import { api } from './apiClient';

function qs(params?: Record<string, any>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v!==undefined && v!==null && v!=='') sp.append(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const apiSuppliers = {
  fetchSuppliers: (params?: any) => api.get('/suppliers' + qs(params)),
  createSupplier: (body: any) => api.post('/suppliers', body),
  updateSupplier: (id: string, body: any) => api.patch(`/suppliers/${id}`, body),
  deleteSupplier: (id: string) => api.delete(`/suppliers/${id}`),
  fetchSupplierProducts: (supplierId: string, params?: any) => api.get(`/suppliers/${supplierId}/products` + qs(params)),
  addProduct: (supplierId: string, body: any) => api.post(`/suppliers/${supplierId}/products`, body),
  removeProduct: (supplierId: string, variationId: string) => api.delete(`/suppliers/${supplierId}/products/${variationId}`),
};
