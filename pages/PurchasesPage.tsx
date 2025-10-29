import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Modal, Select, Input, ConfirmationModal, ExportDropdown } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { 
    PurchaseOrder, 
    PurchaseOrderStatus, 
    Supplier, 
    Store, 
    Product, 
    ProductStock, 
    Permission, 
    ProductType, 
    PurchaseOrderItem
} from '../types';
import { 
    apiFetchPurchaseOrders,
    apiCreatePurchaseOrder,
    apiUpdatePurchaseOrder,
    apiReceivePurchaseOrderItems,
    MOCK_SUPPLIERS,
    MOCK_STORES,
    MOCK_PRODUCTS,
    MOCK_USERS,
    apiFetchStock
} from '../services/mockApi';
import { USE_API, ApiError } from '../services/apiClient';
import { apiPurchases } from '../services/apiPurchases';
import { apiSuppliers } from '../services/apiSuppliers';
import { apiStores } from '../services/apiStores';
import { apiProducts } from '../services/apiProducts';
import { TrashIcon } from '../components/icons';
import { fromApiPurchaseOrderStatus, toApiPurchaseOrderStatus } from '../services/apiMappers';

const ITEMS_PER_PAGE = 10;

type ModalState = 'closed' | 'edit' | 'details' | 'receive';

