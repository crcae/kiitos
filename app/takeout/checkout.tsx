import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTakeoutCart } from '../../src/context/TakeoutCartContext';
import TimeSelector from '../../src/components/TimeSelector';
import { createPickupOrder } from '../../src/services/pickupOrders';
import { getRestaurantConfig } from '../../src/services/guestMenu';
import { RestaurantConfig, Session, OrderItem } from '../../src/types/firestore';
import PaymentInterface from '../../src/components/PaymentInterface';

export default function TakeoutCheckoutScreen() {
    const router = useRouter();
    const { items, clearCart, getCartSubtotal, getCartTax, restaurantId } = useTakeoutCart();

    const [selectedTime, setSelectedTime] = useState<Date | null>(null);
    const [timeOption, setTimeOption] = useState<'asap' | 'scheduled'>('asap');
    const [restaurantConfig, setRestaurantConfig] = useState<RestaurantConfig | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (restaurantId) {
            loadRestaurantConfig();
        }
    }, [restaurantId]);

    const loadRestaurantConfig = async () => {
        if (!restaurantId) return;
        const config = await getRestaurantConfig(restaurantId);
        setRestaurantConfig(config as RestaurantConfig);
    };

    const taxRate = restaurantConfig?.tax_rate || 0;
    const prepTime = restaurantConfig?.preparation_time_minutes || 30;
    const subtotal = getCartSubtotal();
    const tax = getCartTax(taxRate);

    // Create a mock Session object for PaymentInterface
    const mockSession: Session | null = useMemo(() => {
        if (!restaurantId) return null;

        const sessionItems: OrderItem[] = items.map(item => ({
            id: item.product_id,
            product_id: item.product_id,
            session_id: 'takeout-local',
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            modifiers: item.modifiers,
            paid_quantity: 0,
            created_by: 'guest'
        }));

        return {
            id: 'takeout-local',
            restaurantId,
            tableId: 'Takeout',
            tableName: 'Para Llevar',
            status: 'active',
            startTime: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
            items: sessionItems,
            subtotal,
            tax,
            total: subtotal + tax,
            paidAmount: 0,
            amount_paid: 0,
            remaining_amount: subtotal + tax,
            paymentStatus: 'unpaid',
            qrCode: ''
        };
    }, [items, subtotal, tax, restaurantId]);

    const handleTimeSelected = (time: Date, option: 'asap' | 'scheduled') => {
        setSelectedTime(time);
        setTimeOption(option);
    };

    const handleConfirmPayment = async (amount: number, tip: number) => {
        if (!selectedTime || !restaurantId) {
            Alert.alert('Error', 'Por favor selecciona un horario de entrega');
            throw new Error('Missing delivery time');
        }

        if (items.length === 0) {
            Alert.alert('Error', 'Tu carrito está vacío');
            throw new Error('Empty cart');
        }

        try {
            setProcessing(true);

            // SIMULATED PAYMENT FOR TESTING
            const mockPaymentIntentId = `pi_mock_${Date.now()}`;

            const orderId = await createPickupOrder(
                restaurantId,
                items,
                subtotal,
                tax,
                amount + tip,
                timeOption,
                selectedTime,
                mockPaymentIntentId,
                { name: 'Guest' },
                `Propina: $${tip.toFixed(2)}`,
                'takeout' // Force takeout per user request
            );

            // Clear cart
            await clearCart();

            // Navigate to success screen
            router.replace(`/takeout/success?orderId=${orderId}&restaurantId=${restaurantId}`);
        } catch (error) {
            console.error('Checkout error:', error);
            Alert.alert('Error', 'No se pudo procesar tu pedido. Intenta de nuevo.');
            throw error;
        } finally {
            setProcessing(false);
        }
    };

    if (!restaurantId) {
        return (
            <View className="flex-1 items-center justify-center bg-stone-50">
                <Text className="text-stone-600">Restaurante no encontrado</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-stone-50">
            {/* Header */}
            <View className="bg-white border-b border-stone-200 px-4 py-4 pt-12">
                <Text className="text-2xl font-bold text-stone-900">Checkout</Text>
                <Text className="text-sm text-stone-600 mt-1">Confirma tu pedido y horario</Text>
            </View>

            <View className="p-4">
                {/* Time Selection */}
                <View className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
                    <TimeSelector
                        restaurantId={restaurantId}
                        openingHours={restaurantConfig?.opening_hours}
                        prepTimeMinutes={prepTime}
                        onTimeSelected={handleTimeSelected}
                    />
                </View>

                {/* Unified Payment Interface */}
                {mockSession && (
                    <PaymentInterface
                        restaurantId={restaurantId}
                        localSession={mockSession}
                        hideSplitModes={true}
                        onConfirmPayment={handleConfirmPayment}
                    />
                )}

                {processing && (
                    <View className="mt-4 items-center">
                        <ActivityIndicator size="large" color="#EA580C" />
                        <Text className="text-stone-600 mt-2">Procesando pedido...</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
