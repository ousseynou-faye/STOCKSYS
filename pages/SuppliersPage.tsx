import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Table, Button, Modal, Input, Select, ExportDropdown, ConfirmationModal } from '../components/ui';
import { apiFetchSuppliers, apiCreateSupplier, apiUpdateSupplier, apiDeleteSupplier, apiFetchSupplierProducts, apiAddProductToSupplier, apiRemoveProductFromSupplier, MOCK_PRODUCTS } from '../services/mockApi';
import { USE_API, STRICT_API } from '../services/apiClient';
import { apiSuppliers } from '../services/apiSuppliers';
import { apiProducts } from '../services/apiProducts';
// Fix: Add missing imports
import { Supplier, SupplierProduct, ProductType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { TrashIcon } from '../components/icons';

const ITEMS_PER_PAGE = 10;

const SuppliersPage: React.FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // State for suppliers list
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [serverTotal, setServerTotal] = useState(0);

    // State for CRUD modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null);

    // State for details/catalog modal
    const [detailsSupplier, setDetailsSupplier] = useState<Supplier | null>(null);
    const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productPage, setProductPage] = useState(1);
    const [productTotal, setProductTotal] = useState(0);
    const [products, setProducts] = useState<any[]>([]);

    // Load products/variations for labels/options
    useEffect(() => {
        const loadProducts = async () => {
            if (USE_API) {
                try {
                    const p: any = await apiProducts.fetchProducts({ limit: 500 });
                    const arr = ((p as any)?.data) || (p as any) || [];
                    setProducts(arr as any);
                } catch (e) {
                    console.error('API products failed for suppliers page', e);
                    setProducts(STRICT_API ? [] : (MOCK_PRODUCTS as any));
                }
            } else {
                setProducts(MOCK_PRODUCTS as any);
            }
        };
        loadProducts();
    }, []);

    // Fetch suppliers
    useEffect(() => {
        const fetchAndFilter = async () => {
            let allSuppliers: any = [];
            if (USE_API) {
                try {
                    const res = await apiSuppliers.fetchSuppliers({ page: currentPage, limit: ITEMS_PER_PAGE, name: searchTerm || undefined });
                    allSuppliers = res?.data || [];
                    setServerTotal(res?.meta?.total || 0);
                } catch (e) {
                    console.error('API suppliers failed', e);
                    allSuppliers = STRICT_API ? [] : apiFetchSuppliers();
                }
            } else {
                allSuppliers = apiFetchSuppliers();
            }
            setSuppliers(allSuppliers);
            
            // Handle search param from global search
            const searchId = searchParams.get('search');
            if (searchId) {
                const foundSupplier = allSuppliers.find(s => s.id === searchId);
                if (foundSupplier) {
                    setDetailsSupplier(foundSupplier);
                }
                searchParams.delete('search');
                setSearchParams(searchParams);
            }
        };
        fetchAndFilter();
    }, [refreshKey, searchParams, setSearchParams, currentPage, searchTerm]);
    
    // Fetch supplier products when a supplier is selected for details view
    useEffect(() => {
        if (detailsSupplier) {
            const load = async () => {
                if (USE_API) {
                    try {
                        const res = await apiSuppliers.fetchSupplierProducts(detailsSupplier.id, { page: productPage, limit: 5 });
                        setSupplierProducts((res as any)?.data || res);
                        setProductTotal(((res as any)?.meta?.total) || ((res as any)?.data?.length || 0));
                    } catch (e) {
                        console.error('API supplier products failed, fallback', e);
                        const arr = apiFetchSupplierProducts(detailsSupplier.id);
                        setSupplierProducts(arr);
                        setProductTotal(arr.length);
                    }
                } else {
                    const arr = apiFetchSupplierProducts(detailsSupplier.id);
                    setSupplierProducts(arr);
                    setProductTotal(arr.length);
                }
            };
            load();
        }
    }, [detailsSupplier, refreshKey, productPage]);

    const filteredSuppliers = useMemo(() => {
        if (!searchTerm) return suppliers;
        return suppliers.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [suppliers, searchTerm]);

    const handleEditClick = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsEditModalOpen(true);
    };
    
    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        const formData = new FormData(e.currentTarget);
        const toU = (v: FormDataEntryValue | null) => { const s = (v as string) || ''; return s.trim() === '' ? undefined : s.trim(); };
        let supplierData: Omit<Supplier, 'id'> & { paymentTerms?: string } = {
            name: (formData.get('name') as string).trim(),
            contactPerson: toU(formData.get('contactPerson')) as any,
            phone: toU(formData.get('phone')) as any,
            email: toU(formData.get('email')) as any,
            address: toU(formData.get('address')) as any,
            paymentTerms: toU(formData.get('paymentTerms')) as any,
        };
        // En mode API, on envoie aussi paymentTerms et contactPerson (schéma aligné)
        if (USE_API) {
            if (editingSupplier) await apiSuppliers.updateSupplier(editingSupplier.id, supplierData);
            else await apiSuppliers.createSupplier(supplierData);
        } else {
            if (editingSupplier) await apiUpdateSupplier(editingSupplier.id, supplierData, user.id);
            else await apiCreateSupplier(supplierData, user.id);
        }
        setIsEditModalOpen(false);
        setEditingSupplier(null);
        setRefreshKey(k => k + 1);
    };
    
    const handleDeleteSupplier = async () => {
        if (!deletingSupplierId || !user) return;
        if (USE_API) await apiSuppliers.deleteSupplier(deletingSupplierId); else await apiDeleteSupplier(deletingSupplierId, user.id);
        setDeletingSupplierId(null);
        setRefreshKey(k => k + 1);
    };
    
    const handleAddProductToSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!detailsSupplier || !user) return;
        const formData = new FormData(e.currentTarget);
        const variationId = formData.get('variationId') as string;
        // Fix: Construct a full SupplierProduct object with a composite ID to satisfy the type.
        const data: Omit<SupplierProduct, 'id'> = {
            supplierId: detailsSupplier.id,
            variationId: variationId,
            purchasePrice: Number(formData.get('purchasePrice')),
            supplierSku: formData.get('supplierSku') as string,
        };
        if (USE_API) await apiSuppliers.addProduct(detailsSupplier.id, data); else await apiAddProductToSupplier(data, user.id);
        setIsProductModalOpen(false);
        setRefreshKey(k => k + 1);
    };
    
    const handleRemoveProduct = async (variationId: string) => {
        if (!detailsSupplier || !user) return;
        // Fix: Changed productId to variationId to correctly call the API.
        if (USE_API) await apiSuppliers.removeProduct(detailsSupplier.id, variationId); else await apiRemoveProductFromSupplier(detailsSupplier.id, variationId, user.id);
        setRefreshKey(k => k + 1);
    };
    
    const exportableData = useMemo(() => filteredSuppliers.map(s => ({
        'ID': s.id,
        'Nom': s.name,
        'Contact': s.contactPerson,
        'Téléphone': s.phone,
        'Email': s.email,
        'Adresse': s.address,
        'Conditions de Paiement': s.paymentTerms,
    })), [filteredSuppliers]);
    const exportColumns = ['ID', 'Nom', 'Contact', 'Téléphone', 'Email', 'Adresse', 'Conditions de Paiement'];

    const supplierColumns: { header: string; accessor: keyof Supplier | ((item: Supplier) => React.ReactNode) }[] = [
        { header: 'Nom', accessor: 'name' },
        { header: 'Contact', accessor: 'contactPerson' },
        { header: 'Téléphone', accessor: 'phone' },
        { header: 'Email', accessor: 'email' },
        { header: 'Actions', accessor: (item) => (
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleEditClick(item)}>Modifier</Button>
                <Button variant="danger" size="sm" onClick={() => setDeletingSupplierId(item.id)}>Supprimer</Button>
            </div>
        )},
    ];
    
    const enrichedSupplierProducts = useMemo(() => {
        const src = USE_API ? products : (MOCK_PRODUCTS as any[]);
        return supplierProducts.map(sp => {
            const product = src.find(p => p.id === sp.variationId || p.variations?.some((v: any) => v.id === sp.variationId));
            if (!product) return { ...sp, productName: 'Produit Inconnu' };
            const variation = product.variations?.find((v: any) => v.id === sp.variationId);
            const variationName = variation && Object.values(variation.attributes || {}).length > 0 ? ` (${Object.values(variation.attributes).join(' / ')})` : '';
            return { ...sp, productName: `${product.name}${variationName}` };
        });
    }, [supplierProducts, products]);
    type EnrichedSupplierProduct = typeof enrichedSupplierProducts[number];
    
    const productColumns: { header: string; accessor: keyof EnrichedSupplierProduct | ((item: EnrichedSupplierProduct) => React.ReactNode) }[] = [
        { header: 'Produit', accessor: 'productName' },
        { header: 'Prix d\'achat', accessor: (item) => `${item.purchasePrice.toLocaleString('fr-FR')} FCFA` },
        { header: 'SKU Fournisseur', accessor: 'supplierSku' },
        { header: 'Actions', accessor: (item) => (
            // Fix: Pass variationId to the remove handler.
            <Button variant="danger" size="sm" onClick={() => handleRemoveProduct(item.variationId)}><TrashIcon /></Button>
        )},
    ];
    
    const availableProductsForSupplier = useMemo(() => {
        if (!detailsSupplier) return [];
        const supplierVariationIds = new Set(supplierProducts.map(sp => sp.variationId));
        const available: { label: string, value: string }[] = [];
        const src = USE_API ? products : (MOCK_PRODUCTS as any[]);
        src.forEach((p: any) => {
            if (USE_API) {
                if (Array.isArray(p.variations)) {
                    p.variations.forEach((v: any) => {
                        if (!supplierVariationIds.has(v.id)) {
                            const labelAttrs = v.attributes ? Object.values(v.attributes).join(' / ') : '';
                            available.push({ label: `${p.name}${labelAttrs ? ` (${labelAttrs})` : ''}`, value: v.id });
                        }
                    });
                }
            } else {
                if ((p.type === ProductType.STANDARD || p.type === ProductType.BUNDLE) && p.id) {
                    if (!supplierVariationIds.has(p.id)) available.push({ label: p.name, value: p.id });
                } else if (p.variations) {
                    p.variations.forEach((v: any) => {
                        if (!supplierVariationIds.has(v.id)) {
                            available.push({ label: `${p.name} (${Object.values(v.attributes).join(' / ')})`, value: v.id });
                        }
                    });
                }
            }
        });
        return available;
    }, [detailsSupplier, supplierProducts, products, USE_API]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Gérez vos fournisseurs et leurs catalogues de produits.</p>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <ExportDropdown data={exportableData} columns={exportColumns} filename="fournisseurs" />
                    <Button onClick={() => { setEditingSupplier(null); setIsEditModalOpen(true); }}>Ajouter</Button>
                </div>
            </div>

            <Card>
                <div className="mb-4">
                     <Input 
                        label="Rechercher un fournisseur"
                        id="search-supplier"
                        placeholder="Nom ou contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Table 
                    columns={supplierColumns} 
                    data={USE_API ? suppliers : filteredSuppliers}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    serverMode={USE_API}
                    totalItems={USE_API ? serverTotal : undefined}
                    onRowClick={(supplier) => setDetailsSupplier(supplier)}
                />
            </Card>

            {/* Details/Catalog Modal */}
            {detailsSupplier && (
                <Modal isOpen={true} onClose={() => setDetailsSupplier(null)} title={`Catalogue de ${detailsSupplier.name}`} wrapperClassName="md:max-w-3xl">
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <h3 className="text-lg font-semibold">Produits fournis</h3>
                            <Button size="sm" onClick={() => setIsProductModalOpen(true)}>Ajouter un produit</Button>
                        </div>
                        {enrichedSupplierProducts.length > 0 ? (
                            <Table 
                                columns={productColumns} 
                                data={enrichedSupplierProducts} 
                                currentPage={productPage} itemsPerPage={5} onPageChange={setProductPage} serverMode={USE_API} totalItems={USE_API ? productTotal : undefined} 
                            />
                        ) : (
                            <p className="text-text-secondary text-center p-4">Aucun produit dans le catalogue de ce fournisseur.</p>
                        )}
                        <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Ajouter un produit au catalogue">
                            <form className="space-y-4" onSubmit={handleAddProductToSupplier}>
                                {/* Fix: Changed Select to use variationId and correct options */}
                                <Select 
                                    label="Produit"
                                    id="variationId"
                                    name="variationId"
                                    options={[{ value: '', label: 'Sélectionner un produit...' }, ...availableProductsForSupplier]}
                                    required
                                />
                                <Input label="Prix d'achat (FCFA)" id="purchasePrice" name="purchasePrice" type="number" required />
                                <Input label="SKU Fournisseur (Optionnel)" id="supplierSku" name="supplierSku" />
                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button type="button" variant="secondary" onClick={() => setIsProductModalOpen(false)}>Annuler</Button>
                                    <Button type="submit">Ajouter</Button>
                                </div>
                            </form>
                        </Modal>
                    </div>
                </Modal>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingSupplier(null); }} title={editingSupplier ? "Modifier le fournisseur" : "Ajouter un fournisseur"}>
                <form className="space-y-4" onSubmit={handleFormSubmit}>
                    <Input label="Nom" id="name" name="name" required defaultValue={editingSupplier?.name} />
                    <Input label="Personne de contact" id="contactPerson" name="contactPerson" required defaultValue={editingSupplier?.contactPerson} />
                    <Input label="Téléphone" id="phone" name="phone" required defaultValue={editingSupplier?.phone} />
                    <Input label="Email" id="email" name="email" type="email" required defaultValue={editingSupplier?.email} />
                    <Input label="Adresse" id="address" name="address" required defaultValue={editingSupplier?.address} />
                    <Input label="Conditions de paiement" id="paymentTerms" name="paymentTerms" required defaultValue={editingSupplier?.paymentTerms} />
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => { setIsEditModalOpen(false); setEditingSupplier(null); }}>Annuler</Button>
                        <Button type="submit">Enregistrer</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal 
                isOpen={!!deletingSupplierId} 
                onClose={() => setDeletingSupplierId(null)} 
                onConfirm={handleDeleteSupplier}
                title="Confirmer la suppression"
            >
                <p>Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.</p>
            </ConfirmationModal>
        </div>
    );
};

export default SuppliersPage;

