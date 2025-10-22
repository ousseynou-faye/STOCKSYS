// services/mockApi.ts
import { 
    User, CustomRole, Permission, Store, Category, Product, ProductStock, Sale, 
    Expense, Supplier, PurchaseOrder, AuditLog, Notification, CompanyInfo, AppSettings, 
    InventorySession, SaleStatus, PurchaseOrderStatus, ProductType, SaleItem, 
    ExpenseCategory, NotificationType, AuditActionType, InventorySessionStatus, 
    InventoryItem, CashierSession, PaymentMethod, ProductVariation, BundleComponent,
    SupplierProduct, PurchaseOrderItem, GlobalSearchResults, Payment
} from '../types';

// ===================================================================================
// UTILITIES
// ===================================================================================

const DB = {
    users: [] as User[],
    roles: [] as CustomRole[],
    stores: [] as Store[],
    categories: [] as Category[],
    products: [] as Product[],
    stock: [] as ProductStock[],
    sales: [] as Sale[],
    expenses: [] as Expense[],
    suppliers: [] as Supplier[],
    purchaseOrders: [] as PurchaseOrder[],
    auditLogs: [] as AuditLog[],
    notifications: [] as Notification[],
    companyInfo: {} as CompanyInfo,
    appSettings: {} as AppSettings,
    inventorySessions: [] as InventorySession[],
    cashierSessions: [] as CashierSession[],
    supplierProducts: [] as SupplierProduct[],
};

const saveToLocalStorage = () => {
    localStorage.setItem('stocksys_db', JSON.stringify(DB));
};

const loadFromLocalStorage = () => {
    const data = localStorage.getItem('stocksys_db');
    if (data) {
        Object.assign(DB, JSON.parse(data));
    } else {
        // Initialize with mock data if nothing is in local storage
        initializeMockData();
        saveToLocalStorage();
    }
};

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ===================================================================================
// MOCK DATA & INITIALIZATION
// ===================================================================================

export const PERMISSION_GROUPS: Record<string, Permission[]> = {
    "Ventes": [Permission.CREATE_SALE, Permission.VIEW_SALES_HISTORY, Permission.MANAGE_RETURNS],
    "Stock": [Permission.VIEW_STOCK, Permission.MANAGE_STOCK, Permission.PERFORM_INVENTORY, Permission.MANAGE_STOCK_TRANSFERS],
    "Achats": [Permission.VIEW_PURCHASES, Permission.CREATE_PURCHASE_ORDER, Permission.MANAGE_PURCHASE_ORDERS],
    "Fournisseurs": [Permission.VIEW_SUPPLIERS, Permission.MANAGE_SUPPLIERS],
    "Dépenses": [Permission.VIEW_EXPENSES, Permission.MANAGE_EXPENSES],
    "Rapports": [Permission.VIEW_REPORTS],
    "Utilisateurs & Rôles": [Permission.VIEW_USERS, Permission.MANAGE_USERS, Permission.VIEW_ROLES, Permission.MANAGE_ROLES],
    "Configuration": [Permission.VIEW_CATEGORIES, Permission.MANAGE_CATEGORIES, Permission.VIEW_STORES, Permission.MANAGE_STORES, Permission.MANAGE_SETTINGS],
    "Tableau de Bord": [Permission.VIEW_DASHBOARD_STATS, Permission.VIEW_DASHBOARD_CASHIER],
    "Audit": [Permission.VIEW_AUDIT_LOG],
    "Clôture de Caisse": [Permission.MANAGE_CASHIER_SESSIONS],
};

const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flat();

export let MOCK_ROLES: CustomRole[] = [
    { id: 'role_admin', name: 'Administrateur', permissions: ALL_PERMISSIONS },
    { id: 'role_manager', name: 'Manager', permissions: [
        Permission.VIEW_DASHBOARD_STATS, Permission.CREATE_SALE, Permission.VIEW_SALES_HISTORY,
        Permission.VIEW_STOCK, Permission.MANAGE_STOCK, Permission.MANAGE_STOCK_TRANSFERS, Permission.PERFORM_INVENTORY,
        Permission.VIEW_PURCHASES, Permission.CREATE_PURCHASE_ORDER, Permission.MANAGE_PURCHASE_ORDERS,
        Permission.VIEW_SUPPLIERS, Permission.MANAGE_SUPPLIERS, Permission.VIEW_EXPENSES, Permission.MANAGE_EXPENSES,
        Permission.VIEW_REPORTS, Permission.VIEW_USERS, Permission.MANAGE_CASHIER_SESSIONS
    ]},
    { id: 'role_cashier', name: 'Caissier', permissions: [
        Permission.VIEW_DASHBOARD_CASHIER, Permission.CREATE_SALE, Permission.VIEW_SALES_HISTORY,
        Permission.VIEW_STOCK, Permission.MANAGE_CASHIER_SESSIONS
    ]},
];

