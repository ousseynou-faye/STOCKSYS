import React, { useState, useEffect, useRef, Fragment } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon, ExportIcon, CloseIcon } from './icons';

// Card Component
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-surface p-4 sm:p-6 rounded-lg shadow-md border border-secondary/50 ${className}`}>
        {children}
    </div>
);

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}
export const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', size = 'md', ...props }) => {
    const baseClasses = 'font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed';
    const variantClasses = {
        primary: 'bg-accent text-white hover:bg-accent/90 focus:ring-accent',
        secondary: 'bg-secondary text-text-primary hover:bg-secondary/80 focus:ring-secondary',
        danger: 'bg-danger text-white hover:bg-danger/90 focus:ring-danger',
    };
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>
            {children}
        </button>
    );
};

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
}
export const Input: React.FC<InputProps> = ({ label, id, className = '', ...props }) => (
    <div className="w-full">
        {label && <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
            {label}
        </label>}
        <input
            id={id}
            className={`w-full bg-background border border-secondary/70 rounded-md px-3 py-2 text-sm text-text-primary focus:ring-accent focus:border-accent ${className}`}
            {...props}
        />
    </div>
);

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    id: string;
    options: { value: string | number; label: string }[];
}
export const Select: React.FC<SelectProps> = ({ label, id, options, className = '', ...props }) => (
    <div className="w-full">
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
            {label}
        </label>
        <select
            id={id}
            className={`w-full bg-background border border-secondary/70 rounded-md px-3 py-2 text-sm text-text-primary focus:ring-accent focus:border-accent ${className}`}
            {...props}
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    </div>
);


// MultiSelect Component
interface MultiSelectProps {
    label: string;
    id: string;
    options: { value: string; label: string }[];
    selectedValues: string[];
    onChange: (selected: string[]) => void;
}
export const MultiSelect: React.FC<MultiSelectProps> = ({ label, id, options, selectedValues, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (value: string) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelected);
    };

    const selectedLabels = options.filter(opt => selectedValues.includes(opt.value)).map(opt => opt.label).join(', ') || 'Aucun';

    return (
        <div className="w-full relative" ref={ref}>
            <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">
                {label}
            </label>
            <div
                id={id}
                className="w-full bg-background border border-secondary/70 rounded-md px-3 py-2 text-sm text-text-primary cursor-pointer min-h-[38px] flex items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedLabels}
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-surface border border-secondary/70 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {options.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 p-2 hover:bg-secondary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedValues.includes(option.value)}
                                onChange={() => handleSelect(option.value)}
                                className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                            />
                            <span>{option.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

// Table Component
interface TableProps<T> {
    columns: { header: string; accessor: keyof T | ((item: T) => React.ReactNode) }[];
    data: T[];
    currentPage: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onRowClick?: (item: T) => void;
    // Optional server-side pagination support
    totalItems?: number;
    serverMode?: boolean;
}
export const Table = <T extends { id?: string | number }>({ columns, data, currentPage, itemsPerPage, onPageChange, onRowClick, totalItems, serverMode }: TableProps<T>) => {
    const total = serverMode && typeof totalItems === 'number' ? totalItems : data.length;
    const paginatedData = serverMode ? data : data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(total / itemsPerPage);

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-text-secondary">
                    <thead className="text-xs text-text-primary uppercase bg-secondary/50">
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} scope="col" className="px-6 py-3">{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length > 0 ? paginatedData.map((item, itemIndex) => (
                            <tr key={item.id || itemIndex} className={`border-b border-secondary/50 ${onRowClick ? 'cursor-pointer hover:bg-secondary/30' : ''}`} onClick={() => onRowClick?.(item)}>
                                {columns.map((col, colIndex) => (
                                    <td key={colIndex} className="px-6 py-4 text-text-primary whitespace-nowrap">
                                        {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor as keyof T] as React.ReactNode)}
                                    </td>
                                ))}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-8 px-6 text-text-secondary">
                                    Aucune donnée disponible.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {total > itemsPerPage && (
                 <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-text-secondary">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                            <ChevronLeftIcon />
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                             <ChevronRightIcon />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Modal Component
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    wrapperClassName?: string;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, wrapperClassName = 'md:max-w-md' }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <Fragment>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div className={`bg-surface rounded-lg shadow-xl w-full mx-4 ${wrapperClassName} transform transition-all animate-modal-in`} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-secondary/50">
                        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                        <button onClick={onClose}><CloseIcon className="w-5 h-5 text-text-secondary hover:text-text-primary" /></button>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes modal-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-modal-in {
                    animation: modal-in 0.2s ease-out forwards;
                }
            `}</style>
        </Fragment>,
        document.body
    );
};

// ConfirmationModal Component
interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
}
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div>
                <div className="text-text-secondary">{children}</div>
                <div className="flex justify-end space-x-2 pt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button type="button" variant="danger" onClick={onConfirm}>Confirmer</Button>
                </div>
            </div>
        </Modal>
    );
};


// ExportDropdown Component
interface ExportDropdownProps {
    data: any[];
    columns: string[];
    filename: string;
}
export const ExportDropdown: React.FC<ExportDropdownProps> = ({ data, columns, filename }) => {
    const downloadCSV = () => {
        if (data.length === 0) return;
        const header = columns.join(',');
        const rows = data.map(row => 
            columns.map(col => {
                let cell = row[col] ?? '';
                if (typeof cell === 'string') {
                    cell = `"${cell.replace(/"/g, '""')}"`; // Escape quotes
                }
                return cell;
            }).join(',')
        ).join('\n');
        
        const csv = `${header}\n${rows}`;
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button variant="secondary" onClick={downloadCSV}>
            <ExportIcon className="mr-2" /> Exporter
        </Button>
    );
};
