import React, { useState, useMemo, useEffect } from 'react';
import { Card, Table, Button, Input, Select, ExportDropdown } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { Sale, ProductStock, Expense, Product, Category, Store, User, Permission, ExpenseCategory } from '../types';
import { 
    apiFetchSales,
    apiFetchStock,
    apiFetchExpenses,
    getPurchasePriceForProduct,
    MOCK_PRODUCTS,
    MOCK_CATEGORIES,
    MOCK_STORES,
    MOCK_USERS,
} from '../services/mockApi';
import { USE_API, STRICT_API } from '../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import { apiReports } from '../services/apiReports';
import { apiStores } from '../services/apiStores';
import { apiUsers } from '../services/apiUsers';
import { apiProducts } from '../services/apiProducts';
import { apiCategories } from '../services/apiCategories';

type ReportTab = 'sales' | 'stock' | 'profitability' | 'expenses';

const ITEMS_PER_PAGE = 15;

// Helper to format currency
const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

const ReportsPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<ReportTab>('sales');
    const [currentPage, setCurrentPage] = useState(1);

    // Filter state
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        storeId: user?.storeId && !hasPermission(Permission.MANAGE_ROLES) ? user.storeId || '' : '',
        userId: '',
        productId: '',
        categoryId: '',
        expenseCategory: '',
    });

    // Data fetching
    const [sales, setSales] = useState<Sale[]>([]);
    const [stock, setStock] = useState<ProductStock[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    // API report data
    const [salesReport, setSalesReport] = useState<any[] | null>(null);
    const [stockValuationReport, setStockValuationReport] = useState<any[] | null>(null);
    const [profitabilityReport, setProfitabilityReport] = useState<any[] | null>(null);
    const [expensesReport, setExpensesReport] = useState<any[] | null>(null);
    const [stores, setStores] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        if (!USE_API) {
            setSales(apiFetchSales());
            setStock(apiFetchStock());
            setExpenses(apiFetchExpenses());
        } else {
            // Load stores/users for mapping names
            (async () => {
                try {
                    const [st, us, pr, ct] = await Promise.all([
                        apiStores.fetchStores().catch(() => MOCK_STORES as any),
                        apiUsers.fetchUsers().catch(() => MOCK_USERS as any),
                        apiProducts.fetchProducts({ limit: 500 }).catch(() => (STRICT_API ? [] : MOCK_PRODUCTS) as any),
                        apiCategories.fetchCategories().catch(() => (STRICT_API ? [] : MOCK_CATEGORIES) as any),
                    ]);
                    setStores(((st as any)?.data) || (st as any));
                    const uArr: any = Array.isArray(us) ? us : (us as any)?.data || [];
                    setUsers(uArr);
                    const pArr: any[] = ((pr as any)?.data) || (pr as any) || [];
                    setProducts(pArr);
                    const cArr: any[] = ((ct as any)?.data) || (ct as any) || [];
                    setCategories(cArr);
                } catch {}
            })();
        }
    }, []);

    useEffect(() => {
        if (!USE_API) return;
        (async () => {
            try {
                const common: any = {
                    startDate: filters.startDate || undefined,
                    endDate: filters.endDate || undefined,
                    storeId: filters.storeId || undefined,
                };
                const [sr, sv, pr, er] = await Promise.all([
                    apiReports.sales({ ...common, userId: filters.userId || undefined, productId: filters.productId || undefined, categoryId: filters.categoryId || undefined }) as any,
                    apiReports.stockValuation(filters.storeId || undefined) as any,
                    apiReports.profitability(common) as any,
                    apiReports.expenses({ ...common, expenseCategory: filters.expenseCategory || undefined }) as any,
                ]);
                setSalesReport(sr as any[]);
                setStockValuationReport(sv as any[]);
                setProfitabilityReport(pr as any[]);
                setExpensesReport(er as any[]);
            } catch (e: any) {
                if (e?.status === 403) {
                    addToast({ message: 'Accès refusé — permission requise: VIEW_REPORTS', type: 'error' });
                    setSalesReport(null);
                    setStockValuationReport(null);
                    setProfitabilityReport(null);
                    setExpensesReport(null);
                    return;
                }
                // Fallback pour autres erreurs
                setSales(apiFetchSales());
                setStock(apiFetchStock());
                setExpenses(apiFetchExpenses());
                setSalesReport(null);
                setStockValuationReport(null);
                setProfitabilityReport(null);
                setExpensesReport(null);
            }
        })();
    }, [filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const resetFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            storeId: user?.storeId && !hasPermission(Permission.MANAGE_ROLES) ? user.storeId || '' : '',
            userId: '',
            productId: '',
            categoryId: '',
            expenseCategory: '',
        });
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, filters]);

    const tabClasses = (tabName: ReportTab) => 
        `px-4 py-2 font-semibold rounded-t-lg transition-colors text-sm sm:text-base ${activeTab === tabName ? 'bg-surface text-accent border-b-2 border-accent' : 'text-text-secondary hover:bg-secondary'}`;

    // --- REPORT LOGIC ---

    // Sales Report
    const salesReportData = useMemo(() => {
        if (USE_API && salesReport) {
            return salesReport.map((r: any) => ({
                id: r.id,
                date: new Date(r.date).toLocaleDateString('fr-FR'),
                storeName: (stores.find(s => s.id === r.storeId)?.name) || 'N/A',
                sellerName: (users.find((u: any) => u.id === r.userId)?.username) || 'N/A',
                itemCount: r.itemCount,
                totalAmount: r.totalAmount,
            }));
        }
        return sales
            .filter(sale => {
                if (filters.startDate && sale.createdAt < filters.startDate) return false;
                if (filters.endDate) {
                    const endDate = new Date(filters.endDate);
                    endDate.setDate(endDate.getDate() + 1);
                    if (new Date(sale.createdAt) >= endDate) return false;
                }
                if (filters.storeId && sale.storeId !== filters.storeId) return false;
                if (filters.userId && sale.userId !== filters.userId) return false;
                
                if (filters.productId && !sale.items.some(item => {
                    const product = MOCK_PRODUCTS.find(p => p.variations?.some(v => v.id === item.variationId) || p.id === item.variationId);
                    return product?.id === filters.productId;
                })) return false;
                
                if (filters.categoryId) {
                    const categoryProductIds = new Set(MOCK_PRODUCTS.filter(p => p.categoryId === filters.categoryId).map(p => p.id));
                    const saleHasCategoryProduct = sale.items.some(item => {
                        const product = MOCK_PRODUCTS.find(p => p.variations?.some(v => v.id === item.variationId) || p.id === item.variationId);
                        return product && categoryProductIds.has(product.id);
                    });
                    if (!saleHasCategoryProduct) return false;
                }
                return true;
            })
            .map((sale, index) => {
                const store = (USE_API ? stores : MOCK_STORES).find((s: any) => s.id === sale.storeId);
                const seller = (USE_API ? users : MOCK_USERS).find((u: any) => u.id === sale.userId);
                return {
                    id: `${sale.id}-${index}`,
                    date: new Date(sale.createdAt).toLocaleDateString('fr-FR'),
                    storeName: store?.name || 'N/A',
                    sellerName: seller?.username || 'N/A',
                    itemCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
                    totalAmount: sale.totalAmount,
                };
            });
    }, [sales, filters, salesReport, stores, users]);
    
    // Stock Valuation Report
    const stockValuationData = useMemo(() => {
        if (USE_API && stockValuationReport) {
            return stockValuationReport.map((r: any) => ({
                id: r.id,
                productName: r.productName,
                storeName: (stores.find(s => s.id === r.storeId)?.name) || 'N/A',
                quantity: r.quantity,
                costPerUnit: r.costPerUnit,
                totalValue: r.totalValue,
            }));
        }
        return stock
            .filter(s => !filters.storeId || s.storeId === filters.storeId)
            .map(s => {
                const product = MOCK_PRODUCTS.find(p => p.variations?.some(v => v.id === s.variationId) || p.id === s.variationId);
                const store = (USE_API ? stores : MOCK_STORES).find((st: any) => st.id === s.storeId);
                const purchasePrice = getPurchasePriceForProduct(s.variationId) || 0;
                return {
                    id: `${s.variationId}-${s.storeId}`,
                    productName: product?.name || 'N/A',
                    storeName: store?.name || 'N/A',
                    quantity: s.quantity,
                    costPerUnit: purchasePrice,
                    totalValue: s.quantity * purchasePrice,
                };
            });
    }, [stock, filters.storeId, stockValuationReport, stores]);

    // Profitability Report
    const profitabilityReportData = useMemo(() => {
        if (USE_API && profitabilityReport) {
            return profitabilityReport.map((r: any) => ({
                id: r.id,
                date: new Date(r.date).toLocaleDateString('fr-FR'),
                storeName: (stores.find(s => s.id === r.storeId)?.name) || 'N/A',
                revenue: r.revenue,
                cost: r.cost,
                profit: r.profit,
                margin: r.margin,
            }));
        }
        return sales
            .filter(sale => { // Basic filtering
                if (filters.startDate && sale.createdAt < filters.startDate) return false;
                if (filters.endDate) {
                    const endDate = new Date(filters.endDate);
                    endDate.setDate(endDate.getDate() + 1);
                    if (new Date(sale.createdAt) >= endDate) return false;
                }
                if (filters.storeId && sale.storeId !== filters.storeId) return false;
                return true;
            })
            .map(sale => {
                const revenue = sale.totalAmount;
                const cost = sale.items.reduce((sum, item) => {
                    const purchasePrice = getPurchasePriceForProduct(item.variationId) || item.priceAtSale; // fallback to sale price if no cost
                    return sum + (purchasePrice * item.quantity);
                }, 0);
                const profit = revenue - cost;
                const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
                return {
                    id: sale.id,
                    date: new Date(sale.createdAt).toLocaleDateString('fr-FR'),
                    storeName: ((USE_API ? stores : MOCK_STORES).find((s: any) => s.id === sale.storeId)?.name) || 'N/A',
                    revenue,
                    cost,
                    profit,
                    margin,
                };
            });
    }, [sales, filters, profitabilityReport, stores]);

    // Expenses Report
    const expensesReportData = useMemo(() => {
        if (USE_API && expensesReport) {
            return expensesReport.map((r: any) => ({
                id: r.id,
                date: new Date(r.date).toLocaleDateString('fr-FR'),
                storeName: (stores.find(s => s.id === r.storeId)?.name) || 'N/A',
                category: r.category,
                description: r.description,
                amount: r.amount,
            }));
        }
        return expenses
            .filter(exp => {
                if (filters.startDate && exp.createdAt < filters.startDate) return false;
                if (filters.endDate) {
                    const endDate = new Date(filters.endDate);
                    endDate.setDate(endDate.getDate() + 1);
                    if (new Date(exp.createdAt) >= endDate) return false;
                }
                if (filters.storeId && exp.storeId !== filters.storeId) return false;
                if (filters.expenseCategory && exp.category !== filters.expenseCategory) return false;
                return true;
            })
            .map(exp => ({
                id: exp.id,
                date: new Date(exp.createdAt).toLocaleDateString('fr-FR'),
                storeName: ((USE_API ? stores : MOCK_STORES).find((s: any) => s.id === exp.storeId)?.name) || 'N/A',
                category: exp.category,
                description: exp.description,
                amount: exp.amount,
            }));
    }, [expenses, filters, expensesReport, stores]);

    const reportConfig = {
        sales: {
            title: "Rapport des Ventes",
            data: salesReportData,
            columns: [
                { header: 'Date', accessor: 'date' },
                { header: 'Boutique', accessor: 'storeName' },
                { header: 'Vendeur', accessor: 'sellerName' },
                { header: 'Articles', accessor: 'itemCount' },
                { header: 'Montant Total', accessor: (item: any) => formatCurrency(item.totalAmount) },
            ],
            exportFilename: 'rapport_ventes',
        },
        stock: {
            title: "Valorisation du Stock",
            data: stockValuationData,
            columns: [
                { header: 'Produit', accessor: 'productName' },
                { header: 'Boutique', accessor: 'storeName' },
                { header: 'Quantité', accessor: 'quantity' },
                { header: 'Coût Unitaire', accessor: (item: any) => formatCurrency(item.costPerUnit) },
                { header: 'Valeur Totale', accessor: (item: any) => formatCurrency(item.totalValue) },
            ],
            exportFilename: 'valorisation_stock',
        },
        profitability: {
            title: "Rapport de Rentabilité",
            data: profitabilityReportData,
            columns: [
                { header: 'Date', accessor: 'date' },
                { header: 'Boutique', accessor: 'storeName' },
                { header: 'Chiffre d\'Affaires', accessor: (item: any) => formatCurrency(item.revenue) },
                { header: 'Coût des Ventes', accessor: (item: any) => formatCurrency(item.cost) },
                { header: 'Bénéfice Brut', accessor: (item: any) => formatCurrency(item.profit) },
                { header: 'Marge Brute', accessor: (item: any) => `${item.margin.toFixed(2)}%` },
            ],
            exportFilename: 'rapport_rentabilite',
        },
        expenses: {
            title: "Rapport des Dépenses",
            data: expensesReportData,
            columns: [
                { header: 'Date', accessor: 'date' },
                { header: 'Boutique', accessor: 'storeName' },
                { header: 'Catégorie', accessor: 'category' },
                { header: 'Description', accessor: 'description' },
                { header: 'Montant', accessor: (item: any) => formatCurrency(item.amount) },
            ],
            exportFilename: 'rapport_depenses',
        },
    };
    
    const activeReport = reportConfig[activeTab];

    const { totalLabel, totalAmount } = useMemo(() => {
        switch (activeTab) {
            case 'sales':
                return {
                    totalLabel: "Chiffre d'Affaires Total",
                    totalAmount: salesReportData.reduce((sum, item) => sum + item.totalAmount, 0)
                };
            case 'stock':
                return {
                    totalLabel: 'Valeur Totale du Stock',
                    totalAmount: stockValuationData.reduce((sum, item) => sum + item.totalValue, 0)
                };
            case 'profitability':
                return {
                    totalLabel: 'Bénéfice Brut Total',
                    totalAmount: profitabilityReportData.reduce((sum, item) => sum + item.profit, 0)
                };
            case 'expenses':
                return {
                    totalLabel: 'Dépenses Totales',
                    totalAmount: expensesReportData.reduce((sum, item) => sum + item.amount, 0)
                };
            default:
                return { totalLabel: 'Total', totalAmount: 0 };
        }
    }, [activeTab, salesReportData, stockValuationData, profitabilityReportData, expensesReportData]);
    
    const exportColumns = activeReport.columns.map(c => c.header);
    const exportData = useMemo(() => {
        return activeReport.data.map(item => {
            const row: Record<string, any> = {};
            activeReport.columns.forEach(col => {
                if (typeof col.accessor === 'function') {
                    row[col.header] = col.accessor(item);
                } else {
                    row[col.header] = (item as any)[col.accessor];
                }
            });
            return row;
        });
    }, [activeReport]);


    return (
        <div className="space-y-6">
            <div className="border-b border-secondary">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto">
                    <button className={tabClasses('sales')} onClick={() => setActiveTab('sales')}>Ventes</button>
                    <button className={tabClasses('stock')} onClick={() => setActiveTab('stock')}>Stock</button>
                    <button className={tabClasses('profitability')} onClick={() => setActiveTab('profitability')}>Rentabilité</button>
                    <button className={tabClasses('expenses')} onClick={() => setActiveTab('expenses')}>Dépenses</button>
                </nav>
            </div>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                    <Input label="Date de début" id="startDate" name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} />
                    <Input label="Date de fin" id="endDate" name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} />
                    <Select label="Boutique" id="storeId" name="storeId" value={filters.storeId} onChange={handleFilterChange} options={[{ value: '', label: 'Toutes' }, ...((USE_API ? stores : MOCK_STORES) as any[]).map((s: any) => ({ value: s.id, label: s.name }))]} disabled={!!user?.storeId && !hasPermission(Permission.MANAGE_ROLES)} />
                    
                    {activeTab === 'sales' && (
                        <>
                            <Select label="Vendeur" id="userId" name="userId" value={filters.userId} onChange={handleFilterChange} options={[{ value: '', label: 'Tous' }, ...((USE_API ? users : MOCK_USERS) as any[]).map((u: any) => ({ value: u.id, label: (u.username || u.email || u.name) }))]} />
                            <Select label="Produit" id="productId" name="productId" value={filters.productId} onChange={handleFilterChange} options={[{ value: '', label: 'Tous' }, ...((USE_API ? products : MOCK_PRODUCTS) as any[]).map((p: any) => ({ value: p.id, label: p.name }))]} />
                            <Select label="Catégorie" id="categoryId" name="categoryId" value={filters.categoryId} onChange={handleFilterChange} options={[{ value: '', label: 'Toutes' }, ...((USE_API ? categories : MOCK_CATEGORIES) as any[]).map((c: any) => ({ value: c.id, label: c.name }))]} />
                        </>
                    )}
                    {activeTab === 'expenses' && (
                         <Select label="Catégorie Dépense" id="expenseCategory" name="expenseCategory" value={filters.expenseCategory} onChange={handleFilterChange} options={[{ value: '', label: 'Toutes' }, ...Object.values(ExpenseCategory).map(c => ({ value: c, label: c }))]} />
                    )}

                    <div className="col-start-auto">
                        <Button variant="secondary" onClick={resetFilters} className="w-full">Réinitialiser</Button>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold">{activeReport.title}</h2>
                    <ExportDropdown data={exportData} columns={exportColumns} filename={activeReport.exportFilename} />
                </div>
                <Table 
                    columns={activeReport.columns as any}
                    data={activeReport.data}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
                <div className="mt-4 pt-4 border-t border-secondary text-right">
                    <p className="text-text-secondary">{totalLabel}: <span className="font-bold text-xl text-accent">{formatCurrency(totalAmount)}</span></p>
                </div>
            </Card>
        </div>
    );
};

export default ReportsPage;
