import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { Card, Input, Button } from '../components/ui';
// Fix: Add missing imports
import { CompanyInfo, AppSettings } from '../types';
import { 
    apiFetchCompanyInfo, 
    apiUpdateCompanyInfo, 
    apiFetchAppSettings, 
    apiUpdateAppSettings 
} from '../services/mockApi';
import { USE_API } from '../services/apiClient';
import { apiSettings } from '../services/apiSettings';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: '', logoUrl: '', address: '', taxNumber: '' });
    const [appSettings, setAppSettings] = useState<AppSettings>({ stockAlertThreshold: 0 });
    const [isSavingCompany, setIsSavingCompany] = useState(false);
    const [isSavingApp, setIsSavingApp] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (USE_API) {
                try {
                    const [c, a] = await Promise.all([apiSettings.getCompany(), apiSettings.getApp()]);
                    setCompanyInfo(c as any);
                    setAppSettings(a as any);
                    return;
                } catch (e) {
                    // fallback mock
                }
            }
            setCompanyInfo(apiFetchCompanyInfo());
            setAppSettings(apiFetchAppSettings());
        };
        load();
    }, []);

    const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompanyInfo({ ...companyInfo, [e.target.name]: e.target.value });
    };

    const handleAppSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAppSettings({ ...appSettings, [e.target.name]: Number(e.target.value) });
    };

    const handleSaveCompanyInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSavingCompany(true);
        if (USE_API) await apiSettings.updateCompany(companyInfo); else await apiUpdateCompanyInfo(companyInfo, user.id);
        setIsSavingCompany(false);
        addToast({ message: "Informations de l'entreprise mises à jour.", type: 'success' });
    };

    const handleSaveAppSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSavingApp(true);
        if (USE_API) await apiSettings.updateApp(appSettings); else await apiUpdateAppSettings(appSettings, user.id);
        setIsSavingApp(false);
        addToast({ message: "Paramètres de l'application mis à jour.", type: 'success' });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Paramètres Généraux</h1>
            
            {/* Company Info Card */}
            <Card>
                <form onSubmit={handleSaveCompanyInfo} className="space-y-4">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 border-b border-secondary pb-3">Informations de l'Entreprise</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Nom de l'entreprise"
                            id="name"
                            name="name"
                            value={companyInfo.name}
                            onChange={handleCompanyInfoChange}
                            required
                        />
                        <Input
                            label="URL du logo"
                            id="logoUrl"
                            name="logoUrl"
                            value={companyInfo.logoUrl}
                            onChange={handleCompanyInfoChange}
                            placeholder="https://example.com/logo.png"
                        />
                        <Input
                            label="Adresse"
                            id="address"
                            name="address"
                            value={companyInfo.address}
                            onChange={handleCompanyInfoChange}
                            required
                        />
                        <Input
                            label="Numéro de contribuable"
                            id="taxNumber"
                            name="taxNumber"
                            value={companyInfo.taxNumber}
                            onChange={handleCompanyInfoChange}
                            required
                        />
                    </div>
                    <div className="pt-2 text-right">
                        <Button type="submit" disabled={isSavingCompany}>
                            {isSavingCompany ? 'Enregistrement...' : 'Enregistrer les informations'}
                        </Button>
                    </div>
                </form>
            </Card>

            {/* App Settings Card */}
            <Card>
                <form onSubmit={handleSaveAppSettings} className="space-y-4">
                     <h2 className="text-xl font-semibold text-text-primary mb-4 border-b border-secondary pb-3">Paramètres de l'Application</h2>
                     <div className="max-w-sm">
                        <Input
                            label="Seuil d'alerte de stock"
                            id="stockAlertThreshold"
                            name="stockAlertThreshold"
                            type="number"
                            min="0"
                            value={appSettings.stockAlertThreshold}
                            onChange={handleAppSettingsChange}
                            required
                        />
                        <p className="text-xs text-text-secondary mt-1">
                            Une notification sera créée lorsqu'un stock passe en dessous de ce seuil.
                        </p>
                     </div>
                    <div className="pt-2 text-right">
                        <Button type="submit" disabled={isSavingApp}>
                             {isSavingApp ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default SettingsPage;