export let MOCK_STORES: Store[] = [
    { id: 'store_1', name: 'Boutique Principale (Abidjan)' },
    { id: 'store_2', name: 'Entrepôt (Yamoussoukro)' },
];

export let MOCK_USERS: User[] = [
    { id: 'user_admin', username: 'admin', passwordHash: 'password123', roleIds: ['role_admin'], profilePictureUrl: 'https://avatar.iran.liara.run/public/1' },
    { id: 'user_manager_1', username: 'manager1', passwordHash: 'password123', roleIds: ['role_manager'], storeId: 'store_1', profilePictureUrl: 'https://avatar.iran.liara.run/public/2' },
    { id: 'user_cashier_1', username: 'cashier1', passwordHash: 'password123', roleIds: ['role_cashier'], storeId: 'store_1', profilePictureUrl: 'https://avatar.iran.liara.run/public/3' },
    { id: 'user_cashier_2', username: 'cashier2', passwordHash: 'password123', roleIds: ['role_cashier'], storeId: 'store_2', profilePictureUrl: 'https://avatar.iran.liara.run/public/4' },
];

export let MOCK_CATEGORIES: Category[] = [
    { id: 'cat_1', name: 'Bois de Construction' },
    { id: 'cat_2', name: 'Visserie & Clous' },
    { id: 'cat_3', name: 'Outils Manuels' },
];

export let MOCK_PRODUCTS: Product[] = [
    {
        id: 'prod_1', name: 'Planche de Chêne', categoryId: 'cat_1', lowStockThreshold: 10, type: ProductType.VARIABLE,
        variations: [
            { id: 'var_1', productId: 'prod_1', sku: 'PC-200', price: 15000, attributes: { 'Dimension': '2m' } },
            { id: 'var_2', productId: 'prod_1', sku: 'PC-300', price: 22000, attributes: { 'Dimension': '3m' } },
        ]
    },
    {
        id: 'prod_2', name: 'Vis à bois (boîte de 100)', categoryId: 'cat_2', lowStockThreshold: 20, type: ProductType.STANDARD,
        sku: 'VB-50', price: 3500,
    },
    {
        id: 'prod_3', name: 'Marteau de Charpentier', categoryId: 'cat_3', lowStockThreshold: 5, type: ProductType.STANDARD,
        sku: 'MC-01', price: 7500,
    },
     {
        id: 'prod_4', name: 'Kit du Charpentier', categoryId: 'cat_3', lowStockThreshold: 0, type: ProductType.BUNDLE,
        sku: 'KIT-CHARP-01', price: 10000, // Discounted price for the bundle
        bundleComponents: [
            { variationId: 'prod_3', quantity: 1 }, // Marteau
            { variationId: 'prod_2', quantity: 1 }, // Vis
        ]
    }
];
// Standard products are also treated as having one variation with an ID equal to the product ID for stock purposes
MOCK_PRODUCTS.forEach(p => {
    if (p.type === ProductType.STANDARD) {
        p.variations = [{ id: p.id, productId: p.id, sku: p.sku!, price: p.price!, attributes: {} }];
    }
});


export let MOCK_STOCK: ProductStock[] = [
    { id: 'var_1-store_1', variationId: 'var_1', storeId: 'store_1', quantity: 50 },
    { id: 'var_1-store_2', variationId: 'var_1', storeId: 'store_2', quantity: 200 },
    { id: 'var_2-store_1', variationId: 'var_2', storeId: 'store_1', quantity: 30 },
    { id: 'prod_2-store_1', variationId: 'prod_2', storeId: 'store_1', quantity: 150 },
    { id: 'prod_2-store_2', variationId: 'prod_2', storeId: 'store_2', quantity: 500 },
    { id: 'prod_3-store_1', variationId: 'prod_3', storeId: 'store_1', quantity: 30 },
];

export let MOCK_SUPPLIERS: Supplier[] = [
    { id: 'sup_1', name: 'Scierie du Sud', contactPerson: 'Jean Yao', phone: '0102030405', email: 'contact@scieriedusud.ci', address: 'Zone Industrielle, Vridi', paymentTerms: 'Net 30' },
    { id: 'sup_2', name: 'Visserie Express', contactPerson: 'Amina Koné', phone: '0504030201', email: 'amina.kone@vissexpress.com', address: 'Koumassi, Abidjan', paymentTerms: 'Paiement à la commande' },
];

