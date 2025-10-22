import { api } from './apiClient';
import { fromApiProductType, toApiProductType } from './apiMappers';

function sanitizeProductPayload(body: any) {
  const type = toApiProductType(body.type);
  const base: any = {
    name: body.name,
    type,
    lowStockThreshold: Number(body.lowStockThreshold ?? 0),
    categoryId: body.categoryId,
  };
  if (type === 'STANDARD') {
    return {
      ...base,
      sku: body.sku || undefined,
      price: body.price !== undefined ? Number(body.price) : undefined,
    };
  }
  if (type === 'VARIABLE') {
    const variations = Array.isArray(body.variations)
      ? body.variations.map((v: any) => ({ sku: v.sku, price: Number(v.price ?? 0), attributes: v.attributes || {} }))
      : [];
    return { ...base, variations };
  }
  if (type === 'BUNDLE') {
    // Create bundle product with an optional default variation if provided; strip bundleComponents (managed elsewhere)
    const variations = Array.isArray(body.variations)
      ? body.variations.map((v: any) => ({ sku: v.sku, price: Number(v.price ?? 0), attributes: v.attributes || {} }))
      : [];
    return { ...base, variations };
  }
  return base;
}

function qs(params?: Record<string, any>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v!==undefined && v!==null && v!=='') sp.append(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const apiProducts = {
  fetchProducts: async (params?: any) => {
    const res: any = await api.get('/products' + qs(params));
    if (Array.isArray(res)) {
      return res.map((p: any) => ({ ...p, type: fromApiProductType(p.type) }));
    }
    if (res && Array.isArray(res.data)) {
      return { ...res, data: res.data.map((p: any) => ({ ...p, type: fromApiProductType(p.type) })) };
    }
    return res;
  },
  createProduct: (body: any) => api.post('/products', sanitizeProductPayload(body)),
  updateProduct: (id: string, body: any) => api.patch(`/products/${id}`, sanitizeProductPayload(body)),
  setBundleComponents: (productId: string, components: { componentVariationId: string; quantity: number }[]) =>
    api.put(`/products/${productId}/bundle-components`, { components }),
};
