import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Modal, Input, ExportDropdown } from '../components/ui';
// Fix: Add missing imports
import { apiFetchCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '../services/mockApi';
import { USE_API } from '../services/apiClient';
import { apiCategories } from '../services/apiCategories';
import { Category } from '../types';
import { useAuth } from '../hooks/useAuth';

const ITEMS_PER_PAGE = 10;

const CategoriesPage: React.FC = () => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const load = async () => {
            if (USE_API) {
                try { setCategories(await apiCategories.fetchCategories()); }
                catch (e) { console.error('API categories failed, fallback to mock', e); setCategories(apiFetchCategories()); }
            } else {
                setCategories(apiFetchCategories());
            }
        };
        load();
    }, [refreshKey]);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        const categoryName = (e.currentTarget.elements.namedItem('category-name') as HTMLInputElement).value;
        if (!categoryName.trim()) return;

        if (USE_API) {
            if (editingCategory) await apiCategories.updateCategory(editingCategory.id, { name: categoryName });
            else await apiCategories.createCategory({ name: categoryName });
        } else {
            if (editingCategory) await apiUpdateCategory(editingCategory.id, { name: categoryName }, user.id);
            else await apiCreateCategory({ name: categoryName }, user.id);
        }
        
        setIsModalOpen(false);
        setEditingCategory(null);
        setRefreshKey(oldKey => oldKey + 1);
    };

    const handleDeleteCategory = async () => {
        if (!deletingCategoryId || !user) return;
        if (USE_API) await apiCategories.deleteCategory(deletingCategoryId); else await apiDeleteCategory(deletingCategoryId, user.id);
        setDeletingCategoryId(null);
        setRefreshKey(k => k + 1);
    };
    
    const handleEditClick = (category: Category) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };
    
    const filteredCategories = useMemo(() => {
        if (!searchTerm) {
            return categories;
        }
        return categories.filter(category =>
            category.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [categories, searchTerm]);
    
    // Reset page number when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const exportableData = useMemo(() => filteredCategories.map(cat => ({
        'ID': cat.id,
        'Nom de la Catégorie': cat.name,
    })), [filteredCategories]);

    const exportColumns = ['ID', 'Nom de la Catégorie'];

    const columns: { header: string; accessor: keyof Category | ((item: Category) => React.ReactNode) }[] = [
        { header: 'ID', accessor: 'id' },
        { header: 'Nom de la Catégorie', accessor: 'name' },
        { header: 'Actions', accessor: (item) => (
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleEditClick(item)}>Modifier</Button>
                <Button variant="danger" size="sm" onClick={() => setDeletingCategoryId(item.id)}>Supprimer</Button>
            </div>
        )},
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Organisez vos produits en créant des catégories.</p>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <ExportDropdown data={exportableData} columns={exportColumns} filename="categories" />
                    <Button onClick={() => { setEditingCategory(null); setIsModalOpen(true); }}>Créer</Button>
                </div>
            </div>

            <Card>
                <div className="mb-4">
                    <Input 
                        label="Rechercher une catégorie"
                        id="search-category"
                        placeholder="Entrez le nom de la catégorie..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Table 
                    columns={columns} 
                    data={filteredCategories}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingCategory(null); }} title={editingCategory ? "Modifier la catégorie" : "Créer une nouvelle catégorie"}>
                <form className="space-y-4" onSubmit={handleFormSubmit}>
                    <Input 
                        label="Nom de la catégorie" 
                        id="category-name" 
                        name="category-name" 
                        type="text" 
                        required 
                        defaultValue={editingCategory?.name}
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); setEditingCategory(null); }}>Annuler</Button>
                        <Button type="submit">Enregistrer</Button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={!!deletingCategoryId} onClose={() => setDeletingCategoryId(null)} title="Confirmer la suppression">
                <div>
                    <p>Êtes-vous sûr de vouloir supprimer cette catégorie ?</p>
                    <div className="flex justify-end space-x-2 pt-6">
                        <Button type="button" variant="secondary" onClick={() => setDeletingCategoryId(null)}>Annuler</Button>
                        <Button type="button" variant="danger" onClick={handleDeleteCategory}>Supprimer</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CategoriesPage;
