


import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface OnlineStatusContextType {
    isOnline: boolean;
    isSyncing: boolean;
    pendingSaleCount: number;
    setPendingSaleCount: (count: number) => void;
    triggerSync: () => void;
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(undefined);

export const useOnlineStatus = () => {
    const context = useContext(OnlineStatusContext);
    if (!context) {
        throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
    }
    return context;
};

export const OnlineStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSaleCount, setPendingSaleCount] = useState(0);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    
    // Trigger background sync via Service Worker
    const triggerSync = () => {
        if (navigator.serviceWorker.ready && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(swRegistration => {
                // Fix: The 'sync' property is part of the Background Sync API, which might not be in default TS types.
                // Casting to any is a pragmatic way to solve this without altering tsconfig.
                return (swRegistration as any).sync.register('sync-pending-sales');
            }).catch(err => console.error('Background sync registration failed:', err));
        } else {
             console.log("Background Sync not supported, manual sync might be needed.");
        }
    };
    
    // Listen for sync messages from the Service Worker
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'SYNC_STARTED') {
                setIsSyncing(true);
            }
            if (event.data && event.data.type === 'SYNC_COMPLETE') {
                setIsSyncing(false);
                // The SalesPage will update the count and refresh
            }
        };
        navigator.serviceWorker.addEventListener('message', handleMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }, []);

    return (
        <OnlineStatusContext.Provider value={{ isOnline, isSyncing, pendingSaleCount, setPendingSaleCount, triggerSync }}>
            {children}
        </OnlineStatusContext.Provider>
    );
};