import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AirbnbHeader from '../components/AirbnbHeader';
import AirbnbCard from '../components/AirbnbCard';
import AirbnbButton from '../components/AirbnbButton';
import { useBill } from '../context/BillContext';
import { colors, spacing, typography, shadows } from '../styles/theme';

/**
 * Bill Details Screen - Airbnb Listing Style
 * 
 * Features:
 * - Airbnb-style header with restaurant name
 * - Clean card sections for items
 * - Subtle dividers between items
 * - Airbnb price breakdown modal style
 * - Shows: Subtotal, IVA (16%), Total
 * - Fixed bottom CTA: "Dividir la Cuenta"
 */
export default function BillDetailsScreen() {
    const router = useRouter();
    const { bill } = useBill();

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

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <AirbnbHeader
                title={bill.restaurantName || 'Cuenta'}
                showBack
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Items Section */}
                <AirbnbCard shadow="sm" style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                        Items de la Cuenta
                    </Text>

                    {bill.items.map((item, index) => (
                        <View key={item.id}>
                            {index > 0 && <View style={styles.divider} />}
                            <View style={styles.itemRow}>
                                <Text style={styles.itemName}>
                                    {item.name}
                                </Text>
                                <Text style={styles.itemPrice}>
                                    {formatCurrency(item.price)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </AirbnbCard>

                {/* Price Breakdown - Airbnb Style */}
                <AirbnbCard shadow="sm" style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                        Desglose de Precios
                    </Text>

                    {/* Subtotal */}
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>
                            Subtotal
                        </Text>
                        <Text style={styles.breakdownValue}>
                            {formatCurrency(bill.subtotal)}
                        </Text>
                    </View>

                    {/* IVA */}
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>
                            IVA (16%)
                        </Text>
                        <Text style={styles.breakdownValue}>
                            {formatCurrency(bill.tax)}
                        </Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.mainDivider} />

                    {/* Total */}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>
                            Total
                        </Text>
                        <Text style={styles.totalValue}>
                            {formatCurrency(bill.total)}
                        </Text>
                    </View>
                </AirbnbCard>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View style={styles.footer}>
                <AirbnbButton
                    title="Dividir la Cuenta"
                    onPress={() => router.push('/split-bill')}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.oatCream,
    },
    centerContainer: {
        flex: 1,
        backgroundColor: colors.oatCream,
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
    sectionCard: {
        marginBottom: spacing.xl,
        padding: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.darkText,
        marginBottom: spacing.lg,
    },
    divider: {
        height: 1,
        backgroundColor: colors.offWhite,
        marginVertical: spacing.md,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemName: {
        fontSize: typography.base,
        color: colors.darkText,
        flex: 1,
    },
    itemPrice: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.darkText,
        marginLeft: spacing.lg,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    breakdownLabel: {
        fontSize: typography.base,
        color: colors.gray,
    },
    breakdownValue: {
        fontSize: typography.base,
        color: colors.darkText,
    },
    mainDivider: {
        height: 1,
        backgroundColor: colors.lightGray,
        marginVertical: spacing.lg,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalLabel: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.darkText,
    },
    totalValue: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.darkText,
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
