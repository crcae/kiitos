import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PaymentInterface from '../../src/components/PaymentInterface';
import { colors } from '../../src/styles/theme';

type SplitMode = 'full' | 'items' | 'equal' | 'custom';

export default function ClientPayScreen() {
    const { id, restaurantId, mode } = useLocalSearchParams<{ id: string, restaurantId: string, mode?: 'guest' | 'waiter' }>();
    const router = useRouter();

    if (!id || !restaurantId) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Error: Faltan parámetros</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.oatCream }}>
            <PaymentInterface
                sessionId={id}
                restaurantId={restaurantId}
                onClose={() => router.back()}
                mode={mode as 'guest' | 'waiter'}
            />
        </View>
    );
}


