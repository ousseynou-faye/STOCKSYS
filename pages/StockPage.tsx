import React, { useState, useMemo, useEffect } from 'react';
import { Card, Table, Button, Modal, Input, Select, ExportDropdown } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { Product, Category, Store, ProductStock, Permission, ProductType, ProductVariation, BundleComponent } from '../types';
import { 
    apiFetchProducts, 
    apiFetchCategories, 
    apiFetchStores, 
    apiFetchStock,
    apiCreateProduct,
    apiUpdateProduct,
    apiAdjustStock,
    apiCreateStockTransfer
} from '../services/mockApi';
import { USE_API, STRICT_API } from '../services/apiClient';
import { apiProducts } from '../services/apiProducts';
import { apiCategories } from '../services/apiCategories';
import { apiStores } from '../services/apiStores';
import { apiStock as apiStockSvc } from '../services/apiStock';
import { TrashIcon, PlusIcon } from '../components/icons';

const ITEMS_PER_PAGE = 10;

const StockPage: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Gestion de Stock</h1>
            <StockLevelList />
        </div>
    );
};

// ===================================================================================
// Stock Level Component
// ===================================================================================
const StockLevelList: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    const [stockLevels, setStockLevels] = useState<ProductStock[]>([]);
    const [serverTotal, setServerTotal] = useState(0);
    const [products, setProducts] = useState<Product[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustingStock, setAdjustingStock] = useState<any | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    
    // Filtering and pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [filterStore, setFilterStore] = useState(user?.storeId || '');
    
    useEffect(() => {
        const load = async () => {
            if (USE_API) {
                try {
                    const sPromise = apiStockSvc.fetchStock({ page: currentPage, limit: ITEMS_PER_PAGE, storeId: filterStore || undefined });
                    const pPromise = apiProducts.fetchProducts();
                    const stPromise = hasPermission(Permission.VIEW_STORES) ? apiStores.fetchStores() : Promise.resolve([]);
                    const cPromise = hasPermission(Permission.VIEW_CATEGORIES) ? apiCategories.fetchCategories() : Promise.resolve([]);
                    const [s, p, st, c] = await Promise.all([sPromise, pPromise, stPromise, cPromise]);
                    setStockLevels((s as any)?.data || s);
                    setServerTotal(((s as any)?.meta?.total) || ((s as any)?.data?.length || 0));
                    setProducts(((p as any)?.data) || (p as any));
                    setStores(((st as any)?.data) || (st as any) || []);
                    setCategories(((c as any)?.data) || (c as any) || []);
                } catch (e: any) {
                    if (e?.status === 403) {
                        addToast({ message: 'Acc√®s refus√© ‚Äî permission requise: VIEW_STOCK', type: 'error' });
                        setStockLevels([]);
                        setProducts([]);
                        setStores([]);
                        setCategories([]);
                        return;
                    } else {
                        console.error('API stock/products failed', e);
                        if (STRICT_API) {
                            addToast({ message: "Erreur de chargement du stock/produits.", type: 'error' });
                            setStockLevels([]);
                            setProducts([]);
                            setStores([]);
                            setCategories([]);
                        } else {
                            setStockLevels(apiFetchStock());
                            setProducts(apiFetchProducts());
                            setStores(hasPermission(Permission.VIEW_STORES) ? apiFetchStores() : []);
                            setCategories(hasPermission(Permission.VIEW_CATEGORIES) ? apiFetchCategories() : []);
                        }
                    }
                }
            } else {
                setStockLevels(apiFetchStock());
                setProducts(apiFetchProducts());
                setStores(apiFetchStores());
                setCategories(apiFetchCategories());
            }
        };
        load();
    }, [refreshKey, currentPage, filterStore, hasPermission]);
    
    const enrichedStock = useMemo(() => {
        return stockLevels
            .filter(s => !filterStore || s.storeId === filterStore)
            .map(s => {
                let product: Product | undefined;
                let variation: ProductVariation | undefined;

                for (const p of products) {
                    if (p.id === s.variationId || p.variations?.some(v => v.id === s.variationId)) {
                        product = p;
                        variation = p.variations?.find(v => v.id === s.variationId) ?? (p.type === ProductType.STANDARD ? p.variations?.[0] : undefined);
                        if (p.type === ProductType.STANDARD && p.id === s.variationId) {
                            variation = { id: p.id, productId: p.id, sku: p.sku || '', price: p.price || 0, attributes: {} };
                        }
                        break;
                    }
                }

                if (!product || !variation) return null;

                const variationName = product.type === ProductType.VARIABLE ? Object.values(variation.attributes).join(' / ') : '';
                
                return {
                    id: s.id,
                    productName: product.name,
                    variationName,
                    variationId: s.variationId,
                    sku: variation.sku,
                    storeId: s.storeId,
                    storeName: stores.find(st => st.id === s.storeId)?.name || 'N/A',
                    quantity: s.quantity,
                    isLow: product ? s.quantity <= product.lowStockThreshold : false
                };
            }).filter(Boolean); // Remove nulls
    }, [stockLevels, products, stores, filterStore]);

    const handleAdjustStock = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !adjustingStock) return;
        const formData = new FormData(e.currentTarget);
        const raw = formData.get('newQuantity');
        const parsedQty = Number(raw);
        if (!Number.isFinite(parsedQty) || parsedQty < 0) { addToast({ message: 'QuantitÈ invalide. Entrez un nombre = 0.', type: 'error' }); return; }
        if (Math.floor(parsedQty) !== parsedQty) { addToast({ message: 'La quantitÈ doit Ítre un entier.', type: 'error' }); return; }
        const newQuantity = parsedQty;
        if (typeof adjustingStock.quantity === 'number' && newQuantity === adjustingStock.quantity) { addToast({ message: 'Aucune modification: quantitÈ identique.', type: 'info' }); return; }
        const ok = window.confirm(`Confirmer l'ajustement du stock
${adjustingStock.productName} ${adjustingStock.variationName ? '('+adjustingStock.variationName+')' : ''}
${adjustingStock.storeName}
${adjustingStock.quantity} ? ${newQuantity}`);
        if (!ok) return;

        try { if (USE_API) await apiStockSvc.adjust(adjustingStock.variationId, adjustingStock.storeId, newQuantity); else await apiAdjustStock(adjustingStock.variationId, adjustingStock.storeId, newQuantity, user.id); } catch (err) { addToast({ message: (err as any)?.message || 'Echec de l\'ajustement du stock.', type: 'error' }); return; }
        addToast({ message: "Stock ajuste.", type: 'success' });
        
        setIsAdjustModalOpen(false);
        setAdjustingStock(null);
        setRefreshKey(k => k + 1);
    };
    
    const handleEditProductClick = (variationId: string) => {
        const product = products.find(p => p.variations?.some(v => v.id === variationId) || p.id === variationId);
        if (product) {
            setEditingProduct(product);
            setIsProductModalOpen(true);
        }
    };

    const columns = [
        { header: 'Produit', accessor: (item: any) => (
            <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-text-secondary">{item.variationName}</p>
            </div>
        ) },
        { header: 'Boutique', accessor: 'storeName' },
        { header: 'SKU', accessor: 'sku' },
        { header: 'Quantit√©', accessor: (item: any) => (
            <span className={item.isLow ? 'text-danger font-bold' : ''}>{item.quantity}</span>
        ) },
        { header: 'Actions', accessor: (item: any) => {
            if (!hasPermission(Permission.MANAGE_STOCK)) return null;
            return <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setAdjustingStock(item); setIsAdjustModalOpen(true); }}>Ajuster</Button>
                <Button variant="secondary" size="sm" onClick={() => handleEditProductClick(item.variationId)}>Fiche</Button>
            </div>
        }},
    ];

    const exportableData = enrichedStock.map(s => ({
        'Produit': s?.productName,
        'Variation': s?.variationName,
        'SKU': s?.sku,
        'Boutique': s?.storeName,
        'Quantit√©': s?.quantity
    }));

    return (
        <div className="space-y-4">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Consultez et g√©rez les produits et leurs niveaux de stock.</p>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <ExportDropdown data={exportableData} columns={['Produit', 'Variation', 'SKU', 'Boutique', 'Quantit√©']} filename="niveaux_de_stock" />
                    {hasPermission(Permission.MANAGE_STOCK_TRANSFERS) && <Button variant="secondary" onClick={() => setIsTransferModalOpen(true)}>Nouveau Transfert</Button>}
                    {hasPermission(Permission.MANAGE_STOCK) && <Button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}>Nouveau Produit</Button>}
                </div>
            </div>
            <Card>
                <div className="mb-4 max-w-sm">
                    <Select 
                        label="Filtrer par boutique" 
                        id="filter-store" 
                        value={filterStore}
                        onChange={e => setFilterStore(e.target.value)}
                        options={[{value: '', label: 'Toutes'}, ...stores.map(s => ({value: s.id, label: s.name}))]}
                        disabled={!!user?.storeId}
                    />
                </div>
                <Table columns={columns} data={enrichedStock as any[]} currentPage={currentPage} itemsPerPage={ITEMS_PER_PAGE} serverMode={USE_API} totalItems={USE_API ? serverTotal : undefined} onPageChange={setCurrentPage} />
            </Card>

            {isTransferModalOpen && <StockTransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} stores={stores} stockLevels={stockLevels} products={products} defaultFromStoreId={filterStore || user?.storeId || ''} onSave={() => setRefreshKey(k => k+1)} />}

            {isProductModalOpen && <ProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} product={editingProduct} categories={categories} allProducts={products} onSave={() => setRefreshKey(k => k + 1)} />}

            {adjustingStock && (
                <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Ajuster le Stock">
                    <form className="space-y-4" onSubmit={handleAdjustStock}>
                        <p>Produit: <span className="font-bold">{adjustingStock.productName} ({adjustingStock.variationName})</span></p>
                        <p>Boutique: <span className="font-bold">{adjustingStock.storeName}</span></p>
                        <p>Quantit√© actuelle: <span className="font-bold">{adjustingStock.quantity}</span></p>
                        <Input label="Nouvelle quantit√©" id="newQuantity" name="newQuantity" type="number" required defaultValue={adjustingStock.quantity} />
                         <div className="flex justify-end space-x-2 pt-4">
                            <Button type="button" variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>Annuler</Button>
                            <Button type="submit">Enregistrer</Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

// ===================================================================================
// Transfer Modal Component
// ===================================================================================
interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    stores: Store[];
    stockLevels: ProductStock[];
    products: Product[];
    onSave: () => void;
}
const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, stores, stockLevels, products, onSave }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [fromStoreId, setFromStoreId] = useState('');
    const [toStoreId, setToStoreId] = useState('');
    const [transferItems, setTransferItems] = useState<{ variationId: string; quantity: number }[]>([]);

    const availableProductsForTransfer = useMemo(() => {
        if (!fromStoreId) return [];
        const stockInStore = stockLevels.filter(s => s.storeId === fromStoreId && s.quantity > 0);
        return stockInStore.map(s => {
            const product = products.find(p => p.id === s.variationId || p.variations?.some(v => v.id === s.variationId));
            const variation = product?.variations?.find(v => v.id === s.variationId);
            const variationName = variation ? ` (${Object.values(variation.attributes).join(' / ')})` : '';
            return {
                value: s.variationId,
                label: `${product?.name || 'N/A'}${variationName}`
            };
        });
    }, [fromStoreId, stockLevels, products]);

    const handleAddItem = (variationId: string) => {
        if (!variationId || transferItems.some(item => item.variationId === variationId)) return;
        setTransferItems(prev => [...prev, { variationId, quantity: 1 }]);
    };

    const handleQuantityChange = (variationId: string, quantity: number) => {
        const stockItem = stockLevels.find(s => s.variationId === variationId && s.storeId === fromStoreId);
        const maxQuantity = stockItem ? stockItem.quantity : 0;
        const validQuantity = Math.max(0, Math.min(quantity, maxQuantity));
        setTransferItems(prev => prev.map(item => item.variationId === variationId ? { ...item, quantity: validQuantity } : item));
    };

    const handleRemoveItem = (variationId: string) => {
        setTransferItems(prev => prev.filter(item => item.variationId !== variationId));
    };

    const getVariationDetails = (variationId: string) => {
        const product = products.find(p => p.id === variationId || p.variations?.some(v => v.id === variationId));
        const variation = product?.variations?.find(v => v.id === variationId);
        const variationName = variation ? ` (${Object.values(variation.attributes).join(' / ')})` : '';
        return {
            name: product?.name || 'N/A',
            variationName: variationName,
            stock: stockLevels.find(s => s.variationId === variationId && s.storeId === fromStoreId)?.quantity || 0,
        };
    };

    const handleSubmit = async () => {
        if (!user || !fromStoreId || !toStoreId || transferItems.length === 0) {
            addToast({ message: "Veuillez remplir tous les champs.", type: 'error' });
            return;
        }
        if (fromStoreId === toStoreId) {
            addToast({ message: "Les boutiques d'origine et de destination doivent √™tre diff√©rentes.", type: 'error' });
            return;
        }
        await apiCreateStockTransfer(fromStoreId, toStoreId, transferItems.filter(i => i.quantity > 0), user.id);
        addToast({ message: 'Transfert de stock enregistr√©.', type: 'success' });
        onSave();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nouveau Transfert de Stock" wrapperClassName="md:max-w-3xl">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label="De" id="fromStore" options={stores.map(s => ({ value: s.id, label: s.name }))} value={fromStoreId} onChange={e => { setFromStoreId(e.target.value); setTransferItems([]); }} />
                    <Select label="Vers" id="toStore" options={stores.map(s => ({ value: s.id, label: s.name }))} value={toStoreId} onChange={e => setToStoreId(e.target.value)} />
                </div>
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Articles √† transf√©rer</h3>
                        <Select value="" onChange={e => handleAddItem(e.target.value)} options={[{ value: '', label: 'Ajouter un produit...' }, ...availableProductsForTransfer]} disabled={!fromStoreId} />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {transferItems.length > 0 ? (
                             <div className="space-y-2">
                                {transferItems.map(item => {
                                    const details = getVariationDetails(item.variationId);
                                    return (
                                        <div key={item.variationId} className="grid grid-cols-[1fr,auto,auto] gap-2 items-center p-2 bg-background rounded">
                                            <div>
                                                <p className="font-medium">{details.name}{details.variationName}</p>
                                                <p className="text-xs text-text-secondary">En stock: {details.stock}</p>
                                            </div>
                                            <Input type="number" label="" id={`qty-${item.variationId}`} value={item.quantity} onChange={e => handleQuantityChange(item.variationId, Number(e.target.value))} className="w-24 text-center" max={details.stock} />
                                            <Button variant="danger" size="sm" onClick={() => handleRemoveItem(item.variationId)}><TrashIcon/></Button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-text-secondary py-4">Veuillez ajouter des produits.</p>
                        )}
                    </div>
                </Card>
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleSubmit}>Confirmer le Transfert</Button>
                </div>
            </div>
        </Modal>
    );
};


// ===================================================================================
// Product Modal Component
// ===================================================================================
interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    categories: Category[];
    allProducts: Product[];
    onSave: () => void;
}
const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, categories, allProducts, onSave }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    
    const initialProductState = { 
        type: ProductType.STANDARD, 
        name: '', 
        categoryId: categories[0]?.id || '',
        lowStockThreshold: 10,
        sku: '',
        price: 0,
        variations: [], 
        bundleComponents: [] 
    };

    const [productData, setProductData] = useState<Partial<Product>>(product || initialProductState);
    
    useEffect(() => {
        setProductData(product || initialProductState);
    }, [product]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProductData(prev => ({ ...prev, [name]: value }));
    };

    const handleVariationChange = (index: number, field: keyof ProductVariation, value: any) => {
        const newVariations = [...(productData.variations || [])];
        (newVariations[index] as any)[field] = value;
        setProductData(prev => ({...prev, variations: newVariations }));
    };
    
    const addVariation = () => {
        const newVariation: ProductVariation = { id: generateId('var'), productId: productData.id || '', sku: '', price: 0, attributes: { 'Option': 'Nouvelle' } };
        setProductData(prev => ({...prev, variations: [...(prev.variations || []), newVariation]}));
    };

    const removeVariation = (index: number) => {
        const v = productData.variations?.[index] as any;
        const label = v?.sku ? ` (${v.sku})` : '';
        if (!window.confirm(`Supprimer cette variation${label} ?`)) return;
        setProductData(prev => ({...prev, variations: prev.variations?.filter((_, i) => i !== index) }));
    };

    // ==========================
    // Bundle components (kit)
    // ==========================
    const [bundleComps, setBundleComps] = useState<{ componentVariationId: string; quantity: number }[]>(() => {
        const bc: any[] = (product as any)?.bundleComponents || [];
        return Array.isArray(bc) ? bc.map((b: any) => ({ componentVariationId: b.componentVariationId, quantity: b.quantity })) : [];
    });

    const variationChoices = useMemo(() => {
        const out: { value: string; label: string }[] = [];
        for (const p of allProducts) {
            if (p.variations && p.variations.length > 0) {
                p.variations.forEach(v => {
                    const varLabel = Object.keys(v.attributes || {}).length ? ` (${Object.values(v.attributes).join(' / ')})` : '';
                    const sku = v.sku ? ` [${v.sku}]` : '';
                    out.push({ value: v.id, label: `${p.name}${varLabel}${sku}` });
                });
            } else {
                out.push({ value: p.id, label: `${p.name}${p.sku ? ' [' + p.sku + ']' : ''}` });
            }
        }
        return out;
    }, [allProducts]);

    const [selVar, setSelVar] = useState('');
    const [selQty, setSelQty] = useState(1);
    const addBundleComp = () => {
        if (!selVar) { addToast({ message: 'SÈlectionnez une variation.', type: 'error' }); return; }
        if (!Number.isFinite(selQty) || selQty <= 0 || Math.floor(selQty) !== selQty) { addToast({ message: 'QuantitÈ composant invalide (entier > 0).', type: 'error' }); return; }
        if (bundleComps.some(b => b.componentVariationId === selVar)) { addToast({ message: 'Ce composant est dÈj‡ ajoutÈ.', type: 'info' }); return; }
        if (product && product.variations?.some(v => v.id === selVar)) { addToast({ message: 'Un produit ne peut pas contenir sa propre variation en composant.', type: 'error' }); return; }
        setBundleComps(prev => [...prev, { componentVariationId: selVar, quantity: selQty }]);
        setSelVar(''); setSelQty(1);
    };
    const removeBundleComp = (variationId: string) => {
        if (!window.confirm('Supprimer ce composant du bundle ?')) return;
        setBundleComps(prev => prev.filter(b => b.componentVariationId !== variationId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        // PrÈ-validation produit
        const pd: any = productData || {};
        if (!pd.name || String(pd.name).trim().length < 2) { addToast({ message: 'Nom de produit trop court.', type: 'error' }); return; }
        if (!pd.categoryId) { addToast({ message: 'CatÈgorie requise.', type: 'error' }); return; }
        if (pd.lowStockThreshold !== undefined && (!Number.isFinite(Number(pd.lowStockThreshold)) || Number(pd.lowStockThreshold) < 0)) { addToast({ message: 'Seuil low stock invalide.', type: 'error' }); return; }

        if (pd.type === ProductType.STANDARD) {
            if (!pd.sku || String(pd.sku).trim() === '') { addToast({ message: 'SKU requis pour un produit standard.', type: 'error' }); return; }
            if (!Number.isFinite(Number(pd.price)) || Number(pd.price) < 0) { addToast({ message: 'Prix invalide.', type: 'error' }); return; }
        }
        if (pd.type === ProductType.VARIABLE) {
            if (!Array.isArray(pd.variations) || pd.variations.length === 0) { addToast({ message: 'Ajoutez au moins une variation.', type: 'error' }); return; }
            for (const v of pd.variations) {
                if (!v.sku || String(v.sku).trim() === '') { addToast({ message: 'SKU requis pour chaque variation.', type: 'error' }); return; }
                if (!Number.isFinite(Number(v.price)) || Number(v.price) < 0) { addToast({ message: 'Prix variation invalide.', type: 'error' }); return; }
            }
        }
        if (pd.type === ProductType.BUNDLE) {
            if (bundleComps.length === 0) { addToast({ message: 'Ajoutez au moins un composant au bundle.', type: 'error' }); return; }
            for (const c of bundleComps) {
                if (!Number.isFinite(Number(c.quantity)) || Number(c.quantity) <= 0 || Math.floor(Number(c.quantity)) !== Number(c.quantity)) {
                    addToast({ message: 'QuantitÈ composant invalide (entier > 0).', type: 'error' }); return;
                }
            }
        }

        const confirmMsg = product ? 'Confirmer la mise ‡ jour du produit ?' : 'Confirmer la crÈation du produit ?';
        if (!window.confirm(confirmMsg)) return;
        
        if (product) {
            if (USE_API) {
                await apiProducts.updateProduct(product.id, productData);
                if (productData.type === ProductType.BUNDLE) {
                    await apiProducts.setBundleComponents(product.id, bundleComps);
                }
            } else {
                await apiUpdateProduct(product.id, (productData.type === ProductType.BUNDLE ? { ...productData, bundleComponents: bundleComps } : productData) as any, user.id);
            }
            addToast({ message: 'Produit mis ‡ jour.', type: 'success' });
        } else {
            if (USE_API) {
                const created: any = await apiProducts.createProduct(productData);
                if (productData.type === ProductType.BUNDLE && created?.id) {
                    await apiProducts.setBundleComponents(created.id, bundleComps);
                }
            } else {
                await apiCreateProduct((productData.type === ProductType.BUNDLE ? { ...productData, bundleComponents: bundleComps } : productData) as any, user.id);
            }
            addToast({ message: 'Produit crÈÈ.', type: 'success' });
        }
        onSave();
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product ? "Modifier le produit" : "Nouveau Produit"} wrapperClassName="md:max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select label="Type de produit" name="type" id="type" value={productData.type} onChange={handleChange} options={Object.values(ProductType).map(t => ({ value: t, label: t }))} />
                <Input label="Nom du produit" id="name" name="name" required value={productData.name || ''} onChange={handleChange} />
                <Select label="Cat√©gorie" id="categoryId" name="categoryId" required value={productData.categoryId || ''} onChange={handleChange} options={categories.map(c => ({value: c.id, label: c.name}))} />
                <Input label="Seuil de stock bas" id="lowStockThreshold" name="lowStockThreshold" type="number" required value={productData.lowStockThreshold || ''} onChange={handleChange} />

                {productData.type === ProductType.STANDARD && (
                    <>
                        <Input label="SKU" id="sku" name="sku" required value={productData.sku || ''} onChange={handleChange} />
                        <Input label="Prix" id="price" name="price" type="number" required value={productData.price || ''} onChange={handleChange} />
                    </>
                )}
                
                {productData.type === ProductType.VARIABLE && (
                    <div>
                        <h3 className="font-semibold mb-2">Variations</h3>
                        {productData.variations?.map((v, i) => (
                            <div key={i} className="grid grid-cols-4 gap-2 p-2 bg-background rounded items-center mb-2">
                                <Input label="" id={`sku-${i}`} placeholder="SKU" value={v.sku} onChange={(e) => handleVariationChange(i, 'sku', e.target.value)} />
                                <Input label="" id={`attr-${i}`} placeholder="Attribut (ex: 2m)" value={Object.values(v.attributes)[0] || ''} onChange={(e) => handleVariationChange(i, 'attributes', { 'Dimension': e.target.value })} />
                                <Input label="" id={`price-${i}`} type="number" placeholder="Prix" value={v.price} onChange={(e) => handleVariationChange(i, 'price', Number(e.target.value))} />
                                <Button type="button" variant="danger" size="sm" onClick={() => removeVariation(i)}><TrashIcon/></Button>
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={addVariation} className="flex items-center"><PlusIcon className="mr-1"/> Ajouter une variation</Button>
                    </div>
                )}

                {productData.type === ProductType.BUNDLE && (
                    <div>
                        <h3 className="font-semibold mb-2">Composition du Kit</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end mb-2">
                            <Select id="bundle-var" label="Article" value={selVar} onChange={(e) => setSelVar(e.target.value)} options={[{ value: '', label: 'S√©lectionner...' }, ...variationChoices]} />
                            <Input id="bundle-qty" label="Quantit√©" type="number" value={selQty} onChange={(e) => setSelQty(Number(e.target.value))} />
                            <Button type="button" variant="secondary" onClick={addBundleComp} className="flex items-center"><PlusIcon className="mr-1"/> Ajouter</Button>
                        </div>
                        <div className="bg-background rounded">
                            {bundleComps.length === 0 && <p className="p-3 text-text-secondary">Aucun composant.</p>}
                            {bundleComps.map((b, idx) => {
                                const label = variationChoices.find(v => v.value === b.componentVariationId)?.label || b.componentVariationId;
                                return (
                                    <div key={idx} className="flex items-center justify-between p-2 border-b border-secondary/40">
                                        <div className="text-sm">{label}</div>
                                        <div className="flex items-center gap-2">
                                            <Input id={`bundle-qty-${idx}`} label="" type="number" value={b.quantity} onChange={(e) => {
                                                const q = Number(e.target.value);
                                                setBundleComps(prev => prev.map((x, i) => i === idx ? { ...x, quantity: q } : x));
                                            }} />
                                            <Button type="button" variant="danger" size="sm" onClick={() => removeBundleComp(b.componentVariationId)}><TrashIcon/></Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button type="submit">Enregistrer</Button>
                </div>
            </form>
        </Modal>
    )
};


export default StockPage;
const generateId = (prefix: string) => `${prefix}-${Date.now()}`;

// ===================================================================================
// Transfer Modal Component
// ===================================================================================
const StockTransferModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    stores: Store[];
    stockLevels: ProductStock[];
    products: Product[];
    defaultFromStoreId?: string;
    onSave: () => void;
}> = ({ isOpen, onClose, stores, stockLevels, products, defaultFromStoreId = '', onSave }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [fromStoreId, setFromStoreId] = useState<string>(defaultFromStoreId);
    const [toStoreId, setToStoreId] = useState<string>('');
    const [selectedVariationId, setSelectedVariationId] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [items, setItems] = useState<{ variationId: string; quantity: number }[]>([]);

    useEffect(() => { setFromStoreId(defaultFromStoreId); }, [defaultFromStoreId]);

    const stockOptions = useMemo(() => {
        const opts: { value: string; label: string; available: number }[] = [];
        const inStore = stockLevels.filter(s => !fromStoreId || s.storeId === fromStoreId);
        inStore.forEach(s => {
            let label = s.variationId;
            for (const p of products) {
                const v = (p.variations || []).find(vv => vv.id === s.variationId);
                if (v) {
                    const varLabel = Object.keys(v.attributes || {}).length ? ` (${Object.values(v.attributes).join(' / ')})` : '';
                    const sku = v.sku ? ` [${v.sku}]` : '';
                    label = `${p.name}${varLabel}${sku}`;
                    break;
                }
                if (p.id === s.variationId) { label = `${p.name}${p.sku ? ' [' + p.sku + ']' : ''}`; break; }
            }
            opts.push({ value: s.variationId, label: `${label} ó dispo: ${s.quantity}`, available: s.quantity });
        });
        const seen = new Set<string>();
        return opts.filter(o => (seen.has(o.value) ? false : (seen.add(o.value), true)));
    }, [stockLevels, products, fromStoreId]);

    const addItem = () => {
        if (!selectedVariationId || quantity <= 0) return;
        const opt = stockOptions.find(o => o.value === selectedVariationId);
        if (!opt) return;
        if (quantity > opt.available) { alert('Quantit√© sup√©rieure au stock disponible.'); return; }
        setItems(prev => [...prev, { variationId: selectedVariationId, quantity }]);
        setSelectedVariationId('');
        setQuantity(1);
    };

    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

    const submitTransfer = async () => {
        try {
            if (!fromStoreId || !toStoreId) { alert('S√©lectionnez les deux boutiques.'); return; }
            if (fromStoreId === toStoreId) { alert('La boutique source doit √™tre diff√©rente de la destination.'); return; }
            if (items.length === 0) { alert('Ajoutez au moins un article.'); return; }
            if (USE_API) await apiStockSvc.transfer(fromStoreId, toStoreId, items); else await apiCreateStockTransfer(fromStoreId, toStoreId, items, user?.id || 'sys');
            addToast({ message: 'Transfert cr√©√©.', type: 'success' });
            onClose(); onSave();
        } catch (e: any) {
            addToast({ message: e?.message || '√âchec du transfert', type: 'error' });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nouveau Transfert" wrapperClassName="md:max-w-3xl">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select id="fromStore" label="Depuis" value={fromStoreId} onChange={e => setFromStoreId(e.target.value)} options={[{ value: '', label: 'S√©lectionner...' }, ...stores.map(s => ({ value: s.id, label: s.name }))]} />
                    <Select id="toStore" label="Vers" value={toStoreId} onChange={e => setToStoreId(e.target.value)} options={[{ value: '', label: 'S√©lectionner...' }, ...stores.map(s => ({ value: s.id, label: s.name }))]} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <Select id="variation" label="Article" value={selectedVariationId} onChange={e => setSelectedVariationId(e.target.value)} options={[{ value: '', label: 'Choisir...' }, ...stockOptions.map(o => ({ value: o.value, label: o.label }))]} />
                    <Input id="qty" label="Quantit√©" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                    <Button onClick={addItem}>Ajouter</Button>
                </div>
                <div className="bg-surface rounded-lg border border-secondary/40">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-secondary/60"><th className="p-2">Article</th><th className="p-2">Qt√©</th><th className="p-2"></th></tr>
                        </thead>
                        <tbody>
                            {items.map((it, idx) => {
                                const opt = stockOptions.find(o => o.value === it.variationId);
                                return (
                                    <tr key={idx} className="border-b border-secondary/40">
                                        <td className="p-2">{opt?.label || it.variationId}</td>
                                        <td className="p-2">{it.quantity}</td>
                                        <td className="p-2"><Button variant="danger" size="sm" onClick={() => removeItem(idx)}>Supprimer</Button></td>
                                    </tr>
                                );
                            })}
                            {items.length === 0 && <tr><td className="p-3 text-text-secondary" colSpan={3}>Aucun article s√©lectionn√©.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button onClick={submitTransfer}>Cr√©er le transfert</Button>
                </div>
            </div>
        </Modal>
    );
};









