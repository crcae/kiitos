import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import DigitalMenuInterface from '../../../src/components/DigitalMenuInterface';

export default function DigitalMenuScreen() {
    const { restaurantId, tableId } = useLocalSearchParams<{ restaurantId: string; tableId: string }>();

    if (!restaurantId || !tableId) {
        return null;
    }

    return (
        <DigitalMenuInterface
            restaurantId={restaurantId}
            tableId={tableId}
            mode="guest"
        />
    );
}
