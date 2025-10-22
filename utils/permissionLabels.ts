import { Permission } from '../types';

export const PermissionLabels: Record<string, string> = {
  [Permission.VIEW_STOCK]: 'Gestion de stock',
  [Permission.VIEW_SALES_HISTORY]: 'Historique des ventes',
  [Permission.VIEW_PURCHASES]: 'Achats',
  [Permission.VIEW_REPORTS]: 'Rapports',
  [Permission.VIEW_EXPENSES]: 'Dépenses',
  [Permission.PERFORM_INVENTORY]: 'Inventaire',
  [Permission.MANAGE_CASHIER_SESSIONS]: 'Clôture de caisse',
  [Permission.VIEW_USERS]: 'Utilisateurs',
  [Permission.VIEW_ROLES]: 'Rôles',
  [Permission.VIEW_CATEGORIES]: 'Catégories',
  [Permission.VIEW_STORES]: 'Boutiques',
  [Permission.MANAGE_SETTINGS]: 'Paramètres',
  [Permission.VIEW_AUDIT_LOG]: "Journal d'audit",
};

export function pathToRequiredPermission(path: string): string | null {
  // Basic prefix matching to infer permission from API path
  const p = path || '';
  if (p.startsWith('/products')) return Permission.VIEW_STOCK;
  if (p.startsWith('/stock')) return Permission.VIEW_STOCK;
  if (p.startsWith('/sales')) return Permission.VIEW_SALES_HISTORY;
  if (p.startsWith('/purchase-orders')) return Permission.VIEW_PURCHASES;
  if (p.startsWith('/reports')) return Permission.VIEW_REPORTS;
  if (p.startsWith('/expenses')) return Permission.VIEW_EXPENSES;
  if (p.startsWith('/inventory-sessions')) return Permission.PERFORM_INVENTORY;
  if (p.startsWith('/cashier-sessions')) return Permission.MANAGE_CASHIER_SESSIONS;
  if (p.startsWith('/users')) return Permission.VIEW_USERS;
  if (p.startsWith('/roles')) return Permission.VIEW_ROLES;
  if (p.startsWith('/categories')) return Permission.VIEW_CATEGORIES;
  if (p.startsWith('/stores')) return Permission.VIEW_STORES;
  if (p.startsWith('/settings')) return Permission.MANAGE_SETTINGS;
  if (p.startsWith('/audit')) return Permission.VIEW_AUDIT_LOG;
  if (p.startsWith('/notifications')) return Permission.VIEW_DASHBOARD_STATS;
  return null;
}

export function buildPermissionDeniedMessage(permission?: string | null): string {
  if (permission && PermissionLabels[permission]) {
    return `Accès refusé — permission requise: ${permission}`;
  }
  return 'Accès refusé.';
}

