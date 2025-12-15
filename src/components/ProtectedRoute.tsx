import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/firestore';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    React.useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            // Redirect to login if not authenticated
            router.replace('/');
        } else if (user && allowedRoles && !allowedRoles.includes(user.role)) {
            // Redirect if role not allowed (could go to a "Not Authorized" page or home)
            alert('Access Denied: You do not have permission to view this page.');
            router.back();
        }
    }, [user, loading, segments]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return <>{children}</>;
}
