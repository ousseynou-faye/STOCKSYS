


import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
<<<<<<< HEAD
=======
import { useToast } from '../contexts/ToastContext';
>>>>>>> 7884868 (STOCKSYS)
import { Card, Button, Input, Select, Table, ExportDropdown } from '../components/ui';
import { Sale, ProductStock, Store, Product, Category, Expense, Permission, ProductType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { RevenueIcon, TotalSalesIcon, ProductsInStockIcon, ProfitIcon, TotalExpensesIcon } from '../components/icons';
import { apiFetchSales, apiFetchStock, MOCK_STORES, MOCK_PRODUCTS, MOCK_CATEGORIES, apiFetchExpenses } from '../services/mockApi';
import { USE_API, STRICT_API } from '../services/apiClient';
import { apiReports } from '../services/apiReports';
import { apiStock as apiStockSvc } from '../services/apiStock';
import { apiStores } from '../services/apiStores';
import { apiProducts } from '../services/apiProducts';
import { apiCategories } from '../services/apiCategories';

interface StatCardProps {
    title: string;
    value: string;
    description: string;
    icon: React.ReactNode;
    colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon, colorClass }) => (
    <Card className="relative overflow-hidden">
        <div className="flex items-start justify-between">
            <div className="flex flex-col">
                <p className="text-text-secondary">{title}</p>
                <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
                <p className="text-sm text-accent mt-2">{description}</p>
            </div>
             <div className={`rounded-lg p-3 ${colorClass}`}>
                {icon}
            </div>
        </div>
    </Card>
);

