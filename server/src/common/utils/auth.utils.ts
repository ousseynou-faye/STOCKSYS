export function hasGlobalAccess(user?: { permissions?: string[] }): boolean {
  return Array.isArray(user?.permissions) && user!.permissions.includes('MANAGE_ROLES');
}

export function getUserStoreId(user?: { storeId?: string }): string | undefined {
  const storeId = typeof user?.storeId === 'string' && user.storeId.length > 0 ? user.storeId : undefined;
  return storeId;
}
