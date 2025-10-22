import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Modal, Input, Select, ExportDropdown } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
// Fix: Add missing imports
import { Expense, ExpenseCategory, Permission } from '../types';
import { apiFetchExpenses, apiCreateExpense, apiUpdateExpense, apiDeleteExpense, MOCK_STORES, MOCK_USERS } from '../services/mockApi';
import { USE_API, STRICT_API } from '../services/apiClient';
import { sanitizeNumbers } from '../utils/sanitize';
import { useToast } from '../contexts/ToastContext';
import { apiExpenses } from '../services/apiExpenses';
import { apiStores } from '../services/apiStores';
import { apiUsers } from '../services/apiUsers';

const ITEMS_PER_PAGE = 10;

const ExpensesPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [stores, setStores] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
    
    // Filter states
    const [filterStoreId, setFilterStoreId] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterDate, setFilterDate] = useState('');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    
    const [serverTotal, setServerTotal] = useState(0);
    useEffect(() => {
        const load = async () => {
            if (USE_API) {
                try {
                    const res = await apiExpenses.fetchExpenses({ page: currentPage, limit: ITEMS_PER_PAGE, storeId: filterStoreId || undefined, category: filterCategory || undefined, date: filterDate || undefined });
                    setExpenses((res as any)?.data || res);
                    setServerTotal(((res as any)?.meta?.total) || 0);
                } catch (e: any) {
                    if (e?.status === 403) {
                        addToast({ message: 'Accès refusé — permission requise: VIEW_EXPENSES', type: 'error' });
                        setExpenses([]);
                        setServerTotal(0);
                        return;
                    } else {
                        console.error('API expenses failed', e);
                        if (STRICT_API) {
                            addToast({ message: 'Erreur de chargement des dépenses.', type: 'error' });
                            setExpenses([]);
                            setServerTotal(0);
                        } else {
                            let all = apiFetchExpenses();
                            if (user?.storeId && !hasPermission(Permission.MANAGE_ROLES)) all = all.filter(exp => exp.storeId === user.storeId);
                            setExpenses(all);
                            setServerTotal(all.length);
                        }
                    }
                }
            } else {
                let all = apiFetchExpenses();
                if (user?.storeId && !hasPermission(Permission.MANAGE_ROLES)) all = all.filter(exp => exp.storeId === user.storeId);
                setExpenses(all);
                setServerTotal(all.length);
            }
        };
        load();
    }, [refreshKey, user, hasPermission, currentPage, filterStoreId, filterCategory, filterDate]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            if (filterStoreId && expense.storeId !== filterStoreId) return false;
            if (filterCategory && expense.category !== filterCategory) return false;
            if (filterDate && !expense.createdAt.startsWith(filterDate)) return false;
            return true;
        });
    }, [expenses, filterStoreId, filterCategory, filterDate]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStoreId, filterCategory, filterDate]);

    // Charger boutiques/utilisateurs pour libellés
    useEffect(() => {
        const loadRefs = async () => {
            if (USE_API) {
                if (hasPermission(Permission.VIEW_STORES)) {
                    try {
                        const st: any = await apiStores.fetchStores();
                        setStores(((st as any)?.data) || (st as any) || []);
                    } catch { setStores([]); }
                } else { setStores([]); }
                if (hasPermission(Permission.VIEW_USERS)) {
                    try {
                        const us: any = await apiUsers.fetchUsers();
                        setUsers(Array.isArray(us) ? us : (((us as any)?.data) || []));
                    } catch { setUsers([]); }
                } else { setUsers([]); }
            } else {
                setStores(MOCK_STORES);
                setUsers(MOCK_USERS);
            }
        };
        loadRefs();
    }, [hasPermission]);

    const storeMap = useMemo(() => new Map(((USE_API ? stores : MOCK_STORES) as any[]).map((s: any) => [s.id, s.name])), [stores]);
    const userMap = useMemo(() => new Map(((USE_API ? users : MOCK_USERS) as any[]).map((u: any) => [u.id, u.username || u.email || u.name])), [users]);

    const enrichedExpenses = useMemo(() => {
        return filteredExpenses.map(expense => ({
            ...expense,
            storeName: storeMap.get(expense.storeId) || 'N/A',
            userName: userMap.get(expense.userId) || 'N/A',
            amountFormatted: `${expense.amount.toLocaleString('fr-FR')} FCFA`,
        }));
    }, [filteredExpenses, storeMap, userMap]);

    const exportableData = useMemo(() => {
        return enrichedExpenses.map(exp => ({
            'Date': new Date(exp.createdAt).toLocaleDateString('fr-CA'),
            'Boutique': exp.storeName,
            'Catégorie': exp.category,
            'Description': exp.description,
            'Montant (FCFA)': exp.amount,
            'Enregistré par': exp.userName,
        }));
    }, [enrichedExpenses]);

    const exportColumns = ['Date', 'Boutique', 'Catégorie', 'Description', 'Montant (FCFA)', 'Enregistré par'];

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;

        const formData = new FormData(e.currentTarget);
        const baseData = sanitizeNumbers({
            storeId: user.storeId && !hasPermission(Permission.MANAGE_ROLES) ? user.storeId! : (formData.get('store') as string),
            userId: user.id,
            category: formData.get('category') as ExpenseCategory,
            description: formData.get('description') as string,
            amount: Number(formData.get('amount')),
        }, { keys: ['amount'] });
        // Backend crée createdAt côté serveur; ne pas l'envoyer en mode API.
        const expenseData: any = USE_API ? baseData : { ...baseData, createdAt: new Date().toISOString() };
        if (USE_API && !expenseData.storeId) {
            addToast({ message: 'Veuillez sélectionner une boutique.', type: 'error' });
            return;
        }

        try {
            if (editingExpense) {
                if (USE_API) await apiExpenses.updateExpense(editingExpense.id, expenseData);
                else await apiUpdateExpense(editingExpense.id, expenseData, user.id);
            } else {
                if (USE_API) await apiExpenses.createExpense(expenseData);
                else await apiCreateExpense(expenseData, user.id);
            }

            setIsModalOpen(false);
            setEditingExpense(null);
            setRefreshKey(k => k + 1);
        } catch (err: any) {
            addToast({ message: err?.message || 'Erreur lors de l’enregistrement de la dépense.', type: 'error' });
        }
    };
    
    const handleEditClick = (expense: Expense) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleDeleteExpense = async () => {
        if (!deletingExpenseId || !user) return;
        if (USE_API) await apiExpenses.deleteExpense(deletingExpenseId);
        else await apiDeleteExpense(deletingExpenseId, user.id);
        setDeletingExpenseId(null);
        setRefreshKey(k => k + 1);
    };

    const handleResetFilters = () => {
        setFilterStoreId('');
        setFilterCategory('');
        setFilterDate('');
    };

    // Fix: Explicitly type the `columns` array to match the enriched data structure.
    type EnrichedExpense = typeof enrichedExpenses[number];
    const columns: { header: string; accessor: keyof EnrichedExpense | ((item: EnrichedExpense) => React.ReactNode) }[] = [
        { header: 'Date', accessor: (item) => new Date(item.createdAt).toLocaleDateString('fr-FR') },
        { header: 'Boutique', accessor: 'storeName' },
        { header: 'Catégorie', accessor: 'category' },
        { header: 'Description', accessor: 'description' },
        { header: 'Montant', accessor: 'amountFormatted' },
        { header: 'Enregistré par', accessor: 'userName' },
        { header: 'Actions', accessor: (item: EnrichedExpense) => {
            if (!hasPermission(Permission.MANAGE_EXPENSES)) return null;
            return (
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleEditClick(item)}>Modifier</Button>
                    <Button variant="danger" size="sm" onClick={() => setDeletingExpenseId(item.id)}>Supprimer</Button>
                </div>
            );
        }},
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <p className="text-lg text-text-secondary">Suivez toutes les dépenses de votre entreprise.</p>
                <div className="flex items-center gap-2 self-end md:self-center">
                    <ExportDropdown data={exportableData} columns={exportColumns} filename="depenses" />
                    {hasPermission(Permission.MANAGE_EXPENSES) && <Button onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}>Enregistrer</Button>}
                </div>
            </div>
            
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Input 
                        label="Filtrer par date" id="filter-date" type="date"
                        value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                    />
                     <Select
                        label="Filtrer par boutique" id="filter-store" value={filterStoreId} onChange={(e) => setFilterStoreId(e.target.value)}
                        options={[{ value: '', label: 'Toutes les boutiques'}, ...((USE_API ? stores : MOCK_STORES) as any[]).map((s: any) => ({ value: s.id, label: s.name }))]}
                        disabled={!!user?.storeId && !hasPermission(Permission.MANAGE_ROLES)}
                    />
                    <Select
                        label="Filtrer par catégorie" id="filter-category" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                        options={[{ value: '', label: 'Toutes les catégories'}, ...Object.values(ExpenseCategory).map(c => ({ value: c, label: c }))]}
                    />
                    <Button variant="secondary" onClick={handleResetFilters} className="w-full">Réinitialiser</Button>
                </div>
            </Card>

            <Card>
                <Table 
                    columns={columns} 
                    data={enrichedExpenses}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    serverMode={USE_API}
                    totalItems={USE_API ? serverTotal : undefined}
                />
            </Card>
            
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} title={editingExpense ? "Modifier la dépense" : "Nouvelle Dépense"}>
                <form className="space-y-4" onSubmit={handleFormSubmit}>
                    <Select
                        label="Boutique"
                        id="store"
                        name="store"
                        defaultValue={user?.storeId ? user.storeId : editingExpense?.storeId}
                        disabled={!!user?.storeId && !hasPermission(Permission.MANAGE_ROLES)}
                        options={((USE_API ? stores : MOCK_STORES) as any[]).map((s: any) => ({ value: s.id, label: s.name }))}
                        required
                    />
                    <Select
                        label="Catégorie"
                        id="category"
                        name="category"
                        defaultValue={editingExpense?.category}
                        options={Object.values(ExpenseCategory).map(c => ({ value: c, label: c }))}
                        required
                    />
                    <Input label="Description" id="description" name="description" required defaultValue={editingExpense?.description}/>
                    <Input label="Montant (FCFA)" id="amount" name="amount" type="number" required min="0" defaultValue={editingExpense?.amount} />
                    
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); setEditingExpense(null); }}>Annuler</Button>
                        <Button type="submit">Enregistrer</Button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={!!deletingExpenseId} onClose={() => setDeletingExpenseId(null)} title="Confirmer la suppression">
                <div>
                    <p>Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible.</p>
                    <div className="flex justify-end space-x-2 pt-6">
                        <Button type="button" variant="secondary" onClick={() => setDeletingExpenseId(null)}>Annuler</Button>
                        <Button type="button" variant="danger" onClick={handleDeleteExpense}>Supprimer</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ExpensesPage;
