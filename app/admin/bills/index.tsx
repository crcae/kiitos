import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ReceiptText } from 'lucide-react-native';
import { getBills } from '../../../src/services/adminAnalytics';
import { getRestaurant } from '../../../src/services/restaurant';
import { useAuth } from '../../../src/context/AuthContext';
import DataTable, { Column } from '../../../src/components/DataTable';
import { Session } from '../../../src/types/firestore';

export default function BillsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [bills, setBills] = useState<Session[]>([]);
    const [restaurantName, setRestaurantName] = useState('');

    const fetchData = async () => {
        if (!user?.restaurantId) return;
        setLoading(true);
        try {
            const [data, restaurant] = await Promise.all([
                getBills(user.restaurantId),
                getRestaurant(user.restaurantId)
            ]);
            setBills(data);
            if (restaurant?.name) {
                setRestaurantName(restaurant.name.replace(/\s+/g, '_'));
            }
        } catch (error) {
            console.error('Error fetching bills:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.restaurantId]);

    const columns: Column<any>[] = [
        {
            key: 'id',
            label: 'ID',
            width: 90,
            render: (item) => (
                <Text className="text-indigo-400 font-mono text-[10px]">#{item.id.slice(-6).toUpperCase()}</Text>
            ),
            exportValue: (item) => item.id
        },
        {
            key: 'startTime',
            label: 'Fecha',
            sortable: true,
            flex: 1.5,
            render: (item) => (
                <Text className="text-slate-300 text-[10px]">
                    {item.startTime?.toDate().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </Text>
            ),
            exportValue: (item) => item.startTime?.toDate().toISOString() || ''
        },
        {
            key: 'tableName',
            label: 'Mesa',
            sortable: true,
            flex: 1,
            render: (item) => (
                <Text className="text-white font-medium text-xs">{item.tableName || 'Takeout'}</Text>
            )
        },
        {
            key: 'total',
            label: 'Subtotal',
            sortable: true,
            align: 'right',
            width: 90,
            render: (item) => (
                <Text className="text-slate-400 font-medium text-xs">${(item.total || 0).toFixed(2)}</Text>
            ),
            exportValue: (item) => (item.total || 0).toString()
        },
        {
            key: 'tips',
            label: 'Propina',
            sortable: true,
            align: 'right',
            width: 80,
            render: (item) => (
                <Text className="text-blue-400 font-medium text-xs">${(item.tips || 0).toFixed(2)}</Text>
            ),
            exportValue: (item) => (item.tips || 0).toString()
        },
        {
            key: 'grandTotal',
            label: 'Total',
            sortable: true,
            align: 'right',
            width: 100,
            render: (item) => (
                <Text className="text-emerald-400 font-bold text-xs">${(item.grandTotal || 0).toFixed(2)}</Text>
            ),
            exportValue: (item) => (item.grandTotal || 0).toString()
        }
    ];

    return (
        <SafeAreaView className="flex-1 bg-slate-950">
            {/* Header */}
            <View className="px-6 py-6 flex-row justify-between items-center bg-slate-950 border-b border-slate-900">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 20, backgroundColor: '#0f172a', width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronLeft size={20} color="#94a3b8" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-1">Analítica</Text>
                        <Text className="text-3xl font-black text-white">Historial de Cuentas</Text>
                    </View>
                </View>
                <View style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                    <ReceiptText size={24} color="#6366f1" />
                </View>
            </View>

            <View className="flex-1 p-6">
                <DataTable
                    data={bills}
                    columns={columns}
                    isLoading={loading}
                    searchKey="id"
                    searchPlaceholder="Buscar por ID..."
                    title={restaurantName ? `${restaurantName}_bills` : 'kiitos_bills'}
                    onRowPress={(item) => router.push(`/admin/bills/${item.id}` as any)}
                />
            </View>
        </SafeAreaView>
    );
}
