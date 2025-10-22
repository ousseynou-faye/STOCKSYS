

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Modal, Input, ConfirmationModal } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
// Fix: Add missing imports
import { CustomRole, Permission } from '../types';
import { apiFetchRoles, apiCreateRole, apiUpdateRole, apiDeleteRole, PERMISSION_GROUPS } from '../services/mockApi';
import { USE_API } from '../services/apiClient';
import { apiRoles } from '../services/apiRoles';
import { useAuth } from '../hooks/useAuth';

const ITEMS_PER_PAGE = 10;

const RolesPage: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [roles, setRoles] = useState<CustomRole[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());

    // Confirmation modal
    const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
    
    // Pagination & Search
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const load = async () => {
            if (USE_API) {
                try {
                    const rs = await apiRoles.fetchRoles();
                    setRoles(rs);
                } catch (e) {
                    console.error('API roles failed, fallback to mock', e);
                    setRoles(apiFetchRoles());
                }
            } else {
                setRoles(apiFetchRoles());
            }
        };
        load();
    }, [refreshKey]);

    const filteredRoles = useMemo(() => {
        return roles.filter(role => role.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [roles, searchTerm]);

    const handleCreateClick = () => {
        setEditingRole(null);
        setSelectedPermissions(new Set());
        setIsEditModalOpen(true);
    };
    
    const handleEditClick = (role: CustomRole) => {
        setEditingRole(role);
        setSelectedPermissions(new Set(role.permissions));
        setIsEditModalOpen(true);
    };

    const handlePermissionToggle = (permission: Permission) => {
        const newPermissions = new Set(selectedPermissions);
        if (newPermissions.has(permission)) {
            newPermissions.delete(permission);
        } else {
            newPermissions.add(permission);
        }
        setSelectedPermissions(newPermissions);
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        const formData = new FormData(e.currentTarget);
        const name = formData.get('role-name') as string;

        if (!name.trim()) {
            addToast({ message: "Le nom du rôle est requis.", type: 'error' });
            return;
        }

        const roleData: Omit<CustomRole, 'id'> = {
            name,
            permissions: Array.from(selectedPermissions),
        };

        // API réelle si activée, sinon fallback mock
        if (USE_API) {
            if (editingRole) await apiRoles.updateRole(editingRole.id, roleData);
            else await apiRoles.createRole(roleData);
            setIsEditModalOpen(false);
            setRefreshKey(k => k + 1);
            return;
        }

        if (editingRole) {
            await apiUpdateRole(editingRole.id, roleData, user.id);
            addToast({ message: "Rôle mis à jour avec succès.", type: 'success' });
        } else {
            await apiCreateRole(roleData, user.id);
            addToast({ message: "Rôle créé avec succès.", type: 'success' });
        }

        setIsEditModalOpen(false);
        setRefreshKey(k => k + 1);
    };

    const handleDeleteRole = async () => {
        if (!deletingRoleId || !user) return;
        if (USE_API) { await apiRoles.deleteRole(deletingRoleId); setDeletingRoleId(null); setRefreshKey(k => k + 1); return; }
        // Basic protection for default roles
        if (['role_admin', 'role_manager', 'role_cashier'].includes(deletingRoleId)) {
            addToast({ message: "Impossible de supprimer les rôles par défaut.", type: 'error' });
            setDeletingRoleId(null);
            return;
        }
        await apiDeleteRole(deletingRoleId, user.id);
        addToast({ message: "Rôle supprimé avec succès.", type: 'success' });
        setDeletingRoleId(null);
        setRefreshKey(k => k + 1);
    };

    const columns: { header: string; accessor: keyof CustomRole | ((item: CustomRole) => React.ReactNode) }[] = [
        { header: 'Nom du Rôle', accessor: 'name' },
        { header: 'Permissions', accessor: (item) => `${item.permissions.length} activée(s)` },
        { header: 'Actions', accessor: (item) => (
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleEditClick(item)}>Modifier</Button>
                <Button variant="danger" size="sm" onClick={() => setDeletingRoleId(item.id)}>Supprimer</Button>
            </div>
        )},
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-lg text-text-secondary">Créez et configurez des rôles avec des permissions personnalisées.</p>
                <Button onClick={handleCreateClick} className="self-end sm:self-center">Créer un rôle</Button>
            </div>

            <Card>
                <div className="mb-4">
                    <Input 
                        label="Rechercher un rôle"
                        id="search-role"
                        placeholder="Nom du rôle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Table 
                    columns={columns}
                    data={filteredRoles}
                    currentPage={currentPage}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </Card>
            
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                title={editingRole ? `Modifier le rôle: ${editingRole.name}` : "Créer un nouveau rôle"}
                wrapperClassName="md:max-w-3xl"
            >
                <form onSubmit={handleFormSubmit}>
                    <div className="space-y-6">
                        <Input label="Nom du Rôle" id="role-name" name="role-name" required defaultValue={editingRole?.name} />
                        
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                            <h3 className="font-semibold">Permissions</h3>
                            {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                                <div key={groupName} className="p-3 bg-background rounded-lg">
                                    <h4 className="font-medium text-accent mb-2">{groupName}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {/* FIX: Add type assertion to permissions to solve TypeScript error */}
                                        {(permissions as Permission[]).map(permission => (
                                            <label key={permission} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-secondary/50">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                                                    checked={selectedPermissions.has(permission)}
                                                    onChange={() => handlePermissionToggle(permission)}
                                                />
                                                <span className="text-sm">{permission.replace(/_/g, ' ')}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-6 mt-4 border-t border-secondary">
                        <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Annuler</Button>
                        <Button type="submit">Enregistrer</Button>
                    </div>
                </form>
            </Modal>

            {deletingRoleId && (
                <ConfirmationModal
                    isOpen={true}
                    title="Confirmer la suppression"
                    onClose={() => setDeletingRoleId(null)}
                    onConfirm={handleDeleteRole}
                >
                    <p>Êtes-vous sûr de vouloir supprimer ce rôle ? Il sera retiré de tous les utilisateurs auxquels il est assigné.</p>
                </ConfirmationModal>
            )}
        </div>
    );
};

export default RolesPage;
