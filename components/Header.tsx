


import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { Button, Input } from './ui';
import { 
    NotificationIcon, AlertIcon, SalesIcon, StockIcon, MenuIcon, 
    PurchaseOrderIcon, InventoryIcon, SupplierIcon, UserCircleIcon, CogIcon, LogoutIcon
} from './icons';
// Fix: Add missing imports
import { Notification, NotificationType, GlobalSearchResults } from '../types';
import { apiFetchNotifications, apiMarkAllNotificationsAsRead, apiGlobalSearch } from '../services/mockApi';
import { USE_API } from '../services/apiClient';
import { apiNotifications } from '../services/apiNotifications';
import { apiSearch } from '../services/apiSearch';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}


const GlobalSearch: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<GlobalSearchResults | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const navigate = useNavigate();

    useEffect(() => {
        const run = async () => {
            if (!debouncedSearchTerm) { setResults(null); setIsOpen(false); return; }
            try {
                if (USE_API) {
                    const res = await apiSearch.global(debouncedSearchTerm);
                    setResults(res);
                } else {
                    const res = await apiGlobalSearch(debouncedSearchTerm);
                    setResults(res);
                }
                setIsOpen(true);
            } catch (e) {
                // fallback mock on error
                const res = await apiGlobalSearch(debouncedSearchTerm);
                setResults(res);
                setIsOpen(true);
            }
        };
        run();
    }, [debouncedSearchTerm]);
    
    const handleResultClick = (path: string) => {
        setSearchTerm('');
        setIsOpen(false);
        navigate(path);
    };

    return (
        <div className="relative w-full max-w-xs">
            <Input 
                id="global-search"
                label=""
                placeholder="Recherche globale..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            />
            {isOpen && results && (
                <div className="absolute top-full mt-2 w-full bg-surface rounded-lg shadow-2xl border border-secondary/50 z-50 max-h-96 overflow-y-auto">
                   {results.products.length === 0 && results.sales.length === 0 && results.suppliers.length === 0 && searchTerm ? (
                        <p className="p-4 text-sm text-text-secondary">Aucun résultat trouvé.</p>
                   ) : (
                    <>
                        {results.products.length > 0 && (
                            <div>
                                <h4 className="p-3 text-xs font-bold uppercase text-text-secondary border-b border-secondary">Produits</h4>
                                <ul>{results.products.map(p => <li key={p.id} onClick={() => handleResultClick(`/stock?tab=products&search=${'sku' in p ? p.sku : ''}`)} className="p-3 text-sm hover:bg-secondary/50 cursor-pointer">{('name' in p ? p.name : 'Variation')} <span className="text-xs text-text-secondary">({('sku' in p ? p.sku : '')})</span></li>)}</ul>
                            </div>
                        )}
                        {results.sales.length > 0 && (
                            <div>
                                <h4 className="p-3 text-xs font-bold uppercase text-text-secondary border-b border-secondary">Ventes</h4>
                                <ul>{results.sales.map(s => <li key={s.id} onClick={() => handleResultClick(`/sales?search=${s.id}`)} className="p-3 text-sm hover:bg-secondary/50 cursor-pointer">Vente #{s.id.slice(-6)} <span className="text-xs text-text-secondary">({new Date(s.createdAt).toLocaleDateString()})</span></li>)}</ul>
                            </div>
                        )}
                        {results.suppliers.length > 0 && (
                            <div>
                                <h4 className="p-3 text-xs font-bold uppercase text-text-secondary border-b border-secondary">Fournisseurs</h4>
                                <ul>{results.suppliers.map(s => <li key={s.id} onClick={() => handleResultClick(`/suppliers?search=${s.id}`)} className="p-3 text-sm hover:bg-secondary/50 cursor-pointer">{s.name}</li>)}</ul>
                            </div>
                        )}
                    </>
                   )}
                </div>
            )}
        </div>
    );
}

const OnlineStatusIndicator: React.FC = () => {
    const { isOnline, isSyncing, pendingSaleCount } = useOnlineStatus();

    if (isOnline && !isSyncing && pendingSaleCount === 0) {
        return <div className="flex items-center text-xs text-green-400"><div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>En ligne</div>;
    }
    if (isSyncing) {
        return <div className="flex items-center text-xs text-yellow-400 animate-pulse"><div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>Synchronisation...</div>;
    }
    if (!isOnline) {
        return <div className="flex items-center text-xs text-red-400"><div className="w-2 h-2 rounded-full bg-red-400 mr-2"></div>Hors ligne ({pendingSaleCount} en attente)</div>;
    }
    if (pendingSaleCount > 0) {
         return <div className="flex items-center text-xs text-yellow-400"><div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>{pendingSaleCount} vente(s) en attente</div>;
    }
    return null;
}


const NotificationCard: React.FC<{ notification: Notification }> = ({ notification }) => {
    const iconMap: Record<NotificationType, React.ReactNode> = {
        [NotificationType.SALE]: <SalesIcon className="h-5 w-5 text-accent" />,
        [NotificationType.TRANSFER]: <StockIcon className="h-5 w-5 text-primary" />,
        [NotificationType.ALERT]: <AlertIcon className="h-5 w-5 text-danger" />,
        [NotificationType.PURCHASE]: <PurchaseOrderIcon className="h-5 w-5 text-yellow-400" />,
        [NotificationType.INVENTORY]: <InventoryIcon className="h-5 w-5 text-purple-400" />,
    };

    return (
        <li className={`p-3 flex items-start space-x-3 hover:bg-secondary/50 transition-colors ${!notification.read ? 'bg-primary/10' : ''}`}>
            <div className="flex-shrink-0 mt-1">{iconMap[notification.type]}</div>
            <div>
                <p className="text-sm text-text-primary">{notification.message}</p>
                <p className="text-xs text-text-secondary mt-1">
                    {new Date(notification.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
             {!notification.read && <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2 ml-auto"></div>}
        </li>
    );
};

const UserMenu: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2 p-1 rounded-full hover:bg-secondary/50">
                {user?.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt="Profil" className="h-8 w-8 rounded-full object-cover"/>
                ) : (
                    <UserCircleIcon className="h-8 w-8 text-text-secondary" />
                )}
            </button>
            {isOpen && (
                 <div className="absolute top-full right-0 mt-2 w-64 bg-surface rounded-lg shadow-2xl border border-secondary/50 z-50">
                     <div className="p-4 border-b border-secondary/50">
                         <p className="font-semibold text-text-primary">{user?.username}</p>
                         <p className="text-xs text-text-secondary">Connecté</p>
                     </div>
                    <ul className="py-2">
                        <li>
                            <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center w-full px-4 py-3 text-sm text-text-primary hover:bg-secondary/50 transition-colors">
                                <CogIcon className="h-6 w-6 mr-3 text-text-secondary" />
                                <span className="font-medium">Mon Profil</span>
                            </Link>
                        </li>
                        <li>
                            <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm text-text-primary hover:bg-secondary/50 transition-colors">
                                <LogoutIcon className="h-6 w-6 mr-3 text-text-secondary" />
                                <span className="font-medium">Déconnexion</span>
                            </button>
                        </li>
                    </ul>
                 </div>
            )}
        </div>
    );
}

const Header: React.FC<{notificationKey: number, onMenuClick: () => void}> = ({notificationKey, onMenuClick}) => {
    const { user } = useAuth();
    const location = useLocation();
    
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    
    useEffect(() => {
        const load = async () => {
            try {
                if (USE_API) {
                    const res = await apiNotifications.fetch();
                    setNotifications(res);
                } else {
                    setNotifications(apiFetchNotifications());
                }
            } catch (e) {
                setNotifications(apiFetchNotifications());
            }
        };
        load();
    }, [notificationKey]);

    const filteredNotifications = useMemo(() => {
        if (!user) return [];
        if (!user.storeId) return notifications;
        return notifications.filter(n => !n.storeId || n.storeId === user.storeId);
    }, [notifications, user]);

    const unreadCount = useMemo(() => filteredNotifications.filter(n => !n.read).length, [filteredNotifications]);

    const handleMarkAllRead = async () => {
        try {
            if (USE_API) await apiNotifications.markAllRead(); else await apiMarkAllNotificationsAsRead();
        } finally {
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        }
    };

    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return `Bonjour, ${user?.username}!`;
        if (path.startsWith('/stock')) return 'Gestion de Stock';
        if (path.startsWith('/sales')) return 'Historique des Ventes';
        if (path.startsWith('/purchases')) return 'Commandes d\'Achat';
        if (path.startsWith('/suppliers')) return 'Gestion des Fournisseurs';
        if (path.startsWith('/expenses')) return 'Gestion des Dépenses';
        if (path.startsWith('/inventory')) return 'Gestion d\'Inventaire';
        if (path.startsWith('/reports')) return 'Rapports & Analyses';
        if (path.startsWith('/categories')) return 'Gestion des Catégories';
        if (path.startsWith('/stores')) return 'Gestion des Boutiques';
        if (path.startsWith('/users')) return 'Gestion des Utilisateurs';
        if (path.startsWith('/roles')) return 'Rôles & Permissions';
        if (path.startsWith('/audit-log')) return "Journal d'Audit";
        if (path.startsWith('/profile')) return "Mon Profil";
        if (path.startsWith('/cashier-closing')) return "Clôture de Caisse";
        if (path.startsWith('/settings')) return "Paramètres";
        return `Bonjour, ${user?.username}!`;
    };

    return (
        <header className="flex-shrink-0 flex flex-col md:flex-row justify-between items-center p-4 sm:p-6 lg:p-8 border-b border-secondary/50 gap-4">
            <div className="flex items-center w-full md:w-auto">
                <button onClick={onMenuClick} className="mr-4 text-text-secondary md:hidden">
                    <MenuIcon />
                </button>
                <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
            </div>
            
            <div className="flex items-center justify-end w-full md:w-auto space-x-2 md:space-x-4">
                <GlobalSearch />
                <OnlineStatusIndicator />
                
                <div className="relative">
                    <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="relative text-text-secondary hover:text-text-primary transition-colors p-2 rounded-full hover:bg-secondary">
                        <NotificationIcon />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-danger ring-2 ring-surface" />
                        )}
                    </button>
                    
                    {isPanelOpen && (
                        <div className="absolute top-full right-0 mt-2 w-80 max-w-sm bg-surface rounded-lg shadow-2xl border border-secondary/50 z-50">
                            <div className="flex justify-between items-center p-3 border-b border-secondary">
                                <h3 className="font-semibold">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-xs text-accent hover:underline">
                                        Tout marquer comme lu
                                    </button>
                                )}
                            </div>
                            
                            <ul className="divide-y divide-secondary max-h-96 overflow-y-auto">
                                {filteredNotifications.length > 0 ? (
                                    filteredNotifications.map(notif => <NotificationCard key={notif.id} notification={notif} />)
                                ) : (
                                    <p className="text-center text-text-secondary p-4">Aucune notification</p>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
                <UserMenu />
            </div>
        </header>
    );
};

export default Header;
