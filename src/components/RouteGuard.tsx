import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface RouteGuardProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    requireOnboarding?: boolean;
}

/**
 * Route Guard Component
 * 
 * Protects routes by checking:
 * 1. Authentication status
 * 2. Restaurant assignment (restaurantId)
 * 3. Onboarding completion (for restaurant owners)
 * 
 * Redirects users appropriately based on their state
 */
export function RouteGuard({
    children,
    requireAuth = true,
    requireOnboarding = true
}: RouteGuardProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inOnboardingGroup = segments[0] === 'onboarding';
        const inPublicGroup = ['landing', 'pricing', 'signup'].includes(segments[0] as string);

        // Not authenticated
        if (requireAuth && !user) {
            if (!inAuthGroup && !inPublicGroup) {
                console.log('🔒 Not authenticated, redirecting to landing');
                router.replace('/landing');
            }
            return;
        }

        // Authenticated
        if (user) {
            // Check if user has restaurant assignment
            if (!user.restaurantId) {
                console.log('⚠️ User has no restaurant, something went wrong during signup');
                // This shouldn't happen in normal flow, but handle it gracefully
                router.replace('/signup');
                return;
            }

            // Check onboarding status for restaurant owners
            if (
                requireOnboarding &&
                user.role === 'restaurant_owner' &&
                !user.onboardingComplete &&
                !inOnboardingGroup
            ) {
                console.log('📋 Onboarding incomplete, redirecting to onboarding');
                router.replace('/onboarding/business');
                return;
            }

            // If onboarding is complete and user is in onboarding routes, redirect to dashboard
            if (user.onboardingComplete && inOnboardingGroup) {
                console.log('✅ Onboarding already complete, redirecting to dashboard');
                redirectToDashboard(user.role, router);
                return;
            }

            // If authenticated and trying to access public routes, redirect to dashboard
            if (inPublicGroup) {
                console.log('🏠 Authenticated user on public page, redirecting to dashboard');
                redirectToDashboard(user.role, router);
                return;
            }
        }
    }, [user, loading, segments]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF385C" />
            </View>
        );
    }

    return <>{children}</>;
}

/**
 * Redirects user to their appropriate dashboard based on role
 */
function redirectToDashboard(role: string, router: any) {
    switch (role) {
        case 'restaurant_owner':
        case 'restaurant_manager':
        case 'admin': // Legacy
            router.replace('/admin/menu');
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
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
});
