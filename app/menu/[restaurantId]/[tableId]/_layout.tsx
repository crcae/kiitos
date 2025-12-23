import React from 'react';
import { Tabs, useLocalSearchParams } from 'expo-router';
import { ShoppingBag, FileText, Utensils } from 'lucide-react-native';
import { colors } from '../../../../src/styles/theme';

export default function MenuTabsLayout() {
    const { restaurantId, tableId } = useLocalSearchParams();

    // Ideally, we might want to fetch branding color here to style the tabs?
    // For now, default styling.

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.eerieBlack,
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    paddingBottom: 5,
                    paddingTop: 5,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginBottom: 5,
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
