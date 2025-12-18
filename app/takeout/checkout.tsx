import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useTakeoutCart } from '../../src/context/TakeoutCartContext';
import TimeSelector from '../../src/components/TimeSelector';
import { createPickupOrder } from '../../src/services/pickupOrders';
import { getRestaurantConfig } from '../../src/services/guestMenu';
import { RestaurantConfig } from '../../src/types/firestore';

export default function TakeoutCheckoutScreen() {
    const router = useRouter();
    const { items, removeItem, updateQuantity, clearCart, getCartSubtotal, getCartTax, restaurantId } = useTakeoutCart();

    const [selectedTime, setSelectedTime] = useState<Date | null>(null);
    const [timeOption, setTimeOption] = useState<'asap' | 'scheduled'>('asap');
    const [restaurantConfig, setRestaurantConfig] = useState<RestaurantConfig | null>(null);
    const [processing, setProcessing] = useState(false);

    // New fields
    // const [customerName, setCustomerName] = useState(''); // Removed per request
    const [tipPercentage, setTipPercentage] = useState<number | null>(null);
    const [customTip, setCustomTip] = useState('');
    const [diningOption, setDiningOption] = useState<'takeout' | 'eat_in'>('takeout');

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

    // Calculate Tip
    let tipAmount = 0;
    if (tipPercentage !== null) {
        tipAmount = subtotal * (tipPercentage / 100);
    } else if (customTip) {
        tipAmount = parseFloat(customTip) || 0;
    }

    const total = subtotal + tax + tipAmount;

    const handleTimeSelected = (time: Date, option: 'asap' | 'scheduled') => {
        setSelectedTime(time);
        setTimeOption(option);
    };

    const handleCheckout = async () => {


        if (!selectedTime || !restaurantId) {
            Alert.alert('Error', 'Por favor selecciona un horario');
            return;
        }

        if (items.length === 0) {
            Alert.alert('Error', 'Tu carrito está vacío');
            return;
        }

        try {
            setProcessing(true);

            // SIMULATED PAYMENT FOR TESTING
            // In a real scenario, we would confirm Stripe payment here.
            // For now, we simulate success immediately.
            Alert.alert('Modo Prueba', 'Pago Simulado Exitoso');

            const mockPaymentIntentId = `pi_mock_${Date.now()}`;

            const orderId = await createPickupOrder(
                restaurantId,
                items,
                subtotal,
                tax,
                total,
                timeOption,
                selectedTime,
                mockPaymentIntentId,
                { name: 'Guest' }, // Default name since input removed
                `Propina: $${tipAmount.toFixed(2)}`, // Add tip to notes for now
                diningOption // Pass dining option
            );

            // Clear cart
            await clearCart();

            // Navigate to success screen
            router.replace(`/takeout/success?orderId=${orderId}&restaurantId=${restaurantId}`);
        } catch (error) {
            console.error('Checkout error:', error);
            Alert.alert('Error', 'No se pudo procesar tu pedido. Intenta de nuevo.');
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
                <Text className="text-sm text-stone-600 mt-1">Confirma tu pedido</Text>
            </View>

            <View className="p-4">




                {/* Cart Items */}
                <View className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
                    <Text className="text-lg font-semibold text-stone-900 mb-4">Tu Pedido</Text>
                    {items.map((item, idx) => (
                        <View key={`${item.product_id}_${idx}`} className="flex-row items-center justify-between py-3 border-b border-stone-100">
                            <View className="flex-1">
                                <Text className="text-base font-medium text-stone-900">{item.name}</Text>
                                {item.modifiers && item.modifiers.length > 0 && (
                                    <View className="mt-1">
                                        {item.modifiers.map((mod, mIdx) => (
                                            <Text key={mIdx} className="text-xs text-stone-500">
                                                + {mod.name} {mod.price > 0 ? `($${mod.price.toFixed(2)})` : ''}
                                            </Text>
                                        ))}
                                    </View>
                                )}
                                <Text className="text-sm text-stone-600 mt-1">
                                    ${(item.price + (item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0)).toFixed(2)}
                                </Text>
                            </View>
                            <View className="flex-row items-center">
                                <TouchableOpacity
                                    onPress={() => updateQuantity(item.product_id, item.quantity - 1)}
                                    className="w-8 h-8 bg-stone-100 rounded-lg items-center justify-center"
                                >
                                    <Text className="text-stone-700 font-bold">-</Text>
                                </TouchableOpacity>
                                <Text className="mx-3 text-base font-semibold">{item.quantity}</Text>
                                <TouchableOpacity
                                    onPress={() => updateQuantity(item.product_id, item.quantity + 1)}
                                    className="w-8 h-8 bg-stone-100 rounded-lg items-center justify-center"
                                >
                                    <Text className="text-stone-700 font-bold">+</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => removeItem(item.product_id)}
                                    className="ml-3"
                                >
                                    <Trash2 size={20} color="#DC2626" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Time Selection */}
                <View className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
                    <TimeSelector
                        restaurantId={restaurantId}
                        openingHours={restaurantConfig?.opening_hours}
                        prepTimeMinutes={prepTime}
                        onTimeSelected={handleTimeSelected}
                    />
                </View>

                {/* Dining Option Selector - Moved here */}
                <View className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
                    <Text className="text-lg font-semibold text-stone-900 mb-3">¿Para dónde es?</Text>
                    <View className="flex-row bg-stone-100 p-1 rounded-xl">
                        <TouchableOpacity
                            className={`flex-1 py-3 rounded-lg items-center ${diningOption === 'takeout' ? 'bg-white shadow-sm border border-stone-200' : ''}`}
                            onPress={() => setDiningOption('takeout')}
                        >
                            <Text className={`font-semibold ${diningOption === 'takeout' ? 'text-stone-900' : 'text-stone-500'}`}>
                                Para Llevar
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 py-3 rounded-lg items-center ${diningOption === 'eat_in' ? 'bg-white shadow-sm border border-stone-200' : ''}`}
                            onPress={() => setDiningOption('eat_in')}
                        >
                            <Text className={`font-semibold ${diningOption === 'eat_in' ? 'text-stone-900' : 'text-stone-500'}`}>
                                Comer Aquí
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tip Selector */}
                <View className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
                    <Text className="text-lg font-semibold text-stone-900 mb-3">Propina</Text>
                    <View className="flex-row gap-2 mb-3">
                        {[10, 15, 20].map((pct) => (
                            <TouchableOpacity
                                key={pct}
                                onPress={() => { setTipPercentage(pct); setCustomTip(''); }}
                                className={`flex-1 py-3 rounded-lg border ${tipPercentage === pct
                                    ? 'bg-orange-600 border-orange-600'
                                    : 'bg-white border-stone-300'
                                    }`}
                            >
                                <Text className={`text-center font-bold ${tipPercentage === pct ? 'text-white' : 'text-stone-700'
                                    }`}>
                                    {pct}%
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View className="flex-row items-center">
                        <Text className="text-stone-600 mr-2">Otra:</Text>
                        <TextInput
                            className="bg-stone-50 border border-stone-300 rounded-lg p-2 flex-1"
                            placeholder="$0.00"
                            keyboardType="numeric"
                            value={customTip}
                            onChangeText={(text) => {
                                setCustomTip(text);
                                setTipPercentage(null);
                            }}
                        />
                    </View>
                </View>

                {/* Order Summary */}
                <View className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
                    <Text className="text-lg font-semibold text-stone-900 mb-3">Resumen</Text>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-stone-600">Subtotal</Text>
                        <Text className="text-stone-900 font-medium">${subtotal.toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-stone-600">Impuestos ({taxRate}%)</Text>
                        <Text className="text-stone-900 font-medium">${tax.toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-stone-600">Propina</Text>
                        <Text className="text-stone-900 font-medium">${tipAmount.toFixed(2)}</Text>
                    </View>
                    <View className="border-t border-stone-200 pt-2 mt-2">
                        <View className="flex-row justify-between">
                            <Text className="text-lg font-bold text-stone-900">Total</Text>
                            <Text className="text-lg font-bold text-orange-600">${total.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Checkout Button */}
                <TouchableOpacity
                    onPress={handleCheckout}
                    disabled={processing}
                    className={`rounded-xl py-4 ${processing
                        ? 'bg-stone-300'
                        : 'bg-orange-600'
                        }`}
                >
                    {processing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-center text-lg">
                            Pagar ${total.toFixed(2)}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
