import React, { useState, useMemo, useEffect } from 'react';
import { Card, Table, Button, Modal, Input, Select, ExportDropdown, MultiSelect } from '../components/ui';
// Fix: Add missing imports
import { MOCK_STORES, apiCreateUser, apiUpdateUser, apiDeleteUser, MOCK_USERS, MOCK_ROLES } from '../services/mockApi';
import { USE_API, STRICT_API } from '../services/apiClient';
import { apiUsers } from '../services/apiUsers';
import { apiStores } from '../services/apiStores';
import { User, Permission, CustomRole, Store } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';

const ITEMS_PER_PAGE = 10;

const UsersPage: React.FC = () => {
    const { user: currentUser, hasPermission } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    // State for user roles in modal
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

    const [users, setUsers] = useState<User[]>([]);
    const [serverTotal, setServerTotal] = useState(0);
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [stores, setStores] = useState<Store[]>([]);
    const { addToast } = useToast();

    useEffect(() => {
        const load = async () => {
            if (USE_API) {
                try {
                    const [u, r, s] = await Promise.all([
                        apiUsers.fetchUsers({ page: currentPage, limit: ITEMS_PER_PAGE }),
                        apiUsers.fetchRoles(),
                        apiStores.fetchStores(),
                    ]);
                    let arr: any[] = (u as any)?.data || (u as any) || [];
                    arr = arr.map((usr: any) => ({...usr, roleIds: Array.isArray(usr.roleIds) ? usr.roleIds : (Array.isArray(usr.roles) ? usr.roles.map((rr: any) => rr.id) : []),}));
                    setUsers(arr as any);
                    setServerTotal(((u as any)?.meta?.total) || arr.length);
                    const rolesArray = Array.isArray(r) ? (r as any) : (Array.isArray((r as any)?.data) ? (r as any).data : []);
                    const storesArray = Array.isArray(s) ? (s as any) : (Array.isArray((s as any)?.data) ? (s as any).data : []);
                    setRoles(rolesArray as any);
                    setStores(storesArray as any);
                } catch (e) {
                    console.error('API users/roles failed', e);
                    if (STRICT_API) {
                        addToast({ message: "Erreur de chargement des utilisateurs/rôles/boutiques.", type: 'error' });
                        setUsers([]);
                        setRoles([]);
                        setStores([]);
                    } else {
                        setUsers([...MOCK_USERS]);
                        setRoles([...MOCK_ROLES]);
                        setStores([...MOCK_STORES]);
                    }
                }
            } else {
                setUsers([...MOCK_USERS]);
                setRoles([...MOCK_ROLES]);
                setStores([...MOCK_STORES]);
            }
        };
        load();
    }, [refreshKey, currentPage]);


    const filteredUsers = useMemo(() => {
        if (currentUser && !hasPermission(Permission.MANAGE_USERS) && hasPermission(Permission.VIEW_USERS) && currentUser.storeId) {
             // Non-admin managers only see users from their own store
            return users.filter(user => user.storeId === currentUser.storeId);
        }
        return users; // Admins see all users
    }, [users, currentUser, hasPermission]);


    const dataWithDetails = useMemo(() => filteredUsers.map(user => {
        const roleIds = Array.isArray(user.roleIds) ? user.roleIds : [];
        const roleList = Array.isArray(roles) ? roles : [];
        const userRoles = roleList.filter(role => roleIds.includes(role.id));
        const storesSource = USE_API ? (Array.isArray(stores) ? stores : []) : MOCK_STORES;
        return {
            ...user,
            storeName: user.storeId ? storesSource.find(s => s.id === user.storeId)?.name : 'N/A',
            roleNames: userRoles.map(r => r.name).join(', ') || 'Aucun rôle',
        }
    }), [filteredUsers, roles, stores]);
    
    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentUser) return;

        const formData = new FormData(e.currentTarget);
        
        const userData: Partial<User> & { username: string, roleIds: string[] } = {
            username: formData.get('username') as string,
            roleIds: selectedRoleIds,
            storeId: (formData.get('store') as string) || undefined,
        };
        
        if (!userData.username || userData.roleIds.length === 0) {
            alert("Le nom d'utilisateur et au moins un rôle sont requis.");
            return;
        }
        
        const password = formData.get('password') as string;

        try {
            if (USE_API) {
                if (editingUser) await apiUsers.updateUser(editingUser.id, userData);
                else await apiUsers.createUser({ ...userData, password });
            } else {
                if (editingUser) await apiUpdateUser(editingUser.id, userData, currentUser.id);
                else await apiCreateUser({ ...userData, password }, currentUser.id);
            }

            setIsCreateModalOpen(false);
            setEditingUser(null);
            setRefreshKey(oldKey => oldKey + 1);
        } catch (error: any) {
            addToast({ message: error?.message || "Erreur lors de l'enregistrement de l'utilisateur.", type: 'error' });
        }
    };
    
    const handleDeleteUser = async () => {
        if (!deletingUserId || !currentUser) return;
        try {
            if (USE_API) await apiUsers.deleteUser(deletingUserId);
            else await apiDeleteUser(deletingUserId, currentUser.id);
            setDeletingUserId(null);
            setRefreshKey(k => k + 1);
        } catch (error: any) {
            addToast({ message: error?.message || "Erreur lors de la suppression de l'utilisateur.", type: 'error' });
        }
    }

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        setSelectedRoleIds(Array.isArray(user.roleIds) ? user.roleIds : []);
        setIsCreateModalOpen(true);
    };

    const handleCreateClick = () => {
        setEditingUser(null);
        setSelectedRoleIds([]);
        setIsCreateModalOpen(true);
    };
    
    const exportableData = useMemo(() => {
        return dataWithDetails.map(user => ({
            'ID': user.id,
            'Nom d\'utilisateur': user.username,
            'Rôles': user.roleNames,
            'Boutique': user.storeName,
        }));
    }, [dataWithDetails]);

    const exportColumns = ['ID', 'Nom d\'utilisateur', 'Rôles', 'Boutique'];

    type EnrichedUser = typeof dataWithDetails[number];

    const columns: { header: string; accessor: keyof EnrichedUser | ((item: EnrichedUser) => React.ReactNode) }[] = [
        { header: 'Nom d\'utilisateur', accessor: 'username' },
        { header: 'Rôles', accessor: 'roleNames' },
        { header: 'Boutique Assignée', accessor: 'storeName' },
        { header: 'Actions', accessor: (item) => {
             if (!currentUser || !hasPermission(Permission.MANAGE_USERS)) return null;
            // Prevent admin from deleting themselves
            if (item.id === currentUser.id) return null;

            return (
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleEditClick(item)}>Modifier</Button>
                    <Button variant="danger" size="sm" onClick={() => setDeletingUserId(item.id)}>Supprimer</Button>
                </div>
            )
        }},
    ];

    const pageDescription = "Gérez tous les comptes utilisateurs et leurs permissions.";

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">{pageDescription}</p>
                 <div className="flex items-center gap-2 self-end sm:self-center">
                    <ExportDropdown data={exportableData} columns={exportColumns} filename="utilisateurs" />
                    {hasPermission(Permission.MANAGE_USERS) && <Button onClick={handleCreateClick}>Créer</Button>}
                </div>
            </div>
            <Card>
                <Table 
                    columns={columns} 
                    data={dataWithDetails}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    serverMode={USE_API}
                    totalItems={USE_API ? serverTotal : undefined}
                />
            </Card>

            <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setEditingUser(null); }} title={editingUser ? "Modifier l'utilisateur" : "Créer un nouvel utilisateur"}>
                <form className="space-y-4" onSubmit={handleFormSubmit}>
                    <Input label="Nom d'utilisateur" id="username" name="username" type="text" required defaultValue={editingUser?.username} />
                    {!editingUser && <Input label="Mot de passe (temporaire)" id="password" name="password" type="password" required />}
                    <MultiSelect
                        label="Rôles"
                        id="roles"
                        options={(Array.isArray(roles) ? roles : []).map(r => ({ value: r.id, label: r.name }))}
                        selectedValues={selectedRoleIds}
                        onChange={setSelectedRoleIds}
                    />
                    <Select 
                        label="Boutique" 
                        id="store" 
                        name="store"
                        defaultValue={editingUser?.storeId || ''}
                        options={[{ value: '', label: 'Aucune' }, ...((USE_API ? (Array.isArray(stores) ? stores : []) : MOCK_STORES).map(s => ({ value: s.id, label: s.name })))]} 
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => { setIsCreateModalOpen(false); setEditingUser(null); }}>Annuler</Button>
                        <Button type="submit">Enregistrer</Button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={!!deletingUserId} onClose={() => setDeletingUserId(null)} title="Confirmer la suppression">
                <div>
                    <p>Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.</p>
                    <div className="flex justify-end space-x-2 pt-6">
                        <Button type="button" variant="secondary" onClick={() => setDeletingUserId(null)}>Annuler</Button>
                        <Button type="button" variant="danger" onClick={handleDeleteUser}>Supprimer</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UsersPage;

