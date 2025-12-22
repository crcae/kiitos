import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trash2, MapPin } from 'lucide-react-native';
import { useMarketplaceCart } from '../../../src/context/MarketplaceCartContext';

export default function MarketplaceCart() {
    const router = useRouter();
    const { cartItems, removeFromCart, cartTotal, clearCart } = useMarketplaceCart();

    const handleCheckout = () => {
        // Implement Mock Payment
        Alert.alert(
            "Order Placed!",
            "Your food will be ready for pickup in 20 minutes.",
            [
                {
                    text: "Done",
                    onPress: () => {
                        clearCart();
                        router.dismissAll();
                        router.replace('/(tabs)/marketplace');
                    }
                }
            ]
        );
    };

    if (cartItems.length === 0) {
        return (
            <View className="flex-1 items-center justify-center bg-stone-50 p-5">
                <Text className="text-xl font-bold text-stone-900 mb-2">Cart is Empty</Text>
                <Text className="text-stone-500 mb-6 text-center">Looks like you haven't added anything yet.</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="bg-black px-6 py-3 rounded-xl"
                >
                    <Text className="text-white font-semibold">Start Ordering</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-stone-50">
            {/* Header */}
            <View className="bg-white px-5 pt-12 pb-4 border-b border-stone-100 flex-row items-center">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <ChevronLeft size={24} color="#1c1917" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-stone-900">Your Order</Text>
            </View>

            <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
                {/* Pickup Info */}
                <View className="bg-white p-4 rounded-xl border border-stone-100 mb-6 flex-row items-center">
                    <View className="bg-stone-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                        <MapPin size={20} color="#57534e" />
                    </View>
                    <View>
                        <Text className="font-semibold text-stone-900">Pickup in 20 min</Text>
                        <Text className="text-stone-500 text-sm">Burger & Co. • 123 Burger Lane</Text>
                    </View>
                </View>

                {/* Items */}
                <Text className="font-bold text-stone-900 mb-3 text-lg">Items</Text>
                <View className="gap-3 mb-8">
                    {cartItems.map((item, index) => (
                        <View key={`${item.id}-${index}`} className="flex-row bg-white p-4 rounded-xl border border-stone-100 items-start justify-between">
                            <View className="flex-row flex-1">
                                <View className="bg-stone-100 w-8 h-8 rounded-lg items-center justify-center mr-3">
                                    <Text className="font-bold text-stone-800">{item.quantity}x</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-semibold text-stone-900">{item.name}</Text>
                                    <Text className="text-stone-500 text-sm">${item.price}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => removeFromCart(item.id)}
                                className="p-2"
                            >
                                <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                {/* Summary */}
                <View className="border-t border-stone-200 pt-4 mb-4">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-stone-500">Subtotal</Text>
                        <Text className="font-medium text-stone-900">${cartTotal.toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-stone-500">Taxes & Fees</Text>
                        <Text className="font-medium text-stone-900">${(cartTotal * 0.1).toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between mt-2 pt-2 border-t border-stone-200">
                        <Text className="font-bold text-lg text-stone-900">Total</Text>
                        <Text className="font-bold text-lg text-stone-900">${(cartTotal * 1.1).toFixed(2)}</Text>
                    </View>
                </View>

                <View className="h-24" />
            </ScrollView>

            {/* Footer */}
            <View className="absolute bottom-0 w-full bg-white p-5 border-t border-stone-100">
                <TouchableOpacity
                    onPress={handleCheckout}
                    className="bg-stone-900 w-full py-4 rounded-xl items-center shadow-lg"
                >
                    <Text className="text-white font-bold text-lg">Pay & Pickup</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
