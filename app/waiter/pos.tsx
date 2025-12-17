import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import DigitalMenuInterface from '../../src/components/DigitalMenuInterface';
import { useAuth } from '../../src/context/AuthContext';
import { View, Text } from 'react-native';

export default function WaiterPOSScreen() {
    const { tableId, sessionId } = useLocalSearchParams<{ tableId: string, sessionId: string }>();
    const { user } = useAuth();
    const restaurantId = user?.restaurantId || 'kiitos-main'; // Fallback or strict?

    if (!restaurantId || !tableId) {
        return <View><Text>Missing restaurant or table ID</Text></View>;
    }

    return (
        <DigitalMenuInterface
            restaurantId={restaurantId}
            tableId={tableId}
            sessionId={sessionId}
            mode="waiter"
        />
    );
}


