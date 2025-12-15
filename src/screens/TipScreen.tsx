import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AirbnbHeader from '../components/AirbnbHeader';
import AirbnbCard from '../components/AirbnbCard';
import AirbnbInput from '../components/AirbnbInput';
import AirbnbButton from '../components/AirbnbButton';
import { useBill } from '../context/BillContext';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

/**
 * Tip Screen - Airbnb Bottom Sheet Style
 * 
 * Features:
 * - Title: "¿Dejar propina?"
 * - Three rounded pill buttons: 10%, 15%, 20%
 * - Custom amount input field
 * - Selected state: pink background
 * - Subtotal calculation display
 * - Spanish (México) text
 */
export default function TipScreen() {
    const router = useRouter();
    const { bill, setBill } = useBill();
    const [selectedTipPercentage, setSelectedTipPercentage] = useState(15);
    const [customAmount, setCustomAmount] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    if (!bill) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No hay cuenta disponible</Text>
            </View>
        );
    }

    const tipPercentages = [10, 15, 20];

    const calculateTip = () => {
        if (useCustom && customAmount) {
            return parseFloat(customAmount) || 0;
        }
        return (bill.total * selectedTipPercentage) / 100;
    };

    const tipAmount = calculateTip();
    const totalWithTip = bill.total + tipAmount;

    const formatCurrency = (amount: number) => {
        return `$${amount.toFixed(2)} MXN`;
    };

    const handleContinue = () => {
        setBill({
            ...bill,
            tipPercentage: useCustom ? 0 : selectedTipPercentage,
            customTipAmount: useCustom ? tipAmount : 0,
        });

        router.push('/checkout');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <AirbnbHeader
                title="¿Dejar propina?"
                subtitle="Basado en el servicio recibido"
                showBack
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Tip Percentage Buttons */}
                <AirbnbCard shadow="sm" style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Porcentaje de Propina
                    </Text>

                    <View style={styles.percentageContainer}>
                        {tipPercentages.map((percentage) => (
                            <TouchableOpacity
                                key={percentage}
                                onPress={() => {
                                    setSelectedTipPercentage(percentage);
                                    setUseCustom(false);
                                    setCustomAmount('');
                                }}
                                style={[
                                    styles.percentageButton,
                                    !useCustom && selectedTipPercentage === percentage
                                        ? styles.selectedButton
                                        : styles.unselectedButton
                                ]}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.percentageText,
                                        !useCustom && selectedTipPercentage === percentage
                                            ? styles.selectedText
                                            : styles.unselectedText
                                    ]}
                                >
                                    {percentage}%
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Custom Amount */}
                    <Text style={styles.subTitle}>
                        Monto Personalizado
                    </Text>
                    <AirbnbInput
                        label=""
                        value={customAmount}
                        onChangeText={(text) => {
                            setCustomAmount(text);
                            if (text) {
                                setUseCustom(true);
                            }
                        }}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                    />
                </AirbnbCard>

                {/* Summary */}
                <AirbnbCard shadow="sm" style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Resumen
                    </Text>

                    <View style={styles.row}>
                        <Text style={styles.label}>Subtotal de cuenta</Text>
                        <Text style={styles.value}>{formatCurrency(bill.total)}</Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Propina</Text>
                        <Text style={styles.value}>{formatCurrency(tipAmount)}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>
                            {formatCurrency(totalWithTip)}
                        </Text>
                    </View>
                </AirbnbCard>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View style={styles.footer}>
                <AirbnbButton
                    title="Continuar al Pago"
                    onPress={handleContinue}
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
    card: {
        marginBottom: spacing.xl,
        padding: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.darkText,
        marginBottom: spacing.lg,
    },
    subTitle: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.darkText,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    percentageContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    percentageButton: {
        flex: 1,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.rounded,
        alignItems: 'center',
    },
    selectedButton: {
        backgroundColor: colors.roastedSaffron,
    },
    unselectedButton: {
        backgroundColor: colors.offWhite,
        borderWidth: 1,
        borderColor: colors.lightGray,
    },
    percentageText: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
    },
    selectedText: {
        color: colors.white,
    },
    unselectedText: {
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
        marginVertical: spacing.md,
    },
    totalLabel: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.darkText,
    },
    totalValue: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.roastedSaffron,
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
