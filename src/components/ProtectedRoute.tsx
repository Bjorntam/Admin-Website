// src/components/ProtectedRoute.tsx
import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole: 'Admin' | 'Teacher';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { currentUser, loading } = useAuth();
    const [role, setRole] = useState<string | null>(null);
    const [checkingRole, setCheckingRole] = useState(true);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (!currentUser) return;

            const docRef = doc(db, 'teachers', currentUser.email!);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setRole(docSnap.data().Role);
            }

            setCheckingRole(false);
        };

        if (currentUser) {
            fetchUserRole();
        }
    }, [currentUser]);

    if (loading || checkingRole) return <div>Loading...</div>;

    if (!currentUser) {
        return <Navigate to="/auth" />;
    }

    if (role !== requiredRole) {
        return <Navigate to="/unauthorized" />; // Create a simple Unauthorized page if you want
    }

    return <>{children}</>;
}
