import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UtensilsCrossed, LayoutGrid, Users } from 'lucide-react-native';

export default function AdminDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

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
        }
    ];

    return (
        <ScrollView className="flex-1 bg-slate-900" contentContainerStyle={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
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
    );
}
