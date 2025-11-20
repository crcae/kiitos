import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import { View, ActivityIndicator } from 'react-native';
import { auth } from '../src/services/firebaseConfig';
import { BillProvider } from '../src/context/BillContext';
import '../global.css';

export default function Layout() {
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [initializing, setInitializing] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (initializing) setInitializing(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (initializing) return;

        const inAuthGroup = segments[0] === 'login' || segments[0] === 'sign-up';

        if (!user && !inAuthGroup) {
            // Redirect to login if not authenticated
            router.replace('/login');
        } else if (user && inAuthGroup) {
            // Redirect to home if authenticated
            router.replace('/');
        }
    }, [user, initializing, segments]);

    if (initializing) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#F43F5E" />
            </View>
        );
    }

    return (
        <BillProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <StatusBar style="auto" />
        </BillProvider>
    );
}