const AdminManagerDashboard: React.FC = () => {
    const { user, hasPermission } = useAuth();
<<<<<<< HEAD
=======
    const { addToast } = useToast();
>>>>>>> 7884868 (STOCKSYS)
    const isManagerView = !hasPermission(Permission.MANAGE_ROLES); // Simple way to differentiate admin from manager

    const [filterStoreId, setFilterStoreId] = useState(isManagerView && user?.storeId ? user.storeId : '');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [stock, setStock] = useState<ProductStock[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [topVariations, setTopVariations] = useState<{ variationId: string; sku: string | null; attributes: any; productName: string; ventes: number }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                if (USE_API) {
                    const [sr, er, st, storesRes, tv, prods] = await Promise.all([
                        apiReports.sales({ startDate: filterStartDate || undefined, endDate: filterEndDate || undefined, storeId: filterStoreId || undefined }) as any,
                        apiReports.expenses({ startDate: filterStartDate || undefined, endDate: filterEndDate || undefined, storeId: filterStoreId || undefined }) as any,
                        apiStockSvc.fetchStock(filterStoreId ? { storeId: filterStoreId } : undefined) as any,
                        apiStores.fetchStores().catch(() => MOCK_STORES as any),
                        apiReports.topVariations({ startDate: filterStartDate || undefined, endDate: filterEndDate || undefined, storeId: filterStoreId || undefined, limit: 5 }) as any,
                        // Lightweight lists for name lookups and charts
                        apiProducts.fetchProducts({ limit: 200 }).catch(() => (STRICT_API ? [] : MOCK_PRODUCTS) as any),
                    ]);

                    const salesNorm: Sale[] = (sr as any[]).map((r: any) => ({
                        id: r.id,
                        userId: r.userId,
                        storeId: r.storeId,
                        items: [],
                        payments: [],
                        totalAmount: r.totalAmount,
                        status: 'PAID' as any,
                        createdAt: (new Date(r.date)).toISOString(),
                    }));
                    const expensesNorm: Expense[] = (er as any[]).map((e: any) => ({
                        id: e.id,
                        userId: e.userId || '',
                        storeId: e.storeId,
                        category: e.category,
                        description: e.description,
                        amount: e.amount,
                        createdAt: (new Date(e.date)).toISOString(),
                    }));
                    const stockArr: any = st as any;

                    setSales(salesNorm);
                    setExpenses(expensesNorm);
                    setStock((stockArr?.data) || stockArr || []);
                    setStores(((storesRes as any)?.data) || (storesRes as any));
                    const prodArr: any[] = ((prods as any)?.data) || (prods as any) || [];
                    setProducts(prodArr as any);
                    // Load categories only if permitted, to avoid 403 global errors
                    if (hasPermission(Permission.VIEW_CATEGORIES)) {
                        try {
                            const ct: any = await apiCategories.fetchCategories();
                            const catArr: any[] = ((ct as any)?.data) || (ct as any) || [];
                            setCategories(catArr as any);
                        } catch {
                            setCategories(STRICT_API ? [] : (MOCK_CATEGORIES as any));
                        }
                    } else {
                        setCategories([] as any);
                    }
                    setTopVariations(Array.isArray(tv) ? (tv as any) : []);
                } else {
                    await new Promise(res => setTimeout(res, 500));
                    setSales(apiFetchSales());
                    setExpenses(apiFetchExpenses());
                    setStock(apiFetchStock());
                    setStores(MOCK_STORES);
                    setProducts(MOCK_PRODUCTS);
                    setCategories(MOCK_CATEGORIES);
                    setTopVariations([]);
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
<<<<<<< HEAD
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
=======
    }, [addToast]);
>>>>>>> 7884868 (STOCKSYS)

    const filteredData = useMemo(() => {
        const filterFn = <T extends { storeId: string; createdAt: string }>(item: T) => {
             if (filterStoreId && item.storeId !== filterStoreId) return false;
            if (filterStartDate && item.createdAt < filterStartDate) return false;
            if (filterEndDate) {
                const endDate = new Date(filterEndDate);
                endDate.setDate(endDate.getDate() + 1);
                if (new Date(item.createdAt) >= endDate) return false;
            }
            return true;
        }
        return {
            sales: sales.filter(filterFn),
            expenses: expenses.filter(filterFn),
        }
    }, [sales, expenses, filterStoreId, filterStartDate, filterEndDate]);

    const dashboardStats = useMemo(() => {
        const totalRevenue = filteredData.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalExpenses = filteredData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        const totalSales = filteredData.sales.length;
        const filteredStock = stock.filter(s => !filterStoreId || s.storeId === filterStoreId);
        const totalStock = filteredStock.reduce((sum, item) => sum + item.quantity, 0);
        return { totalRevenue, totalExpenses, netProfit, totalSales, totalStock };
    }, [filteredData, stock, filterStoreId]);

    const salesByStoreData = useMemo(() => {
        const dataMap = new Map<string, number>();
        filteredData.sales.forEach(sale => {
            const storeName = stores.find(s => s.id === sale.storeId)?.name || 'N/A';
            dataMap.set(storeName, (dataMap.get(storeName) || 0) + sale.totalAmount);
        });
        return Array.from(dataMap.entries()).map(([name, value]) => ({ name, "Chiffre d'affaires": value }));
    }, [filteredData.sales, stores]);

    const [topProducts, setTopProducts] = useState<{ name: string; ventes: number }[] | null>(null);
    useEffect(() => {
        const loadTop = async () => {
            if (!USE_API) { setTopProducts(null); return; }
            try {
                const res: any = await apiReports.topProducts({
                    startDate: filterStartDate || undefined,
                    endDate: filterEndDate || undefined,
                    storeId: filterStoreId || undefined,
                    limit: 5,
                });
                const arr = Array.isArray(res) ? res : [];
                setTopProducts(arr.map((r: any) => ({ name: r.productName, ventes: r.ventes })));
            } catch { setTopProducts(null); }
        };
        loadTop();
    }, [filterStartDate, filterEndDate, filterStoreId]);

    const topProductsData = useMemo(() => {
        if (USE_API && Array.isArray(topProducts)) return topProducts;
        const productSales = new Map<string, { name: string, ventes: number }>();
        filteredData.sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = products.find(p => p.variations?.some(v => v.id === item.variationId) || p.id === item.variationId);
                if (product) {
                    const existing = productSales.get(product.id) || { name: product.name, ventes: 0 };
                    existing.ventes += item.quantity;
                    productSales.set(product.id, existing);
                }
            });
        });
        return Array.from(productSales.values()).sort((a, b) => b.ventes - a.ventes).slice(0, 5);
    }, [filteredData.sales, products, topProducts]);
    
    const expensesByCategoryData = useMemo(() => {
        const categoryExpenses = new Map<string, { name: string, value: number }>();
        filteredData.expenses.forEach(expense => {
            const existing = categoryExpenses.get(expense.category) || { name: expense.category, value: 0 };
            existing.value += expense.amount;
            categoryExpenses.set(expense.category, existing);
        });
        return Array.from(categoryExpenses.values());
    }, [filteredData.expenses]);

    const monthlyFinancialData = useMemo(() => {
        const monthlyMap = new Map<string, { revenue: number, expenses: number }>();
        const today = new Date();
    
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.toISOString().slice(0, 7); // "YYYY-MM"
            monthlyMap.set(monthKey, { revenue: 0, expenses: 0 });
        }
        
        filteredData.sales.forEach(sale => {
            const saleMonthKey = sale.createdAt.slice(0, 7);
            if (monthlyMap.has(saleMonthKey)) {
                monthlyMap.get(saleMonthKey)!.revenue += sale.totalAmount;
            }
        });
        
        filteredData.expenses.forEach(expense => {
            const expenseMonthKey = expense.createdAt.slice(0, 7);
            if (monthlyMap.has(expenseMonthKey)) {
                monthlyMap.get(expenseMonthKey)!.expenses += expense.amount;
            }
        });
    
        const chartData = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = d.toISOString().slice(0, 7);
            const monthLabel = d.toLocaleString('fr-FR', { month: 'short', year: 'numeric' });
            const data = monthlyMap.get(monthKey) || { revenue: 0, expenses: 0 };
            chartData.push({
                name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
                "Chiffre d'affaires": data.revenue,
                "Dépenses": data.expenses,
                "Bénéfice": data.revenue - data.expenses,
            });
        }
    
        return chartData;
    }, [filteredData]);

    const handleResetFilters = () => {
        if (!isManagerView) setFilterStoreId('');
        setFilterStartDate('');
        setFilterEndDate('');
    };
    
    const COLORS = ['#2dd4bf', '#0e7490', '#334155', '#f43f5e', '#eab308', '#8b5cf6'];

    return (
        <div className="space-y-6">
            <Card>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                     <Input 
                        label="Date de début" id="filter-start-date" type="date"
                        value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
                    />
                    <Input 
                        label="Date de fin" id="filter-end-date" type="date"
                        value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
                    />
                    <Select
                        label="Filtrer par boutique" id="filter-store" value={filterStoreId} onChange={(e) => setFilterStoreId(e.target.value)}
                        options={[{ value: '', label: 'Toutes les boutiques'}, ...stores.map(s => ({ value: s.id, label: s.name })) ]}
                        disabled={isManagerView}
                    />
                    <Button variant="secondary" onClick={handleResetFilters} className="w-full">Réinitialiser</Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Chiffre d'Affaires" value={`${dashboardStats.totalRevenue.toLocaleString('fr-FR')} FCFA`} description="Basé sur les filtres" icon={<RevenueIcon />} colorClass="bg-accent" />
                <StatCard title="Dépenses Totales" value={`${dashboardStats.totalExpenses.toLocaleString('fr-FR')} FCFA`} description="Dépenses enregistrées" icon={<TotalExpensesIcon />} colorClass="bg-orange-500" />
                <StatCard title="Bénéfice Net" value={`${dashboardStats.netProfit.toLocaleString('fr-FR')} FCFA`} description="Revenus - Dépenses" icon={<ProfitIcon />} colorClass="bg-green-500" />
            </div>
            
            {isLoading ? <p className="text-center">Chargement des données...</p> :
            <div className="space-y-6">
                 <Card>
                    <h3 className="text-xl font-semibold mb-4">Évolution Financière Mensuelle</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyFinancialData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#D1D5DB" />
                            <YAxis stroke="#D1D5DB" tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563' }} 
                                formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`} 
                            />
                            <Legend />
                            <Line type="monotone" dataKey="Chiffre d'affaires" stroke="#2dd4bf" strokeWidth={2} />
                            <Line type="monotone" dataKey="Dépenses" stroke="#f43f5e" strokeWidth={2} />
                            <Line type="monotone" dataKey="Bénéfice" stroke="#22c55e" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <Card className="lg:col-span-3">
                        <h3 className="text-xl font-semibold mb-4">Ventes par Boutique</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salesByStoreData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#D1D5DB" />
                                <YAxis stroke="#D1D5DB" tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(value as number)}/>
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563' }} formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`} />
                                <Legend />
                                <Bar dataKey="Chiffre d'affaires" fill="#2dd4bf" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                    <Card className="lg:col-span-2">
                        <h3 className="text-xl font-semibold mb-4">Dépenses par Catégorie</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={expensesByCategoryData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {expensesByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563' }} formatter={(value: number) => `${value.toLocaleString('fr-FR')} FCFA`}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
            </div>
            }
        </div>
    );
};

