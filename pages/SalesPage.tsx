import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Modal, Input, Select, ExportDropdown } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { Sale, Product, Permission, SaleItem, Payment, PaymentMethod, SaleStatus } from '../types';
import { apiFetchSales, apiCreateSale, apiFetchProducts, MOCK_STORES, MOCK_USERS } from '../services/mockApi';
import { USE_API, STRICT_API } from '../services/apiClient';
import { apiSales } from '../services/apiSales';
import { apiProducts } from '../services/apiProducts';
import { apiStock as apiStockSvc } from '../services/apiStock';
import { apiStores } from '../services/apiStores';
import { apiUsers } from '../services/apiUsers';
import { addPendingSale, getPendingSales, clearPendingSales } from '../services/offlineDb';
import { TrashIcon } from '../components/icons';

const ITEMS_PER_PAGE = 10;

const getProductDetails = (variationId: string, products: Product[]) => {
    for (const p of products) {
        if (p.id === variationId || p.variations?.some(v => v.id === variationId)) {
            const variation = p.variations?.find(v => v.id === variationId);
            const name = variation && Object.keys(variation.attributes).length > 0 ? `${p.name} (${Object.values(variation.attributes).join(' / ')})` : p.name;
            const price = variation?.price ?? p.price ?? 0;
            const sku = variation?.sku ?? p.sku ?? 'N/A';
            return { product: p, variation, name, price, sku };
        }
    }
    return null;
};

