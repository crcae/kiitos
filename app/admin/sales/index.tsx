import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, BarChart3, TrendingUp, DollarSign } from 'lucide-react-native';
import { getBills } from '../../../src/services/adminAnalytics';
import { useAuth } from '../../../src/context/AuthContext';
import DataTable, { Column } from '../../../src/components/DataTable';
import { Session } from '../../../src/types/firestore';

interface ProductSale {
    id: string;
    product_id: string;
    name: string;
    category: string;
    unitsSold: number;
    totalRevenue: number;
}

export default function SalesByProductScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<Session[]>([]);

    const fetchData = async () => {
        if (!user?.restaurantId) return;
        setLoading(true);
        try {
            const data = await getBills(user.restaurantId);
            setSessions(data);
        } catch (error) {
            console.error('Error fetching sales data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.restaurantId]);

    const productSales = useMemo(() => {
        const stats = new Map<string, ProductSale>();

        sessions.forEach(session => {
            (session.items || []).forEach(item => {
                const existing = stats.get(item.product_id);
                if (existing) {
                    existing.unitsSold += item.quantity;
                    existing.totalRevenue += (item.price * item.quantity);
                } else {
                    stats.set(item.product_id, {
                        id: item.product_id,
                        product_id: item.product_id,
                        name: item.name,
                        category: (item as any).category || 'General',
                        unitsSold: item.quantity,
                        totalRevenue: item.price * item.quantity
                    });
                }
            });
        });

        return Array.from(stats.values());
    }, [sessions]);

    const columns: Column<ProductSale>[] = [
        {
            key: 'name',
            label: 'Producto',
            sortable: true,
            flex: 2,
            render: (item) => (
                <View>
                    <Text className="text-white font-bold text-xs">{item.name}</Text>
                    <Text className="text-slate-500 text-[10px] uppercase font-black">{item.category}</Text>
                </View>
            )
        },
        {
            key: 'unitsSold',
            label: 'Vendidos',
            sortable: true,
            align: 'center',
            width: 100,
            render: (item) => (
                <View className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    <Text className="text-white font-black text-xs">{item.unitsSold}</Text>
                </View>
            ),
            exportValue: (item) => item.unitsSold.toString()
        },
        {
            key: 'totalRevenue',
            label: 'Ingresos',
            sortable: true,
            align: 'right',
            width: 120,
            render: (item) => (
                <Text className="text-emerald-400 font-black text-xs">${item.totalRevenue.toFixed(2)}</Text>
            ),
            exportValue: (item) => item.totalRevenue.toString()
        }
    ];

    return (
        <SafeAreaView className="flex-1 bg-slate-950">
            {/* Header */}
            <View className="px-6 py-6 flex-row justify-between items-center bg-slate-950 border-b border-slate-900">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-5 bg-slate-900 w-10 h-10 rounded-xl border border-slate-800 items-center justify-center">
                        <ChevronLeft size={20} color="#94a3b8" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-1">Analítica</Text>
                        <Text className="text-3xl font-black text-white">Ventas por Producto</Text>
                    </View>
                </View>
                <View className="bg-orange-600/10 w-12 h-12 rounded-2xl items-center justify-center border border-orange-600/20">
                    <BarChart3 size={24} color="#f97316" />
                </View>
            </View>

            <View className="flex-1 p-6">
                <DataTable
                    data={productSales}
                    columns={columns}
                    isLoading={loading}
                    searchKey="name"
                    searchPlaceholder="Buscar producto..."
                    title="reporte_ventas_producto"
                />
            </View>
        </SafeAreaView>
    );
}