const CashierDashboard: React.FC = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [stock, setStock] = useState<ProductStock[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        if (!user || !user.storeId) return;

        const fetchData = async () => {
            setIsLoading(true);
            // Sales: conserver le mock pour l'instant (pas d'endpoint items détaillés)
            const allSales = apiFetchSales();
            setSales(allSales.filter(s => s.storeId === user.storeId));

            // Stock et produits: si API dispo, charger pour des libellés cohérents
            try {
                if (USE_API) {
                    try {
                        const st: any = await apiStockSvc.fetchStock({ storeId: user.storeId });
                        setStock(((st as any)?.data) || (st as any) || []);
                    } catch { setStock([]); }
                    try {
                        const p: any = await apiProducts.fetchProducts({ limit: 200 });
                        const arr = ((p as any)?.data) || (p as any) || [];
                        setProducts(arr as any);
                    } catch { setProducts(STRICT_API ? [] : (MOCK_PRODUCTS as any)); }
                } else {
                    setStock(apiFetchStock().filter(s => s.storeId === user.storeId));
                    setProducts(MOCK_PRODUCTS as any);
                }
            } finally {
                // no-op
            }
            setIsLoading(false);
        };
        fetchData();
    }, [user]);

    const dashboardStats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const salesToday = sales.filter(s => s.createdAt.startsWith(today));
        const totalRevenueToday = salesToday.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalSalesToday = salesToday.length;
        const totalStock = stock.reduce((sum, item) => sum + item.quantity, 0);
        return { totalRevenueToday, totalSalesToday, totalStock };
    }, [sales, stock]);

    const recentSales = useMemo(() => {
        return sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [sales]);

    const getProductNameFromVariationId = (variationId: string): string => {
        const src = USE_API ? products : (MOCK_PRODUCTS as any);
        for (const product of src) {
            if (product.variations?.some(v => v.id === variationId) || product.id === variationId) {
                const variation = product.variations?.find(v => v.id === variationId);
                const variationName = product.type === 'Avec Variations' && variation ? ` - ${Object.values(variation!.attributes).join(' / ')}` : '';
                return `${product.name}${variationName}`;
            }
        }
        return 'N/A';
    };

    type EnrichedSale = typeof recentSales[number] & { itemsSummary: string, totalAmountFormatted: string };
    const columns: { header: string; accessor: keyof EnrichedSale | ((item: EnrichedSale) => React.ReactNode) }[] = [
        { header: 'Date', accessor: (item) => new Date(item.createdAt).toLocaleString('fr-FR') },
        { header: 'Produits', accessor: 'itemsSummary' },
        { header: 'Montant Total', accessor: 'totalAmountFormatted' },
    ];
    
    const enrichedRecentSales = recentSales.map(sale => ({
        ...sale,
        itemsSummary: sale.items.map(item => getProductNameFromVariationId(item.variationId)).join(', '),
        totalAmountFormatted: `${sale.totalAmount.toLocaleString('fr-FR')} FCFA`
    }));

    const exportableData = useMemo(() => {
        return enrichedRecentSales.map(sale => ({
            'Date': new Date(sale.createdAt).toLocaleString('fr-CA'),
            'Produits': sale.itemsSummary,
            'Montant Total (FCFA)': sale.totalAmount,
            'ID Vente': sale.id
        }));
    }, [enrichedRecentSales]);
    
    const exportColumns = ['Date', 'Produits', 'Montant Total (FCFA)', 'ID Vente'];


    if (isLoading) return <p>Chargement du tableau de bord...</p>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Chiffre d'Affaires (jour)" value={`${dashboardStats.totalRevenueToday.toLocaleString('fr-FR')} FCFA`} description="Pour votre boutique" icon={<RevenueIcon />} colorClass="bg-accent" />
                <StatCard title="Ventes (jour)" value={dashboardStats.totalSalesToday.toString()} description="Transactions de la journée" icon={<TotalSalesIcon />} colorClass="bg-primary" />
                <StatCard title="Produits en Stock" value={dashboardStats.totalStock.toLocaleString('fr-FR')} description="Stock de votre boutique" icon={<ProductsInStockIcon />} colorClass="bg-cyan-600" />
            </div>
            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h3 className="text-xl font-semibold">Vos ventes récentes</h3>
                    <ExportDropdown data={exportableData} columns={exportColumns} filename="ventes_recentes" />
                </div>
                <Table 
                    columns={columns} 
                    data={enrichedRecentSales}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </Card>
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const { user, hasPermission } = useAuth();

    if (hasPermission(Permission.VIEW_DASHBOARD_STATS)) {
        return <AdminManagerDashboard />;
    }
    if (hasPermission(Permission.VIEW_DASHBOARD_CASHIER)) {
        return <CashierDashboard />;
    }
    
    // Fallback for users who are logged in but have no specific dashboard permission
    return (
        <div className="text-center p-8">
            <h2 className="text-2xl font-semibold mb-2">Bienvenue, {user?.username} !</h2>
            <p className="text-text-secondary">Utilisez le menu de navigation pour accéder aux différentes sections de l'application.</p>
        </div>
    );
};

export default DashboardPage;