export let MOCK_SUPPLIER_PRODUCTS: SupplierProduct[] = [
    // Scierie du Sud
    { id: 'sup_1-var_1', supplierId: 'sup_1', variationId: 'var_1', purchasePrice: 12000, supplierSku: 'SDS-CHEN-2' },
    { id: 'sup_1-var_2', supplierId: 'sup_1', variationId: 'var_2', purchasePrice: 18000, supplierSku: 'SDS-CHEN-3' },
    // Visserie Express
    { id: 'sup_2-prod_2', supplierId: 'sup_2', variationId: 'prod_2', purchasePrice: 2500, supplierSku: 'VEX-VB50-100' },
    { id: 'sup_2-prod_3', supplierId: 'sup_2', variationId: 'prod_3', purchasePrice: 5500, supplierSku: 'VEX-MAR-CHP' },
];

export let MOCK_SALES: Sale[] = Array.from({ length: 25 }, (_, i) => {
    const store = MOCK_STORES[i % MOCK_STORES.length];
    const cashier = MOCK_USERS.filter(u => u.roleIds.includes('role_cashier') && u.storeId === store.id)[0] || MOCK_USERS[2];
    const productVar = MOCK_PRODUCTS[0].variations![i % 2];
    const amount = productVar.price * (i + 1);
    const date = new Date(2025, 9, 10 - i, 10, 30, 0).toISOString();
    return {
        id: `sale_${i + 1}`,
        userId: cashier.id,
        storeId: store.id,
        items: [{ variationId: productVar.id, quantity: i + 1, priceAtSale: productVar.price }],
        payments: [{ method: PaymentMethod.CASH, amount: amount, createdAt: date }],
        totalAmount: amount,
        status: SaleStatus.PAID,
        createdAt: date
    };
});


export let MOCK_PURCHASE_ORDERS: PurchaseOrder[] = Array.from({ length: 15 }, (_, i) => {
    const supplier = MOCK_SUPPLIERS[i % MOCK_SUPPLIERS.length];
    const store = MOCK_STORES[i % MOCK_STORES.length];
    const productVar = MOCK_PRODUCTS[0].variations![i % 2];
    const statusValues = Object.values(PurchaseOrderStatus);
    return {
        id: `po_${i + 1}`,
        supplierId: supplier.id,
        storeId: store.id,
        items: [{ variationId: productVar.id, quantity: 10 * (i + 1), receivedQuantity: i > 5 ? 10 * (i + 1) : 0, price: productVar.price * 0.8 }],
        status: statusValues[i % statusValues.length],
        createdAt: new Date(2025, 8, 15 - i).toISOString(),
        createdById: 'user_manager_1',
    };
});

export let MOCK_EXPENSES: Expense[] = Array.from({ length: 20 }, (_, i) => ({
    id: `exp_${i+1}`,
    userId: 'user_manager_1',
    storeId: MOCK_STORES[i % MOCK_STORES.length].id,
    category: Object.values(ExpenseCategory)[i % Object.values(ExpenseCategory).length],
    description: `Dépense diverse #${i+1}`,
    amount: Math.floor(Math.random() * 50000) + 10000,
    createdAt: new Date(2025, 9, 5 - i).toISOString(),
}));


const initializeMockData = () => {
    DB.roles = MOCK_ROLES;
    DB.users = MOCK_USERS;
    DB.stores = MOCK_STORES;
    DB.categories = MOCK_CATEGORIES;
    DB.products = MOCK_PRODUCTS;
    DB.stock = MOCK_STOCK;
    DB.suppliers = MOCK_SUPPLIERS;
    DB.supplierProducts = MOCK_SUPPLIER_PRODUCTS;
    DB.sales = MOCK_SALES;
    DB.purchaseOrders = MOCK_PURCHASE_ORDERS;
    DB.expenses = MOCK_EXPENSES;
    DB.auditLogs = [];
    DB.notifications = [];
    DB.inventorySessions = [];
    DB.cashierSessions = [];
    DB.companyInfo = {
        name: 'STOCKSYS Inc.',
        logoUrl: 'https://via.placeholder.com/150/0e7490/FFFFFF/?text=STOCKSYS',
        address: '123 Rue du Commerce, Abidjan, Côte d\'Ivoire',
        taxNumber: 'CI-ABJ-01-1234567A',
    };
    DB.appSettings = {
        stockAlertThreshold: 10,
    };
};

// ===================================================================================
// API FUNCTIONS
// ===================================================================================

const createAuditLog = (userId: string, action: AuditActionType, details: string) => {
    const user = DB.users.find(u => u.id === userId);
    const log: AuditLog = {
        id: generateId('log'),
        userId,
        username: user?.username || 'Système',
        action,
        details,
        createdAt: new Date().toISOString(),
    };
    DB.auditLogs.unshift(log);
    saveToLocalStorage();
};

const createNotification = (type: NotificationType, message: string, storeId?: string) => {
    const notif: Notification = {
        id: generateId('notif'),
        type,
        message,
        read: false,
        createdAt: new Date().toISOString(),
        storeId,
    };
    DB.notifications.unshift(notif);
    saveToLocalStorage();
}

