import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Input, Select } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { USE_API, STRICT_API } from '../services/apiClient';
import { apiProducts } from '../services/apiProducts';
import { apiCategories } from '../services/apiCategories';
import { MOCK_PRODUCTS, apiFetchCategories } from '../services/mockApi';
import { useAuth } from '../hooks/useAuth';
import { Permission } from '../types';

const ITEMS_PER_PAGE = 10;

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');

  const { hasPermission } = useAuth();
  const { addToast } = useToast();
  useEffect(() => {
    const load = async () => {
      if (USE_API) {
        try {
          const p = await apiProducts.fetchProducts({ page: currentPage, limit: ITEMS_PER_PAGE, name: search || undefined, categoryId: categoryId || undefined });
          const arr = (p as any)?.data || p;
          setProducts(arr);
          setServerTotal(((p as any)?.meta?.total) || arr.length);
          if (hasPermission(Permission.VIEW_CATEGORIES)) {
            const c = await apiCategories.fetchCategories();
            setCategories(c as any);
          } else {
            setCategories([]);
          }
        } catch (e: any) {
          if (e?.status === 403) {
            addToast({ message: 'Accès refusé — permission requise: VIEW_STOCK', type: 'error' });
            setProducts([]);
            setCategories([]);
            return;
          } else {
            console.error('API products/categories failed', e);
            if (STRICT_API) {
              addToast({ message: "Erreur de chargement des produits/catégories.", type: 'error' });
              setProducts([]);
              setCategories([]);
            } else {
              setProducts(MOCK_PRODUCTS as any);
              setCategories(hasPermission(Permission.VIEW_CATEGORIES) ? (apiFetchCategories() as any) : []);
            }
          }
        }
      } else {
        setProducts(MOCK_PRODUCTS as any);
        setCategories(apiFetchCategories() as any);
      }
    };
    load();
  }, [currentPage, search, categoryId, hasPermission]);

  const categoryMap = useMemo(() => new Map(categories.map((c: any) => [c.id, c.name])), [categories]);

  const data = useMemo(() => {
    if (USE_API) return products;
    const filtered = (products as any[]).filter(p => (!search || p.name.toLowerCase().includes(search.toLowerCase())) && (!categoryId || p.categoryId === categoryId));
    return filtered;
  }, [products, search, categoryId]);

  const columns = [
    { header: 'Nom', accessor: (item: any) => item.name },
    { header: 'Type', accessor: (item: any) => item.type },
    { header: 'Catégorie', accessor: (item: any) => categoryMap.get(item.categoryId) || 'N/A' },
    { header: 'Seuil Low Stock', accessor: (item: any) => item.lowStockThreshold },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Rechercher" id="search-products" value={search} onChange={e => { setCurrentPage(1); setSearch(e.target.value); }} />
        <Select label="Catégorie" id="filter-category" value={categoryId} onChange={e => { setCurrentPage(1); setCategoryId(e.target.value); }} options={[{ value: '', label: 'Toutes' }, ...categories.map((c: any) => ({ value: c.id, label: c.name }))]} />
      </div>
      <Card>
        <Table columns={columns as any} data={data as any} currentPage={currentPage} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} serverMode={USE_API} totalItems={USE_API ? serverTotal : undefined} />
      </Card>
    </div>
  );
};

export default ProductsPage;
