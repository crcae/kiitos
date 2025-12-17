import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal, TextInput, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { subscribeToSession } from '../../src/services/sessions';
import { subscribeToGuestProducts, subscribeToGuestCategories, sendOrderToKitchen } from '../../src/services/guestMenu';
import { recordPayment } from '../../src/services/payments';
import { Product, Category, Session } from '../../src/types/firestore';
import { colors } from '../../src/styles/theme';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../src/context/AuthContext';

interface CartItem {
    product: Product;
    quantity: number;
}

export default function WaiterPOSScreen() {
    const { tableId, sessionId } = useLocalSearchParams<{ tableId: string, sessionId: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const restaurantId = user?.restaurantId || 'kiitos-main';

    // Data State
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // UI State
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [cashAmount, setCashAmount] = useState('');
    const [tipAmount, setTipAmount] = useState(''); // NEW: Separate tip

    // Attribution tracking
    const waiterNumberRef = useRef(1); // Simple counter for this session

    useEffect(() => {
        if (!restaurantId) return;

        const unsubCats = subscribeToGuestCategories(restaurantId, (data) => {
            setCategories(data);
            if (data.length > 0 && !selectedCategory) {
                setSelectedCategory(data[0].id);
            }
        });

        const unsubProds = subscribeToGuestProducts(restaurantId, setProducts);

        const unsubSession = subscribeToSession(sessionId!, (data) => {
            setSession(data);
        }, restaurantId);

        setLoading(false);

        return () => {
            unsubCats();
            unsubProds();
            if (unsubSession) unsubSession();
        };
    }, [sessionId, restaurantId]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === productId);
            if (existing && existing.quantity > 1) {
                return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
            }
            return prev.filter(item => item.product.id !== productId);
        });
    };

    const handleSendOrder = async () => {
        if (cart.length === 0) return;
        try {
            const createdById = `waiter-${waiterNumberRef.current}`;
            await sendOrderToKitchen(restaurantId, tableId!, cart, createdById);
            Alert.alert('Éxito', 'Orden enviada a cocina');
            setCart([]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo enviar la orden');
        }
    };

    useEffect(() => {
        if (showPaymentModal && session) {
            // Pre-fill with remaining amount
            const remaining = (session.total || 0) - (session.amount_paid || 0);
            setCashAmount(remaining.toFixed(2));
        }
    }, [showPaymentModal, session]);

    const handleCashPayment = async () => {
        const cash = parseFloat(cashAmount);
        const tip = parseFloat(tipAmount) || 0;
        const total = session?.total || 0;
        const amountPaid = session?.amount_paid || 0;
        const remaining = total - amountPaid;

        if (isNaN(cash) || cash <= 0) {
            Alert.alert('Error', 'Ingresa un monto válido');
            return;
        }

        if (cash < remaining) {
            // Partial payment
            Alert.alert(
                'Pago Parcial',
                `Recibiendo $${cash.toFixed(2)} de $${remaining.toFixed(2)}${tip > 0 ? ` + $${tip.toFixed(2)} propina` : ''}`,
                [
                    { text: 'Cancelar' },
                    {
                        text: 'Confirmar',
                        onPress: async () => {
                            try {
                                await recordPayment(restaurantId, sessionId!, cash, 'cash', `waiter-${waiterNumberRef.current}`, tip);
                                Alert.alert('¡Pago Registrado!', `Restante: $${(remaining - cash).toFixed(2)}`);
                                setShowPaymentModal(false);
                                setCashAmount('');
                                setTipAmount('');
                            } catch (error) {
                                console.error(error);
                                Alert.alert('Error', 'No se pudo registrar el pago');
                            }
                        }
                    }
                ]
            );
        } else {
            // Full or overpayment
            const change = cash - remaining;
            Alert.alert(
                'Pago Completo',
                `Cambio: $${change.toFixed(2)}${tip > 0 ? `\nPropina: $${tip.toFixed(2)}` : ''}`,
                [
                    { text: 'Cancelar' },
                    {
                        text: 'Confirmar',
                        onPress: async () => {
                            try {
                                await recordPayment(restaurantId, sessionId!, remaining, 'cash', `waiter-${waiterNumberRef.current}`, tip);
                                Alert.alert('¡Cuenta Cerrada!', `Cambio: $${change.toFixed(2)}`);
                                setShowPaymentModal(false);
                                setCashAmount('');
                                setTipAmount('');
                            } catch (error) {
                                console.error(error);
                                Alert.alert('Error', 'No se pudo registrar el pago');
                            }
                        }
                    }
                ]
            );
        }
    };

    // Get attribution badge info
    const getAttributionBadge = (item: any) => {
        const createdById = item.created_by_id || 'guest-1';
        const isWaiter = createdById.startsWith('waiter');
        const number = createdById.split('-')[1] || '1';

        return {
            label: isWaiter ? `Mesero ${number}` : `Cliente ${number}`,
            color: isWaiter ? '#27AE60' : '#3498DB'
        };
    };

    const visibleProducts = selectedCategory
        ? products.filter(p => p.category_id === selectedCategory && p.available)
        : [];

    const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const sessionTotal = session?.total || 0;
    const grandTotal = sessionTotal + cartTotal;

    // Payment URL for QR code
    const paymentUrl = `http://localhost:8081/pay/${sessionId}?restaurantId=${restaurantId}`;

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.roastedSaffron} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Mobile Responsive Layout */}
            <View style={styles.contentWrapper}>
                {/* Menu Section */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Menú</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow}>
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setSelectedCategory(cat.id)}
                                style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
                            >
                                <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                                    {cat.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <FlatList
                        data={visibleProducts}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        key={2} // Force re-render when switching
                        contentContainerStyle={styles.menuGrid}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.menuItem} onPress={() => addToCart(item)}>
                                <Text style={styles.menuItemName}>{item.name}</Text>
                                <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* Order Section */}
                <View style={styles.orderSection}>
                    <View style={styles.orderHeader}>
                        <Text style={styles.sectionTitle}>Mesa {tableId?.substring(0, 8)}</Text>
                        <View style={styles.headerButtons}>
                            <TouchableOpacity onPress={() => setShowPrintModal(true)} style={styles.iconButton}>
                                <Text style={styles.iconButtonText}>🖨️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowPaymentModal(true)} style={styles.iconButton}>
                                <Text style={styles.iconButtonText}>💵</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* BALANCE MONITOR */}
                    <View style={styles.balanceMonitor}>
                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceLabel}>Total:</Text>
                            <Text style={styles.balanceValue}>${sessionTotal.toFixed(2)}</Text>
                        </View>
                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceLabel}>Pagado:</Text>
                            <Text style={[styles.balanceValue, styles.paidAmount]}>${(session?.amount_paid || 0).toFixed(2)}</Text>
                        </View>
                        <View style={[styles.balanceRow, styles.balanceRowHighlight]}>
                            <Text style={styles.balanceLabelBold}>Restante:</Text>
                            <Text style={styles.balanceValueBold}>${Math.max(0, sessionTotal - (session?.amount_paid || 0)).toFixed(2)}</Text>
                        </View>
                    </View>

                    <ScrollView style={styles.orderList}>
                        {/* Committed Items */}
                        {session?.items && session.items.length > 0 && (
                            <>
                                <Text style={styles.subsectionTitle}>Ordenados</Text>
                                {session.items.map((item, index) => {
                                    const badge = getAttributionBadge(item);
                                    return (
                                        <View key={`session-${index}`} style={styles.orderItem}>
                                            <View style={styles.orderItemLeft}>
                                                <Text style={styles.committedItemText}>{item.quantity}x {item.name}</Text>
                                                <View style={[styles.attributionBadge, { backgroundColor: badge.color }]}>
                                                    <Text style={styles.attributionText}>{badge.label}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                                        </View>
                                    );
                                })}
                            </>
                        )}

                        {/* Pending Items */}
                        {cart.length > 0 && (
                            <>
                                <Text style={styles.subsectionTitle}>Nuevos (Pendiente)</Text>
                                {cart.map((item, index) => (
                                    <View key={`new-${index}`} style={styles.orderItem}>
                                        <View style={styles.orderItemContent}>
                                            <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={styles.minusButton}>
                                                <Text style={styles.minusText}>−</Text>
                                            </TouchableOpacity>
                                            <View>
                                                <Text style={styles.newItemText}>{item.quantity}x {item.product.name}</Text>
                                                <View style={[styles.attributionBadge, { backgroundColor: '#27AE60' }]}>
                                                    <Text style={styles.attributionText}>Mesero {waiterNumberRef.current}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <Text style={styles.itemPrice}>${(item.product.price * item.quantity).toFixed(2)}</Text>
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total:</Text>
                            <Text style={styles.totalAmount}>${grandTotal.toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleSendOrder}
                            disabled={cart.length === 0}
                            style={[styles.sendButton, cart.length === 0 && styles.sendButtonDisabled]}
                        >
                            <Text style={styles.sendButtonText}>Enviar a Cocina</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Print Bill Modal */}
            <Modal visible={showPrintModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Cuenta - Mesa {tableId?.substring(0, 8)}</Text>

                        <ScrollView style={styles.billScroll}>
                            {session?.items && session.items.map((item, index) => {
                                const badge = getAttributionBadge(item);
                                return (
                                    <View key={index} style={styles.billItem}>
                                        <View>
                                            <Text style={styles.billItemName}>{item.quantity}x {item.name}</Text>
                                            <Text style={[styles.billItemBadge, { color: badge.color }]}>{badge.label}</Text>
                                        </View>
                                        <Text style={styles.billItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                                    </View>
                                );
                            })}

                            <View style={styles.billTotal}>
                                <Text style={styles.billTotalLabel}>Total:</Text>
                                <Text style={styles.billTotalAmount}>${sessionTotal.toFixed(2)}</Text>
                            </View>

                            <View style={styles.qrContainer}>
                                <Text style={styles.qrLabel}>Paga con QR:</Text>
                                <QRCode value={paymentUrl} size={200} />
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setShowPrintModal(false)} style={styles.modalButtonCancel}>
                                <Text style={styles.modalButtonTextCancel}>Cerrar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                                if (Platform.OS === 'web') window.print();
                            }} style={styles.modalButtonPrimary}>
                                <Text style={styles.modalButtonText}>Imprimir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Cash Payment Modal */}
            <Modal visible={showPaymentModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentSmall}>
                        <Text style={styles.modalTitle}>Pago en Efectivo</Text>

                        <View style={styles.paymentInfo}>
                            <Text style={styles.paymentLabel}>Total a pagar:</Text>
                            <Text style={styles.paymentTotal}>${sessionTotal.toFixed(2)}</Text>
                        </View >

                        <TextInput
                            style={styles.cashInput}
                            placeholder="Monto recibido"
                            keyboardType="decimal-pad"
                            value={cashAmount}
                            onChangeText={setCashAmount}
                        />

                        {cashAmount && !isNaN(parseFloat(cashAmount)) && parseFloat(cashAmount) >= sessionTotal && (
                            <View style={styles.changeInfo}>
                                <Text style={styles.changeLabel}>Cambio:</Text>
                                <Text style={styles.changeAmount}>${(parseFloat(cashAmount) - sessionTotal).toFixed(2)}</Text>
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => {
                                setShowPaymentModal(false);
                                setCashAmount('');
                            }} style={styles.modalButtonCancel}>
                                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCashPayment} style={styles.modalButtonPrimary}>
                                <Text style={styles.modalButtonText}>Confirmar Pago</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFBF7',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentWrapper: {
        flex: 1,
        flexDirection: 'row',
        // Stack vertically on mobile
        ...Platform.select({
            web: {
                '@media (max-width: 768px)': {
                    flexDirection: 'column',
                }
            }
        })
    },
    menuSection: {
        flex: 2,
        padding: 20,
        borderRightWidth: 1,
        borderRightColor: '#E5E5E5',
        minHeight: 300,
    },
    orderSection: {
        flex: 1,
        padding: 20,
        backgroundColor: '#FFFFFF',
        minWidth: 300,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButtonText: {
        fontSize: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#2C3E50',
    },
    subsectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginTop: 10,
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    categoriesRow: {
        maxHeight: 50,
        marginBottom: 15,
    },
    categoryPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        marginRight: 8,
    },
    categoryPillActive: {
        backgroundColor: '#E67E22',
        borderColor: '#E67E22',
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    categoryTextActive: {
        color: '#FFFFFF',
    },
    menuGrid: {
        gap: 10,
    },
    menuItem: {
        flex: 1,
        margin: 5,
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        minHeight: 80,
        justifyContent: 'center',
    },
    menuItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        textAlign: 'center',
    },
    menuItemPrice: {
        fontSize: 14,
        color: '#E67E22',
        marginTop: 4,
        fontWeight: '600',
    },
    orderList: {
        flex: 1,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    orderItemLeft: {
        flex: 1,
    },
    orderItemContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        gap: 8,
    },
    committedItemText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#2C3E50',
        marginBottom: 4,
    },
    newItemText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#E67E22',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 14,
        color: '#717171',
        fontWeight: '500',
    },
    attributionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    attributionText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
    },
    minusButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#C0392B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    minusText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingTop: 20,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    totalAmount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    sendButton: {
        backgroundColor: '#27AE60',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#95A5A6',
    },
    sendButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
    },
    modalContentSmall: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#2C3E50',
    },
    billScroll: {
        maxHeight: 400,
    },
    billItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    billItemName: {
        fontSize: 14,
        color: '#2C3E50',
        fontWeight: '500',
    },
    billItemBadge: {
        fontSize: 10,
        marginTop: 2,
        fontWeight: '600',
    },
    billItemPrice: {
        fontSize: 14,
        color: '#2C3E50',
    },
    billTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderTopWidth: 2,
        borderTopColor: '#2C3E50',
        marginTop: 10,
    },
    billTotalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    billTotalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    qrContainer: {
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    qrLabel: {
        fontSize: 14,
        marginBottom: 10,
        color: '#666',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 20,
    },
    modalButtonCancel: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    modalButtonTextCancel: {
        color: '#666',
        fontSize: 16,
    },
    modalButtonPrimary: {
        backgroundColor: '#E67E22',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    // Payment Modal
    paymentInfo: {
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
    },
    paymentLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    paymentTotal: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    cashInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 18,
        marginBottom: 16,
    },
    changeInfo: {
        backgroundColor: '#D5F4E6',
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
    },
    changeLabel: {
        fontSize: 14,
        color: '#27AE60',
        marginBottom: 4,
    },
    changeAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#27AE60',
    },
    // Balance Monitor Styles
    balanceMonitor: {
        backgroundColor: '#F8F9FA',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    balanceRowHighlight: {
        paddingTop: 8,
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    balanceLabel: {
        fontSize: 14,
        color: '#666',
    },
    balanceValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    paidAmount: {
        color: '#27AE60',
    },
    balanceLabelBold: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    balanceValueBold: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E67E22',
    },
});