// Auth
export const apiLogin = (username: string, password: string): Promise<User | null> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const user = DB.users.find(u => u.username === username && u.passwordHash === password);
            if (user) {
                createAuditLog(user.id, AuditActionType.USER_LOGIN, `Utilisateur ${user.username} connecté.`);
                resolve(user);
            } else {
                reject(new Error("Invalid credentials"));
            }
        }, 500);
    });
};

export const apiUpdatePassword = (userId: string, currentPass: string, newPass: string): Promise<{ success: boolean, message: string }> => {
    return new Promise(resolve => {
        const user = DB.users.find(u => u.id === userId);
        if (!user || user.passwordHash !== currentPass) {
            return resolve({ success: false, message: "Mot de passe actuel incorrect." });
        }
        user.passwordHash = newPass;
        saveToLocalStorage();
        createAuditLog(userId, AuditActionType.USER_UPDATE, "Mot de passe mis à jour.");
        resolve({ success: true, message: "Mot de passe mis à jour avec succès." });
    });
};

// Users
export const apiFetchUsers = () => [...DB.users];
export const apiCreateUser = (data: Partial<User> & { password?: string }, actorId: string) => {
    const newUser: User = {
        id: generateId('user'),
        username: data.username!,
        passwordHash: data.password || 'password123',
        roleIds: data.roleIds || [],
        storeId: data.storeId,
    };
    DB.users.push(newUser);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.USER_CREATE, `Utilisateur ${newUser.username} créé.`);
    return Promise.resolve(newUser);
};
export const apiUpdateUser = (id: string, data: Partial<User>, actorId: string) => {
    const userIndex = DB.users.findIndex(u => u.id === id);
    if (userIndex > -1) {
        DB.users[userIndex] = { ...DB.users[userIndex], ...data };
        saveToLocalStorage();
        createAuditLog(actorId, AuditActionType.USER_UPDATE, `Utilisateur ${DB.users[userIndex].username} mis à jour.`);
    }
    return Promise.resolve(DB.users[userIndex]);
};
export const apiDeleteUser = (id: string, actorId: string) => {
    const user = DB.users.find(u => u.id === id);
    DB.users = DB.users.filter(u => u.id !== id);
    saveToLocalStorage();
    if (user) createAuditLog(actorId, AuditActionType.USER_DELETE, `Utilisateur ${user.username} supprimé.`);
    return Promise.resolve();
};

// Roles
export const apiFetchRoles = () => [...DB.roles];
export const apiCreateRole = (data: Omit<CustomRole, 'id'>, actorId: string) => {
    const newRole: CustomRole = { id: generateId('role'), ...data };
    DB.roles.push(newRole);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.ROLE_CREATE, `Rôle '${newRole.name}' créé.`);
    return Promise.resolve(newRole);
}
export const apiUpdateRole = (id: string, data: Partial<CustomRole>, actorId: string) => {
    const roleIndex = DB.roles.findIndex(r => r.id === id);
    if (roleIndex > -1) {
        DB.roles[roleIndex] = { ...DB.roles[roleIndex], ...data };
        saveToLocalStorage();
        createAuditLog(actorId, AuditActionType.ROLE_UPDATE, `Rôle '${DB.roles[roleIndex].name}' mis à jour.`);
    }
    return Promise.resolve(DB.roles[roleIndex]);
}
export const apiDeleteRole = (id: string, actorId: string) => {
    const role = DB.roles.find(r => r.id === id);
    DB.roles = DB.roles.filter(r => r.id !== id);
    // Also remove this role from all users
    DB.users.forEach(u => {
        u.roleIds = u.roleIds.filter(roleId => roleId !== id);
    });
    saveToLocalStorage();
    if (role) createAuditLog(actorId, AuditActionType.ROLE_DELETE, `Rôle '${role.name}' supprimé.`);
    return Promise.resolve();
}

