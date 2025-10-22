
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button, Input, Card } from '../components/ui';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const success = await login(username, password);
        setIsLoading(false);

        if (success) {
            navigate('/');
        } else {
            setError('Nom d\'utilisateur ou mot de passe incorrect.');
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Card className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-accent">STOCK<span className="text-text-primary">SYS</span></h1>
                    <p className="text-text-secondary mt-2">Connectez-vous à votre compte</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        id="username"
                        label="Nom d'utilisateur"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="e.g., admin"
                    />
                    <Input
                        id="password"
                        label="Mot de passe"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="e.g., password123"
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Connexion...' : 'Se connecter'}
                    </Button>
                </form>
                 <div className="mt-4 text-xs text-text-secondary text-center">
                    <p>Utilisateurs de démo:</p>
                    <p>admin / password123</p>
                    <p>manager1 / password123</p>
                    <p>cashier1 / password123</p>
                </div>
            </Card>
        </div>
    );
};

export default LoginPage;
