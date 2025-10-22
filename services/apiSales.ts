import { api } from './apiClient';
import { toApiPaymentMethod } from './apiMappers';

function qs(params?: Record<string, any>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const apiSales = {
  fetchSales: (params?: any) => api.get('/sales' + qs(params)),
  createSale: (sale: any) => {
    const payload = {
      ...sale,
      payments: Array.isArray(sale.payments)
        ? sale.payments.map((p: any) => ({ ...p, method: toApiPaymentMethod(p.method) }))
        : [],
    };
    return api.post('/sales', payload);
  },
  bulkSync: (sales: any[]) => {
    const mapped = sales.map((s: any) => ({
      ...s,
      payments: Array.isArray(s.payments)
        ? s.payments.map((p: any) => ({ ...p, method: toApiPaymentMethod(p.method) }))
        : [],
    }));
    return api.post('/sales/bulk', { sales: mapped });
  },
};