// Categories
export const apiFetchCategories = () => [...DB.categories];
export const apiCreateCategory = (data: Partial<Category>, actorId: string) => {
    const newCat = { id: generateId('cat'), name: data.name! };
    DB.categories.push(newCat);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Catégorie '${newCat.name}' créée.`);
    return Promise.resolve(newCat);
}
export const apiUpdateCategory = (id: string, data: Partial<Category>, actorId: string) => {
    const index = DB.categories.findIndex(c => c.id === id);
    if (index > -1) {
        DB.categories[index] = { ...DB.categories[index], ...data };
        saveToLocalStorage();
        createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Catégorie '${DB.categories[index].name}' mise à jour.`);
    }
    return Promise.resolve(DB.categories[index]);
}
export const apiDeleteCategory = (id: string, actorId: string) => {
    const cat = DB.categories.find(c => c.id === id);
    DB.categories = DB.categories.filter(c => c.id !== id);
    saveToLocalStorage();
    if (cat) createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Catégorie '${cat.name}' supprimée.`);
    return Promise.resolve();
}

// Stores
export const apiFetchStores = () => [...DB.stores];
export const apiCreateStore = (data: Partial<Store>, actorId: string) => {
    const newStore = { id: generateId('store'), name: data.name! };
    DB.stores.push(newStore);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.SETTINGS_UPDATE, `Boutique '${newStore.name}' créée.`);
    return Promise.resolve(newStore);
}
export const apiUpdateStore = (id: string, data: Partial<Store>, actorId: string) => {
    const index = DB.stores.findIndex(s => s.id === id);
    if (index > -1) {
        DB.stores[index] = { ...DB.stores[index], ...data };
        saveToLocalStorage();
        createAuditLog(actorId, AuditActionType.SETTINGS_UPDATE, `Boutique '${DB.stores[index].name}' mise à jour.`);
    }
    return Promise.resolve(DB.stores[index]);
}
export const apiDeleteStore = (id: string, actorId: string) => {
    const store = DB.stores.find(s => s.id === id);
    DB.stores = DB.stores.filter(s => s.id !== id);
    saveToLocalStorage();
    if (store) createAuditLog(actorId, AuditActionType.SETTINGS_UPDATE, `Boutique '${store.name}' supprimée.`);
    return Promise.resolve();
}


// Products
export const apiFetchProducts = () => [...DB.products];
export const apiCreateProduct = (data: Partial<Product>, actorId: string) => {
    const newProd: Product = {
        id: generateId('prod'),
        name: data.name!,
        categoryId: data.categoryId!,
        lowStockThreshold: data.lowStockThreshold || 10,
        type: data.type || ProductType.STANDARD,
        sku: data.sku,
        price: data.price,
        variations: data.variations,
        bundleComponents: data.bundleComponents,
    };
    if (newProd.type === ProductType.STANDARD) {
        newProd.variations = [{ id: newProd.id, productId: newProd.id, sku: newProd.sku!, price: newProd.price!, attributes: {} }];
    }
    if (newProd.type === ProductType.VARIABLE && newProd.variations) {
        newProd.variations.forEach(v => v.productId = newProd.id);
    }

    DB.products.push(newProd);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.PRODUCT_CREATE, `Produit '${newProd.name}' créé.`);
    return Promise.resolve(newProd);
}
export const apiUpdateProduct = (id: string, data: Partial<Product>, actorId: string) => {
    const index = DB.products.findIndex(p => p.id === id);
    if (index > -1) {
        DB.products[index] = { ...DB.products[index], ...data };
        saveToLocalStorage();
        createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Produit '${DB.products[index].name}' mis à jour.`);
    }
    return Promise.resolve(DB.products[index]);
}

// Stock
export const apiFetchStock = () => [...DB.stock];
export const apiAdjustStock = (variationId: string, storeId: string, newQuantity: number, actorId: string) => {
    const stockIndex = DB.stock.findIndex(s => s.variationId === variationId && s.storeId === storeId);
    if (stockIndex > -1) {
        const oldQty = DB.stock[stockIndex].quantity;
        DB.stock[stockIndex].quantity = newQuantity;
        createAuditLog(actorId, AuditActionType.STOCK_ADJUSTMENT, `Stock pour ${variationId} ajusté de ${oldQty} à ${newQuantity}.`);
    } else {
        DB.stock.push({ id: `${variationId}-${storeId}`, variationId, storeId, quantity: newQuantity });
        createAuditLog(actorId, AuditActionType.STOCK_ADJUSTMENT, `Stock pour ${variationId} initialisé à ${newQuantity}.`);
    }
    saveToLocalStorage();
    return Promise.resolve();
}
export const apiCreateStockTransfer = (fromStoreId: string, toStoreId: string, items: { variationId: string; quantity: number }[], actorId: string) => {
    items.forEach(item => {
        // Decrement from source
        const fromStock = DB.stock.find(s => s.variationId === item.variationId && s.storeId === fromStoreId);
        if (fromStock) fromStock.quantity -= item.quantity;
        // Increment at destination
        let toStock = DB.stock.find(s => s.variationId === item.variationId && s.storeId === toStoreId);
        if (toStock) toStock.quantity += item.quantity;
        else DB.stock.push({ id: `${item.variationId}-${toStoreId}`, variationId: item.variationId, storeId: toStoreId, quantity: item.quantity });
    });
    const fromStore = DB.stores.find(s => s.id === fromStoreId)?.name;
    const toStore = DB.stores.find(s => s.id === toStoreId)?.name;
    createAuditLog(actorId, AuditActionType.STOCK_TRANSFER, `Transfert de ${items.length} article(s) de ${fromStore} à ${toStore}.`);
    saveToLocalStorage();
    return Promise.resolve();
}