const StatusBadge: React.FC<{ status: PurchaseOrderStatus }> = ({ status }) => {
    const statusConfig = {
        [PurchaseOrderStatus.DRAFT]: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
        [PurchaseOrderStatus.PENDING]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        [PurchaseOrderStatus.ORDERED]: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        [PurchaseOrderStatus.RECEIVED]: 'bg-green-500/20 text-green-300 border-green-500/30',
        [PurchaseOrderStatus.CANCELLED]: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusConfig[status]}`}>{status}</span>;
};

const PurchasesPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    const isAdmin = hasPermission(Permission.MANAGE_ROLES);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal state
    const [modalState, setModalState] = useState<ModalState>('closed');
    const [activePO, setActivePO] = useState<PurchaseOrder | null>(null);

    // Pagination and filtering
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        storeId: user?.storeId || '',
        supplierId: '',
        status: '',
    });

    useEffect(() => {
        if (!isAdmin) {
            const forcedStore = user?.storeId || '';
            setFilters(prev => (prev.storeId === forcedStore ? prev : { ...prev, storeId: forcedStore }));
        }
    }, [isAdmin, user?.storeId]);

    useEffect(() => {
        const load = async () => {
            try {
                if (USE_API) {
                    const pos = await apiPurchases.fetchPOs();
                    const sups = await apiSuppliers.fetchSuppliers();
                    const prods = await apiProducts.fetchProducts();
                    const poArr: any[] = (pos as any)?.data || (pos as any) || [];
                    const filtered = (user?.storeId && !hasPermission(Permission.MANAGE_ROLES))
                        ? poArr.filter((po: any) => po.storeId === user!.storeId)
                        : poArr;
                    setPurchaseOrders(filtered as any);
                    setSuppliers(((sups as any)?.data) || (sups as any));
                    // Only fetch stores if permission, otherwise keep empty
                    if (hasPermission(Permission.VIEW_STORES)) {
                        try {
                            const sts: any = await apiStores.fetchStores();
                            setStores(((sts as any)?.data) || (sts as any));
                        } catch { setStores(MOCK_STORES); }
                    } else { setStores([]); }
                    setProducts(((prods as any)?.data) || (prods as any));
                } else {
                    let allPOs = apiFetchPurchaseOrders();
                    if (user?.storeId && !hasPermission(Permission.MANAGE_ROLES)) {
                        allPOs = allPOs.filter(po => po.storeId === user.storeId);
                    }
                    setPurchaseOrders(allPOs);
                    setSuppliers(MOCK_SUPPLIERS);
                    setStores(MOCK_STORES);
                    setProducts(MOCK_PRODUCTS);
                }
            } catch (e: any) {
                if (e?.status === 403) {
                    addToast({ message: 'Acces refuse - permission requise: VIEW_PURCHASES', type: 'error' });
                    setPurchaseOrders([]);
                    setSuppliers([]);
                    setStores([]);
                    setProducts([]);
                } else {
                    console.error('Purchases load failed, fallback to mock', e);
                    let allPOs = apiFetchPurchaseOrders();
                    if (user?.storeId && !hasPermission(Permission.MANAGE_ROLES)) {
                        allPOs = allPOs.filter(po => po.storeId === user.storeId);
                    }
                    setPurchaseOrders(allPOs);
                    setSuppliers(MOCK_SUPPLIERS);
                    setStores(hasPermission(Permission.VIEW_STORES) ? MOCK_STORES : []);
                    setProducts(MOCK_PRODUCTS);
                }
            }
        };
        load();
    }, [refreshKey, user, hasPermission]);

    const storeOptions = useMemo(() => {
        if (isAdmin) {
            return [{ value: '', label: 'Toutes' }, ...stores.map(s => ({ value: s.id, label: s.name }))];
        }
        if (user?.storeId) {
            const label = stores.find(s => s.id === user.storeId)?.name || 'Ma boutique';
            return [{ value: user.storeId, label }];
        }
        return [{ value: '', label: 'Toutes' }];
    }, [isAdmin, stores, user?.storeId]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (e.target.name === 'storeId' && !isAdmin) return;
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const filteredPOs = useMemo(() => {
        return purchaseOrders.filter(po => 
            (!filters.storeId || po.storeId === filters.storeId) &&
            (!filters.supplierId || po.supplierId === filters.supplierId) &&
            (!filters.status || po.status === filters.status)
        );
    }, [purchaseOrders, filters]);

    const enrichedPOs = useMemo(() => {
        return filteredPOs.map(po => ({
            ...po,
            supplierName: suppliers.find(s => s.id === po.supplierId)?.name || 'N/A',
            storeName: stores.find(s => s.id === po.storeId)?.name || 'N/A',
            createdBy: MOCK_USERS.find(u => u.id === po.createdById)?.username || 'N/A',
        }));
    }, [filteredPOs, suppliers, stores]);

    const openModal = (po: PurchaseOrder, state: ModalState) => {
        setActivePO(po);
        setModalState(state);
    };

    const handleCreateClick = () => {
        const newPO: PurchaseOrder = {
            id: `po-${Date.now()}`,
            supplierId: '',
            storeId: user?.storeId || '',
            items: [],
            status: PurchaseOrderStatus.DRAFT,
            createdAt: new Date().toISOString(),
            createdById: user!.id,
        };
        setActivePO(newPO);
        setModalState('edit');
    };

    const columns = [
        { header: 'ID Commande', accessor: (item: any) => `#${item.id.slice(-6).toUpperCase()}` },
        { header: 'Fournisseur', accessor: 'supplierName' },
        { header: 'Boutique', accessor: 'storeName' },
        { header: 'Statut', accessor: (item: any) => <StatusBadge status={item.status} /> },
        { header: 'Date Creation', accessor: (item: any) => new Date(item.createdAt).toLocaleDateString('fr-FR') },
        { header: 'Actions', accessor: (item: any) => (
            <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openModal(item, 'details')}>Details</Button>
                {hasPermission(Permission.MANAGE_PURCHASE_ORDERS) && item.status !== PurchaseOrderStatus.RECEIVED && item.status !== PurchaseOrderStatus.CANCELLED && (
                    <Button variant="secondary" size="sm" onClick={() => openModal(item, 'edit')}>Modifier</Button>
                )}
            </div>
        )},
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Gerez les commandes d'achat aupres de vos fournisseurs.</p>
                {hasPermission(Permission.CREATE_PURCHASE_ORDER) && <Button onClick={handleCreateClick}>Nouvelle Commande</Button>}
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <Select label="Filtrer par boutique" id="storeId" name="storeId" value={filters.storeId} onChange={handleFilterChange} options={storeOptions} disabled={!isAdmin} />
                    <Select label="Filtrer par fournisseur" id="supplierId" name="supplierId" value={filters.supplierId} onChange={handleFilterChange} options={[{value: '', label: 'Tous'}, ...suppliers.map(s => ({value: s.id, label: s.name}))]} />
                    <Select label="Filtrer par statut" id="status" name="status" value={filters.status} onChange={handleFilterChange} options={[{value: '', label: 'Tous'}, ...Object.values(PurchaseOrderStatus).map(s => ({value: s, label: s}))]} />
                </div>
                <Table columns={columns} data={enrichedPOs} currentPage={currentPage} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
            </Card>

            {modalState !== 'closed' && activePO && (
                <PurchaseOrderModal
                    isOpen={modalState !== 'closed'}
                    onClose={() => setModalState('closed')}
                    purchaseOrder={activePO}
                    mode={modalState}
                    suppliers={suppliers}
                    stores={stores}
                    products={products}
                    onSave={() => {
                        setRefreshKey(k => k + 1);
                        setModalState('closed');
                    }}
                />
            )}
        </div>
    );
};

