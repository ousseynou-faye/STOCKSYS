<<<<<<< HEAD




=======
>>>>>>> 7884868 (STOCKSYS)
import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { OnlineStatusProvider } from './contexts/OnlineStatusContext';
import { useAuth } from './hooks/useAuth';
// Fix: Add missing import
import { Permission } from './types';
import ErrorBoundary from './components/ErrorBoundary';

import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
// Fix: Add missing import
import StockPage from './pages/StockPage';
// Fix: Add missing import
import SalesPage from './pages/SalesPage';
import UsersPage from './pages/UsersPage';
import CategoriesPage from './pages/CategoriesPage';
import StoresPage from './pages/StoresPage';
import ExpensesPage from './pages/ExpensesPage';
import SuppliersPage from './pages/SuppliersPage';
import ProductsPage from './pages/ProductsPage';
// Fix: Add missing import
import PurchasesPage from './pages/PurchasesPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import RolesPage from './pages/RolesPage';
import AuditLogPage from './pages/AuditLogPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import CashierClosingPage from './pages/CashierClosingPage';
import { useToast } from './contexts/ToastContext';
import { buildPermissionDeniedMessage, pathToRequiredPermission } from './utils/permissionLabels';

<<<<<<< HEAD
=======

>>>>>>> 7884868 (STOCKSYS)
// Component to protect the entire application layout
const LayoutProtectedRoute: React.FC = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Layout /> : <Navigate to="/login" replace />;
};

// Component to protect specific routes based on permissions
const PermissionProtectedRoute: React.FC<{ permission: Permission }> = ({ permission }) => {
    const { hasPermission } = useAuth();
    
    // Authentication is already handled by LayoutProtectedRoute, so we only check permissions
    if (!hasPermission(permission)) {
        // Redirect to a fallback page (dashboard) if permission is denied
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};


const LoadingScreen: React.FC = () => (
    <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-accent">STOCK<span className="text-text-primary">SYS</span></h1>
            <p className="text-text-secondary mt-2">Chargement de l'application...</p>
        </div>
    </div>
);

const AppRoutes: React.FC = () => {
    const { isLoading } = useAuth();
    const { addToast } = useToast();

    React.useEffect(() => {
        const onApiError = (e: any) => {
            const detail = e?.detail || {};
            if (detail?.status === 403) {
                const perm = pathToRequiredPermission(detail.path || '');
                addToast({ message: buildPermissionDeniedMessage(perm), type: 'error' });
            }
        };
        const onUnauthorized = (e: any) => {
            addToast({ message: 'Session expirée. Veuillez vous reconnecter.', type: 'error' });
            try { localStorage.removeItem('token'); } catch {}
            // HashRouter: rediriger vers /login
            window.location.hash = '#/login';
        };
        window.addEventListener('api:error', onApiError as any);
        window.addEventListener('api:unauthorized', onUnauthorized as any);
        return () => {
            window.removeEventListener('api:error', onApiError as any);
            window.removeEventListener('api:unauthorized', onUnauthorized as any);
        };
    }, [addToast]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                
                {/* All main routes are now protected by the LayoutProtectedRoute */}
                <Route element={<LayoutProtectedRoute />}>
                     <Route path="/" element={<DashboardPage />} />
                     <Route path="/profile" element={<ProfilePage />} />
                     
                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_SALES_HISTORY} />}>
<<<<<<< HEAD
                         <Route path="/sales" element={<SalesPage />} />
                     </Route>

                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_STOCK} />}>
                         <Route path="/stock" element={<StockPage />} />
                         <Route path="/products" element={<ProductsPage />} />
=======
                        <Route path="/sales" element={<SalesPage />} />
                     </Route>

                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_STOCK} />}>
                        <Route path="/stock" element={<StockPage />} />
                        <Route path="/products" element={<ProductsPage />} />
>>>>>>> 7884868 (STOCKSYS)
                     </Route>
                    
                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_USERS} />}>
                        <Route path="/users" element={<UsersPage />} />
                     </Route>
                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_EXPENSES} />}>
                        <Route path="/expenses" element={<ExpensesPage />} />
                     </Route>
                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_SUPPLIERS} />}>
                        <Route path="/suppliers" element={<SuppliersPage />} />
                     </Route>
                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_PURCHASES} />}>
                        <Route path="/purchases" element={<PurchasesPage />} />
                     </Route>
                     {/* Fix: Changed Permission.VIEW_INVENTORY to Permission.PERFORM_INVENTORY which is defined in the enum. */}
                     <Route element={<PermissionProtectedRoute permission={Permission.PERFORM_INVENTORY} />}>
                        <Route path="/inventory" element={<InventoryPage />} />
                     </Route>
                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_REPORTS} />}>
                        <Route path="/reports" element={<ReportsPage />} />
                     </Route>
                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_CATEGORIES} />}>
                        <Route path="/categories" element={<CategoriesPage />} />
                     </Route>
                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_STORES} />}>
                        <Route path="/stores" element={<StoresPage />} />
                     </Route>
                     <Route element={<PermissionProtectedRoute permission={Permission.VIEW_ROLES} />}>
                        <Route path="/roles" element={<RolesPage />} />
                    </Route>
                    <Route element={<PermissionProtectedRoute permission={Permission.VIEW_AUDIT_LOG} />}>
                        <Route path="/audit-log" element={<AuditLogPage />} />
                    </Route>
                    <Route element={<PermissionProtectedRoute permission={Permission.MANAGE_SETTINGS} />}>
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>
                     <Route element={<PermissionProtectedRoute permission={Permission.MANAGE_CASHIER_SESSIONS} />}>
                        <Route path="/cashier-closing" element={<CashierClosingPage />} />
                    </Route>
                </Route>
                
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
    );
};


const App: React.FC = () => {
    return (
        <AuthProvider>
            <ToastProvider>
                <OnlineStatusProvider>
                    <ErrorBoundary>
                        <AppRoutes />
                    </ErrorBoundary>
                </OnlineStatusProvider>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
