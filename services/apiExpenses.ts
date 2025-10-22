import { api } from './apiClient';

function qs(params?: Record<string, any>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v!==undefined && v!==null && v!=='') sp.append(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const apiExpenses = {
  fetchExpenses: (params?: any) => api.get('/expenses' + qs(params)),
  createExpense: (body: any) => api.post('/expenses', body),
  updateExpense: (id: string, body: any) => api.patch(`/expenses/${id}`, body),
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`),
};

