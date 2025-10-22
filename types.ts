// types.ts

// ===================================================================================
// AUTH & USERS
// ===================================================================================

export enum Permission {
    // Sales
    CREATE_SALE = 'CREATE_SALE',
    VIEW_SALES_HISTORY = 'VIEW_SALES_HISTORY',
    MANAGE_RETURNS = 'MANAGE_RETURNS',

    // Stock
    VIEW_STOCK = 'VIEW_STOCK',
    MANAGE_STOCK = 'MANAGE_STOCK', // Add, edit products
    PERFORM_INVENTORY = 'PERFORM_INVENTORY',
    MANAGE_STOCK_TRANSFERS = 'MANAGE_STOCK_TRANSFERS',

    // Purchases
    VIEW_PURCHASES = 'VIEW_PURCHASES',
    CREATE_PURCHASE_ORDER = 'CREATE_PURCHASE_ORDER',
    MANAGE_PURCHASE_ORDERS = 'MANAGE_PURCHASE_ORDERS', // Update status, receive stock

    // Suppliers
    VIEW_SUPPLIERS = 'VIEW_SUPPLIERS',
    MANAGE_SUPPLIERS = 'MANAGE_SUPPLIERS',

    // Expenses
    VIEW_EXPENSES = 'VIEW_EXPENSES',
    MANAGE_EXPENSES = 'MANAGE_EXPENSES',

    // Reports
    VIEW_REPORTS = 'VIEW_REPORTS',

    // Users & Roles
    VIEW_USERS = 'VIEW_USERS',
    MANAGE_USERS = 'MANAGE_USERS',
    VIEW_ROLES = 'VIEW_ROLES',
    MANAGE_ROLES = 'MANAGE_ROLES',

    // Settings & Configuration
    VIEW_CATEGORIES = 'VIEW_CATEGORIES',
    MANAGE_CATEGORIES = 'MANAGE_CATEGORIES',
    VIEW_STORES = 'VIEW_STORES',
    MANAGE_STORES = 'MANAGE_STORES',
    MANAGE_SETTINGS = 'MANAGE_SETTINGS',

    // Dashboard
    VIEW_DASHBOARD_STATS = 'VIEW_DASHBOARD_STATS',
    VIEW_DASHBOARD_CASHIER = 'VIEW_DASHBOARD_CASHIER',
    
    // Audit
    VIEW_AUDIT_LOG = 'VIEW_AUDIT_LOG',

    // Cashier sessions
    MANAGE_CASHIER_SESSIONS = 'MANAGE_CASHIER_SESSIONS',
}

export interface User {
    id: string;
    username: string;
    passwordHash: string; // Only in mock data, not exposed to client
    roleIds: string[];
    storeId?: string;
    profilePictureUrl?: string;
}

export interface CustomRole {
    id: string;
    name: string;
    permissions: Permission[];
}

// ===================================================================================
// CORE BUSINESS
// ===================================================================================

export interface Store {
    id: string;
    name: string;
}

export interface Category {
    id: string;
    name: string;
}

export enum ProductType {
    STANDARD = 'Standard',
    VARIABLE = 'Avec Variations',
    BUNDLE = 'Kit / Pack',
}

export interface ProductVariation {
    id: string; // e.g., 'prod_1-var_1'
    productId: string;
    sku: string;
    price: number;
    attributes: Record<string, string>; // e.g., { "Taille": "M", "Couleur": "Rouge" }
}

export interface BundleComponent {
    variationId: string; // A kit is composed of specific variations
    quantity: number;
}

export interface Product {
    id: string;
    name: string;
    categoryId: string;
    lowStockThreshold: number;
    type: ProductType;
    // For STANDARD products (and default SKU for bundles)
    sku?: string; 
    price?: number; 
    // For VARIABLE products
    variations?: ProductVariation[]; 
    // For BUNDLE products
    bundleComponents?: BundleComponent[];
}

export interface ProductStock {
    id: string; // Composite key like `variationId-storeId`
    variationId: string;
    storeId: string;
    quantity: number;
}

export enum PaymentMethod {
    CASH = 'Espèces',
    CARD = 'Carte de crédit',
    MOBILE_MONEY = 'Mobile Money',
}

export interface Payment {
    method: PaymentMethod;
    amount: number;
    createdAt: string;
}

