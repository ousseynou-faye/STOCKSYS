import { api } from './apiClient';

function qs(params?: Record<string, any>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v!==undefined && v!==null && v!=='') sp.append(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const apiCashier = {
  fetchSessions: (params?: any) => api.get('/cashier-sessions' + qs(params)),
  fetchActive: (userId: string, storeId: string) => api.get('/cashier-sessions/active' + qs({ userId, storeId })),
  start: (userId: string, storeId: string, openingBalance: number) => api.post('/cashier-sessions/start', { userId, storeId, openingBalance }),
  close: (sessionId: string, closingBalance: number) => api.post(`/cashier-sessions/${sessionId}/close`, { sessionId, closingBalance }),
  liveSummary: (sessionId: string) => api.get(`/cashier-sessions/${sessionId}/summary`),
};
