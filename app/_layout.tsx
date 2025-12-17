import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth } from '../src/services/firebaseConfig';
import { BillProvider } from '../src/context/BillContext';
import { GuestProvider } from '../src/context/GuestContext';
import { AuthProvider } from '../src/context/AuthContext';
import { TenantProvider } from '../src/context/TenantContext';
import { TakeoutCartProvider } from '../src/context/TakeoutCartContext';
import { useAuth } from '../src/context/AuthContext';
import { useSegments, useRouter, Stack } from 'expo-router';
import '../global.css';

export default function Layout() {
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser as any); // Type casting for simplicity in this specific file context, though we really want the User profile
            if (initializing) setInitializing(false);
        });
        return unsubscribe;
    }, []);

    if (initializing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF385C" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <AuthProvider>
                <TenantProvider>
                    <GuestProvider>
                        <BillProvider>
                            <TakeoutCartProvider>
                                <RootRouteGuard />
                                <Stack screenOptions={{ headerShown: false }}>
                                    <Stack.Screen name="index" />
                                    <Stack.Screen name="login" />
                                    <Stack.Screen name="signup" />
                                    <Stack.Screen name="onboarding" options={{ gestureEnabled: false, headerShown: false }} />
                                </Stack>
                                <StatusBar style="auto" />
                            </TakeoutCartProvider>
                        </BillProvider>
                    </GuestProvider>
                </TenantProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}

// Separate component to use AuthContext
function RootRouteGuard() {
    const { user, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)'; // login, signup
        const inOnboarding = segments[0] === 'onboarding';
        const inAdmin = segments[0] === 'admin';
        const inWaiter = segments[0] === 'waiter';
        const inCashier = segments[0] === 'cashier';
        const inKitchen = segments[0] === 'kitchen';

        const path = segments.join('/');

        // console.log(`Guard Check: User=${!!user}, Path=${path}, OnboardingComplete=${user?.onboardingComplete}`);

        if (user) {
            // User is logged in
            const isRestaurantOwner = user.role === 'restaurant_owner';

            if (isRestaurantOwner && !user.onboardingComplete) {
                // Must be in onboarding
                if (!inOnboarding) {
                    // Check if we are already trying to go there to avoid loop?
                    // Verify if route exists? For now assume YES as we defined it in Stack.
                    router.replace('/onboarding');
                }
            } else if (isRestaurantOwner && user.onboardingComplete) {
                // Must NOT be in onboarding
                if (inOnboarding) {
                    router.replace('/admin');
                }
                // If at root or login, go to admin
                if (path === '' || path === 'login' || path === 'login/staff') {
                    router.replace('/admin');
                }
            } else {
                // Staff Roles (Waiter, Cashier, Kitchen)

                // 1. Protect Admin Routes: Staff cannot go to /admin
                if (inAdmin) {
                    if (user.role === 'waiter') router.replace('/waiter');
                    else if (user.role === 'cashier') router.replace('/cashier');
                    else if (user.role === 'kitchen') router.replace('/kitchen');
                    return;
                }

                // 2. Redirect from Login/Root to specific dashboard
                if (path === '' || path === 'login' || path === 'login/staff') {
                    if (user.role === 'admin') router.replace('/admin');
                    else if (user.role === 'waiter') router.replace('/waiter');
                    else if (user.role === 'cashier') router.replace('/cashier');
                    else if (user.role === 'kitchen') router.replace('/kitchen');
                }
            }
        } else {
            // User is NOT logged in
            // Protected routes: admin, onboarding, waiter, cashier, kitchen
            if (inAdmin || inOnboarding || inWaiter || inCashier || inKitchen) {
                router.replace('/login');
            }
        }
    }, [user, loading, segments]);

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
});
