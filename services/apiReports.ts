import { api } from './apiClient';

function qs(params?: Record<string, any>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v!==undefined && v!==null && v!=='') sp.append(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const apiReports = {
  sales: (params?: any) => api.get('/reports/sales' + qs(params)),
  stockValuation: (storeId?: string) => api.get('/reports/stock-valuation' + qs(storeId ? { storeId } : {})),
  profitability: (params?: any) => api.get('/reports/profitability' + qs(params)),
  expenses: (params?: any) => api.get('/reports/expenses' + qs(params)),
  topProducts: (params?: any) => api.get('/reports/top-products' + qs(params)),
  topVariations: (params?: any) => api.get('/reports/top-variations' + qs(params)),
};
