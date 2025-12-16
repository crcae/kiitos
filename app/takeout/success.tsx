import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { CheckCircle, Clock } from 'lucide-react-native';
import { getPickupOrder } from '../../src/services/pickupOrders';
import { PickupOrder } from '../../src/types/firestore';

export default function TakeoutSuccessScreen() {
    const { orderId, restaurantId } = useLocalSearchParams<{ orderId: string; restaurantId: string }>();
    const router = useRouter();
    const [order, setOrder] = useState<PickupOrder | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (orderId && restaurantId) {
            loadOrder();
        }
    }, [orderId, restaurantId]);

    const loadOrder = async () => {
        if (!orderId || !restaurantId) return;

        const orderData = await getPickupOrder(restaurantId, orderId);
        setOrder(orderData);
        setLoading(false);
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-stone-50">
                <Text className="text-stone-600">Cargando...</Text>
            </View>
        );
    }

    if (!order) {
        return (
            <View className="flex-1 items-center justify-center bg-stone-50">
                <Text className="text-stone-600">Orden no encontrada</Text>
            </View>
        );
    }

    const scheduledDate = order.scheduled_time.toDate();

    return (
        <ScrollView className="flex-1 bg-stone-50">
            {/* Success Header */}
            <View className="bg-green-600 px-4 py-8 pt-16 items-center">
                <CheckCircle size={64} color="white" />
                <Text className="text-white text-2xl font-bold mt-4">¡Pedido Confirmado!</Text>
                <Text className="text-green-100 text-center mt-2">
                    Tu orden ha sido recibida y está siendo preparada
                </Text>
            </View>

            <View className="p-4">
                {/* Pickup Code */}
                <View className="bg-white rounded-xl border-2 border-orange-600 p-6 mb-4 items-center">
                    <Text className="text-sm text-stone-600 mb-2">Código de Recogida</Text>
                    <Text className="text-5xl font-bold text-orange-600 tracking-widest mb-4">
                        {order.pickup_code}
                    </Text>
                    <View className="bg-white p-4 rounded-xl border border-stone-200">
                        <QRCode
                            value={order.pickup_code}
                            size={200}
                        />
                    </View>
                    <Text className="text-center text-stone-500 mt-4 text-sm">
                        Muestra este código en el mostrador para recoger tu pedido
                    </Text>
                </View>

                {/* Pickup Time */}
                <View className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
                    <View className="flex-row items-center mb-2">
                        <Clock size={20} color="#EA580C" />
                        <Text className="text-lg font-semibold text-stone-900 ml-2">
                            Hora de Recogida
                        </Text>
                    </View>
                    <Text className="text-2xl font-bold text-orange-600">
                        {scheduledDate.toLocaleString('es-MX', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>
                    {order.time_option === 'asap' && (
                        <Text className="text-stone-500 mt-1 text-sm">
                            Estimado (Lo antes posible)
                        </Text>
                    )}
                </View>

                {/* Order Summary */}
                <View className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
                    <Text className="text-lg font-semibold text-stone-900 mb-3">Resumen del Pedido</Text>
                    {order.items.map((item, index) => (
                        <View key={index} className="flex-row justify-between py-2">
                            <Text className="text-stone-700">{item.quantity}x {item.name}</Text>
                            <Text className="text-stone-900 font-medium">
                                ${(item.price * item.quantity).toFixed(2)}
                            </Text>
                        </View>
                    ))}
                    <View className="border-t border-stone-200 pt-2 mt-2">
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-stone-600">Subtotal</Text>
                            <Text className="text-stone-900">${order.subtotal.toFixed(2)}</Text>
                        </View>
                        <View className="flex-row justify-between mb-1">
                            <Text className="text-stone-600">Impuestos</Text>
                            <Text className="text-stone-900">${order.tax.toFixed(2)}</Text>
                        </View>
                        <View className="flex-row justify-between mt-2 pt-2 border-t border-stone-200">
                            <Text className="text-lg font-bold text-stone-900">Total</Text>
                            <Text className="text-lg font-bold text-orange-600">
                                ${order.total.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    onPress={() => router.push('/')}
                    className="bg-orange-600 rounded-xl py-4 mb-2"
                >
                    <Text className="text-white font-bold text-center text-lg">Volver al Inicio</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push(`/takeout/${restaurantId}`)}
                    className="bg-white border border-stone-200 rounded-xl py-4"
                >
                    <Text className="text-stone-700 font-semibold text-center text-base">
                        Hacer Otro Pedido
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