// Sales
export const apiFetchSales = () => [...DB.sales].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const apiCreateSale = (sale: Sale, actorId: string, isSyncing: boolean = false) => {
    if (DB.sales.some(s => s.id === sale.id)) { // Already synced
        return Promise.resolve(sale);
    }
    DB.sales.unshift(sale);

    // Decrement stock
    sale.items.forEach(item => {
        const product = DB.products.find(p => p.variations?.some(v => v.id === item.variationId));
        if (product?.type === ProductType.BUNDLE) {
            // Decrement components
            product.bundleComponents?.forEach(comp => {
                const stockItem = DB.stock.find(s => s.variationId === comp.variationId && s.storeId === sale.storeId);
                if (stockItem) {
                    stockItem.quantity -= (comp.quantity * item.quantity);
                }
            });
        } else {
            // Decrement standard/variation
            const stockItem = DB.stock.find(s => s.variationId === item.variationId && s.storeId === sale.storeId);
            if (stockItem) {
                stockItem.quantity -= item.quantity;
                // Check for low stock alert
                const product = DB.products.find(p => p.id === stockItem.variationId || p.variations?.some(v => v.id === stockItem.variationId));
                if (product && stockItem.quantity <= product.lowStockThreshold) {
                    createNotification(NotificationType.ALERT, `Stock bas pour ${product.name} dans la boutique ${DB.stores.find(s=>s.id === sale.storeId)?.name}.`, sale.storeId);
                }
            }
        }
    });

    if (!isSyncing) {
      createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Vente #${sale.id.slice(-6)} créée.`);
    }
    saveToLocalStorage();
    return Promise.resolve(sale);
}

// Expenses
export const apiFetchExpenses = () => [...DB.expenses];
export const apiCreateExpense = (data: Omit<Expense, 'id'>, actorId: string) => {
    const newExpense: Expense = { ...data, id: generateId('exp') };
    DB.expenses.push(newExpense);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.SETTINGS_UPDATE, `Dépense de ${newExpense.amount} enregistrée.`);
    return Promise.resolve(newExpense);
}
export const apiUpdateExpense = (id: string, data: Omit<Expense, 'id'>, actorId: string) => {
    const index = DB.expenses.findIndex(e => e.id === id);
    if (index > -1) {
        DB.expenses[index] = { ...DB.expenses[index], ...data };
        saveToLocalStorage();
        createAuditLog(actorId, AuditActionType.SETTINGS_UPDATE, `Dépense #${id.slice(-6)} mise à jour.`);
    }
    return Promise.resolve(DB.expenses[index]);
}
export const apiDeleteExpense = (id: string, actorId: string) => {
    DB.expenses = DB.expenses.filter(e => e.id !== id);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.SETTINGS_UPDATE, `Dépense #${id.slice(-6)} supprimée.`);
    return Promise.resolve();
}

// Suppliers
export const apiFetchSuppliers = () => [...DB.suppliers];
export const apiCreateSupplier = (data: Omit<Supplier, 'id'>, actorId: string) => {
    const newSupplier = { ...data, id: generateId('sup') };
    DB.suppliers.push(newSupplier);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Fournisseur '${newSupplier.name}' créé.`);
    return Promise.resolve(newSupplier);
}
export const apiUpdateSupplier = (id: string, data: Partial<Supplier>, actorId: string) => {
    const index = DB.suppliers.findIndex(s => s.id === id);
    if (index > -1) {
        DB.suppliers[index] = { ...DB.suppliers[index], ...data };
        saveToLocalStorage();
        createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Fournisseur '${DB.suppliers[index].name}' mis à jour.`);
    }
    return Promise.resolve(DB.suppliers[index]);
}
export const apiDeleteSupplier = (id: string, actorId: string) => {
    const supplier = DB.suppliers.find(s => s.id === id);
    DB.suppliers = DB.suppliers.filter(s => s.id !== id);
    saveToLocalStorage();
    if(supplier) createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Fournisseur '${supplier.name}' supprimé.`);
    return Promise.resolve();
}
export const apiFetchSupplierProducts = (supplierId: string) => DB.supplierProducts.filter(p => p.supplierId === supplierId);
export const apiAddProductToSupplier = (data: Omit<SupplierProduct, 'id'>, actorId: string) => {
    const newSupplierProduct = { ...data, id: `${data.supplierId}-${data.variationId}` };
    DB.supplierProducts.push(newSupplierProduct);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Produit ajouté au fournisseur.`);
    return Promise.resolve(newSupplierProduct);
}
export const apiRemoveProductFromSupplier = (supplierId: string, variationId: string, actorId: string) => {
    DB.supplierProducts = DB.supplierProducts.filter(p => !(p.supplierId === supplierId && p.variationId === variationId));
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.PRODUCT_UPDATE, `Produit retiré du fournisseur.`);
    return Promise.resolve();
}
export const getPurchasePriceForProduct = (variationId: string) => {
    // simplistic: returns first found price
    return DB.supplierProducts.find(p => p.variationId === variationId)?.purchasePrice;
}

