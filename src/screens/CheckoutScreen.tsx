import React from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AirbnbHeader from '../components/AirbnbHeader';
import AirbnbCard from '../components/AirbnbCard';
import AirbnbButton from '../components/AirbnbButton';
import { useBill } from '../context/BillContext';
import { useGuest } from '../context/GuestContext';
import PhoneAuthModal from '../components/auth/PhoneAuthModal';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

/**
 * Checkout Screen - Clean Payment Summary
 * 
 * Features:
 * - Clean summary card with breakdown
 * - Shows items, tip, and totals
 * - Payment method selector (card icon)
 * - Primary CTA: "Pagar con Tarjeta" (Airbnb pink)
 * - Spanish (México) text
 */
export default function CheckoutScreen() {
    const router = useRouter();
    const { bill } = useBill();
    const { isGuest } = useGuest();
    const [showPhoneAuth, setShowPhoneAuth] = React.useState(false);

    if (!bill) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No hay cuenta disponible</Text>
            </View>
        );
    }

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)} MXN`;
    };

    const calculateMyPortion = () => {
        if (bill.splitMode === 'full') {
            return bill.total;
        } else if (bill.splitMode === 'equal') {
            return bill.total / bill.splitCount;
        }
        // For 'items' mode, would need selection logic
        return bill.total / bill.splitCount;
    };

    const myPortion = calculateMyPortion();
    const tipAmount = bill.customTipAmount || (myPortion * bill.tipPercentage) / 100;
    const finalTotal = myPortion + tipAmount;

    const processPayment = () => {
        Alert.alert(
            'Pago Exitoso',
            `Se procesó tu pago de ${formatCurrency(finalTotal)}. ¡Gracias!`,
            [
                {
                    text: 'OK',
                    onPress: () => router.replace('/'),
                },
            ]
        );
    };

    const handlePayment = () => {
        if (isGuest) {
            setShowPhoneAuth(true);
            return;
        }
        processPayment();
    };

    const handleAuthSuccess = () => {
        setShowPhoneAuth(false);
        // Optional: Add a small delay or check if we should auto-proceed
        setTimeout(() => {
            processPayment();
        }, 500);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <AirbnbHeader
                title="Resumen de Pago"
                subtitle="Confirma tu pago"
                showBack
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Payment Summary */}
                <AirbnbCard shadow="md" style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Total a Pagar
                    </Text>

                    {/* Split info */}
                    <View style={styles.splitInfoContainer}>
                        <Text style={styles.splitInfoLabel}>Forma de pago</Text>
                        <Text style={styles.splitInfoValue}>
                            {bill.splitMode === 'full' && 'Cuenta completa'}
                            {bill.splitMode === 'equal' && `Dividido entre ${bill.splitCount} personas`}
                            {bill.splitMode === 'items' && 'Items seleccionados'}
                        </Text>
                    </View>

                    {/* Amount breakdown */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Tu porción</Text>
                        <Text style={styles.value}>{formatCurrency(myPortion)}</Text>
                    </View>

                    {tipAmount > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>
                                Propina ({bill.tipPercentage > 0 ? `${bill.tipPercentage}%` : 'Personalizada'})
                            </Text>
                            <Text style={styles.value}>{formatCurrency(tipAmount)}</Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <Text style={styles.totalLabel}>Total Final</Text>
                        <Text style={styles.totalValue}>
                            {formatCurrency(finalTotal)}
                        </Text>
                    </View>
                </AirbnbCard>

                {/* Payment Method */}
                <AirbnbCard shadow="sm" style={styles.card}>
                    <Text style={styles.subTitle}>
                        Método de Pago
                    </Text>

                    <View style={styles.paymentMethodContainer}>
                        <View style={styles.cardIconContainer}>
                            <Ionicons name="card" size={24} color={colors.airbnbPink} />
                        </View>
                        <View style={styles.paymentMethodTextContainer}>
                            <Text style={styles.paymentMethodTitle}>
                                Tarjeta de Crédito/Débito
                            </Text>
                            <Text style={styles.paymentMethodSubtitle}>
                                Visa, Mastercard, Amex
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.gray} />
                    </View>
                </AirbnbCard>

                {/* Restaurant info */}
                <AirbnbCard shadow="sm" style={[styles.card, styles.lastCard]}>
                    <View style={styles.restaurantContainer}>
                        <View style={styles.restaurantIconContainer}>
                            <Ionicons name="restaurant" size={24} color={colors.white} />
                        </View>
                        <View style={styles.restaurantTextContainer}>
                            <Text style={styles.restaurantName}>
                                {bill.restaurantName}
                            </Text>
                            <Text style={styles.restaurantItems}>
                                {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                            </Text>
                        </View>
                    </View>
                </AirbnbCard>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View style={styles.footer}>
                <AirbnbButton
                    title="Pagar con Tarjeta"
                    onPress={handlePayment}
                    icon="card"
                />
            </View>

            <PhoneAuthModal
                visible={showPhoneAuth}
                onClose={() => setShowPhoneAuth(false)}
                onSuccess={handleAuthSuccess}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: typography.base,
        color: colors.gray,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingBottom: 100, // Space for footer
    },
    card: {
        marginBottom: spacing.xl,
        padding: spacing.xl,
    },
    lastCard: {
        marginBottom: 100,
    },
    sectionTitle: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.darkText,
        marginBottom: spacing.lg,
    },
    subTitle: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.darkText,
        marginBottom: spacing.lg,
    },
    splitInfoContainer: {
        backgroundColor: colors.offWhite,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    splitInfoLabel: {
        fontSize: typography.sm,
        color: colors.gray,
        marginBottom: 4,
    },
    splitInfoValue: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.darkText,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    label: {
        fontSize: typography.base,
        color: colors.gray,
    },
    value: {
        fontSize: typography.base,
        color: colors.darkText,
    },
    divider: {
        height: 1,
        backgroundColor: colors.lightGray,
        marginVertical: spacing.lg,
    },
    totalLabel: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.darkText,
    },
    totalValue: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.airbnbPink,
    },
    paymentMethodContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.offWhite,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
    },
    cardIconContainer: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.sm,
        padding: spacing.sm,
        marginRight: spacing.lg,
        ...shadows.sm,
    },
    paymentMethodTextContainer: {
        flex: 1,
    },
    paymentMethodTitle: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.darkText,
    },
    paymentMethodSubtitle: {
        fontSize: typography.sm,
        color: colors.gray,
    },
    restaurantContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    restaurantIconContainer: {
        backgroundColor: colors.airbnbPink,
        borderRadius: borderRadius.rounded,
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.lg,
    },
    restaurantTextContainer: {
        flex: 1,
    },
    restaurantName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.darkText,
    },
    restaurantItems: {
        fontSize: typography.sm,
        color: colors.gray,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.offWhite,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
});
