import React from 'react';
import { Toast, ToastType } from '../contexts/ToastContext';
import { SuccessIcon, ErrorIcon, InfoIcon, CloseIcon } from './icons';

interface ToastProps {
    toast: Toast;
    onDismiss: (id: number) => void;
}

const ToastMessage: React.FC<ToastProps> = ({ toast, onDismiss }) => {
    const typeClasses: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
        success: { bg: 'bg-green-500', icon: <SuccessIcon className="text-white" /> },
        error: { bg: 'bg-danger', icon: <ErrorIcon className="text-white" /> },
        info: { bg: 'bg-blue-500', icon: <InfoIcon className="text-white" /> },
    };

    return (
        <div className={`
            flex items-start p-4 rounded-lg shadow-2xl text-white w-full max-w-sm
            ${typeClasses[toast.type].bg} 
            animate-toast-in
        `}>
            <div className="flex-shrink-0 mr-3">
                {typeClasses[toast.type].icon}
            </div>
            <div className="flex-grow text-sm font-medium">
                {toast.message}
            </div>
            <button onClick={() => onDismiss(toast.id)} className="ml-4 flex-shrink-0">
                <CloseIcon className="w-5 h-5 text-white/80 hover:text-white" />
            </button>
        </div>
    );
};


interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] space-y-2">
            {toasts.map(toast => (
                <ToastMessage key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
            <style>{`
                @keyframes toast-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-toast-in {
                    animation: toast-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};