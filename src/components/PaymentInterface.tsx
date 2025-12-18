import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Platform } from 'react-native';
import { subscribeToSession } from '../services/sessions';
import { recordPayment, recordItemPayment } from '../services/payments';
import { Session, OrderItem, Payment } from '../types/firestore';
import AirbnbCard from './AirbnbCard';
import { colors, spacing, typography } from '../styles/theme';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

type SplitMode = 'full' | 'items' | 'equal' | 'custom';

interface PaymentInterfaceProps {
    sessionId?: string; // Optional if localSession is provided
    restaurantId: string;
    onClose?: () => void;
    onPaymentSuccess?: () => void;
    mode?: 'guest' | 'waiter';
    localSession?: Session; // Optional: use this instead of subscribing to a session
    onConfirmPayment?: (amount: number, tip: number, selectedItems?: any[]) => Promise<void>; // Optional: custom handler for payment
    hideSplitModes?: boolean; // Optional: hide splitting UI
}

export default function PaymentInterface({
    sessionId,
    restaurantId,
    onClose,
    onPaymentSuccess,
    mode = 'guest',
    localSession,
    onConfirmPayment,
    hideSplitModes = false
}: PaymentInterfaceProps) {
    const [session, setSession] = useState<Session | null>(localSession || null);
    const [loading, setLoading] = useState(true);
    const [splitMode, setSplitMode] = useState<SplitMode>('full');
    const [selectedVirtualIds, setSelectedVirtualIds] = useState<Set<string>>(new Set());
    const [splitCount, setSplitCount] = useState<string>('2');
    const [customAmount, setCustomAmount] = useState<string>('');

    // Payment Method (for waiters)
    // Payment Method (for waiters)
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cash' | 'other'>('cash');

    // Payment history
    const [payments, setPayments] = useState<Payment[]>([]);
    const [paymentLoading, setPaymentLoading] = useState(false);

    // Tip state
    const [tipPercentage, setTipPercentage] = useState(15);
    const [customTip, setCustomTip] = useState<string>('');
    const [useCustomTip, setUseCustomTip] = useState(false);

    useEffect(() => {
        if (localSession) {
            setSession(localSession);
            setLoading(false);
            return;
        }

        if (!sessionId || !restaurantId) {
            setLoading(false);
            return;
        };

        const unsubscribe = subscribeToSession(sessionId, (data) => {
            console.log('🔄🔄🔄 [PaymentInterface] Session updated:', {
                itemsCount: data?.items?.length,
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
    }, [sessionId, restaurantId, localSession]);

    // Load payment summary with real-time updates
    useEffect(() => {
        if (localSession || !sessionId || !restaurantId) {
            if (localSession) setPayments([]); // No payments history for local sessions yet
            return;
        }

        const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', sessionId, 'payments');
        const unsubscribe = onSnapshot(paymentsRef, (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            setPayments(paymentsData);
        }, (error) => {
            console.error('Failed to subscribe to payments:', error);
        });

        return () => unsubscribe();
    }, [sessionId, restaurantId, localSession]);

    const expandedItems = useMemo(() => {
        if (!session) return [];

        const expanded: Array<OrderItem & { virtualId: string; unitIndex: number }> = [];

        session.items.forEach((item, idx) => {
            for (let i = 0; i < item.quantity; i++) {
                expanded.push({
                    ...item,
                    virtualId: `${item.id}_row${idx}_unit${i}`,
                    unitIndex: i
                });
            }
        });

        return expanded;
    }, [session, session?.items, session?.items?.length, session?.amount_paid]);

    // Calculate actual total including modifiers
    const calculatedTotal = useMemo(() => {
        if (!session) return 0;
        return session.items.reduce((sum, item) => {
            const modifiersTotal = item.modifiers?.reduce((mSum, mod) => mSum + mod.price, 0) || 0;
            return sum + ((item.price + modifiersTotal) * item.quantity);
        }, 0);
    }, [session?.items]);

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

        const newSelection = new Set(selectedVirtualIds);
        let changed = false;

        selectedVirtualIds.forEach(virtualId => {
            const item = expandedItems.find(ei => ei.virtualId === virtualId);
            if (item) {
                const isPaid = item.unitIndex < (item.paid_quantity || 0);
                if (isPaid) {
                    newSelection.delete(virtualId);
                    changed = true;
                }
            }
        });

        if (changed) {
            setSelectedVirtualIds(newSelection);
        }
    }, [expandedItems, selectedVirtualIds]);

    const calculateAmount = (): number => {
        if (!session) return 0;
        const totalPaid = session.amount_paid || 0;
        const remaining = calculatedTotal - totalPaid;

        if (hideSplitModes) return remaining;

        switch (splitMode) {
            case 'full':
                return remaining;
            case 'items':
                return expandedItems
                    .filter(item => {
                        const isPaid = item.unitIndex < (item.paid_quantity || 0);
                        return selectedVirtualIds.has(item.virtualId) && !isPaid;
                    })
                    .reduce((sum, item) => {
                        const modifiersTotal = item.modifiers?.reduce((mSum, mod) => mSum + mod.price, 0) || 0;
                        return sum + (item.price + modifiersTotal);
                    }, 0);
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

        const amount = calculateAmount();
        const tip = calculateTip();
        const totalWithTip = amount + tip;
        const remaining = calculatedTotal - (session.amount_paid || 0);

        // CRITICAL: Validate ONLY the bill amount (without tip) against remaining
        if (amount > remaining + 0.01) {
            console.log('⚠️ OVERPAYMENT DETECTED:', { amount, remaining, tip });

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
                const itemCounts = new Map<string, number>();

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
                    session.id || 'local',
                    selectedItems,
                    paymentMethod,
                    mode,
                    tip
                );
            } else {
                if (onConfirmPayment) {
                    await onConfirmPayment(amount, tip);
                } else if (session.id) {
                    await recordPayment(
                        restaurantId,
                        session.id,
                        amount,
                        paymentMethod, // Use selected method
                        mode, // 'guest' or 'waiter'
                        tip
                    );
                }
            }

            if (onConfirmPayment) {
                // If using custom handler, we assume success or handle failure via throw
                if (onPaymentSuccess) onPaymentSuccess();
                return;
            }

            // Reload session to get updated remaining amount
            if (session.id) {
                const updatedSession = await new Promise<Session | null>((resolve) => {
                    const unsubscribe = subscribeToSession(session.id, (data) => {
                        resolve(data);
                        unsubscribe();
                    }, restaurantId);
                });

                const newRemaining = updatedSession?.remaining_amount || 0;
                const isFullyPaid = newRemaining <= 0.01;

                if (isFullyPaid) {
                    Alert.alert('¡Cuenta Cerrada!', `¡Pago completado! Gracias por tu visita.`);
                    if (onPaymentSuccess) onPaymentSuccess();
                    if (onClose) onClose();
                } else {
                    Alert.alert(
                        'Abono Registrado ✓',
                        `Pagaste $${amount.toFixed(2)}.\n\nRestan $${newRemaining.toFixed(2)} por pagar.`,
                        [{ text: 'OK' }]
                    );
                    if (onPaymentSuccess) onPaymentSuccess();
                }
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

    const remaining = calculatedTotal - (session.amount_paid || 0);

    if (remaining <= 0) {
        return (
            <ScrollView style={styles.container}>
                <View style={styles.receiptContainer}>
                    <Text style={styles.receiptTitle}>✓ Cuenta Cerrada</Text>
                    <Text style={styles.receiptSubtitle}>Mesa {session.tableId?.substring(0, 8)}</Text>

                    <View style={styles.receiptDivider} />

                    <View style={styles.receiptSection}>
                        <Text style={styles.receiptSectionTitle}>Resumen de Cuenta</Text>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Subtotal:</Text>
                            <Text style={styles.receiptValue}>${session.subtotal?.toFixed(2) || calculatedTotal.toFixed(2)}</Text>
                        </View>
                        {session.tax > 0 && (
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Impuestos:</Text>
                                <Text style={styles.receiptValue}>${session.tax.toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={[styles.receiptRow, styles.receiptTotalRow]}>
                            <Text style={styles.receiptTotalLabel}>Total:</Text>
                            <Text style={styles.receiptTotalValue}>${calculatedTotal.toFixed(2)}</Text>
                        </View>
                    </View>

                    <View style={styles.receiptDivider} />

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

                    <TouchableOpacity
                        style={styles.receiptButton}
                        onPress={onClose}
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
                {session.tableName ? (
                    <Text style={styles.subtitle}>Mesa {session.tableName}</Text>
                ) : session.tableId ? (
                    <Text style={styles.subtitle}>Mesa {session.tableId?.substring(0, 8)}</Text>
                ) : null}
            </View>

            {/* ORDER SUMMARY */}
            <AirbnbCard shadow="sm" style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Detalles de la Orden</Text>

                {expandedItems.map((item, idx) => {
                    // Only show 1st unit of each item row to avoid clutter, or show aggregated? 
                    // User asked for "resumen de la cuenta todo lo que se ordeno".
                    // Best to show aggregated by row (OrderItem) and who ordered it.
                    // But expandedItems splits them. Let's use session.items directly for the summary.
                    return null;
                })}

                {session.items.map((item, idx) => {
                    const isWaiter = item.created_by === 'waiter' || item.created_by_id?.startsWith('waiter');
                    const creatorLabel = isWaiter ? 'Mesero' : (item.created_by_name || 'Cliente');

                    return (
                        <View key={`${item.id}_${idx}`} style={styles.orderSummaryRow}>
                            <View style={styles.orderSummaryInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={styles.orderSummaryName}>
                                        {item.quantity}x {item.name}
                                    </Text>
                                    <View style={[
                                        styles.creatorBadge,
                                        isWaiter ? styles.creatorBadgeWaiter : styles.creatorBadgeGuest
                                    ]}>
                                        <Text style={[
                                            styles.creatorText,
                                            isWaiter ? styles.creatorTextWaiter : styles.creatorTextGuest
                                        ]}>
                                            {creatorLabel}
                                        </Text>
                                    </View>
                                </View>
                                {item.modifiers && item.modifiers.length > 0 && (
                                    <View style={{ marginTop: 4 }}>
                                        {item.modifiers.map((mod, mIdx) => (
                                            <Text key={mIdx} style={{ fontSize: 12, color: '#666' }}>
                                                + {mod.name} {mod.price > 0 ? `($${mod.price.toFixed(2)})` : ''}
                                            </Text>
                                        ))}
                                    </View>
                                )}
                            </View>
                            <Text style={styles.orderSummaryPrice}>
                                ${((item.price + (item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0)) * item.quantity).toFixed(2)}
                            </Text>
                        </View>
                    );
                })}
            </AirbnbCard>

            {/* PAYMENT SUMMARY */}
            <AirbnbCard shadow="sm" style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Resumen de Pagos</Text>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Original:</Text>
                    <Text style={styles.summaryValue}>${calculatedTotal.toFixed(2)}</Text>
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
            {!hideSplitModes && (
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
            )}

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
                    {expandedItems.map((expandedItem, idx) => {
                        const isPaid = expandedItem.unitIndex < (expandedItem.paid_quantity || 0);
                        const isSelected = selectedVirtualIds.has(expandedItem.virtualId);

                        return (
                            <TouchableOpacity
                                key={expandedItem.virtualId}
                                style={[
                                    styles.itemRow,
                                    isPaid && styles.itemRowPaid,
                                    isSelected && !isPaid && styles.itemRowSelected
                                ]}
                                onPress={() => {
                                    if (!isPaid) toggleItemSelection(expandedItem.virtualId);
                                }}
                                disabled={isPaid}
                            >
                                <View style={styles.itemRowLeft}>
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
                                            1x {expandedItem.name} ({expandedItem.created_by === 'waiter' || expandedItem.created_by_id?.startsWith('waiter') ? 'Mesero' : (expandedItem.created_by_name || 'Cliente')})
                                        </Text>
                                        {expandedItem.modifiers && expandedItem.modifiers.length > 0 && (
                                            <View style={{ marginTop: 2 }}>
                                                {expandedItem.modifiers.map((mod, mIdx) => (
                                                    <Text key={mIdx} style={{ fontSize: 11, color: '#888' }}>
                                                        + {mod.name} {mod.price > 0 ? `($${mod.price.toFixed(2)})` : ''}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}
                                        {isPaid && (
                                            <Text style={styles.paidBadge}>Pagado</Text>
                                        )}
                                    </View>
                                </View>

                                <Text style={[
                                    styles.itemPrice,
                                    isPaid && styles.itemPricePaid
                                ]}>
                                    ${(expandedItem.price + (expandedItem.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0)).toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
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

            {/* WAITER PAYMENT METHOD SELECTOR */}
            {mode === 'waiter' && (
                <View style={styles.methodSection}>
                    <Text style={styles.sectionTitle}>Método de Pago</Text>
                    <View style={styles.methodSelector}>
                        <TouchableOpacity
                            style={[
                                styles.methodButton,
                                paymentMethod === 'cash' && styles.methodButtonActive
                            ]}
                            onPress={() => setPaymentMethod('cash')}
                        >
                            <Text style={styles.methodEmoji}>💵</Text>
                            <Text style={[
                                styles.methodButtonText,
                                paymentMethod === 'cash' && styles.methodButtonTextActive
                            ]}>
                                Efectivo
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.methodButton,
                                paymentMethod === 'other' && styles.methodButtonActive
                            ]}
                            onPress={() => setPaymentMethod('other')}
                        >
                            <Text style={styles.methodEmoji}>💳</Text>
                            <Text style={[
                                styles.methodButtonText,
                                paymentMethod === 'other' && styles.methodButtonTextActive
                            ]}>
                                Terminal
                            </Text>
                        </TouchableOpacity>


                    </View>
                </View>
            )}

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
                    style={[
                        styles.payButton,
                        paymentLoading && styles.payButtonDisabled,
                        mode === 'waiter' && paymentMethod === 'cash' && { backgroundColor: '#27AE60' }, // Green for cash
                        mode === 'waiter' && paymentMethod === 'other' && { backgroundColor: '#2980B9' } // Blue for terminal
                    ]}
                    onPress={handlePay}
                    disabled={paymentLoading}
                >
                    {paymentLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.payButtonText}>
                            {paymentMethod === 'cash' ? 'Cobrar Efectivo' :
                                paymentMethod === 'other' ? 'Registrar Pago Terminal' :
                                    `Pagar $${(amountToPay + tipAmount).toFixed(2)}`}
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
    errorText: {
        fontSize: 18,
        color: 'red',
        marginBottom: 20,
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
    // Payment Method Styles
    methodSection: {
        marginHorizontal: spacing.xl,
        marginTop: spacing.md,
    },
    methodSelector: {
        flexDirection: 'row',
        gap: 10,
    },
    methodButton: {
        flex: 1,
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#eee',
    },
    methodButtonActive: {
        borderColor: colors.roastedSaffron,
        backgroundColor: '#FFF4ED',
    },
    methodEmoji: {
        fontSize: 24,
        marginBottom: 5,
    },
    methodButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    methodButtonTextActive: {
        color: colors.roastedSaffron,
    },
    splitInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
        gap: 10,
    },
    splitLabel: {
        fontSize: 18,
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        width: 100,
        textAlign: 'center',
        fontSize: 18,
        backgroundColor: 'white',
    },
    itemsCard: {
        marginHorizontal: spacing.xl,
        marginBottom: spacing.md,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    itemRowSelected: {
        backgroundColor: '#F0F9FF',
    },
    itemRowPaid: {
        opacity: 0.6,
        backgroundColor: '#F5F5F5',
    },
    itemRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#ccc',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        borderColor: colors.roastedSaffron,
        backgroundColor: colors.roastedSaffron,
    },
    paidIndicator: {
        width: 24,
        height: 24,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
    },
    paidCheckmark: {
        color: '#2E7D32',
        fontSize: 14,
        fontWeight: 'bold',
    },
    checkmark: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        color: '#333',
    },
    itemNamePaid: {
        textDecorationLine: 'line-through',
        color: '#888',
    },
    paidBadge: {
        fontSize: 10,
        color: '#2E7D32',
        fontWeight: 'bold',
        marginTop: 2,
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    itemPricePaid: {
        color: '#888',
        textDecorationLine: 'line-through',
    },
    tipSection: {
        padding: 20,
        backgroundColor: 'white',
        marginTop: 10,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 15,
        color: '#333',
    },
    tipButtons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    tipButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    tipButtonActive: {
        borderColor: colors.roastedSaffron,
        backgroundColor: '#FFF4ED',
    },
    tipButtonText: {
        fontWeight: '600',
        color: '#666',
    },
    tipButtonTextActive: {
        color: colors.roastedSaffron,
    },
    customTipInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    footer: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingBottom: 40,
    },
    breakdown: {
        marginBottom: 20,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    breakdownLabel: {
        fontSize: 14,
        color: '#666',
    },
    breakdownValue: {
        fontSize: 14,
        color: '#333',
    },
    totalRow: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 8,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.roastedSaffron,
    },
    payButton: {
        backgroundColor: colors.roastedSaffron,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    payButtonDisabled: {
        opacity: 0.7,
    },
    payButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    receiptContainer: {
        flex: 1,
        padding: 20,
        backgroundColor: colors.oatCream,
        alignItems: 'center',
    },
    receiptTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginTop: 20,
    },
    receiptSubtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
        marginBottom: 20,
    },
    receiptDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 20,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 1,
    },
    receiptSection: {
        width: '100%',
    },
    receiptSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    receiptLabel: {
        fontSize: 16,
        color: '#444',
    },
    receiptValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    receiptTotalRow: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    receiptTotalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    receiptTotalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    paymentItem: {
        marginBottom: 10,
    },
    paymentItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    paymentMethod: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    paymentCreator: {
        fontSize: 14,
        color: '#888',
        marginLeft: 5,
    },
    paymentItemRight: {
        alignItems: 'flex-end',
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2E7D32',
    },
    paymentTip: {
        fontSize: 12,
        color: '#888',
    },
    noPaymentsText: {
        fontStyle: 'italic',
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
    },
    receiptButton: {
        backgroundColor: '#333',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
    },
    receiptButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#333',
        marginTop: 15,
    },
    receiptButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    receiptButtonTextSecondary: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
    receiptFooter: {
        marginTop: 40,
        fontSize: 14,
        color: '#888',
        fontStyle: 'italic',
    },
    orderSummaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    orderSummaryInfo: {
        flex: 1,
        flexDirection: 'column',
    },
    orderSummaryName: {
        fontSize: 15,
        color: colors.castIron,
        marginRight: 8,
    },
    orderSummaryPrice: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.castIron,
    },
    creatorBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 4,
    },
    creatorBadgeWaiter: {
        backgroundColor: '#FFF3E0', // Light orange
        borderWidth: 1,
        borderColor: '#FFB74D',
    },
    creatorBadgeGuest: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    creatorText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    creatorTextWaiter: {
        color: '#F57C00', // Darker orange
    },
    creatorTextGuest: {
        color: '#757575',
    },
});
