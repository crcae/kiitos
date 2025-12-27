import React, { useEffect, useState } from 'react';
import { Tabs, useLocalSearchParams } from 'expo-router';
import { ShoppingBag, FileText, Utensils } from 'lucide-react-native';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../../src/styles/theme';
import { subscribeToRestaurantConfig } from '../../../../src/services/menu';

export default function MenuTabsLayout() {
    const { restaurantId, tableId } = useLocalSearchParams<{ restaurantId: string; tableId: string }>();
    const insets = useSafeAreaInsets();
    const [primaryColor, setPrimaryColor] = useState(colors.castIron);

    useEffect(() => {
        if (!restaurantId) return;
        const unsub = subscribeToRestaurantConfig(restaurantId, (config) => {
            if (config.branding?.primary_color) {
                setPrimaryColor(config.branding.primary_color);
            }
        });
        return () => unsub();
    }, [restaurantId]);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: primaryColor,
                tabBarInactiveTintColor: '#94a3b8',
                tabBarShowLabel: true,
                tabBarLabelPosition: 'below-icon',
                tabBarStyle: {
                    backgroundColor: 'white',
                    borderTopColor: '#f1f5f9',
                    borderTopWidth: 1,
                    height: 75 + insets.bottom,
                    paddingBottom: insets.bottom + 5,
                    paddingTop: 8,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarItemStyle: {
                    // paddingBottom: 5, // Removing item padding to let flexbox handle it
                    height: 75,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginBottom: 5,
                    marginTop: 2,
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Menu',
                    tabBarIcon: ({ color }) => <Utensils size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="bill"
                options={{
                    title: 'View Bill',
                    tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
