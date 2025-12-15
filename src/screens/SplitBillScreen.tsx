import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AirbnbHeader from '../components/AirbnbHeader';
import AirbnbCard from '../components/AirbnbCard';
import AirbnbButton from '../components/AirbnbButton';
import { useBill } from '../context/BillContext';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

/**
 * Split Bill Screen - Airbnb Selection Style
 * 
 * Features:
 * - Three large selection cards (Airbnb filter style)
 * - Option 1: Pay full bill
 * - Option 2: Split equally (with selector for 2-4 people)
 * - Option 3: Select individual items
 * - Selected card has pink border + checkmark
 * - Spanish (México) text
 */
export default function SplitBillScreen() {
    const router = useRouter();
    const { bill, setBill } = useBill();
    const [selectedMode, setSelectedMode] = useState<'full' | 'equal' | 'items'>('equal');
    const [splitCount, setSplitCount] = useState(2);

    if (!bill) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>No hay cuenta disponible</Text>
            </View>
        );
    }

    const handleContinue = () => {
        // Update bill with selected split mode
        setBill({
            ...bill,
            splitMode: selectedMode,
            splitCount: selectedMode === 'equal' ? splitCount : 1,
        });

        router.push('/tip');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <AirbnbHeader
                title="¿Cómo quieres dividir?"
                subtitle="Elige la forma de pago"
                showBack
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Option 1: Pay Full */}
                <AirbnbCard
                    pressable
                    onPress={() => setSelectedMode('full')}
                    shadow="sm"
                    style={[
                        styles.optionCard,
                        selectedMode === 'full' && styles.selectedCard
                    ]}
                >
                    <View style={styles.cardContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person" size={28} color={colors.darkText} />
                        </View>

                        <View style={styles.textContainer}>
                            <Text style={styles.optionTitle}>
                                Pagar la Cuenta Completa
                            </Text>
                            <Text style={styles.optionSubtitle}>
                                Yo invito esta vez
                            </Text>
                        </View>

                        {selectedMode === 'full' && (
                            <View style={styles.checkContainer}>
                                <Ionicons name="checkmark" size={18} color={colors.white} />
                            </View>
                        )}
                    </View>
                </AirbnbCard>

                {/* Option 2: Split Equally */}
                <AirbnbCard
                    pressable
                    onPress={() => setSelectedMode('equal')}
                    shadow="sm"
                    style={[
                        styles.optionCard,
                        selectedMode === 'equal' && styles.selectedCard
                    ]}
                >
                    <View style={styles.cardContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="people" size={28} color={colors.darkText} />
                        </View>

                        <View style={styles.textContainer}>
                            <Text style={styles.optionTitle}>
                                Dividir en Partes Iguales
                            </Text>
                            <Text style={styles.optionSubtitle}>
                                Todos pagan lo mismo
                            </Text>
                        </View>

                        {selectedMode === 'equal' && (
                            <View style={styles.checkContainer}>
                                <Ionicons name="checkmark" size={18} color={colors.white} />
                            </View>
                        )}
                    </View>

                    {/* Number selector */}
                    {selectedMode === 'equal' && (
                        <View style={styles.selectorContainer}>
                            <Text style={styles.selectorLabel}>
                                Número de personas
                            </Text>
                            <View style={styles.selectorButtons}>
                                {[2, 3, 4].map((count) => (
                                    <TouchableOpacity
                                        key={count}
                                        onPress={() => setSplitCount(count)}
                                        style={[
                                            styles.countButton,
                                            splitCount === count ? styles.selectedCountButton : styles.unselectedCountButton
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[
                                                styles.countText,
                                                splitCount === count ? styles.selectedCountText : styles.unselectedCountText
                                            ]}
                                        >
                                            {count}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </AirbnbCard>

                {/* Option 3: Select Items */}
                <AirbnbCard
                    pressable
                    onPress={() => setSelectedMode('items')}
                    shadow="sm"
                    style={[
                        styles.optionCard,
                        selectedMode === 'items' && styles.selectedCard
                    ]}
                >
                    <View style={styles.cardContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="checkmark-done" size={28} color={colors.darkText} />
                        </View>

                        <View style={styles.textContainer}>
                            <Text style={styles.optionTitle}>
                                Seleccionar mis Items
                            </Text>
                            <Text style={styles.optionSubtitle}>
                                Solo pago lo que consumí
                            </Text>
                        </View>

                        {selectedMode === 'items' && (
                            <View style={styles.checkContainer}>
                                <Ionicons name="checkmark" size={18} color={colors.white} />
                            </View>
                        )}
                    </View>
                </AirbnbCard>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View style={styles.footer}>
                <AirbnbButton
                    title="Continuar"
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
    optionCard: {
        marginBottom: spacing.lg,
        padding: spacing.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedCard: {
        borderColor: colors.roastedSaffron,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.offWhite,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.lg,
    },
    textContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.darkText,
        marginBottom: 4,
    },
    optionSubtitle: {
        fontSize: typography.sm,
        color: colors.gray,
    },
    checkContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.roastedSaffron,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectorContainer: {
        marginTop: spacing.sm,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.offWhite,
    },
    selectorLabel: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.darkGray,
        marginBottom: spacing.md,
    },
    selectorButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    countButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    selectedCountButton: {
        backgroundColor: colors.roastedSaffron,
    },
    unselectedCountButton: {
        backgroundColor: colors.offWhite,
        borderWidth: 1,
        borderColor: colors.lightGray,
    },
    countText: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
    },
    selectedCountText: {
        color: colors.white,
    },
    unselectedCountText: {
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
