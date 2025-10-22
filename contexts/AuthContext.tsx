import React, { createContext, useState, useEffect, useCallback } from 'react';
// Fix: Add missing imports
import { User, Permission } from '../types';
import { apiLogin, MOCK_ROLES } from '../services/mockApi';
import { USE_API } from '../services/apiClient';
import { api as http } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Nouvel état pour gérer le chargement initial
  permissions: Set<Permission>;
  hasPermission: (permission: Permission) => boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateCurrentUser: (updatedData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
  const [isLoading, setIsLoading] = useState(true); // Initialisé à true

  const calculatePermissions = useCallback((loggedInUser: User | null): Set<Permission> => {
    if (!loggedInUser || !loggedInUser.roleIds || !Array.isArray(loggedInUser.roleIds)) {
        return new Set<Permission>();
    }
    const userRoles = MOCK_ROLES.filter(role => loggedInUser.roleIds.includes(role.id));
    const userPermissions = new Set<Permission>();
    for (const role of userRoles) {
        for (const perm of role.permissions) {
            userPermissions.add(perm);
        }
    }
    return userPermissions;
  }, []);

  // Effet d'initialisation unique au montage du composant
  useEffect(() => {
    const initializeAuth = () => {
      let validUserFound = false;
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Validation stricte de l'objet utilisateur
          if (parsedUser && parsedUser.id && parsedUser.username && Array.isArray(parsedUser.roleIds)) {
            setUser(parsedUser);
            // Si on est en mode API, on préfère les permissions stockées côté client
            if (USE_API) {
              const storedPerms = localStorage.getItem('permissions');
              if (storedPerms) {
                const perms: string[] = JSON.parse(storedPerms);
                setPermissions(new Set(perms as any));
              } else {
                setPermissions(calculatePermissions(parsedUser));
              }
            } else {
              setPermissions(calculatePermissions(parsedUser));
            }
            validUserFound = true;
          }
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage.", error);
      } finally {
        if (!validUserFound) {
          // Si aucun utilisateur valide n'est trouvé, on nettoie tout
          setUser(null);
          setPermissions(new Set());
          localStorage.removeItem('user');
        }
        setIsLoading(false); // L'initialisation est terminée
      }
    };

    initializeAuth();
  }, [calculatePermissions]);


  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      if (USE_API) {
        const res = await http.post('/auth/login', { username, password });
        if (res?.token && res?.user) {
          localStorage.setItem('token', res.token);
          if (Array.isArray(res.permissions)) localStorage.setItem('permissions', JSON.stringify(res.permissions));
          localStorage.setItem('user', JSON.stringify(res.user));
          setUser(res.user);
          setPermissions(new Set((res.permissions || []) as any));
          return true;
        }
        return false;
      } else {
        const loggedInUser = await apiLogin(username, password);
        if (loggedInUser) {
          localStorage.setItem('user', JSON.stringify(loggedInUser));
          setUser(loggedInUser);
          setPermissions(calculatePermissions(loggedInUser));
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, [calculatePermissions]);

  const logout = useCallback(() => {
    setUser(null);
    setPermissions(new Set());
    localStorage.clear();
    sessionStorage.clear();
  }, []);

  const updateCurrentUser = useCallback((updatedData: Partial<User>) => {
      setUser(prevUser => {
          if (!prevUser) return null;
          const newUser = { ...prevUser, ...updatedData };
          localStorage.setItem('user', JSON.stringify(newUser));
          return newUser;
      });
  }, []);
  
  const hasPermission = useCallback((permission: Permission): boolean => {
    return permissions.has(permission);
  }, [permissions]);
  
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, permissions, hasPermission, login, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};
