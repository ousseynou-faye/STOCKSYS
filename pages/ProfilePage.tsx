import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { Card, Input, Button, Modal } from '../components/ui';
// Fix: Add missing imports
import { MOCK_ROLES, MOCK_STORES, apiUpdatePassword, apiUpdateUser } from '../services/mockApi';
import { UserCircleIcon, CameraIcon } from '../components/icons';

const PREDEFINED_AVATARS = [
    'https://avatar.iran.liara.run/public/boy',
    'https://avatar.iran.liara.run/public/girl',
    'https://avatar.iran.liara.run/public/64',
    'https://avatar.iran.liara.run/public/45',
    'https://avatar.iran.liara.run/public/33',
    'https://avatar.iran.liara.run/public/12',
    'https://avatar.iran.liara.run/public/98',
    'https://avatar.iran.liara.run/public/77',
];

const ProfilePage: React.FC = () => {
    const { user, updateCurrentUser } = useAuth();
    const { addToast } = useToast();
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    
    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const userRoles = useMemo(() => {
        if (!user) return 'N/A';
        return MOCK_ROLES.filter(role => user.roleIds.includes(role.id))
            .map(role => role.name)
            .join(', ');
    }, [user]);

    const userStore = useMemo(() => {
        if (!user || !user.storeId) return 'N/A';
        return MOCK_STORES.find(store => store.id === user.storeId)?.name || 'N/A';
    }, [user]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast({ message: 'Les nouveaux mots de passe ne correspondent pas.', type: 'error' });
            return;
        }
        if (!user) return;

        const result = await apiUpdatePassword(user.id, currentPassword, newPassword);
        if (result.success) {
            addToast({ message: result.message, type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            addToast({ message: result.message, type: 'error' });
        }
    };

    const handleAvatarSelect = async (url: string) => {
        if (!user) return;
        
        // Optimistic UI update
        updateCurrentUser({ profilePictureUrl: url });

        // API call
        await apiUpdateUser(user.id, { profilePictureUrl: url }, user.id);
        
        addToast({ message: "Photo de profil mise à jour.", type: 'success' });
        setIsAvatarModalOpen(false);
    };

    if (!user) {
        return <p>Utilisateur non trouvé.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Info Card */}
            <Card className="md:col-span-1 flex flex-col items-center p-8">
                <div className="relative mb-4">
                    {user.profilePictureUrl ? (
                        <img src={user.profilePictureUrl} alt="Profil" className="h-32 w-32 rounded-full object-cover ring-4 ring-accent/50" />
                    ) : (
                        <UserCircleIcon className="h-32 w-32 text-text-secondary" />
                    )}
                    <button 
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="absolute bottom-0 right-0 bg-accent text-white p-2 rounded-full hover:bg-accent-dark transition-transform active:scale-90"
                        aria-label="Changer la photo de profil"
                    >
                        <CameraIcon className="w-5 h-5" />
                    </button>
                </div>
                <h2 className="text-2xl font-bold text-text-primary">{user.username}</h2>
                <p className="text-text-secondary">{userRoles}</p>
                <p className="text-accent text-sm mt-1">{userStore}</p>
            </Card>

            {/* Change Password Card */}
            <Card className="md:col-span-2">
                <h3 className="text-xl font-bold text-text-primary mb-6 border-b border-secondary/50 pb-4">Changer le mot de passe</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <Input
                        label="Mot de passe actuel"
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                    />
                    <Input
                        label="Nouveau mot de passe"
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                    <Input
                        label="Confirmer le nouveau mot de passe"
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <div className="pt-2 text-right">
                        <Button type="submit">Mettre à jour</Button>
                    </div>
                </form>
            </Card>

            {/* Avatar Selection Modal */}
            <Modal isOpen={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} title="Choisir un nouvel avatar">
                <div className="grid grid-cols-4 gap-4">
                    {PREDEFINED_AVATARS.map((avatar, index) => (
                        <button key={index} onClick={() => handleAvatarSelect(avatar)} className="rounded-full overflow-hidden hover:ring-4 hover:ring-accent transition-all">
                            <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

export default ProfilePage;