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
import { USE_API } from '../services/apiClient';
import { apiPurchases } from '../services/apiPurchases';
import { apiSuppliers } from '../services/apiSuppliers';
import { apiStores } from '../services/apiStores';
import { apiProducts } from '../services/apiProducts';
import { TrashIcon } from '../components/icons';

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
                    addToast({ message: 'Accès refusé — permission requise: VIEW_PURCHASES', type: 'error' });
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

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        { header: 'Date Création', accessor: (item: any) => new Date(item.createdAt).toLocaleDateString('fr-FR') },
        { header: 'Actions', accessor: (item: any) => (
            <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openModal(item, 'details')}>Détails</Button>
                {hasPermission(Permission.MANAGE_PURCHASE_ORDERS) && item.status !== PurchaseOrderStatus.RECEIVED && item.status !== PurchaseOrderStatus.CANCELLED && (
                    <Button variant="secondary" size="sm" onClick={() => openModal(item, 'edit')}>Modifier</Button>
                )}
            </div>
        )},
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Gérez les commandes d'achat auprès de vos fournisseurs.</p>
                {hasPermission(Permission.CREATE_PURCHASE_ORDER) && <Button onClick={handleCreateClick}>Nouvelle Commande</Button>}
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <Select label="Filtrer par boutique" id="storeId" name="storeId" value={filters.storeId} onChange={handleFilterChange} options={[{value: '', label: 'Toutes'}, ...stores.map(s => ({value: s.id, label: s.name}))]} disabled={!!user?.storeId} />
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
    const { user } = useAuth();
    const { addToast } = useToast();
    const isEditable = mode === 'edit' && poData.status === PurchaseOrderStatus.DRAFT;

    useEffect(() => {
        setPoData(purchaseOrder);
    }, [purchaseOrder]);

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
        if (poData.items.length === 0) {
            addToast({ message: "Ajoutez au moins un produit.", type: 'error' });
            return;
        }
        const poSanitized = {
            ...poData,
            items: poData.items.map(it => ({
                ...it,
                quantity: Number(it.quantity),
                receivedQuantity: Number(it.receivedQuantity),
                price: Number(it.price),
            })),
        };
        if (poData.id.startsWith('po-')) { // New PO
            if (USE_API) await apiPurchases.createPO(poSanitized);
            else await apiCreatePurchaseOrder(poData, user.id);
            addToast({ message: "Commande créée.", type: 'success' });
        } else {
            if (USE_API) await apiPurchases.updatePO(poData.id, poSanitized);
            else await apiUpdatePurchaseOrder(poData.id, poData, user.id);
            addToast({ message: "Commande mise à jour.", type: 'success' });
        }
        onSave();
    };

    const handleReceive = async () => {
        if (!user) return;
        const itemsToReceive = Object.entries(receiveQuantities)
            // Fix: Explicitly convert quantity to a number to satisfy TypeScript's type checking for the filter and the API call.
            .map(([variationId, quantity]) => ({ variationId, quantity: Number(quantity) }))
            .filter(item => item.quantity > 0);
        
        if (itemsToReceive.length === 0) {
            addToast({ message: "Aucune quantité à recevoir.", type: 'error' });
            return;
        }

        if (USE_API) await apiPurchases.receivePO(poData.id, itemsToReceive);
        else await apiReceivePurchaseOrderItems(poData.id, itemsToReceive, user.id);
        addToast({ message: "Réception enregistrée.", type: 'success' });
        onSave();
    };

    const title = {
        'edit': poData.id.startsWith('po-') ? "Créer une commande" : "Modifier la commande",
        'details': `Détails Commande #${poData.id.slice(-6)}`,
        'receive': `Réceptionner la Commande #${poData.id.slice(-6)}`,
        'closed': ''
    }[mode];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} wrapperClassName="md:max-w-4xl">
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg">
                    <div><span className="font-semibold">Fournisseur:</span> {isEditable ? <Select label="" id="supplierId" value={poData.supplierId} onChange={e => setPoData({...poData, supplierId: e.target.value})} options={suppliers.map(s => ({value: s.id, label: s.name}))}/> : suppliers.find(s => s.id === poData.supplierId)?.name}</div>
                    <div><span className="font-semibold">Boutique:</span> {isEditable ? <Select label="" id="storeId" value={poData.storeId} onChange={e => setPoData({...poData, storeId: e.target.value})} options={stores.map(s => ({value: s.id, label: s.name}))}/> : stores.find(s => s.id === poData.storeId)?.name}</div>
                    <div><span className="font-semibold">Statut:</span> {isEditable ? <Select label="" id="status" value={poData.status} onChange={e => setPoData({...poData, status: e.target.value as PurchaseOrderStatus})} options={Object.values(PurchaseOrderStatus).map(s => ({value: s, label: s}))}/> : <StatusBadge status={poData.status} />}</div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto">
                    {/* Items table */}
                     <table className="w-full text-left">
                         <thead><tr className="border-b border-secondary">
                             <th className="p-2">Produit</th>
                             <th className="p-2">Qté Commandée</th>
                             <th className="p-2">Qté Reçue</th>
                             <th className="p-2">Prix Unitaire</th>
                             {mode === 'receive' && <th className="p-2">Quantité à recevoir</th>}
                             {isEditable && <th className="p-2">Action</th>}
                         </tr></thead>
                         <tbody>
                             {poData.items.map((item, index) => (
                                 <tr key={index} className="border-b border-secondary/50">
                                     <td className="p-2">{getProductName(item.variationId)}</td>
                                     <td className="p-2">{isEditable ? <Input type="number" label="" id={`qty-${index}`} value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} /> : item.quantity}</td>
                                     <td className="p-2">{item.receivedQuantity}</td>
                                     <td className="p-2">{isEditable ? <Input type="number" label="" id={`price-${index}`} value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} /> : item.price}</td>
                                     {mode === 'receive' && 
                                        <td className="p-2">
                                            <Input type="number" label="" id={`receive-${index}`} value={receiveQuantities[item.variationId] || ''} onChange={e => setReceiveQuantities({...receiveQuantities, [item.variationId]: Number(e.target.value)})} max={item.quantity - item.receivedQuantity} min="0" />
                                        </td>
                                     }
                                     {isEditable && <td className="p-2"><Button variant="danger" size="sm" onClick={() => handleRemoveItem(index)}><TrashIcon/></Button></td>}
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                     {isEditable && <Select value="" onChange={e => handleAddItem(e.target.value)} options={[{value: '', label: "Ajouter un produit..."}, ...products.flatMap(p => p.variations ? p.variations.map(v => ({ value: v.id, label: `${p.name} (${Object.values(v.attributes).join(' / ')})` })) : [{ value: p.id, label: p.name }]) ]} />}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {mode === 'edit' && <Button onClick={handleSave}>Enregistrer</Button>}
                    {mode === 'details' && poData.status !== PurchaseOrderStatus.RECEIVED && <Button onClick={() => setReceiveQuantities({})}>Réceptionner</Button>}
                    {mode === 'receive' && <Button onClick={handleReceive}>Confirmer Réception</Button>}
                    <Button variant="secondary" onClick={onClose}>Fermer</Button>
                </div>
            </div>
        </Modal>
    );
};


export default PurchasesPage;
