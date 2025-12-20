import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTakeoutCart } from '../../src/context/TakeoutCartContext';
import DigitalMenuInterface from '../../src/components/DigitalMenuInterface';

export default function TakeoutMenuScreen() {
    const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
    const router = useRouter();
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

    return (
        <View style={{ flex: 1 }}>
            <DigitalMenuInterface
                restaurantId={restaurantId}
                mode="takeout"
                onCheckout={handleCheckout}
            />
        </View>
    );
}
