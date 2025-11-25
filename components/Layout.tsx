import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
// Fix: Add missing import
import { Permission } from '../types';
import Header from './Header';
import {
    DashboardIcon,
    StockIcon,
    SalesIcon,
    UsersIcon,
    CategoriesIcon,
    StoreIcon,
    ExpenseIcon,
    SupplierIcon,
    PurchaseOrderIcon,
    InventoryIcon,
    ReportsIcon,
    AuditLogIcon,
    SettingsIcon,
    CashRegisterIcon,
    IconProps
} from './icons';

interface NavItemProps {
    to: string;
    label: string;
    icon: React.FC<IconProps>;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, icon: Icon }) => (
    <li>
        <NavLink
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
                `flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
                isActive
                    ? 'bg-accent text-white shadow-lg'
                    : 'text-text-secondary hover:bg-secondary/80 hover:text-text-primary'
                }`
            }
        >
            <Icon className="h-6 w-6 mr-3 flex-shrink-0" />
            <span className="font-medium">{label}</span>
        </NavLink>
    </li>
);

const Layout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { hasPermission } = useAuth();
    
<<<<<<< HEAD
    const [notificationKey, setNotificationKey] = useState(Date.now()); 
=======
    const [notificationKey] = useState(Date.now()); 
>>>>>>> 7884868 (STOCKSYS)

    const navLinks = [
        { to: '/', label: 'Tableau de Bord', icon: DashboardIcon, permission: null }, // Always show for authenticated users
        { to: '/sales', label: 'Ventes', icon: SalesIcon, permission: Permission.VIEW_SALES_HISTORY },
        { to: '/cashier-closing', label: 'Clôture de Caisse', icon: CashRegisterIcon, permission: Permission.MANAGE_CASHIER_SESSIONS },
        { to: '/stock', label: 'Stock', icon: StockIcon, permission: Permission.VIEW_STOCK },
        { to: '/products', label: 'Produits', icon: StockIcon, permission: Permission.VIEW_STOCK },
        { to: '/purchases', label: 'Achats', icon: PurchaseOrderIcon, permission: Permission.VIEW_PURCHASES },
        { to: '/suppliers', label: 'Fournisseurs', icon: SupplierIcon, permission: Permission.VIEW_SUPPLIERS },
        { to: '/expenses', label: 'Dépenses', icon: ExpenseIcon, permission: Permission.VIEW_EXPENSES },
        { to: '/inventory', label: 'Inventaire', icon: InventoryIcon, permission: Permission.PERFORM_INVENTORY },
        { to: '/reports', label: 'Rapports', icon: ReportsIcon, permission: Permission.VIEW_REPORTS },
    ];

    const adminLinks = [
        { to: '/users', label: 'Utilisateurs', icon: UsersIcon, permission: Permission.VIEW_USERS },
        { to: '/roles', label: 'Rôles & Permissions', icon: UsersIcon, permission: Permission.VIEW_ROLES },
        { to: '/audit-log', label: 'Journal d\'Audit', icon: AuditLogIcon, permission: Permission.VIEW_AUDIT_LOG },
        { to: '/categories', label: 'Catégories', icon: CategoriesIcon, permission: Permission.VIEW_CATEGORIES },
        { to: '/stores', label: 'Boutiques', icon: StoreIcon, permission: Permission.VIEW_STORES },
        { to: '/settings', label: 'Paramètres', icon: SettingsIcon, permission: Permission.MANAGE_SETTINGS },
    ];

    const visibleAdminLinks = adminLinks.filter(link => hasPermission(link.permission));

    return (
        <div className="flex h-screen bg-background text-text-primary overflow-hidden">
            {/* Sidebar */}
            <aside className={`absolute md:relative z-30 w-64 bg-surface border-r border-secondary/50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
                <div className="flex items-center justify-center p-6 border-b border-secondary/50">
                    <h1 className="text-2xl font-bold text-accent">STOCK<span className="text-text-primary">SYS</span></h1>
                </div>
                
                <nav className="flex-1 p-4 overflow-y-auto">
                    <ul>
                        {navLinks.map(link => 
                            (link.permission === null || hasPermission(link.permission)) && <NavItem key={link.to} {...link} />
                        )}
                    </ul>

                    {visibleAdminLinks.length > 0 && (
                         <div className="mt-6">
                            <h2 className="px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Administration</h2>
                            <ul>
                                {visibleAdminLinks.map(link => <NavItem key={link.to} {...link} />)}
                            </ul>
                        </div>
                    )}
                </nav>
            </aside>
            
             {/* Overlay for mobile */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header notificationKey={notificationKey} onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
