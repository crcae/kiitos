import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { auth } from '../src/services/firebaseConfig';
import { BillProvider } from '../src/context/BillContext';
import { GuestProvider } from '../src/context/GuestContext';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { TenantProvider } from '../src/context/TenantContext';
import { TakeoutCartProvider } from '../src/context/TakeoutCartContext';
import { MarketplaceCartProvider } from '../src/context/MarketplaceCartContext';
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
                                <MarketplaceCartProvider>
                                    <Stack screenOptions={{ headerShown: false }}>
                                        <Stack.Screen name="index" />
                                        <Stack.Screen name="login" />
                                        <Stack.Screen name="signup" />
                                        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, headerShown: false }} />
                                    </Stack>
                                    <StatusBar style="auto" />
                                </MarketplaceCartProvider>
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
            const isCustomer = user.role === 'customer';

            if (isRestaurantOwner && !user.onboardingComplete) {
                if (!inOnboarding) router.replace('/onboarding');
            } else if (isRestaurantOwner && user.onboardingComplete) {
                if (inOnboarding) router.replace('/admin');
                if (path === '' || path === 'login' || path === 'signup') {
                    router.replace('/admin');
                }
            } else if (isCustomer) {
                // Customers can go anywhere in (tabs)
                if (path === 'login' || path === 'signup') {
                    router.replace('/(tabs)/marketplace');
                }
            } else {
                // Staff Roles
                if (inAdmin) {
                    if (user.role === 'waiter') router.replace('/waiter');
                    else if (user.role === 'cashier') router.replace('/cashier');
                    else if (user.role === 'kitchen') router.replace('/kitchen');
                    return;
                }

                if (path === '' || path === 'login' || path === 'login/staff') {
                    if (user.role === 'waiter') router.replace('/waiter');
                    else if (user.role === 'cashier') router.replace('/cashier');
                    else if (user.role === 'kitchen') router.replace('/kitchen');
                }
            }
        } else {
            // User is NOT logged in (Guest Mode)
            // Allow access to (tabs) - marketplace, profile, etc.
            // Protect Admin & Staff routes
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