// --- Sale Creation Modal (POS) ---
interface SaleModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const { isOnline } = useOnlineStatus();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [currentPayment, setCurrentPayment] = useState({ amount: 0, method: PaymentMethod.CASH });
    
    useEffect(() => {
        const loadProducts = async () => {
            try {
                if (USE_API) {
                    const res: any = await apiProducts.fetchProducts();
                    const arr = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
                    setProducts(arr as any);
                } else {
                    setProducts(apiFetchProducts());
                }
            } catch {
                setProducts(STRICT_API ? [] : apiFetchProducts());
            }
        };
        loadProducts();
    }, []);
    
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.data && event.data.type === 'SYNC_SALES') {
                const salesToSync: Sale[] = event.data.payload;
                if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'SYNC_STARTED' });
                const syncedIds: string[] = [];
                for (const sale of salesToSync) {
                    try {
                        if (USE_API) await apiSales.createSale(sale); else await apiCreateSale(sale, user?.id || 'offline-sync', true);
                        syncedIds.push(sale.id);
                    } catch (err) { console.error('Failed to sync sale:', sale.id, err); }
                }
                await clearPendingSales(syncedIds);
                if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'SYNC_COMPLETE' });
            }
        };
        navigator.serviceWorker.addEventListener('message', handleMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }, [user]);

    // Build variation options from products (STANDARD treated as single variation)
    const variationOptions = useMemo(() => {
        const opts: { value: string; label: string; price: number }[] = [];
        products.forEach((p) => {
            if (p.variations && p.variations.length > 0) {
                p.variations.forEach((v) => {
                    const label = `${p.name}${Object.keys(v.attributes || {}).length ? ' (' + Object.values(v.attributes).join(' / ') + ')' : ''}${v.sku ? ' [' + v.sku + ']' : ''}`;
                    opts.push({ value: v.id, label, price: v.price });
                });
            } else {
                const price = p.price || 0;
                const label = `${p.name}${p.sku ? ' [' + p.sku + ']' : ''}`;
                opts.push({ value: p.id, label, price });
            }
        });
        return opts;
    }, [products]);

    const [selectedVariation, setSelectedVariation] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [currentStockQty, setCurrentStockQty] = useState<number | null>(null);

    useEffect(() => {
        const loadStock = async () => {
            setCurrentStockQty(null);
            if (!USE_API || !user || !user.storeId || !selectedVariation) return;
            try {
                const res: any = await apiStockSvc.fetchStock({ storeId: user.storeId, variationId: selectedVariation, limit: 1 });
                const arr: any[] = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
                setCurrentStockQty(arr.length ? Number(arr[0].quantity) : 0);
            } catch {
                setCurrentStockQty(null);
            }
        };
        loadStock();
    }, [selectedVariation, user]);

    const addToCart = () => {
        if (!selectedVariation || quantity <= 0) return;
        const opt = variationOptions.find(o => o.value === selectedVariation);
        const price = opt?.price ?? 0;
        setCart(prev => [...prev, { variationId: selectedVariation, quantity, priceAtSale: price }]);
        setSelectedVariation('');
        setQuantity(1);
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const totalAmount = useMemo(() => cart.reduce((s, i) => s + i.priceAtSale * i.quantity, 0), [cart]);

    useEffect(() => {
        // Keep payment amount in sync with total by default
        setCurrentPayment(cp => ({ ...cp, amount: totalAmount }));
    }, [totalAmount]);

    const submitSale = async () => {
        if (!user) return;
        if (!user.storeId) { alert("Assignez une boutique à l'utilisateur avant de créer une vente."); return; }
        if (cart.length === 0) { alert('Ajoutez au moins un article.'); return; }
        const sale: Sale = {
            id: `sale-${Date.now()}`,
            userId: user.id,
            storeId: user.storeId,
            items: cart,
            payments: [{ method: currentPayment.method, amount: currentPayment.amount, createdAt: new Date().toISOString() } as any],
            totalAmount,
            status: SaleStatus.PAID,
            createdAt: new Date().toISOString(),
        };
        try {
            if (USE_API) await apiSales.createSale(sale); else await apiCreateSale(sale, user.id, true);
            addToast({ message: 'Vente enregistrée.', type: 'success' });
            onClose();
        } catch (e: any) {
            const raw = e?.message || '';
            let friendly = raw;
            if (/insuffisant/i.test(raw)) friendly = 'Stock insuffisant pour au moins un article dans votre boutique.';
            if (/Variation not found|introuvable/i.test(raw)) friendly = "L'article sélectionné est invalide. Veuillez réessayer.";
            addToast({ message: friendly || 'Échec de la vente', type: 'error' });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle Vente" wrapperClassName="md:max-w-3xl">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <Select id="variation" label="Produit" value={selectedVariation} onChange={(e) => setSelectedVariation(e.target.value)} options={[{ value: '', label: 'Sélectionner...' }, ...variationOptions.map(o => ({ value: o.value, label: o.label }))]} />
                    <Input id="qty" label="Quantité" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                    <Button onClick={addToCart}>Ajouter</Button>
                </div>

                {selectedVariation && currentStockQty !== null && currentStockQty <= 0 && (
                    <div className="p-3 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-200 text-sm">
                        Stock insuffisant pour cet article dans votre boutique. Vous pouvez
                        {' '}<a className="underline" href="#/purchases">réceptionner une commande</a>
                        {' '}ou{' '}<a className="underline" href="#/stock">ajuster le stock</a>.
                    </div>
                )}
                <div className="bg-surface rounded-lg border border-secondary/40">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-secondary/60">
                                <th className="p-2">Article</th>
                                <th className="p-2">Qté</th>
                                <th className="p-2">Prix</th>
                                <th className="p-2">Total</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map((it, idx) => {
                                const opt = variationOptions.find(o => o.value === it.variationId);
                                return (
                                    <tr key={idx} className="border-b border-secondary/40">
                                        <td className="p-2">{opt?.label || it.variationId}</td>
                                        <td className="p-2">{it.quantity}</td>
                                        <td className="p-2">{it.priceAtSale.toLocaleString('fr-FR')} FCFA</td>
                                        <td className="p-2">{(it.priceAtSale * it.quantity).toLocaleString('fr-FR')} FCFA</td>
                                        <td className="p-2"><Button variant="danger" size="sm" onClick={() => removeFromCart(idx)}>Supprimer</Button></td>
                                    </tr>
                                );
                            })}
                            {cart.length === 0 && <tr><td className="p-3 text-text-secondary" colSpan={5}>Aucun article.</td></tr>}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <Select id="payMethod" label="Paiement" value={currentPayment.method} onChange={(e) => setCurrentPayment({ ...currentPayment, method: e.target.value as any })} options={[
                        { value: PaymentMethod.CASH, label: 'Espèces' },
                        { value: PaymentMethod.CARD, label: 'Carte' },
                        { value: PaymentMethod.MOBILE_MONEY, label: 'Mobile Money' },
                    ]} />
                    <Input id="payAmount" label="Montant" type="number" value={currentPayment.amount} onChange={(e) => setCurrentPayment({ ...currentPayment, amount: Number(e.target.value) })} />
                    <div className="text-right font-semibold">Total: {totalAmount.toLocaleString('fr-FR')} FCFA</div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button onClick={submitSale}>Enregistrer</Button>
                </div>
            </div>
        </Modal>
    );
};

