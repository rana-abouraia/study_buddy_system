import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
// ─── Context ─────────────────────────────────────────────
const AuthContext = createContext(undefined);
// ─── Provider ────────────────────────────────────────────
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setLoading] = useState(true);
    const apolloClient = useApolloClient();
    // Restore session from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('hivemind_token');
        const storedUser = localStorage.getItem('hivemind_user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);
    const login = (newToken, newUser) => {
        localStorage.setItem('hivemind_token', newToken);
        localStorage.setItem('hivemind_user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };
    const logout = () => {
        localStorage.removeItem('hivemind_token');
        localStorage.removeItem('hivemind_user');
        setToken(null);
        setUser(null);
        apolloClient.clearStore();
    };
    return (_jsx(AuthContext.Provider, { value: {
            user,
            token,
            isAuthenticated: !!token && !!user,
            isLoading,
            login,
            logout,
        }, children: children }));
}
// ─── Hook ────────────────────────────────────────────────
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
