import React, { useEffect } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTakeoutCart } from '../../src/context/TakeoutCartContext';
import DigitalMenuInterface from '../../src/components/DigitalMenuInterface';

export default function TakeoutMenuScreen() {
    const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const { initializeCart, addItem, clearCart } = useTakeoutCart();

    useEffect(() => {
        if (restaurantId) {
            initializeCart(restaurantId);
        }
    }, [restaurantId]);

    const handleCheckout = async (cartItems: any[]) => {
        if (!restaurantId) return;

        // Clear existing cart to avoid duplicates if they came back
        await clearCart();

        // Sync DigitalMenuInterface cart to TakeoutCartContext
        for (const item of cartItems) {
            await addItem(item.product, item.quantity, item.modifiers);
        }

        // Navigate to checkout
        router.push('/takeout/checkout');
    };

    if (!restaurantId) return null;

    const canGoBack = navigation.canGoBack();

    return (
        <View style={{ flex: 1 }}>
            {/* Conditional Back Button */}
            {canGoBack && (
                <View style={{
                    position: 'absolute',
                    top: Platform.OS === 'ios' ? 48 : 20,
                    left: 16,
                    zIndex: 100
                }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{
                            backgroundColor: 'white',
                            padding: 10,
                            borderRadius: 24,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 6,
                            elevation: 4
                        }}
                    >
                        <ChevronLeft color="#1c1917" size={24} />
                    </TouchableOpacity>
                </View>
            )}

            <DigitalMenuInterface
                restaurantId={restaurantId}
                mode="takeout"
                onCheckout={handleCheckout}
            />
        </View>
    );
}
