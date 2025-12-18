import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, CreditCard, Link as LinkIcon, CheckCircle2, XCircle } from 'lucide-react-native';
import { getPaymentsList } from '../../../src/services/adminAnalytics';
import { useAuth } from '../../../src/context/AuthContext';
import DataTable, { Column } from '../../../src/components/DataTable';
import { Payment } from '../../../src/types/firestore';

export default function PaymentsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<Payment[]>([]);

    const fetchData = async () => {
        if (!user?.restaurantId) return;
        setLoading(true);
        try {
            const data = await getPaymentsList(user.restaurantId);
            setPayments(data);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.restaurantId]);

    const columns: Column<Payment>[] = [
        {
            key: 'createdAt',
            label: 'Fecha',
            sortable: true,
            flex: 1.5,
            render: (item) => (
                <Text className="text-slate-400 text-[10px]">
                    {item.createdAt?.toDate().toLocaleString()}
                </Text>
            ),
            exportValue: (item) => item.createdAt?.toDate().toISOString() || ''
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: true,
            align: 'right',
            width: 100,
            render: (item) => (
                <Text className="text-white font-bold text-xs">
                    ${typeof item.amount === 'number' ? item.amount.toFixed(2) : '0.00'}
                </Text>
            ),
            exportValue: (item) => (item.amount || 0).toString()
        },
        {
            key: 'tip',
            label: 'Propina',
            sortable: true,
            align: 'right',
            width: 100,
            render: (item) => (
                <Text className="text-blue-400 font-medium text-xs">
                    ${typeof item.tip === 'number' ? item.tip.toFixed(2) : '0.00'}
                </Text>
            ),
            exportValue: (item) => (item.tip || 0).toString()
        },
        {
            key: 'method',
            label: 'Método',
            flex: 1,
            render: (item) => (
                <View className="bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                    <Text className="text-slate-300 capitalize text-[10px] font-bold">
                        {typeof item.method === 'string' ? item.method : 'N/A'}
                    </Text>
                </View>
            ),
            exportValue: (item) => typeof item.method === 'string' ? item.method : 'N/A'
        },
        {
            key: 'status',
            label: 'Estado',
            align: 'center',
            width: 70,
            render: (item) => (
                <CheckCircle2 size={16} color="#10b981" />
            ),
            exportValue: () => 'Exitoso'
        },
        {
            key: 'sessionId',
            label: 'Sesión',
            align: 'right',
            width: 110,
            render: (item) => (
                <TouchableOpacity
                    onPress={() => router.push(`/admin/bills/${item.sessionId}` as any)}
                    className="flex-row items-center justify-end"
                >
                    <Text className="text-indigo-400 text-[10px] font-mono mr-1">#{item.sessionId.slice(-6).toUpperCase()}</Text>
                    <LinkIcon size={12} color="#6366f1" />
                </TouchableOpacity>
            ),
            exportValue: (item) => item.sessionId
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
                        <Text className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Finanzas</Text>
                        <Text className="text-3xl font-black text-white">Transacciones</Text>
                    </View>
                </View>
                <View className="bg-emerald-600/10 w-12 h-12 rounded-2xl items-center justify-center border border-emerald-600/20">
                    <CreditCard size={24} color="#10b981" />
                </View>
            </View>

            <View className="flex-1 p-6">
                <DataTable
                    data={payments}
                    columns={columns}
                    isLoading={loading}
                    emptyMessage="No se encontraron pagos"
                    title="reporte_pagos"
                />
            </View>
        </SafeAreaView>
    );
}
