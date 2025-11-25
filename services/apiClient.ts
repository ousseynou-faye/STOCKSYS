<<<<<<< HEAD
export const USE_API = (import.meta as any).env?.VITE_USE_API === 'true';
export const STRICT_API = USE_API && ((import.meta as any).env?.VITE_STRICT_API === 'true');

const baseURL = '/api';
=======
const env = (import.meta as any).env || {};
export const USE_API = env.VITE_USE_API === 'true';
export const STRICT_API = USE_API && env.VITE_STRICT_API === 'true';

// Allow overriding the API base URL when front & back are hosted separately
const baseURL = env.VITE_API_BASE || '/api';
>>>>>>> 7884868 (STOCKSYS)

export type ApiErrorDetail = { status: number; path: string; message: string };

export function emitApiEvent(name: 'api:error' | 'api:unauthorized', detail: ApiErrorDetail) {
  try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}

export class ApiError extends Error {
  status: number;
  path: string;
  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const skipGlobalError = (options as any)?.skipGlobalError === true;
  const res = await fetch(`${baseURL}${path}`, { ...options, headers });
  if (res.status === 204) return undefined;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || (res.status === 403 ? 'Accès refusé' : 'Erreur API');
    const detail: ApiErrorDetail = { status: res.status, path, message: msg };
    if (!skipGlobalError) {
      if (res.status === 401) emitApiEvent('api:unauthorized', detail);
      else if (res.status === 403) emitApiEvent('api:error', detail);
    }
    throw new ApiError(msg, res.status, path);
  }
  // Réponses normalisées enveloppées en { data }
  return 'data' in data ? data.data : data;
}

export const api = {
  get: (p: string, opts?: any) => request(p, { method: 'GET', ...(opts || {}) }),
  post: (p: string, body?: any, opts?: any) => request(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...(opts || {}) }),
  patch: (p: string, body?: any, opts?: any) => request(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...(opts || {}) }),
  put: (p: string, body?: any, opts?: any) => request(p, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...(opts || {}) }),
  delete: (p: string, opts?: any) => request(p, { method: 'DELETE', ...(opts || {}) }),
};
