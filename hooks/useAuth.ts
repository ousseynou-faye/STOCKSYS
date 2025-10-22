
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

// Best Practice: A custom hook like `useAuth` simplifies consuming context.
// Instead of `useContext(AuthContext)` in every component, we use `useAuth()`.
// It also provides a single point to add error handling if the hook is used
// outside of the provider.

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
