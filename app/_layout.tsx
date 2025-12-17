import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
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
import { MarketplaceCartProvider } from '../src/context/MarketplaceCartContext';
import '../global.css';

export default function Layout() {
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
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
                                <MarketplaceCartProvider>
                                    <Stack screenOptions={{ headerShown: false }} />
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