export enum SaleStatus {
    COMPLETED = 'COMPLETED',
    PENDING_SYNC = 'PENDING_SYNC',
    RETURNED = 'RETURNED',
    PARTIALLY_PAID = 'PARTIALLY_PAID',
    UNPAID = 'UNPAID',
    PAID = 'PAID'
}

export interface SaleItem {
    variationId: string; // We sell a specific variation
    quantity: number;
    priceAtSale: number;
}

export interface Sale {
    id: string;
    userId: string;
    storeId: string;
    items: SaleItem[];
    payments: Payment[];
    totalAmount: number;
    status: SaleStatus;
    createdAt: string;
}

export enum ExpenseCategory {
    RENT = 'Loyer',
    SALARIES = 'Salaires',
    UTILITIES = 'Services Publics', // (eau, électricité)
    SUPPLIES = 'Fournitures de bureau',
    MARKETING = 'Marketing',
    OTHER = 'Autre',
}

export interface Expense {
    id: string;
    userId: string;
    storeId: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    createdAt: string;
}

export interface Supplier {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    paymentTerms: string;
}

export interface SupplierProduct {
    id: string; // composite key `supplierId-variationId`
    supplierId: string;
    variationId: string;
    purchasePrice: number;
    supplierSku: string;
}

export enum PurchaseOrderStatus {
    DRAFT = 'Brouillon',
    PENDING = 'En attente',
    ORDERED = 'Commandé',
    PARTIALLY_RECEIVED = 'Partiellement Reçu',
    RECEIVED = 'Reçu',
    CANCELLED = 'Annulé',
}

export interface PurchaseOrderItem {
    variationId: string; // We order a specific variation
    quantity: number;
    receivedQuantity: number;
    price: number; // Purchase price at time of order
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    storeId: string;
    items: PurchaseOrderItem[];
    status: PurchaseOrderStatus;
    createdAt: string;
    createdById: string;
    receivedAt?: string;
}

// ===================================================================================
// APP FEATURES
// ===================================================================================

export enum NotificationType {
    SALE = 'SALE',
    TRANSFER = 'TRANSFER',
    ALERT = 'ALERT',
    PURCHASE = 'PURCHASE',
    INVENTORY = 'INVENTORY',
}

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    read: boolean;
    createdAt: string;
    storeId?: string; // Link to a specific store
}

export interface GlobalSearchResults {
    products: (Product | ProductVariation)[];
    sales: Sale[];
    suppliers: Supplier[];
}

export enum AuditActionType {
    USER_LOGIN = 'USER_LOGIN',
    USER_CREATE = 'USER_CREATE',
    USER_UPDATE = 'USER_UPDATE',
    USER_DELETE = 'USER_DELETE',
    ROLE_CREATE = 'ROLE_CREATE',
    ROLE_UPDATE = 'ROLE_UPDATE',
    ROLE_DELETE = 'ROLE_DELETE',
    PRODUCT_CREATE = 'PRODUCT_CREATE',
    PRODUCT_UPDATE = 'PRODUCT_UPDATE',
    STOCK_ADJUSTMENT = 'STOCK_ADJUSTMENT',
    STOCK_TRANSFER = 'STOCK_TRANSFER',
    PURCHASE_ORDER_CREATE = 'PURCHASE_ORDER_CREATE',
    PURCHASE_ORDER_UPDATE = 'PURCHASE_ORDER_UPDATE',
    SETTINGS_UPDATE = 'SETTINGS_UPDATE',
}

export interface AuditLog {
    id: string;
    userId: string;
    username: string; // Denormalized for easy display
    action: AuditActionType;
    details: string;
    createdAt: string;
}

export interface CompanyInfo {
    name: string;
    logoUrl: string;
    address: string;
    taxNumber: string;
}

export interface AppSettings {
    stockAlertThreshold: number;
}

export enum InventorySessionStatus {
    IN_PROGRESS = 'En cours',
    REVIEW = 'En révision',
    COMPLETED = 'Terminé',
}

export interface InventoryItem {
    variationId: string;
    theoreticalQuantity: number;
    countedQuantity: number;
}

export interface InventorySession {
    id: string;
    storeId: string;
    userId: string;
    status: InventorySessionStatus;
    items: InventoryItem[];
    createdAt: string;
    completedAt?: string;
}

export interface CashierSession {
    id: string;
    userId: string;
    storeId: string;
    startedAt: string;
    endedAt: string | null;
    openingBalance: number;
    closingBalance: number | null;
    theoreticalSales: Record<PaymentMethod, number>;
    difference: number | null;
}