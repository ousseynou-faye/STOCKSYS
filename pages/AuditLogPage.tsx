import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Input, Select, ExportDropdown, Button } from '../components/ui';
// Fix: Add missing imports
import { apiFetchAuditLogs, MOCK_USERS } from '../services/mockApi';
import { USE_API, STRICT_API } from '../services/apiClient';
import { apiAudit } from '../services/apiAudit';
import { apiUsers } from '../services/apiUsers';
import { AuditLog, AuditActionType, User } from '../types';
import { useToast } from '../contexts/ToastContext';

const ITEMS_PER_PAGE = 15;

const AuditLogPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [serverTotal, setServerTotal] = useState(0);
    const [filters, setFilters] = useState({
        userId: '',
        action: '',
        date: '',
    });

    const { addToast } = useToast();
    useEffect(() => {
        const load = async () => {
            if (USE_API) {
                try {
                    const [resLogs, resUsers] = await Promise.all([
                        apiAudit.fetchLogs({ page: currentPage, limit: ITEMS_PER_PAGE, userId: filters.userId || undefined, action: filters.action || undefined, date: filters.date || undefined }),
                        apiUsers.fetchUsers(),
                    ]);
                    const arr: any[] = ((resLogs as any)?.data || (resLogs as any) || []);
                    setLogs(arr as any);
                    setServerTotal(((resLogs as any)?.meta?.total) || arr.length);
                    setUsers(((resUsers as any)?.data || (resUsers as any) || []) as any);
                    return;
                } catch (e: any) {
                    addToast({ message: 'Impossible de charger toutes les données du journal.', type: 'error' });
                    if (STRICT_API) {
                        setLogs([]);
                        setUsers([]);
                        setServerTotal(0);
                    } else {
                        try { setLogs(apiFetchAuditLogs()); } catch { setLogs([]); }
                        const forbidden = e?.status === 403 || e?.status === 401;
                        setUsers(forbidden ? [] : (MOCK_USERS as any));
                        setServerTotal(0);
                    }
                    return;
                }
            }
            setLogs(apiFetchAuditLogs());
            setUsers(MOCK_USERS as any);
        };
        load();
    }, [currentPage, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const resetFilters = () => {
        setFilters({ userId: '', action: '', date: '' });
    };
    
    const filteredLogs = useMemo(() => {
        if (USE_API) return logs;
        return logs.filter(log => {
            if (filters.userId && log.userId !== filters.userId) return false;
            if (filters.action && log.action !== filters.action) return false;
            if (filters.date && !log.createdAt.startsWith(filters.date)) return false;
            return true;
        });
    }, [logs, filters]);
    
    useEffect(() => setCurrentPage(1), [filters]);

    const columns: { header: string; accessor: keyof AuditLog | ((item: AuditLog) => React.ReactNode); }[] = [
        { header: 'Date', accessor: (item) => new Date(item.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium'}) },
        { header: 'Utilisateur', accessor: 'username' },
        { header: 'Action', accessor: 'action' },
        { header: 'Détails', accessor: 'details' },
    ];
    
    const exportableData = useMemo(() => filteredLogs.map(log => ({
        'Date': new Date(log.createdAt).toLocaleString('fr-CA'),
        'Utilisateur': log.username,
        'Action': log.action,
        'Détails': log.details,
        'ID Utilisateur': log.userId,
    })), [filteredLogs]);
    const exportColumns = ['Date', 'Utilisateur', 'Action', 'Détails', 'ID Utilisateur'];

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Suivez toutes les actions critiques effectuées dans l'application.</p>
                <ExportDropdown data={exportableData} columns={exportColumns} filename="journal_audit" />
            </div>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <Input label="Filtrer par date" id="date" name="date" type="date" value={filters.date} onChange={handleFilterChange} />
                    <Select label="Filtrer par utilisateur" id="userId" name="userId" value={filters.userId} onChange={handleFilterChange} options={[{ value: '', label: 'Tous' }, ...((USE_API ? users : (MOCK_USERS as any)) as any[]).map((u: any) => ({ value: u.id, label: (u.username || u.email || u.name) }))]} />
                    {/* Fix: Explicitly type 'a' as string to fix .replace() error */}
                    <Select label="Filtrer par action" id="action" name="action" value={filters.action} onChange={handleFilterChange} options={[{ value: '', label: 'Toutes' }, ...Object.values(AuditActionType).map((a: string) => ({ value: a, label: a.replace(/_/g, ' ') }))]} />
                    <Button variant="secondary" onClick={resetFilters} className="w-full">Réinitialiser</Button>
                </div>
            </Card>
            <Card>
                <Table 
                    columns={columns}
                    data={filteredLogs}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    serverMode={USE_API}
                    totalItems={USE_API ? serverTotal : undefined}
                />
            </Card>
        </div>
    );
};

export default AuditLogPage;
