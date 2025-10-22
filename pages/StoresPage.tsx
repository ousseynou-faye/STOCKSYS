import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Modal, Input, ExportDropdown } from '../components/ui';
// Fix: Add missing imports
import { apiFetchStores, apiCreateStore, apiUpdateStore, apiDeleteStore } from '../services/mockApi';
import { USE_API } from '../services/apiClient';
import { apiStores } from '../services/apiStores';
import { Store } from '../types';
import { useAuth } from '../hooks/useAuth';

const ITEMS_PER_PAGE = 10;

const StoresPage: React.FC = () => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [stores, setStores] = useState<Store[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const load = async () => {
            if (USE_API) {
                try { setStores(await apiStores.fetchStores()); }
                catch (e) { console.error('API stores failed, fallback to mock', e); setStores(apiFetchStores()); }
            } else {
                setStores(apiFetchStores());
            }
        };
        load();
    }, [refreshKey]);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        const storeName = (e.currentTarget.elements.namedItem('store-name') as HTMLInputElement).value;
        if (!storeName.trim()) return;

        if (USE_API) {
            if (editingStore) await apiStores.updateStore(editingStore.id, { name: storeName });
            else await apiStores.createStore({ name: storeName });
        } else {
            if (editingStore) await apiUpdateStore(editingStore.id, { name: storeName }, user.id);
            else await apiCreateStore({ name: storeName }, user.id);
        }
        
        setIsModalOpen(false);
        setEditingStore(null);
        setRefreshKey(oldKey => oldKey + 1);
    };

    const handleDeleteStore = async () => {
        if (!deletingStoreId || !user) return;
        if (USE_API) await apiStores.deleteStore(deletingStoreId); else await apiDeleteStore(deletingStoreId, user.id);
        setDeletingStoreId(null);
        setRefreshKey(k => k + 1);
    };

    const handleEditClick = (store: Store) => {
        setEditingStore(store);
        setIsModalOpen(true);
    };

    const exportableData = useMemo(() => stores.map(store => ({
        'ID': store.id,
        'Nom de la Boutique': store.name,
    })), [stores]);
    const exportColumns = ['ID', 'Nom de la Boutique'];
    
    const columns: { header: string; accessor: keyof Store | ((item: Store) => React.ReactNode) }[] = [
        { header: 'ID', accessor: 'id' },
        { header: 'Nom de la Boutique', accessor: 'name' },
        { header: 'Actions', accessor: (item) => (
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleEditClick(item)}>Modifier</Button>
                <Button variant="danger" size="sm" onClick={() => setDeletingStoreId(item.id)}>Supprimer</Button>
            </div>
        )},
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Ajoutez et gérez les points de vente de votre entreprise.</p>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <ExportDropdown data={exportableData} columns={exportColumns} filename="boutiques" />
                    <Button onClick={() => { setEditingStore(null); setIsModalOpen(true); }}>Créer</Button>
                </div>
            </div>
            <Card>
                <Table 
                    columns={columns} 
                    data={stores}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingStore(null); }} title={editingStore ? "Modifier la boutique" : "Créer une nouvelle boutique"}>
                <form className="space-y-4" onSubmit={handleFormSubmit}>
                    <Input 
                        label="Nom de la boutique" 
                        id="store-name" 
                        name="store-name" 
                        type="text" 
                        required 
                        defaultValue={editingStore?.name}
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); setEditingStore(null); }}>Annuler</Button>
                        <Button type="submit">Enregistrer</Button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={!!deletingStoreId} onClose={() => setDeletingStoreId(null)} title="Confirmer la suppression">
                <div>
                    <p>Êtes-vous sûr de vouloir supprimer cette boutique ?</p>
                    <div className="flex justify-end space-x-2 pt-6">
                        <Button type="button" variant="secondary" onClick={() => setDeletingStoreId(null)}>Annuler</Button>
                        <Button type="button" variant="danger" onClick={handleDeleteStore}>Supprimer</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StoresPage;
