// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

type AuthContextType = {
    currentUser: User | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
    });

    return unsubscribe;
    }, []);

    const value = {
        currentUser,
        loading
    };

    return (
    <AuthContext.Provider value={value}>
        {!loading && children}
    </AuthContext.Provider>
    );
}