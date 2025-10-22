


import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Modal, Select, Input, ConfirmationModal, ExportDropdown } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
// Fix: Add missing imports
import { InventorySession, InventorySessionStatus, Store, Permission, Product, ProductType } from '../types';
import { 
    apiFetchInventorySessions,
    apiStartInventorySession,
    apiUpdateInventoryCount,
    apiConfirmInventoryAdjustments,
    MOCK_STORES,
    MOCK_PRODUCTS
} from '../services/mockApi';
import { USE_API } from '../services/apiClient';
import { apiInventory } from '../services/apiInventory';
import { apiStores } from '../services/apiStores';
import { apiProducts } from '../services/apiProducts';

const ITEMS_PER_PAGE = 10;

type ModalType = 'start' | 'counting' | 'review' | 'details' | null;

const StatusBadge: React.FC<{ status: InventorySessionStatus }> = ({ status }) => {
    const statusColors: Record<InventorySessionStatus, string> = {
        [InventorySessionStatus.IN_PROGRESS]: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        [InventorySessionStatus.REVIEW]: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        [InventorySessionStatus.COMPLETED]: 'bg-green-500/20 text-green-300 border border-green-500/30',
    };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[status]}`}>{status}</span>;
};

const InventoryPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    const [sessions, setSessions] = useState<InventorySession[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal and active session state
    const [modal, setModal] = useState<ModalType>(null);
    const [activeSession, setActiveSession] = useState<InventorySession | null>(null);
    const [counts, setCounts] = useState<Record<string, number>>({});

    // Confirmation modal
    const [confirmation, setConfirmation] = useState<{ isOpen: boolean; onConfirm: () => void; } | null>(null);
    
    // Pagination and filter state
    const [currentPage, setCurrentPage] = useState(1);
    const [filterStore, setFilterStore] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    
    useEffect(() => {
        const load = async () => {
            try {
                if (USE_API) {
                    const [sess, sts, prods] = await Promise.all([
                        apiInventory.fetchSessions(),
                        apiStores.fetchStores(),
                        apiProducts.fetchProducts(),
                    ]);
                    const filtered = (user?.storeId && !hasPermission(Permission.MANAGE_ROLES))
                        ? sess.filter((s: any) => s.storeId === user!.storeId)
                        : sess;
                    setSessions(filtered as any);
                    setStores(sts as any);
                    const prodArray = Array.isArray(prods) ? (prods as any) : (((prods as any) && (prods as any).data) ? (prods as any).data : []);
                    setProducts(prodArray as any);
                } else {
                    let allSessions = apiFetchInventorySessions();
                    if (user?.storeId && !hasPermission(Permission.MANAGE_ROLES)) {
                        allSessions = allSessions.filter(s => s.storeId === user.storeId);
                    }
                    setSessions(allSessions);
                    setStores(MOCK_STORES);
                    setProducts(MOCK_PRODUCTS);
                }
            } catch (e: any) {
                if (e?.status === 403) {
                    addToast({ message: 'Accès refusé — permission requise: PERFORM_INVENTORY', type: 'error' });
                    setSessions([]);
                    setStores([] as any);
                    setProducts([] as any);
                } else {
                    console.error('Inventory load failed, fallback to mock', e);
                    let allSessions = apiFetchInventorySessions();
                    if (user?.storeId && !hasPermission(Permission.MANAGE_ROLES)) {
                        allSessions = allSessions.filter(s => s.storeId === user.storeId);
                    }
                    setSessions(allSessions);
                    setStores(MOCK_STORES);
                    setProducts(MOCK_PRODUCTS);
                }
            }
        };
        load();
    }, [refreshKey, user, hasPermission]);

    const filteredSessions = useMemo(() => {
        return sessions.filter(s => 
            (!filterStore || s.storeId === filterStore) &&
            (!filterStatus || s.status === filterStatus)
        );
    }, [sessions, filterStore, filterStatus]);
    
    const enrichedSessions = useMemo(() => filteredSessions.map(s => ({
        ...s,
        storeName: (stores.find(store => store.id === s.storeId)?.name) || 'N/A'
    })), [filteredSessions, stores]);
    
    const exportableData = useMemo(() => enrichedSessions.map(s => ({
        'ID Session': `#${s.id.slice(-6).toUpperCase()}`,
        'Boutique': s.storeName,
        'Statut': s.status,
        'Date de Création': new Date(s.createdAt).toLocaleDateString('fr-CA'),
        'Date de Fin': s.completedAt ? new Date(s.completedAt).toLocaleDateString('fr-CA') : 'N/A',
        'Créé par (ID)': s.userId
    })), [enrichedSessions]);
    const exportColumns = ['ID Session', 'Boutique', 'Statut', 'Date de Création', 'Date de Fin', 'Créé par (ID)'];


    type EnrichedSession = typeof enrichedSessions[number];

    const handleStartSession = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        const formData = new FormData(e.currentTarget);
        const storeId = formData.get('storeId') as string;
        if (!storeId) {
            addToast({ message: 'Veuillez sélectionner une boutique.', type: 'error' });
            return;
        }
        const newSession = USE_API
            ? await apiInventory.startSession(storeId)
            : await apiStartInventorySession(storeId, user.id);
        setRefreshKey(k => k + 1);
        setModal(null);
        setActiveSession({ ...(newSession as any), items: (newSession as any)?.items || [] } as any);
        // Fix: Use variationId as the key for counts, not productId.
        const initialCounts = (newSession && (newSession as any).items ? (newSession as any).items : []).reduce((acc: any, item: any) => ({ ...acc, [item.variationId]: -1 }), {} as Record<string, number>);
        setCounts(initialCounts);
        setModal('counting');
        addToast({ message: `Inventaire pour ${MOCK_STORES.find(s=>s.id === storeId)?.name} démarré.`, type: 'success'});
    };
    
    const handleSaveCounts = async () => {
        if (!activeSession || !user) return;

        if (Object.values(counts).some(c => c === -1)) {
            setConfirmation({
                isOpen: true,
                onConfirm: async () => {
                     // Fix: Map keys to variationId to match the expected API type.
                    const updatedItems = Object.keys(counts)
                        .filter((variationId) => counts[variationId] !== -1) // Only send items that have been counted
                        .map((variationId) => ({ variationId, countedQuantity: counts[variationId] }));

                    const updatedSession = USE_API 
                        ? await apiInventory.updateCounts(activeSession.id, updatedItems, true)
                        : await apiUpdateInventoryCount(activeSession.id, updatedItems, user.id, true);
                    setActiveSession(updatedSession);
                    setRefreshKey(k => k + 1);
                    setModal('review');
                }
            });
            return;
        }

        // Fix: Map keys to variationId to match the expected API type.
        const updatedItems = Object.keys(counts)
            .filter((variationId) => counts[variationId] !== -1) // Only send items that have been counted
            .map((variationId) => ({ variationId, countedQuantity: counts[variationId] }));

        const updatedSession = USE_API 
            ? await apiInventory.updateCounts(activeSession.id, updatedItems, true)
            : await apiUpdateInventoryCount(activeSession.id, updatedItems, user.id, true);
        setActiveSession(updatedSession);
        setRefreshKey(k => k + 1);
        setModal('review');
    };

    const handleConfirmAdjustments = async () => {
        if (!user || !activeSession) return;
        if (USE_API) await apiInventory.confirm(activeSession.id);
        else await apiConfirmInventoryAdjustments(activeSession.id, user.id);
        setRefreshKey(k => k + 1);
        setModal(null);
        setActiveSession(null);
        addToast({ message: 'Ajustements de stock effectués avec succès.', type: 'success' });
    };

    const openSession = (session: EnrichedSession) => {
        setActiveSession(session);
        if (session.status === InventorySessionStatus.IN_PROGRESS) {
            // Fix: Use variationId as the key for counts.
            const initialCounts = session.items.reduce((acc, item) => ({ ...acc, [item.variationId]: item.countedQuantity === -1 ? -1 : item.countedQuantity }), {});
            setCounts(initialCounts);
            setModal('counting');
        } else if (session.status === InventorySessionStatus.REVIEW) {
            setModal('review');
        } else {
            setModal('details');
        }
    };
    
    const columns: { header: string; accessor: keyof EnrichedSession | ((item: EnrichedSession) => React.ReactNode); }[] = [
        { header: 'ID', accessor: (item) => `#${item.id.slice(-6).toUpperCase()}` },
        { header: 'Boutique', accessor: 'storeName' },
        { header: 'Statut', accessor: (item) => <StatusBadge status={item.status} /> },
        { header: 'Date de Création', accessor: (item) => new Date(item.createdAt).toLocaleDateString('fr-FR')},
        { header: 'Date de Fin', accessor: (item) => item.completedAt ? new Date(item.completedAt).toLocaleDateString('fr-FR') : 'N/A' },
    ];

    const getProductName = (variationId: string) => {
        // Fix: Find product and variation details using variationId.
        const list = Array.isArray(products) ? products : [];
        const product = list.find(p => p.id === variationId || p.variations?.some(v => v.id === variationId));
        if (!product) return 'N/A';

        const variation = product.variations?.find(v => v.id === variationId);
        if (variation && Object.values(variation.attributes).length > 0) {
            return `${product.name} (${Object.values(variation.attributes).join(' / ')})`;
        }
        return product.name;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Gérez et suivez les audits de stock physiques.</p>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <ExportDropdown data={exportableData} columns={exportColumns} filename="inventaires" />
                    <Button onClick={() => setModal('start')}>Nouvel Inventaire</Button>
                </div>
            </div>
            <Card>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Select label="Filtrer par boutique" id="filter-store" value={filterStore} onChange={e => setFilterStore(e.target.value)} options={[{ value: '', label: 'Toutes'}, ...stores.map(s => ({ value: s.id, label: s.name }))]} disabled={!!user?.storeId && !hasPermission(Permission.MANAGE_ROLES)}/>
                    <Select label="Filtrer par statut" id="filter-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} options={[{ value: '', label: 'Tous'}, ...Object.values(InventorySessionStatus).map(s => ({ value: s, label: s }))]} />
                    <Button variant="secondary" onClick={() => { setFilterStore(''); setFilterStatus(''); }}>Réinitialiser</Button>
                </div>
            </Card>
            <Card>
                <Table 
                    columns={columns} 
                    data={enrichedSessions} 
                    currentPage={currentPage} 
                    itemsPerPage={ITEMS_PER_PAGE} 
                    onPageChange={setCurrentPage}
                    onRowClick={openSession}
                />
            </Card>
            
            {/* Start Modal */}
            <Modal isOpen={modal === 'start'} onClose={() => setModal(null)} title="Démarrer un nouvel inventaire">
                <form className="space-y-4" onSubmit={handleStartSession}>
                    <Select 
                        label="Sélectionner la boutique"
                        id="storeId"
                        name="storeId"
                        options={user?.storeId && !hasPermission(Permission.MANAGE_ROLES) ? 
                            stores.filter(s => s.id === user.storeId).map(s => ({ value: s.id, label: s.name }))
                            : stores.map(s => ({ value: s.id, label: s.name }))
                        }
                        defaultValue={user?.storeId || ''}
                    />
                     <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setModal(null)}>Annuler</Button>
                        <Button type="submit">Démarrer</Button>
                    </div>
                </form>
            </Modal>
            
            {/* Counting & Review Modals */}
            {(modal === 'counting' || modal === 'review' || modal === 'details') && activeSession && (
                <Modal 
                    isOpen={true} 
                    onClose={() => setModal(null)} 
                    title={`Inventaire #${activeSession.id.slice(-6)} - ${stores.find(s => s.id === activeSession.storeId)?.name || 'N/A'}`}
                    wrapperClassName="md:max-w-4xl"
                >
                    <div className="max-h-[70vh] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-surface">
                                <tr className="border-b border-secondary">
                                    <th className="p-2">Produit</th>
                                    <th className="p-2 text-center">Qté Théorique</th>
                                    <th className="p-2 text-center">Qté Comptée</th>
                                    {modal !== 'counting' && <th className="p-2 text-center">Écart</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {activeSession.items.map(item => {
                                    const counted = modal === 'counting' ? (counts[item.variationId] ?? -1) : item.countedQuantity;
                                    const variance = counted - item.theoreticalQuantity;
                                    return (
                                        // Fix: Use variationId for the key and all related logic.
                                        <tr key={item.variationId} className="border-b border-secondary/50">
                                            <td className="p-2">{getProductName(item.variationId)}</td>
                                            <td className="p-2 text-center">{item.theoreticalQuantity}</td>
                                            <td className="p-2 text-center">
                                                {modal === 'counting' ? (
                                                    <Input
                                                        label=""
                                                        id={`count-${item.variationId}`}
                                                        type="number"
                                                        className="w-24 mx-auto text-center"
                                                        value={counts[item.variationId] === -1 ? '' : counts[item.variationId]}
                                                        onChange={e => setCounts({...counts, [item.variationId]: parseInt(e.target.value, 10) || 0})}
                                                        min="0"
                                                        placeholder="Qté"
                                                    />
                                                ) : item.countedQuantity}
                                            </td>
                                            {modal !== 'counting' && (
                                                <td className={`p-2 text-center font-bold ${variance > 0 ? 'text-green-400' : variance < 0 ? 'text-red-400' : ''}`}>
                                                    {variance > 0 ? `+${variance}` : variance}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                     <div className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
                        {modal === 'counting' && <Button onClick={handleSaveCounts}>Sauvegarder et Réviser</Button>}
                        {modal === 'review' && <Button variant="secondary" onClick={() => setModal('counting')}>Retour au comptage</Button>}
                        {modal === 'review' && <Button onClick={() => setConfirmation({ isOpen: true, onConfirm: handleConfirmAdjustments })}>Confirmer & Ajuster</Button>}
                        <Button variant="secondary" onClick={() => setModal(null)}>Fermer</Button>
                    </div>
                </Modal>
            )}

            {confirmation?.isOpen && (
                <ConfirmationModal
                    isOpen={true}
                    title={Object.values(counts).some(c => c === -1) ? "Produits non comptés" : "Confirmer l'ajustement"}
                    onClose={() => setConfirmation(null)}
                    onConfirm={() => {
                        confirmation.onConfirm();
                        setConfirmation(null);
                    }}
                >
                    {Object.values(counts).some(c => c === -1) ? 
                        <p>Certains produits n'ont pas été comptés. Leur quantité sera considérée comme 0. Voulez-vous continuer ?</p>
                        : 
                        <p>Cette action mettra à jour définitivement les niveaux de stock en fonction des quantités comptées. Êtes-vous sûr de vouloir continuer ?</p>
                    }
                </ConfirmationModal>
            )}
        </div>
    );
};

export default InventoryPage;
