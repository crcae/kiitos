import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AirbnbCard from '../components/AirbnbCard';
import AirbnbHeader from '../components/AirbnbHeader';
import { useBill } from '../context/BillContext';
import { useGuest } from '../context/GuestContext';
import { auth } from '../services/firebaseConfig';
import { colors, spacing, typography, shadows, borderRadius } from '../styles/theme';

export default function HomeScreen() {
    const router = useRouter();
    const { setBill } = useBill();
    const { isGuest, getGuestName } = useGuest();
    const user = auth.currentUser;

    // Get name - either from auth user or guest
    const firstName = isGuest
        ? getGuestName()
        : user?.displayName?.split(' ')[0] || 'Usuario';

    const handleScanBill = () => {
        // Mock scanning a bill with Mexican restaurant items
        const mockItems = [
            { id: '1', name: 'Tacos al Pastor', price: 150.00 },
            { id: '2', name: 'Guacamole', price: 90.00 },
            { id: '3', name: 'Cerveza Victoria', price: 45.00 },
            { id: '4', name: 'Quesadilla', price: 65.00 },
        ];

        const subtotal = mockItems.reduce((sum, item) => sum + item.price, 0);
        const tax = subtotal * 0.16; // IVA 16%
        const total = subtotal + tax;

        setBill({
            id: `bill_${Date.now()}`,
            restaurantName: 'Taquería El Buen Sabor',
            items: mockItems,
            subtotal,
            tax,
            total,
            createdAt: new Date().toISOString(),
        });

        router.push('/bill-details');
    };

    const handleLogout = () => {
        auth.signOut();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header with Greeting */}
                <AirbnbHeader
                    title={`Hola, ${firstName} 👋`}
                    greeting
                />

                {/* Guest Banner - shown only for guests */}
                {isGuest && (
                    <View style={styles.guestBanner}>
                        <View style={styles.guestBannerContent}>
                            <Ionicons name="information-circle" size={20} color={colors.airbnbPink} />
                            <Text style={styles.guestBannerText}>
                                Estás en modo invitado. Crea una cuenta al pagar para guardar tu historial.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Hero Scan Button */}
                <View style={styles.heroContainer}>
                    <AirbnbCard
                        pressable
                        onPress={handleScanBill}
                        shadow="lg"
                        style={styles.heroCard}
                    >
                        <View style={styles.heroContent}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="camera" size={32} color={colors.white} />
                            </View>
                            <Text style={styles.heroTitle}>Escanear Cuenta</Text>
                            <Text style={styles.heroSubtitle}>
                                Toma foto de tu cuenta del restaurante
                            </Text>
                        </View>
                    </AirbnbCard>
                </View>

                {/* Logout/Account Info */}
                {!isGuest && (
                    <View style={styles.footer}>
                        <Text style={styles.footerLink} onPress={handleLogout}>
                            Cerrar Sesión
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.oatCream,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: spacing.xxxl,
    },
    guestBanner: {
        marginHorizontal: spacing.xl,
        marginBottom: spacing.xl,
        backgroundColor: colors.stoneGrey,
        borderRadius: borderRadius.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.roastedSaffron,
        padding: spacing.lg,
    },
    guestBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    guestBannerText: {
        flex: 1,
        marginLeft: spacing.md,
        fontSize: typography.sm,
        color: colors.darkGray,
        lineHeight: 20,
    },
    heroContainer: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xl,
    },
    heroCard: {
        paddingVertical: spacing.xxxl,
    },
    heroContent: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.roastedSaffron,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        ...shadows.md,
    },
    heroTitle: {
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.darkText,
        marginBottom: spacing.sm,
    },
    heroSubtitle: {
        fontSize: typography.base,
        color: colors.darkGray,
        textAlign: 'center',
    },
    footer: {
        marginTop: spacing.xxxl,
        alignItems: 'center',
    },
    footerLink: {
        fontSize: typography.base,
        color: colors.roastedSaffron,
        fontWeight: typography.semibold,
    },
});