// ===================================================================================
// Purchase Order Modal Component
// ===================================================================================

interface POModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseOrder: PurchaseOrder;
    mode: ModalState;
    onSave: () => void;
    suppliers: Supplier[];
    stores: Store[];
    products: Product[];
}

const PurchaseOrderModal: React.FC<POModalProps> = ({ isOpen, onClose, purchaseOrder, mode, onSave, suppliers, stores, products }) => {
    const [poData, setPoData] = useState<PurchaseOrder>(purchaseOrder);
    const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
    const [internalMode, setInternalMode] = useState<ModalState>(mode);
    const { user, hasPermission } = useAuth();
    const isAdmin = hasPermission(Permission.MANAGE_ROLES);
    const { addToast } = useToast();
    const canEditItems = internalMode === 'edit' && poData.status === PurchaseOrderStatus.DRAFT;
    const canEditStatus = internalMode === 'edit';
    const canEditStore = canEditItems && isAdmin;
    const storeLabel = useMemo(() => {
        const found = stores.find(s => s.id === poData.storeId);
        return found?.name || poData.storeId || 'N/A';
    }, [stores, poData.storeId]);

    useEffect(() => {
        setPoData(purchaseOrder);
    }, [purchaseOrder]);

    useEffect(() => {
        if (!isAdmin && user?.storeId) {
            setPoData(prev => (prev.storeId === user.storeId ? prev : { ...prev, storeId: user.storeId }));
        }
    }, [isAdmin, user?.storeId]);

    useEffect(() => {
        setInternalMode(mode);
    }, [mode]);

    const getProductName = (variationId: string) => {
        const product = products.find(p => p.id === variationId || p.variations?.some(v => v.id === variationId));
        if (!product) return 'N/A';
        const variation = product.variations?.find(v => v.id === variationId);
        const variationName = variation ? ` (${Object.values(variation.attributes).join(' / ')})` : '';
        return `${product.name}${variationName}`;
    };

    const handleItemChange = (index: number, field: 'quantity' | 'price', value: number) => {
        const newItems = [...poData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setPoData({ ...poData, items: newItems });
    };
    
    const handleAddItem = (variationId: string) => {
        if (!variationId || poData.items.some(i => i.variationId === variationId)) return;
        const newItem: PurchaseOrderItem = { variationId, quantity: 1, receivedQuantity: 0, price: 0 };
        setPoData({ ...poData, items: [...poData.items, newItem] });
    };

    const handleRemoveItem = (index: number) => {
        setPoData({ ...poData, items: poData.items.filter((_, i) => i !== index) });
    };

    const handleSave = async () => {
        if (!user) return;
        if (!poData.supplierId) { addToast({ message: 'Selectionnez un fournisseur.', type: 'error' }); return; }
        if (!poData.storeId) { addToast({ message: 'Selectionnez une boutique.', type: 'error' }); return; }
        if (poData.items.length === 0) {
            addToast({ message: 'Ajoutez au moins un produit.', type: 'error' });
            return;
        }
        if (poData.items.some(it => !it.variationId || Number(it.quantity) <= 0 || Number(it.price) < 0)) {
            addToast({ message: 'Verifiez les articles: quantite > 0 et prix >= 0.', type: 'error' });
            return;
        }

        const itemsSanitized = poData.items.map(it => ({
            ...it,
            quantity: Number(it.quantity),
            receivedQuantity: Number(it.receivedQuantity),
            price: Number(it.price),
        }));
        const isDraft = poData.status === PurchaseOrderStatus.DRAFT;
        const isNew = poData.id.startsWith('po-');

        try {
            if (isNew) {
                if (USE_API) {
                    await apiPurchases.createPO({ ...poData, items: itemsSanitized });
                } else {
                    await apiCreatePurchaseOrder({ ...poData, items: itemsSanitized }, user.id);
                }
                addToast({ message: 'Commande creee.', type: 'success' });
            } else {
                const payload: any = { status: poData.status };
                if (poData.supplierId) payload.supplierId = poData.supplierId;
                if (poData.storeId) payload.storeId = poData.storeId;
                if (isDraft) payload.items = itemsSanitized;

                if (USE_API) await apiPurchases.updatePO(poData.id, payload);
                else await apiUpdatePurchaseOrder(poData.id, payload, user.id);

                addToast({ message: 'Commande mise a jour.', type: 'success' });
            }
            onSave();
        } catch (e: any) {
            addToast({ message: e?.message || 'Erreur lors de la sauvegarde.', type: 'error' });
        }
    };



    const handleReceive = async () => {
        if (!user) return;

        const itemsToReceive: { variationId: string; quantity: number }[] = [];
        for (const [variationId, rawQty] of Object.entries(receiveQuantities)) {
            const item = poData.items.find(it => it.variationId === variationId);
            if (!item) continue;
            const quantity = Number(rawQty);
            if (!Number.isFinite(quantity) || quantity <= 0) continue;
            const remaining = Math.max(0, Number(item.quantity) - Number(item.receivedQuantity));
            if (remaining <= 0) continue;
            if (quantity > remaining) {
                const name = getProductName(variationId);
                addToast({
                    message: `Quantite a recevoir trop elevee pour ${name}. Maximum restant: ${remaining}.`,
                    type: 'error',
                });
                return;
            }
            itemsToReceive.push({ variationId, quantity });
        }

        if (itemsToReceive.length === 0) {
            addToast({ message: 'Aucune quantite valide a recevoir.', type: 'error' });
            return;
        }

        try {
            if (USE_API) await apiPurchases.receivePO(poData.id, itemsToReceive);
            else await apiReceivePurchaseOrderItems(poData.id, itemsToReceive, user.id);
            addToast({ message: 'Reception enregistree.', type: 'success' });
            setReceiveQuantities({});
            setInternalMode('details');
            onSave();
        } catch (e) {
            let message = 'Erreur lors de la reception.';
            if (e instanceof ApiError) {
                message = e.message || `Erreur API (${e.status})`;
            } else if (typeof (e as any)?.message === 'string' && (e as any).message.trim().length > 0) {
                message = (e as any).message;
            }
            addToast({ message, type: 'error' });
        }
    };

    const title = {
        'edit': poData.id.startsWith('po-') ? "Creer une commande" : "Modifier la commande",
        'details': `Details Commande #${poData.id.slice(-6)}`,
        'receive': `Receptionner la Commande #${poData.id.slice(-6)}`,
        'closed': ''
    }[internalMode];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} wrapperClassName="md:max-w-4xl">
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg">
                    <div><span className="font-semibold">Fournisseur:</span> {canEditItems ? <Select label="" id="supplierId" value={poData.supplierId} onChange={e => setPoData({...poData, supplierId: e.target.value})} options={suppliers.map(s => ({value: s.id, label: s.name}))}/> : suppliers.find(s => s.id === poData.supplierId)?.name}</div>
                    <div><span className="font-semibold">Boutique:</span> {canEditStore ? <Select label="" id="storeId" value={poData.storeId} onChange={e => setPoData({...poData, storeId: e.target.value})} options={stores.map(s => ({value: s.id, label: s.name}))}/> : storeLabel}</div>
                    <div>
                      <span className="font-semibold">Statut:</span>
                      {canEditStatus ? (
                        <div>
                          <Select
                            label=""
                            id="status"
                            value={poData.status}
                            onChange={e => setPoData({ ...poData, status: e.target.value as PurchaseOrderStatus })}
                            options={(() => {
                              const transitions: Record<string, string[]> = {
                                DRAFT: ['DRAFT','PENDING','ORDERED','CANCELLED'],
                                PENDING: ['PENDING','ORDERED','CANCELLED'],
                                ORDERED: ['ORDERED','CANCELLED'],
                                PARTIALLY_RECEIVED: ['PARTIALLY_RECEIVED','RECEIVED','CANCELLED'],
                                RECEIVED: ['RECEIVED'],
                                CANCELLED: ['CANCELLED'],
                              };
                              const current = toApiPurchaseOrderStatus(poData.status);
                              const allowed = transitions[current] || [current];
                              return allowed.map(code => {
                                const uiValue = fromApiPurchaseOrderStatus(code);
                                return { value: uiValue, label: uiValue };
                              });
                            })()}
                          />
                          {poData.status !== 'PARTIALLY_RECEIVED' && (
                            <p className="text-xs text-text-secondary mt-1">Pour marquer la commande comme <b>RECEIVED</b>, utilisez l'action <b>Receptionner</b>.</p>
                          )}
                        </div>
                      ) : (
                        <StatusBadge status={poData.status} />
                      )}
                    </div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto">
                     <table className="w-full text-left">
                         <thead><tr className="border-b border-secondary">
                             <th className="p-2">Produit</th>
                             <th className="p-2">Qte Commandee</th>
                             <th className="p-2">Qte Recue</th>
                             <th className="p-2">Prix Unitaire</th>
                             {internalMode === 'receive' && <th className="p-2">Quantite a recevoir</th>}
                             {canEditItems && <th className="p-2">Action</th>}
                         </tr></thead>
                         <tbody>
                             {poData.items.map((item, index) => (
                                 <tr key={index} className="border-b border-secondary/50">
                                     <td className="p-2">{getProductName(item.variationId)}</td>
                                     <td className="p-2">{canEditItems ? <Input type="number" label="" id={`qty-${index}`} value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} /> : item.quantity}</td>
                                     <td className="p-2">{item.receivedQuantity}</td>
                                     <td className="p-2">{canEditItems ? <Input type="number" label="" id={`price-${index}`} value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} /> : item.price}</td>
                                     {internalMode === 'receive' && 
                                        <td className="p-2">
                                            <Input type="number" label="" id={`receive-${index}`} value={receiveQuantities[item.variationId] || ''} onChange={e => setReceiveQuantities({...receiveQuantities, [item.variationId]: Number(e.target.value)})} max={item.quantity - item.receivedQuantity} min="0" />
                                        </td>
                                     }
                                     {canEditItems && <td className="p-2"><Button variant="danger" size="sm" onClick={() => handleRemoveItem(index)}><TrashIcon/></Button></td>}
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                     {canEditItems && <Select value="" onChange={e => handleAddItem(e.target.value)} options={[{value: '', label: "Ajouter un produit..."}, ...products.flatMap(p => p.variations ? p.variations.map(v => ({ value: v.id, label: `${p.name} (${Object.values(v.attributes).join(' / ')})` })) : [{ value: p.id, label: p.name }]) ]} />}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {internalMode === 'edit' && <Button onClick={handleSave}>Enregistrer</Button>}
                    {internalMode === 'details' && poData.status !== PurchaseOrderStatus.RECEIVED && (
                        <Button
                            onClick={() => {
                                setReceiveQuantities({});
                                setInternalMode('receive');
                            }}
                        >
                            Receptionner
                        </Button>
                    )}
                    {internalMode === 'receive' && (
                        <>
                            <Button onClick={handleReceive}>Confirmer reception</Button>
                            <Button variant="secondary" onClick={() => setInternalMode('details')}>
                                Annuler
                            </Button>
                        </>
                    )}
                    <Button variant="secondary" onClick={onClose}>Fermer</Button>
                </div>
            </div>
        </Modal>
    );
};


export default PurchasesPage;
















