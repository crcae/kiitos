import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { seedDatabase } from '../src/services/seed';
import { UserRole } from '../src/types/firestore';

export default function IndexScreen() {
    const router = useRouter();
    const { user, loading, signInWithRole } = useAuth();

    // Smart routing logic
    useEffect(() => {
        if (loading) return;

        // Not authenticated - show landing or role selector
        if (!user) {
            // For now, we'll show the legacy role selector for testing
            // In production, uncomment this to redirect to landing:
            // router.replace('/landing');
            return;
        }

        // Authenticated - check onboarding status
        if (user.role === 'restaurant_owner' && !user.onboardingComplete) {
            router.replace('/onboarding/business');
            return;
        }

        // Onboarding complete - redirect to dashboard
        redirectToDashboard(user.role);
    }, [user, loading]);

    const redirectToDashboard = (role: UserRole) => {
        switch (role) {
            case 'restaurant_owner':
            case 'restaurant_manager':
            case 'admin':
                router.replace('/admin');
                break;
            case 'waiter':
                router.replace('/waiter/tables');
                break;
            case 'kitchen':
                router.replace('/kitchen/display');
                break;
            case 'cashier':
                router.replace('/cashier/status');
                break;
            default:
                router.replace('/landing');
        }
    };

    // Legacy role selector for testing
    const handleLogin = async (role: UserRole, route: string) => {
        if (signInWithRole) {
            await signInWithRole(role);
            router.push(route as any);
        }
    };

    const handleSeed = async () => {
        try {
            await seedDatabase();
            Alert.alert('Success', 'Database seeded successfully');
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', `Failed to seed database: ${error.message || 'Unknown error'}`);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF385C" />
            </View>
        );
    }

    // If user is authenticated, this screen won't show (useEffect will redirect)
    // This is only shown for testing/development with legacy role selector
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.logoContainer}>
                <Text style={styles.logo}>Kiitos</Text>
                <Text style={styles.tagline}>Restaurant Management SaaS</Text>
            </View>

            <View style={styles.buttonGroup}>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.push('/landing')}
                >
                    <Text style={styles.primaryButtonText}>Ver Landing Page</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.push('/signup')}
                >
                    <Text style={styles.secondaryButtonText}>Registrarse</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Text style={styles.devTitle}>Development Testing</Text>
            <Text style={styles.subtitle}>Quick Role Login (Legacy)</Text>

            <View style={styles.grid}>
                <TouchableOpacity
                    style={[styles.card, styles.admin]}
                    onPress={() => handleLogin('admin', '/admin')}
                >
                    <Text style={styles.cardTitle}>Admin</Text>
                    <Text style={styles.cardDesc}>Manage Menu</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, styles.waiter]}
                    onPress={() => handleLogin('waiter', '/waiter/tables')}
                >
                    <Text style={styles.cardTitle}>Waiter</Text>
                    <Text style={styles.cardDesc}>Tables & Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, styles.kitchen]}
                    onPress={() => handleLogin('kitchen', '/kitchen/display')}
                >
                    <Text style={styles.cardTitle}>Kitchen</Text>
                    <Text style={styles.cardDesc}>View Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, styles.cashier]}
                    onPress={() => handleLogin('cashier', '/cashier/status')}
                >
                    <Text style={styles.cardTitle}>Cashier</Text>
                    <Text style={styles.cardDesc}>Payments</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.card, { backgroundColor: '#EA580C' }]}
                    onPress={() => router.push('/(tabs)/marketplace')}
                >
                    <Text style={styles.cardTitle}>Marketplace</Text>
                    <Text style={styles.cardDesc}>Pre-order (Customer)</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.seedButton} onPress={handleSeed}>
                <Text style={styles.seedText}>⚠️ Reset & Seed Database</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#FDFBF7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FDFBF7',
    },
    logoContainer: {
        marginBottom: 40,
        alignItems: 'center',
    },
    logo: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        color: '#666',
    },
    buttonGroup: {
        width: '100%',
        maxWidth: 400,
        gap: 16,
        marginBottom: 40,
    },
    primaryButton: {
        backgroundColor: '#FF385C',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#2C3E50',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#2C3E50',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 40,
    },
    devTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 24,
    },
    grid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 40,
    },
    card: {
        width: '40%',
        aspectRatio: 1,
        borderRadius: 16,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    cardDesc: {
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
    },
    admin: { backgroundColor: '#2C3E50' },
    waiter: { backgroundColor: '#E67E22' },
    kitchen: { backgroundColor: '#C0392B' },
    cashier: { backgroundColor: '#27AE60' },
    seedButton: {
        padding: 15,
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    seedText: {
        color: '#333',
        fontWeight: '600',
    },
});
