import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Calendar, User, Hash, CreditCard, ShoppingBag } from 'lucide-react-native';
import { getBillDetail } from '../../../src/services/adminAnalytics';
import { useAuth } from '../../../src/context/AuthContext';
import { Session, Payment } from '../../../src/types/firestore';

export default function BillDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [bill, setBill] = useState<Session | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.restaurantId || !id) return;
            try {
                const data = await getBillDetail(user.restaurantId, id as string);
                setBill(data.session);
                setPayments(data.payments);
            } catch (error) {
                console.error('Error fetching bill detail:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user?.restaurantId, id]);

    if (loading) {
        return (
            <View className="flex-1 bg-slate-900 items-center justify-center">
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    if (!bill) {
        return (
            <View className="flex-1 bg-slate-900 items-center justify-center p-6">
                <Text className="text-white text-lg font-bold">Cuenta no encontrada</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-slate-800 px-6 py-2 rounded-xl">
                    <Text className="text-slate-300">Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-900">
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center border-b border-slate-800">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-slate-800 p-2 rounded-lg border border-slate-700">
                    <ChevronLeft size={20} color="#94a3b8" />
                </TouchableOpacity>
                <View>
                    <Text className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">Detalle de Cuenta</Text>
                    <Text className="text-xl font-bold text-white">#{id?.toString().slice(-6).toUpperCase()}</Text>
                </View>
            </View>

            <ScrollView className="flex-1 p-6">
                {/* Summary Card */}
                <View className="bg-slate-800 rounded-3xl border border-slate-700 p-6 mb-6">
                    <View className="flex-row justify-between items-start mb-6">
                        <View className="flex-1">
                            <Text className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Total (con propina)</Text>
                            <Text className="text-4xl font-black text-white">${((bill as any).grandTotal || 0).toFixed(2)}</Text>
                        </View>
                        <View className={`px-3 py-1 rounded-xl ${bill.paymentStatus === 'paid' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-orange-500/20 border border-orange-500/30'}`}>
                            <Text className={`text-xs font-bold ${bill.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                {bill.paymentStatus === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row gap-4 mb-6">
                        <View className="flex-1 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                            <Text className="text-slate-500 text-[9px] uppercase font-bold mb-1">Subtotal (sin propina)</Text>
                            <Text className="text-white text-lg font-bold">${(bill.total || 0).toFixed(2)}</Text>
                        </View>
                        <View className="flex-1 bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50">
                            <Text className="text-blue-500 text-[9px] uppercase font-bold mb-1">Propina Total</Text>
                            <Text className="text-blue-400 text-lg font-bold">${((bill as any).tips || 0).toFixed(2)}</Text>
                        </View>
                    </View>

                    <View className="h-[1px] bg-slate-700/50 mb-6" />

                    <View className="flex-row flex-wrap gap-y-4">
                        <View className="w-1/2">
                            <View className="flex-row items-center mb-1">
                                <Calendar size={12} color="#94a3b8" className="mr-1.5" />
                                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Fecha</Text>
                            </View>
                            <Text className="text-slate-200 font-medium">{bill.startTime?.toDate().toLocaleString()}</Text>
                        </View>
                        <View className="w-1/2">
                            <View className="flex-row items-center mb-1">
                                <Hash size={12} color="#94a3b8" className="mr-1.5" />
                                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Mesa</Text>
                            </View>
                            <Text className="text-slate-200 font-medium">{bill.tableName || 'Takeout'}</Text>
                        </View>
                    </View>
                </View>

                {/* Items Consumed */}
                <View className="mb-6">
                    <View className="flex-row items-center mb-4 px-1">
                        <ShoppingBag size={18} color="#6366f1" className="mr-2" />
                        <Text className="text-lg font-bold text-white">Productos</Text>
                    </View>
                    <View className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                        {(bill.items || []).map((item, index) => (
                            <View key={index} className="px-5 py-4 border-b border-slate-700/50 flex-row justify-between items-center">
                                <View className="flex-1">
                                    <Text className="text-white font-medium">{item.name}</Text>
                                    <Text className="text-slate-500 text-xs">{item.quantity} x ${item.price.toFixed(2)}</Text>
                                </View>
                                <Text className="text-white font-bold">${(item.quantity * item.price).toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Payments */}
                <View className="mb-10">
                    <View className="flex-row items-center mb-4 px-1">
                        <CreditCard size={18} color="#10b981" className="mr-2" />
                        <Text className="text-lg font-bold text-white">Transacciones</Text>
                    </View>
                    {payments.length > 0 ? (
                        <View className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                            {payments.map((p, index) => (
                                <View key={p.id} className="px-5 py-4 border-b border-slate-700/50">
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className="text-white font-bold capitalize">{p.method}</Text>
                                        <Text className="text-emerald-400 font-black">${p.amount.toFixed(2)}</Text>
                                    </View>
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-slate-500 text-[10px]">{p.createdAt?.toDate().toLocaleTimeString()}</Text>
                                        {p.tip ? <Text className="text-blue-400 text-[10px] font-bold">+ ${p.tip.toFixed(2)} Propina</Text> : null}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View className="bg-slate-800/50 rounded-2xl border border-dashed border-slate-700 p-10 items-center">
                            <Text className="text-slate-500 italic">No hay pagos registrados</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
