import React, { createContext, useState, useContext, useCallback } from 'react';
import { ToastContainer } from '../components/Toast';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

<<<<<<< HEAD
=======
    const removeToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

>>>>>>> 7884868 (STOCKSYS)
    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { ...toast, id }]);
        
        setTimeout(() => {
            removeToast(id);
        }, 5000); // Auto-dismiss after 5 seconds
<<<<<<< HEAD
    }, []);
    
    const removeToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

=======
    }, [removeToast]);
    
>>>>>>> 7884868 (STOCKSYS)
    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
<<<<<<< HEAD
};
=======
};
>>>>>>> 7884868 (STOCKSYS)
