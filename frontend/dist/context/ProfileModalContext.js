import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
const ProfileModalContext = createContext(null);
export function ProfileModalProvider({ children }) {
    const [selectedUserId, setSelectedUserId] = useState(null);
    const openProfile = (userId) => setSelectedUserId(userId);
    const closeProfile = () => setSelectedUserId(null);
    return (_jsx(ProfileModalContext.Provider, { value: { openProfile, closeProfile, selectedUserId }, children: children }));
}
export function useProfileModal() {
    const ctx = useContext(ProfileModalContext);
    if (!ctx)
        throw new Error('useProfileModal must be used inside ProfileModalProvider');
    return ctx;
}