// Purchase Orders
export const apiFetchPurchaseOrders = () => [...DB.purchaseOrders];
export const apiCreatePurchaseOrder = (data: PurchaseOrder, actorId: string) => {
    DB.purchaseOrders.push(data);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.PURCHASE_ORDER_CREATE, `Commande d'achat #${data.id.slice(-6)} créée.`);
    return Promise.resolve(data);
}
export const apiUpdatePurchaseOrder = (id: string, data: PurchaseOrder, actorId: string) => {
    const index = DB.purchaseOrders.findIndex(po => po.id === id);
    if (index > -1) {
        DB.purchaseOrders[index] = data;
        saveToLocalStorage();
        createAuditLog(actorId, AuditActionType.PURCHASE_ORDER_UPDATE, `Commande d'achat #${id.slice(-6)} mise à jour.`);
    }
    return Promise.resolve(data);
}
export const apiReceivePurchaseOrderItems = (id: string, itemsToReceive: { variationId: string, quantity: number }[], actorId: string) => {
    const po = DB.purchaseOrders.find(p => p.id === id);
    if (po) {
        itemsToReceive.forEach(item => {
            const poItem = po.items.find(i => i.variationId === item.variationId);
            if (poItem) {
                poItem.receivedQuantity += item.quantity;
                // Update stock
                const stockItem = DB.stock.find(s => s.variationId === item.variationId && s.storeId === po.storeId);
                if (stockItem) {
                    stockItem.quantity += item.quantity;
                } else {
                    DB.stock.push({ id: `${item.variationId}-${po.storeId}`, variationId: item.variationId, storeId: po.storeId, quantity: item.quantity });
                }
            }
        });
        const totalOrdered = po.items.reduce((sum, i) => sum + i.quantity, 0);
        const totalReceived = po.items.reduce((sum, i) => sum + i.receivedQuantity, 0);
        if (totalReceived >= totalOrdered) po.status = PurchaseOrderStatus.RECEIVED;
        else if (totalReceived > 0) po.status = PurchaseOrderStatus.PARTIALLY_RECEIVED;
        saveToLocalStorage();
        createAuditLog(actorId, AuditActionType.PURCHASE_ORDER_UPDATE, `Réception de stock pour la commande #${id.slice(-6)}.`);
    }
    return Promise.resolve();
}

// Notifications
export const apiFetchNotifications = () => [...DB.notifications];
export const apiMarkAllNotificationsAsRead = () => {
    DB.notifications.forEach(n => n.read = true);
    saveToLocalStorage();
    return Promise.resolve();
}

// Global Search
export const apiGlobalSearch = (term: string): Promise<GlobalSearchResults> => {
    const lowerTerm = term.toLowerCase();
    const results: GlobalSearchResults = {
        products: [],
        sales: [],
        suppliers: [],
    };
    DB.products.forEach(p => {
        if (p.name.toLowerCase().includes(lowerTerm) || p.sku?.toLowerCase().includes(lowerTerm)) {
            results.products.push(p);
        }
        p.variations?.forEach(v => {
            if (v.sku.toLowerCase().includes(lowerTerm)) {
                results.products.push(v);
            }
        });
    });
    results.sales = DB.sales.filter(s => s.id.includes(lowerTerm));
    results.suppliers = DB.suppliers.filter(s => s.name.toLowerCase().includes(lowerTerm));
    return Promise.resolve(results);
}

// Audit Log
export const apiFetchAuditLogs = () => [...DB.auditLogs];

// Settings
export const apiFetchCompanyInfo = () => DB.companyInfo;
export const apiUpdateCompanyInfo = (data: CompanyInfo, actorId: string) => {
    DB.companyInfo = data;
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.SETTINGS_UPDATE, "Informations de l'entreprise mises à jour.");
    return Promise.resolve();
}
export const apiFetchAppSettings = () => DB.appSettings;
export const apiUpdateAppSettings = (data: AppSettings, actorId: string) => {
    DB.appSettings = data;
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.SETTINGS_UPDATE, "Paramètres de l'application mis à jour.");
    return Promise.resolve();
}