// SalesPage main component
const SalesPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { isOnline, triggerSync, setPendingSaleCount } = useOnlineStatus();
    const [sales, setSales] = useState<Sale[]>([]);
    const [pendingSales, setPendingSales] = useState<Sale[]>([]);
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [serverTotal, setServerTotal] = useState(0);
    const [filters, setFilters] = useState({ storeId: user?.storeId || '', status: '', date: '' });
    const [stores, setStores] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [returnSale, setReturnSale] = useState<Sale | null>(null);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                if (USE_API) {
                    const res = await apiSales.fetchSales({ page: currentPage, limit: ITEMS_PER_PAGE, storeId: filters.storeId || undefined, status: filters.status || undefined });
                    setSales(((res as any)?.data) || (res as any));
                    setServerTotal(((res as any)?.meta?.total) || (((res as any)?.data?.length) || 0));

                    // Stores only if permission
                    if (hasPermission(Permission.VIEW_STORES)) {
                        try {
                            const st: any = await apiStores.fetchStores();
                            setStores(((st as any)?.data) || (st as any));
                        } catch { setStores(STRICT_API ? [] : (MOCK_STORES as any)); }
                    } else { setStores([]); }

                    // Users only if permission
                    if (hasPermission(Permission.VIEW_USERS)) {
                        try {
                            const us: any = await apiUsers.fetchUsers();
                            const arr = Array.isArray(us) ? us : ((us as any)?.data || []);
                            setUsers(arr as any);
                        } catch { setUsers(STRICT_API ? [] : (MOCK_USERS as any)); }
                    } else { setUsers([]); }
                } else {
                    const fetchedSales = apiFetchSales();
                    setSales(fetchedSales as any);
                    setStores(MOCK_STORES as any);
                    setUsers(MOCK_USERS as any);
                }
                const fetchedPendingSales = await getPendingSales();
                setPendingSales(fetchedPendingSales);
                setPendingSaleCount(fetchedPendingSales.length);
            } catch (e: any) {
                if (e?.status === 403) {
                    addToast({ message: 'Accès refusé — permission requise: VIEW_SALES_HISTORY', type: 'error' });
                    setSales([]);
                    const fetchedPendingSales = await getPendingSales();
                    setPendingSales(fetchedPendingSales);
                    setPendingSaleCount(fetchedPendingSales.length);
                    setStores([]);
                    setUsers([]);
                } else {
                    console.error('Sales load failed', e);
                    if (STRICT_API) {
                        setSales([]);
                        const fetchedPendingSales = await getPendingSales();
                        setPendingSales(fetchedPendingSales);
                        setPendingSaleCount(fetchedPendingSales.length);
                        setStores([]);
                        setUsers([]);
                    } else {
                        setSales(apiFetchSales());
                        const fetchedPendingSales = await getPendingSales();
                        setPendingSales(fetchedPendingSales);
                        setPendingSaleCount(fetchedPendingSales.length);
                        // On failure, keep safe defaults
                        if (!hasPermission(Permission.VIEW_STORES)) setStores([]); else setStores(MOCK_STORES as any);
                        if (!hasPermission(Permission.VIEW_USERS)) setUsers([]); else setUsers(MOCK_USERS as any);
                    }
                }
            }
        };
        fetchAllData();
    }, [refreshKey, setPendingSaleCount, currentPage, filters.storeId, filters.status, hasPermission]);

    const allSalesData = useMemo(() => {
        const combined = [...pendingSales, ...sales];
        return combined
            .filter((sale, index, self) => index === self.findIndex(s => s.id === sale.id))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [sales, pendingSales]);

    const filteredSales = useMemo(() => allSalesData.filter(sale => {
        if (filters.storeId && sale.storeId !== filters.storeId) return false;
        if (filters.status && sale.status !== filters.status) return false;
        if (filters.date && !sale.createdAt.startsWith(filters.date)) return false;
        return true;
    }), [allSalesData, filters]);

    const enrichedSales = useMemo(() => filteredSales.map(s => ({
        ...s,
        storeName: (stores.find(store => store.id === s.storeId)?.name) || 'N/A',
        userName: (users.find(u => u.id === s.userId)?.username) || 'N/A',
    })), [filteredSales]);

    const columns = [
        { header: 'ID Vente', accessor: (item: any) => `#${item.id.slice(-6).toUpperCase()}` },
        { header: 'Date', accessor: (item: any) => new Date(item.createdAt).toLocaleString('fr-FR') },
        { header: 'Boutique', accessor: 'storeName' },
        { header: 'Caissier', accessor: 'userName' },
        { header: 'Montant', accessor: (item: any) => `${item.totalAmount.toLocaleString('fr-FR')} FCFA` },
        { header: 'Statut', accessor: (item: any) => (
            <span className={`px-2 py-1 text-xs rounded-full ${item.status === SaleStatus.PENDING_SYNC ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                {item.status === SaleStatus.PENDING_SYNC ? 'En attente' : 'Synchronisé'}
            </span>
        )},
    ];

    const exportableData = enrichedSales.map(s => ({
        'ID': s.id, 'Date': new Date(s.createdAt).toLocaleString('fr-CA'), 'Boutique': s.storeName,
        'Caissier': s.userName, 'Montant (FCFA)': s.totalAmount, 'Statut': s.status,
    }));
    
    // Add return action column if permitted
    const tableColumns = useMemo(() => {
        const base: any[] = columns as any[];
        if (hasPermission(Permission.MANAGE_RETURNS)) {
            return [
                ...base,
                {
                    header: 'Actions',
                    accessor: (item: any) => (
                        <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => { /* open return modal */ setReturnSale(item); setIsReturnModalOpen(true); }}>Retour</Button>
                        </div>
                    )
                }
            ];
        }
        return base;
    }, [columns, hasPermission]);
    
    

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Consultez l'historique des ventes.</p>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    {pendingSales.length > 0 && isOnline && (
                        <Button variant="secondary" onClick={triggerSync}>Synchroniser ({pendingSales.length})</Button>
                    )}
                    <ExportDropdown data={exportableData} columns={Object.keys(exportableData[0] || {})} filename="ventes" />
                    {hasPermission(Permission.CREATE_SALE) && <Button onClick={() => setIsSaleModalOpen(true)}>Nouvelle Vente</Button>}
                </div>
            </div>
            <Card>
                 <Table columns={tableColumns as any} data={enrichedSales} currentPage={currentPage} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} serverMode={USE_API} totalItems={USE_API ? (serverTotal + pendingSales.length) : undefined} />
            </Card>
            {isSaleModalOpen && <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} />}
            {isReturnModalOpen && returnSale && (
                <ReturnModal sale={returnSale} isOpen={isReturnModalOpen} onClose={() => { setIsReturnModalOpen(false); setReturnSale(null); setRefreshKey(k => k + 1); }} />
            )}
        </div>
    );
};

export default SalesPage;

// --- Return Modal ---
const ReturnModal: React.FC<{ sale: Sale; isOpen: boolean; onClose: () => void }> = ({ sale, isOpen, onClose }) => {
    const { addToast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<{ variationId: string; quantity: number }[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                if (USE_API) {
                    const res: any = await apiProducts.fetchProducts({ limit: 500 });
                    const arr = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
                    setProducts(arr as any);
                } else {
                    setProducts(apiFetchProducts());
                }
            } catch {
                setProducts(STRICT_API ? [] : apiFetchProducts());
            }
        };
        load();
    }, []);

    const variationOptions = useMemo(() => {
        const opts: { value: string; label: string }[] = [];
        products.forEach((p) => {
            if (p.variations && p.variations.length > 0) {
                p.variations.forEach((v) => {
                    const label = `${p.name}${Object.keys(v.attributes || {}).length ? ' (' + Object.values(v.attributes).join(' / ') + ')' : ''}${v.sku ? ' [' + v.sku + ']' : ''}`;
                    opts.push({ value: v.id, label });
                });
            } else {
                const label = `${p.name}${p.sku ? ' [' + p.sku + ']' : ''}`;
                opts.push({ value: p.id, label });
            }
        });
        return opts;
    }, [products]);

    const addItem = () => setItems(prev => [...prev, { variationId: '', quantity: 1 }]);
    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
    const updateItem = (idx: number, patch: Partial<{ variationId: string; quantity: number }>) =>
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

    const submit = async () => {
        try {
            const payload = items
                .filter(it => it.variationId && Number(it.quantity) > 0)
                .map(it => ({ variationId: it.variationId, quantity: Number(it.quantity) }));
            if (payload.length === 0) { addToast({ message: 'Ajoutez au moins un article valide.', type: 'error' }); return; }
            await apiSales.returnItems(sale.id, payload);
            addToast({ message: 'Retour enregistré.', type: 'success' });
            onClose();
        } catch (e: any) {
            addToast({ message: e?.message || 'Échec du retour.', type: 'error' });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Retour pour vente #${sale.id.slice(-6).toUpperCase()}`}>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="text-sm text-text-secondary">Boutique: <span className="font-semibold">{sale.storeId}</span></div>
                    <Button size="sm" variant="secondary" onClick={addItem}>Ajouter un article</Button>
                </div>
                <div className="space-y-3">
                    {items.map((it, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                            <div className="md:col-span-8">
                                <Select id={`ret-var-${idx}`} label="Article (variation)" value={it.variationId} onChange={e => updateItem(idx, { variationId: e.target.value })} options={[{ value: '', label: 'Sélectionner...' }, ...variationOptions]} />
                            </div>
                            <div className="md:col-span-3">
                                <Input id={`ret-qty-${idx}`} label="Quantité" type="number" min={1} value={it.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} />
                            </div>
                            <div className="md:col-span-1">
                                <Button variant="danger" size="sm" onClick={() => removeItem(idx)}><TrashIcon className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-sm text-text-secondary">Aucun article. Cliquez sur "Ajouter un article".</p>}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button onClick={submit}>Enregistrer</Button>
                </div>
            </div>
        </Modal>
    );
};
