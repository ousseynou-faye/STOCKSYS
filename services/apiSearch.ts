import { api } from './apiClient';

export const apiSearch = {
  global: (term: string) => api.get(`/search?term=${encodeURIComponent(term)}`),
};