// Inventory
export const apiFetchInventorySessions = () => [...DB.inventorySessions].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const apiStartInventorySession = (storeId: string, actorId: string): Promise<InventorySession> => {
    const currentStock = DB.stock.filter(s => s.storeId === storeId);
    const newSession: InventorySession = {
        id: generateId('inv'),
        storeId,
        userId: actorId,
        status: InventorySessionStatus.IN_PROGRESS,
        createdAt: new Date().toISOString(),
        items: currentStock.map(s => ({
            variationId: s.variationId,
            theoreticalQuantity: s.quantity,
            countedQuantity: -1, // -1 means not counted yet
        })),
    };
    DB.inventorySessions.push(newSession);
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.STOCK_ADJUSTMENT, `Inventaire #${newSession.id.slice(-6)} démarré.`);
    return Promise.resolve(newSession);
}
export const apiUpdateInventoryCount = (sessionId: string, items: { variationId: string, countedQuantity: number }[], actorId: string, finalize: boolean): Promise<InventorySession> => {
    const session = DB.inventorySessions.find(s => s.id === sessionId);
    if (!session) throw new Error("Session not found");
    
    items.forEach(update => {
        const item = session.items.find(i => i.variationId === update.variationId);
        if (item) item.countedQuantity = update.countedQuantity;
    });

    if (finalize) {
        session.items.forEach(item => {
            if (item.countedQuantity === -1) item.countedQuantity = 0; // Set uncounted items to 0
        });
        session.status = InventorySessionStatus.REVIEW;
    }
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.STOCK_ADJUSTMENT, `Comptage pour l'inventaire #${sessionId.slice(-6)} mis à jour.`);
    return Promise.resolve(session);
}
export const apiConfirmInventoryAdjustments = (sessionId: string, actorId: string): Promise<void> => {
    const session = DB.inventorySessions.find(s => s.id === sessionId);
    if (!session) throw new Error("Session not found");

    session.items.forEach(item => {
        const variance = item.countedQuantity - item.theoreticalQuantity;
        if (variance !== 0) {
            const stockItem = DB.stock.find(s => s.variationId === item.variationId && s.storeId === session.storeId);
            if (stockItem) stockItem.quantity = item.countedQuantity;
        }
    });

    session.status = InventorySessionStatus.COMPLETED;
    session.completedAt = new Date().toISOString();
    saveToLocalStorage();
    createAuditLog(actorId, AuditActionType.STOCK_ADJUSTMENT, `Ajustements de stock pour l'inventaire #${sessionId.slice(-6)} confirmés.`);
    return Promise.resolve();
}

// Cashier Sessions
export const apiFetchCashierSessions = () => [...DB.cashierSessions];
export const apiFetchActiveCashierSession = (userId: string, storeId: string): Promise<CashierSession | null> => {
    const session = DB.cashierSessions.find(s => s.userId === userId && s.storeId === storeId && s.endedAt === null);
    return Promise.resolve(session || null);
}
export const apiStartCashierSession = (userId: string, storeId: string, openingBalance: number): Promise<CashierSession> => {
    if (DB.cashierSessions.some(s => s.userId === userId && s.storeId === storeId && s.endedAt === null)) {
        throw new Error("Une session est déjà active pour cet utilisateur dans cette boutique.");
    }
    const newSession: CashierSession = {
        id: generateId('cash'),
        userId,
        storeId,
        startedAt: new Date().toISOString(),
        endedAt: null,
        openingBalance,
        closingBalance: null,
        theoreticalSales: { [PaymentMethod.CASH]: 0, [PaymentMethod.CARD]: 0, [PaymentMethod.MOBILE_MONEY]: 0 },
        difference: null,
    };
    DB.cashierSessions.push(newSession);
    saveToLocalStorage();
    return Promise.resolve(newSession);
}
export const apiCloseCashierSession = (sessionId: string, closingBalance: number, actorId: string): Promise<CashierSession> => {
    const session = DB.cashierSessions.find(s => s.id === sessionId);
    if (!session) throw new Error("Session not found");

    const salesInSession = DB.sales.filter(sale => 
        sale.storeId === session.storeId &&
        new Date(sale.createdAt) >= new Date(session.startedAt)
    );
    
    const theoreticalSales = { [PaymentMethod.CASH]: 0, [PaymentMethod.CARD]: 0, [PaymentMethod.MOBILE_MONEY]: 0 };
    salesInSession.forEach(sale => {
        sale.payments.forEach(payment => {
            if (theoreticalSales[payment.method as keyof typeof theoreticalSales] !== undefined) {
                theoreticalSales[payment.method as keyof typeof theoreticalSales] += payment.amount;
            }
        });
    });

    const expectedCash = session.openingBalance + theoreticalSales[PaymentMethod.CASH];
    
    session.endedAt = new Date().toISOString();
    session.closingBalance = closingBalance;
    session.theoreticalSales = theoreticalSales;
    session.difference = closingBalance - expectedCash;
    
    saveToLocalStorage();
    return Promise.resolve(session);
}


// Initialize DB on script load
loadFromLocalStorage();
