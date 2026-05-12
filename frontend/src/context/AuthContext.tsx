import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApolloClient } from '@apollo/client';
import { User } from '../types';

// ─── Types ───────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

// ─── Context ─────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const apolloClient          = useApolloClient();

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('hivemind_token');
    const storedUser  = localStorage.getItem('hivemind_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('hivemind_token', newToken);
    localStorage.setItem('hivemind_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('hivemind_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem('hivemind_token');
    localStorage.removeItem('hivemind_user');
    setToken(null);
    setUser(null);
    apolloClient.clearStore();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
