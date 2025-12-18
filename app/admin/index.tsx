import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, UtensilsCrossed, LayoutGrid, Users, BarChart3 } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useRestaurant } from '../../src/hooks/useRestaurant';

export default function AdminDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { signOut } = useAuth();
    const { restaurant } = useRestaurant();
    const [refreshing, setRefreshing] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut();
            router.replace('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);

    const modules = [
        {
            title: 'Menu',
            description: 'Manage categories and products',
            icon: UtensilsCrossed,
            color: 'bg-orange-500',
            route: '/admin/menu',
        },
        {
            title: 'Tables',
            description: 'Manage tables and QR codes',
            icon: LayoutGrid,
            color: 'bg-emerald-500',
            route: '/admin/tables',
        },
        {
            title: 'Staff',
            description: 'Manage employees and access',
            icon: Users,
            color: 'bg-blue-500',
            route: '/admin/staff',
        },
        {
            title: 'Analytics',
            description: 'View reports and export data',
            icon: BarChart3,
            color: 'bg-purple-500',
            route: '/admin/dashboard',
        }
    ];

    return (
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-slate-800 bg-slate-900">
                <View>
                    <Text className="text-sm text-orange-500 font-bold uppercase tracking-wider mb-1">
                        {restaurant?.name || restaurant?.id || 'Cargando...'}
                    </Text>
                    <Text className="text-2xl font-bold text-white">Dashboard</Text>
                    <Text className="text-slate-400">Bienvenido de nuevo</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                    <LogOut size={20} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#fff"
                    />
                }
            >
                <Text className="text-3xl font-bold text-white mb-2">Admin Dashboard</Text>
                <Text className="text-slate-400 mb-8">Manage your restaurant settings</Text>

                <View className="flex-row flex-wrap gap-4">
                    {modules.map((mod) => (
                        <TouchableOpacity
                            key={mod.title}
                            onPress={() => router.push(mod.route as any)}
                            className="w-full md:w-[48%] bg-slate-800 p-6 rounded-2xl border border-slate-700 active:bg-slate-700"
                        >
                            <View className={`w-12 h-12 rounded-lg ${mod.color} items-center justify-center mb-4`}>
                                <mod.icon color="white" size={24} />
                            </View>
                            <Text className="text-xl font-bold text-white mb-1">{mod.title}</Text>
                            <Text className="text-slate-400 text-sm">{mod.description}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
