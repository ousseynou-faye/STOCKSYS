import { api } from './apiClient';

export const apiCategories = {
  fetchCategories: () => api.get('/categories'),
  createCategory: (body: any) => api.post('/categories', body),
  updateCategory: (id: string, body: any) => api.patch(`/categories/${id}`, body),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
};


