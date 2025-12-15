import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { subscribeToSession } from '../../src/services/sessions';
import { recordPayment, getPaymentSummary, recordItemPayment } from '../../src/services/payments';
import { Session, OrderItem, Payment } from '../../src/types/firestore';
import { useGuest } from '../../src/context/GuestContext';
import AirbnbCard from '../../src/components/AirbnbCard';
import { colors, spacing, typography } from '../../src/styles/theme';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/services/firebaseConfig';

type SplitMode = 'full' | 'items' | 'equal' | 'custom';

export default function ClientPayScreen() {
    const { id, restaurantId } = useLocalSearchParams<{ id: string, restaurantId: string }>();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [splitMode, setSplitMode] = useState<SplitMode>('full');
    const [selectedVirtualIds, setSelectedVirtualIds] = useState<Set<string>>(new Set()); // Virtual IDs like "burger-1_0", "burger-1_1"
    const [splitCount, setSplitCount] = useState<string>('2');
    const [customAmount, setCustomAmount] = useState<string>('');

    // Payment history
    const [payments, setPayments] = useState<Payment[]>([]);
    const [paymentLoading, setPaymentLoading] = useState(false);

    // Tip state
    const [tipPercentage, setTipPercentage] = useState(15);
    const [customTip, setCustomTip] = useState<string>('');
    const [useCustomTip, setUseCustomTip] = useState(false);

    useEffect(() => {
        if (!id || !restaurantId) return;

        const unsubscribe = subscribeToSession(id, (data) => {
            console.log('🔄🔄🔄 [PayScreen] Session updated from Firestore:', {
                itemsCount: data?.items?.length,
                FIRST_ITEM_PAID_QTY: data?.items?.[0]?.paid_quantity,  // Direct value
                firstItemName: data?.items?.[0]?.name,
                timestamp: new Date().getTime()
            });

            // CRITICAL: Force new object reference to trigger React re-render
            if (data && data.items) {
                setSession({
                    ...data,
                    items: [...data.items] // Create new array reference
                });
            } else {
                setSession(data);
            }
            setLoading(false);
        }, restaurantId);

        return () => unsubscribe();
    }, [id, restaurantId]);

    // Load payment summary with real-time updates
    useEffect(() => {
        if (!id || !restaurantId) return;

        // Subscribe to payments subcollection for real-time updates
        const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', id, 'payments');
        const unsubscribe = onSnapshot(paymentsRef, (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            setPayments(paymentsData);
            console.log('🔵 [Payments] Real-time update:', paymentsData.length, 'payments');
        }, (error) => {
            console.error('Failed to subscribe to payments:', error);
        });

        return () => unsubscribe();
    }, [id, restaurantId]);

    // CRITICAL: Use useMemo to ensure expandedItems recalculates when session.items changes
    const expandedItems = useMemo(() => {
        if (!session) {
            console.log('🔄 [useMemo] No session, returning empty');
            return [];
        }

        const expanded: Array<OrderItem & { virtualId: string; unitIndex: number }> = [];

        session.items.forEach((item) => {
            // Create individual entries for each unit
            for (let i = 0; i < item.quantity; i++) {
                expanded.push({
                    ...item,
                    virtualId: `${item.id}_${i}`,
                    unitIndex: i
                });
            }
        });

        console.log('🔄🔄🔄 [useMemo] Expanded items recalculated:', {
            totalItems: expanded.length,
            FIRST_EXPANDED_PAID_QTY: expanded[0]?.paid_quantity,  // Direct value
            firstItemName: expanded[0]?.name,
            sessionItemsLength: session.items.length,
            timestamp: new Date().getTime()
        });

        return expanded;
    }, [session, session?.items, session?.items?.length, session?.amount_paid]); // Multiple dependencies to catch any change
    const toggleItemSelection = (virtualId: string) => {
        const newSelection = new Set(selectedVirtualIds);
        if (newSelection.has(virtualId)) {
            newSelection.delete(virtualId);
        } else {
            newSelection.add(virtualId);
        }
        setSelectedVirtualIds(newSelection);
    };

    // Auto-deselect items that become paid
    useEffect(() => {
        if (!session) return;

        // expandedItems is now memoized at component level
        const newSelection = new Set(selectedVirtualIds);
        let changed = false;

        selectedVirtualIds.forEach(virtualId => {
            const item = expandedItems.find(ei => ei.virtualId === virtualId);
            if (item) {
                const isPaid = item.unitIndex < (item.paid_quantity || 0);
                if (isPaid) {
                    console.log(`🔴 Auto-deselecting paid item: ${virtualId}, unitIndex: ${item.unitIndex}, paid_quantity: ${item.paid_quantity}`);
                    newSelection.delete(virtualId);
                    changed = true;
                }
            }
        });

        if (changed) {
            setSelectedVirtualIds(newSelection);
        }
    }, [expandedItems, selectedVirtualIds]); // Re-run when expandedItems changes

    const calculateAmount = (): number => {
        if (!session) return 0;
        const remaining = session.remaining_amount || (session.total - (session.amount_paid || 0));

        switch (splitMode) {
            case 'full':
                return remaining;
            case 'items':
                // Count selected items and calculate total
                // expandedItems is now memoized at component level
                return expandedItems
                    .filter(item => {
                        const isPaid = item.unitIndex < (item.paid_quantity || 0);
                        return selectedVirtualIds.has(item.virtualId) && !isPaid;
                    })
                    .reduce((sum, item) => sum + item.price, 0);
            case 'equal':
                const count = parseInt(splitCount) || 1;
                return remaining / count;
            case 'custom':
                return parseFloat(customAmount) || 0;
            default:
                return remaining;
        }
    };

    const calculateTip = (): number => {
        const baseAmount = calculateAmount();
        if (useCustomTip && customTip) {
            return parseFloat(customTip) || 0;
        }
        return (baseAmount * tipPercentage) / 100;
    };

    const handlePay = async () => {
        if (!session || !restaurantId) return;

        const amount = calculateAmount(); // Bill amount only
        const tip = calculateTip(); // Tip amount
        const totalWithTip = amount + tip; // Total charge
        const remaining = session.remaining_amount || (session.total - (session.amount_paid || 0));

        console.log('🔵 [handlePay] Payment attempt:', { amount, tip, totalWithTip, remaining, splitMode });

        // CRITICAL: Validate ONLY the bill amount (without tip) against remaining
        // Tip can exceed the remaining balance - it's a bonus for the server
        if (amount > remaining + 0.01) { // Small tolerance for rounding
            console.log('⚠️ OVERPAYMENT DETECTED:', { amount, remaining, tip });

            // Use window.alert for web compatibility
            if (Platform.OS === 'web') {
                window.alert(
                    `⚠️ Monto Excedido\n\n` +
                    `El monto del pago ($${amount.toFixed(2)}) excede el saldo restante ($${remaining.toFixed(2)}).\n\n` +
                    `Por favor ajusta tu selección.\n\n` +
                    `Nota: La propina ($${tip.toFixed(2)}) es adicional y no cuenta para el saldo.`
                );
            } else {
                Alert.alert(
                    '⚠️ Monto Excedido',
                    `El monto del pago ($${amount.toFixed(2)}) excede el saldo restante ($${remaining.toFixed(2)}).\n\nPor favor ajusta tu selección.\n\nNota: La propina ($${tip.toFixed(2)}) es adicional y no cuenta para el saldo.`,
                    [{ text: 'Entendido', style: 'cancel' }]
                );
            }
            return;
        }

        if (amount === 0) {
            Alert.alert('Error', 'Por favor ingresa un monto o selecciona items.');
            return;
        }

        await processPaymentWithAmount(amount, tip);
    };

    const processPaymentWithAmount = async (amount: number, tip: number) => {

        // Validate split mode requirements
        if (splitMode === 'items' && selectedVirtualIds.size === 0) {
            Alert.alert('Error', 'Por favor selecciona al menos un item para pagar');
            return;
        }

        if (!session || !restaurantId) {
            Alert.alert('Error', 'No se pudo procesar el pago');
            return;
        }

        setPaymentLoading(true);

        try {
            if (splitMode === 'items' && selectedVirtualIds.size > 0) {
                // Group selected virtual IDs by actual item ID and count
                const itemCounts = new Map<string, number>();
                // expandedItems is now memoized at component level

                selectedVirtualIds.forEach(virtualId => {
                    const expandedItem = expandedItems.find(ei => ei.virtualId === virtualId);
                    if (expandedItem) {
                        const isPaid = expandedItem.unitIndex < (expandedItem.paid_quantity || 0);
                        if (!isPaid) {
                            const currentCount = itemCounts.get(expandedItem.id) || 0;
                            itemCounts.set(expandedItem.id, currentCount + 1);
                        }
                    }
                });

                const selectedItems = Array.from(itemCounts.entries()).map(([itemId, quantity]) => {
                    const item = session.items.find(i => i.id === itemId)!;
                    return {
                        item_id: itemId,
                        quantity,
                        price: item.price
                    };
                });

                await recordItemPayment(
                    restaurantId,
                    session.id,
                    selectedItems,
                    'stripe',
                    'guest',
                    tip
                );
            } else {
                // Pay by amount (full/equal/custom)
                await recordPayment(
                    restaurantId,
                    session.id,
                    amount,
                    'stripe',
                    'guest',
                    tip
                );
            }

            // Reload session to get updated remaining amount
            const updatedSession = await new Promise<Session | null>((resolve) => {
                const unsubscribe = subscribeToSession(session.id, (data) => {
                    resolve(data);
                    unsubscribe(); // Unsubscribe immediately after getting data
                }, restaurantId);
            });

            const newRemaining = updatedSession?.remaining_amount || 0;
            const isFullyPaid = newRemaining <= 0.01; // Tolerance for rounding

            if (isFullyPaid) {
                // CASE 1: Fully paid - show success and exit
                Alert.alert('¡Cuenta Cerrada!', `¡Pago completado! Gracias por tu visita.`);
                router.back();
            } else {
                // CASE 2: Partial payment - show remaining and stay on screen
                Alert.alert(
                    'Abono Registrado ✓',
                    `Pagaste $${amount.toFixed(2)}.\n\nRestan $${newRemaining.toFixed(2)} por pagar.`,
                    [{ text: 'OK' }]
                );
                // Stay on payment screen - session will auto-update via onSnapshot
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo procesar el pago. Intenta de nuevo.');
        } finally {
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!session) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Sesión no encontrada.</Text>
            </View>
        );
    }

    const remaining = session.remaining_amount || (session.total - (session.amount_paid || 0));

    if (remaining <= 0) {
        return (
            <ScrollView style={styles.container}>
                <View style={styles.receiptContainer}>
                    <Text style={styles.receiptTitle}>✓ Cuenta Cerrada</Text>
                    <Text style={styles.receiptSubtitle}>Mesa {session.tableId?.substring(0, 8)}</Text>

                    <View style={styles.receiptDivider} />

                    {/* Bill Summary */}
                    <View style={styles.receiptSection}>
                        <Text style={styles.receiptSectionTitle}>Resumen de Cuenta</Text>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Subtotal:</Text>
                            <Text style={styles.receiptValue}>${session.subtotal?.toFixed(2) || session.total.toFixed(2)}</Text>
                        </View>
                        {session.tax > 0 && (
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Impuestos:</Text>
                                <Text style={styles.receiptValue}>${session.tax.toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={[styles.receiptRow, styles.receiptTotalRow]}>
                            <Text style={styles.receiptTotalLabel}>Total:</Text>
                            <Text style={styles.receiptTotalValue}>${session.total.toFixed(2)}</Text>
                        </View>
                    </View>

                    <View style={styles.receiptDivider} />

                    {/* Payments List */}
                    <View style={styles.receiptSection}>
                        <Text style={styles.receiptSectionTitle}>Pagos Realizados</Text>
                        {payments.length > 0 ? (
                            payments.map((payment, idx) => (
                                <View key={idx} style={styles.paymentItem}>
                                    <View style={styles.paymentItemLeft}>
                                        <Text style={styles.paymentMethod}>
                                            {payment.method === 'cash' ? '💵 Efectivo' :
                                                payment.method === 'stripe' ? '💳 Tarjeta' : '💰 Otro'}
                                        </Text>
                                        {payment.createdBy && (
                                            <Text style={styles.paymentCreator}>({payment.createdBy})</Text>
                                        )}
                                    </View>
                                    <View style={styles.paymentItemRight}>
                                        <Text style={styles.paymentAmount}>${payment.amount.toFixed(2)}</Text>
                                        {payment.tip && payment.tip > 0 && (
                                            <Text style={styles.paymentTip}>+ ${payment.tip.toFixed(2)} propina</Text>
                                        )}
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noPaymentsText}>No se encontraron detalles de pago</Text>
                        )}

                        <View style={[styles.receiptRow, styles.receiptTotalRow, { marginTop: 15 }]}>
                            <Text style={styles.receiptTotalLabel}>Total Pagado:</Text>
                            <Text style={styles.receiptTotalValue}>
                                ${session.amount_paid.toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.receiptDivider} />

                    {/* Action Buttons */}
                    <TouchableOpacity
                        style={styles.receiptButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.receiptButtonText}>✓ Cerrar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.receiptButton, styles.receiptButtonSecondary]}
                        onPress={() => Alert.alert('Próximamente', 'La descarga de recibos estará disponible pronto')}
                    >
                        <Text style={styles.receiptButtonTextSecondary}>📄 Descargar Recibo</Text>
                    </TouchableOpacity>

                    <Text style={styles.receiptFooter}>
                        Gracias por tu visita 🙏
                    </Text>
                </View>
            </ScrollView>
        );
    }

    const amountToPay = calculateAmount();
    const tipAmount = calculateTip();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Tu Cuenta</Text>
                <Text style={styles.subtitle}>Mesa {session.tableId?.substring(0, 8)}</Text>
            </View>

            {/* PAYMENT SUMMARY */}
            <AirbnbCard shadow="sm" style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Resumen</Text>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Original:</Text>
                    <Text style={styles.summaryValue}>${session.total.toFixed(2)}</Text>
                </View>

                {payments.length > 0 && (
                    <>
                        <Text style={styles.paymentsTitle}>Pagos Realizados:</Text>
                        {payments.map((payment, idx) => (
                            <View key={idx} style={styles.paymentRow}>
                                <Text style={styles.paymentLabel}>
                                    - {payment.method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                                    {payment.items && ` (${payment.items.length} items)`}
                                </Text>
                                <Text style={styles.paymentValue}>-${payment.amount.toFixed(2)}</Text>
                            </View>
                        ))}
                    </>
                )}

                <View style={styles.dividerLine} />
                <View style={[styles.summaryRow, styles.remainingRow]}>
                    <Text style={styles.remainingLabel}>Restante a Pagar:</Text>
                    <Text style={styles.remainingValue}>${remaining.toFixed(2)}</Text>
                </View>
            </AirbnbCard>

            {/* SPLIT MODE SELECTOR */}
            <View style={styles.modeSelector}>
                <TouchableOpacity
                    style={[styles.modeButton, splitMode === 'full' && styles.modeButtonActive]}
                    onPress={() => setSplitMode('full')}
                >
                    <Text style={[styles.modeButtonText, splitMode === 'full' && styles.modeButtonTextActive]}>
                        Pagar Todo
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeButton, splitMode === 'items' && styles.modeButtonActive]}
                    onPress={() => setSplitMode('items')}
                >
                    <Text style={[styles.modeButtonText, splitMode === 'items' && styles.modeButtonTextActive]}>
                        Por Items
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeButton, splitMode === 'equal' && styles.modeButtonActive]}
                    onPress={() => setSplitMode('equal')}
                >
                    <Text style={[styles.modeButtonText, splitMode === 'equal' && styles.modeButtonTextActive]}>
                        Dividir Igual
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeButton, splitMode === 'custom' && styles.modeButtonActive]}
                    onPress={() => setSplitMode('custom')}
                >
                    <Text style={[styles.modeButtonText, splitMode === 'custom' && styles.modeButtonTextActive]}>
                        Monto Custom
                    </Text>
                </TouchableOpacity>
            </View>

            {/* EQUAL SPLIT INPUT */}
            {splitMode === 'equal' && (
                <View style={styles.splitInput}>
                    <Text style={styles.splitLabel}>Dividir entre:</Text>
                    <TextInput
                        style={styles.input}
                        value={splitCount}
                        onChangeText={setSplitCount}
                        keyboardType="number-pad"
                        placeholder="2"
                    />
                    <Text style={styles.splitLabel}>personas</Text>
                </View>
            )}

            {/* CUSTOM AMOUNT INPUT */}
            {splitMode === 'custom' && (
                <View style={styles.splitInput}>
                    <Text style={styles.splitLabel}>Monto a pagar:</Text>
                    <TextInput
                        style={styles.input}
                        value={customAmount}
                        onChangeText={setCustomAmount}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                    />
                    <Text style={styles.splitLabel}>de ${remaining.toFixed(2)}</Text>
                </View>
            )}

            {/* ITEMS LIST WITH CHECKBOXES */}
            {splitMode === 'items' && (
                <AirbnbCard shadow="sm" style={styles.itemsCard}>
                    <Text style={styles.sectionTitle}>Selecciona Items</Text>
                    {(() => {
                        // expandedItems is now memoized at component level

                        return expandedItems.map((expandedItem, idx) => {
                            // CRITICAL: Determine if this specific unit is paid
                            const isPaid = expandedItem.unitIndex < (expandedItem.paid_quantity || 0);
                            const isSelected = selectedVirtualIds.has(expandedItem.virtualId);

                            // Debug logging
                            if (idx === 0) {
                                console.log(`📊 Item Debug:`, {
                                    name: expandedItem.name,
                                    unitIndex: expandedItem.unitIndex,
                                    paid_quantity: expandedItem.paid_quantity,
                                    isPaid,
                                    virtualId: expandedItem.virtualId
                                });
                            }

                            return (
                                <TouchableOpacity
                                    key={expandedItem.virtualId}
                                    style={[
                                        styles.itemRow,
                                        isPaid && styles.itemRowPaid,
                                        isSelected && !isPaid && styles.itemRowSelected
                                    ]}
                                    onPress={() => {
                                        if (!isPaid) {
                                            toggleItemSelection(expandedItem.virtualId);
                                        } else {
                                            console.log(`⛔ Cannot select paid item: ${expandedItem.name} unit ${expandedItem.unitIndex}`);
                                        }
                                    }}
                                    disabled={isPaid}
                                >
                                    <View style={styles.itemRowLeft}>
                                        {/* Show checkmark for paid, checkbox for unpaid */}
                                        {isPaid ? (
                                            <View style={styles.paidIndicator}>
                                                <Text style={styles.paidCheckmark}>✓</Text>
                                            </View>
                                        ) : (
                                            <View style={[
                                                styles.checkbox,
                                                isSelected && styles.checkboxSelected
                                            ]}>
                                                {isSelected && (
                                                    <Text style={styles.checkmark}>✓</Text>
                                                )}
                                            </View>
                                        )}

                                        <View style={styles.itemInfo}>
                                            <Text style={[
                                                styles.itemName,
                                                isPaid && styles.itemNamePaid
                                            ]}>
                                                1x {expandedItem.name}
                                            </Text>
                                            {isPaid && (
                                                <Text style={styles.paidBadge}>Pagado</Text>
                                            )}
                                        </View>
                                    </View>

                                    <Text style={[
                                        styles.itemPrice,
                                        isPaid && styles.itemPricePaid
                                    ]}>
                                        ${expandedItem.price.toFixed(2)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        });
                    })()}
                </AirbnbCard>
            )}

            {/* TIP SECTION */}
            <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>Propina (Opcional)</Text>

                <View style={styles.tipButtons}>
                    {[10, 15, 20].map(pct => (
                        <TouchableOpacity
                            key={pct}
                            style={[
                                styles.tipButton,
                                !useCustomTip && tipPercentage === pct && styles.tipButtonActive
                            ]}
                            onPress={() => {
                                setTipPercentage(pct);
                                setUseCustomTip(false);
                                setCustomTip('');
                            }}
                        >
                            <Text style={[
                                styles.tipButtonText,
                                !useCustomTip && tipPercentage === pct && styles.tipButtonTextActive
                            ]}>
                                {pct}%
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TextInput
                    style={styles.customTipInput}
                    placeholder="Monto personalizado"
                    keyboardType="decimal-pad"
                    value={customTip}
                    onChangeText={(text) => {
                        setCustomTip(text);
                        if (text) setUseCustomTip(true);
                    }}
                />
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
                <View style={styles.breakdown}>
                    <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Subtotal:</Text>
                        <Text style={styles.breakdownValue}>${amountToPay.toFixed(2)}</Text>
                    </View>

                    {tipAmount > 0 && (
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>
                                Propina ({useCustomTip ? 'Custom' : `${tipPercentage}%`}):
                            </Text>
                            <Text style={styles.breakdownValue}>${tipAmount.toFixed(2)}</Text>
                        </View>
                    )}

                    <View style={[styles.breakdownRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total a Pagar</Text>
                        <Text style={styles.totalAmount}>${(amountToPay + tipAmount).toFixed(2)}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.payButton, paymentLoading && styles.payButtonDisabled]}
                    onPress={handlePay}
                    disabled={paymentLoading}
                >
                    {paymentLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.payButtonText}>
                            Pagar ${(amountToPay + tipAmount).toFixed(2)}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.oatCream,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        padding: 20,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    summaryCard: {
        marginHorizontal: spacing.xl,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.castIron,
        marginBottom: spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 16,
        color: '#666',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    paymentsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        marginTop: 12,
        marginBottom: 4,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: 12,
        marginBottom: 4,
    },
    paymentLabel: {
        fontSize: 14,
        color: '#888',
    },
    paymentValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E67E22',
    },
    dividerLine: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 12,
    },
    remainingRow: {
        marginTop: 4,
    },
    remainingLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.castIron,
    },
    remainingValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.roastedSaffron,
    },
    modeSelector: {
        flexDirection: 'row',
        padding: 15,
        gap: 8,
    },
    modeButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    modeButtonActive: {
        borderColor: colors.roastedSaffron,
        backgroundColor: '#FFF4ED',
    },
    modeButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    modeButtonTextActive: {
        color: colors.roastedSaffron,
    },
    splitInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        gap: 10,
    },
    splitLabel: {
        fontSize: 16,
        color: '#666',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        width: 80,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
    },
    itemsCard: {
        marginHorizontal: spacing.xl,
        marginBottom: spacing.lg,
        padding: 0,
    },
    divider: {
        height: 1,
        backgroundColor: colors.lightGray,
        marginVertical: spacing.sm,
        marginHorizontal: spacing.lg,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        justifyContent: 'space-between',
    },
    itemRowPaid: {
        opacity: 0.5,
        backgroundColor: '#f5f5f5',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.castIron,
        marginBottom: 4,
    },
    itemNamePaid: {
        textDecorationLine: 'line-through',
        color: '#999',
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.castIron,
    },
    itemPricePaid: {
        textDecorationLine: 'line-through',
        color: '#999',
    },
    paidBadge: {
        fontSize: 12,
        color: '#4caf50',
        fontWeight: '600',
    },
    itemRowSelected: {
        backgroundColor: '#E8F5E9',
        borderColor: colors.roastedSaffron,
        borderWidth: 2,
    },
    itemRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        marginRight: 12,
    },
    checkboxSelected: {
        backgroundColor: colors.roastedSaffron,
        borderColor: colors.roastedSaffron,
    },
    checkmark: {
        fontSize: 18,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    tipButtons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    tipButton: {
        flex: 1,
        padding: 12,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    tipButtonActive: {
        backgroundColor: colors.roastedSaffron,
        borderColor: colors.roastedSaffron,
    },
    tipButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    tipButtonTextActive: {
        color: '#fff',
    },
    customTipInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        backgroundColor: colors.white,
    },
    breakdown: {
        marginBottom: 15,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    breakdownLabel: {
        fontSize: 16,
        color: '#666',
    },
    breakdownValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    totalRow: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    totalLabel: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.castIron,
    },
    payButton: {
        backgroundColor: colors.roastedSaffron,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    payButtonDisabled: {
        opacity: 0.6,
    },
    payButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorText: {
        fontSize: 18,
        color: 'red',
    },
    successText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.roastedSaffron,
        marginBottom: 8,
    },
    subText: {
        fontSize: 16,
        color: colors.castIron,
    },
    // Receipt View Styles
    receiptContainer: {
        backgroundColor: 'white',
        margin: 20,
        padding: 25,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    receiptTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.roastedSaffron,
        textAlign: 'center',
        marginBottom: 8,
    },
    receiptSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    receiptDivider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 20,
    },
    receiptSection: {
        marginBottom: 15,
    },
    receiptSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.castIron,
        marginBottom: 12,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    receiptLabel: {
        fontSize: 15,
        color: '#666',
    },
    receiptValue: {
        fontSize: 15,
        color: colors.castIron,
        fontWeight: '500',
    },
    receiptTotalRow: {
        paddingTop: 12,
        borderTopWidth: 2,
        borderTopColor: '#e0e0e0',
        marginTop: 8,
    },
    receiptTotalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.castIron,
    },
    receiptTotalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.roastedSaffron,
    },
    paymentItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    paymentItemLeft: {
        flex: 1,
    },
    paymentItemRight: {
        alignItems: 'flex-end',
    },
    paymentMethod: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.castIron,
        marginBottom: 4,
    },
    paymentCreator: {
        fontSize: 13,
        color: '#888',
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.castIron,
    },
    paymentTip: {
        fontSize: 13,
        color: colors.roastedSaffron,
        marginTop: 2,
    },
    noPaymentsText: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 20,
    },
    receiptButton: {
        backgroundColor: colors.roastedSaffron,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    receiptButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    receiptButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.roastedSaffron,
    },
    receiptButtonTextSecondary: {
        color: colors.roastedSaffron,
        fontSize: 16,
        fontWeight: '600',
    },
    receiptFooter: {
        textAlign: 'center',
        fontSize: 16,
        color: '#999',
        marginTop: 25,
        fontStyle: 'italic',
    },
});
