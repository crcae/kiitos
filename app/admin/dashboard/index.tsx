import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
    ChevronLeft,
    Download,
    Calendar,
    TrendingUp,
    Users,
    DollarSign,
    ShoppingBag,
    Table as TableIcon,
    RefreshCw
} from 'lucide-react-native';
import { useRestaurant } from '../../../src/hooks/useRestaurant';
import {
    getSessionsInDateRange,
    calculateDashboardMetrics,
    aggregateProductMetrics,
    formatSessionsForCSV,
    DashboardMetrics,
    ProductMetric
} from '../../../src/services/analytics';
import { generateCSV } from '../../../src/utils/csvExport';
import { Session } from '../../../src/types/firestore';

export default function AnalyticsDashboard() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { restaurant } = useRestaurant();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [topProducts, setTopProducts] = useState<ProductMetric[]>([]);

    // Date range state (default to today)
    const [startDate, setStartDate] = useState(new Date(new Date().setHours(0, 0, 0, 0)));
    const [endDate, setEndDate] = useState(new Date(new Date().setHours(23, 59, 59, 999)));
    const [dateLabel, setDateLabel] = useState('Hoy');

    const fetchData = useCallback(async () => {
        if (!restaurant?.id) return;

        setLoading(true);
        try {
            const fetchedSessions = await getSessionsInDateRange(restaurant.id, startDate, endDate);
            setSessions(fetchedSessions);

            const calculatedMetrics = await calculateDashboardMetrics(restaurant.id, fetchedSessions);
            setMetrics(calculatedMetrics);

            const aggregatedProducts = aggregateProductMetrics(fetchedSessions);
            setTopProducts(aggregatedProducts);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [restaurant?.id, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleExportCSV = () => {
        if (sessions.length === 0) return;

        const csvData = formatSessionsForCSV(sessions);
        const headers = [
            { key: 'id', label: 'ID Sesión' },
            { key: 'table', label: 'Mesa' },
            { key: 'startTime', label: 'Inicio' },
            { key: 'endTime', label: 'Fin' },
            { key: 'status', label: 'Estado' },
            { key: 'total', label: 'Total' },
            { key: 'paid', label: 'Pagado' },
            { key: 'paymentStatus', label: 'Estado Pago' }
        ];

        const csvString = generateCSV(csvData, headers);

        if (Platform.OS === 'web') {
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `reporte_ventas_${dateLabel.toLowerCase()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Mobile export would need a different approach (e.g., sharing)
            alert('Exportación CSV disponible en versión web');
        }
    };

    const setDateRange = (range: 'today' | 'week' | 'month') => {
        const now = new Date();
        let start = new Date();
        let label = '';

        if (range === 'today') {
            start = new Date(now.setHours(0, 0, 0, 0));
            label = 'Hoy';
        } else if (range === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            start = new Date(now.setDate(diff));
            start.setHours(0, 0, 0, 0);
            label = 'Esta Semana';
        } else if (range === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            label = 'Este Mes';
        }

        setStartDate(start);
        setEndDate(new Date());
        setDateLabel(label);
    };

    const MetricCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
        <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700 w-[48%] mb-4">
            <View className={`w-10 h-10 rounded-lg ${color} items-center justify-center mb-3`}>
                <Icon color="white" size={20} />
            </View>
            <Text className="text-slate-400 text-xs mb-1 uppercase font-bold tracking-wider">{title}</Text>
            <Text className="text-white text-xl font-bold">{value}</Text>
            {subtitle && <Text className="text-slate-500 text-[10px] mt-1">{subtitle}</Text>}
        </View>
    );

    return (
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-slate-800 bg-slate-900">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-slate-800 p-2 rounded-lg border border-slate-700">
                        <ChevronLeft size={20} color="#94a3b8" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-sm text-purple-500 font-bold uppercase tracking-wider mb-1">Reportes</Text>
                        <Text className="text-2xl font-bold text-white">Analytics</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleExportCSV}
                    disabled={sessions.length === 0}
                    className={`p-2 rounded-lg border ${sessions.length === 0 ? 'bg-slate-800 border-slate-800 opacity-50' : 'bg-slate-800 border-slate-700'}`}
                >
                    <Download size={20} color={sessions.length === 0 ? '#475569' : '#94a3b8'} />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
            >
                {/* Date Filter */}
                <View className="flex-row justify-between items-center mb-6">
                    <View className="flex-row bg-slate-800 rounded-xl p-1 border border-slate-700">
                        <TouchableOpacity
                            onPress={() => setDateRange('today')}
                            className={`px-4 py-2 rounded-lg ${dateLabel === 'Hoy' ? 'bg-purple-600' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${dateLabel === 'Hoy' ? 'text-white' : 'text-slate-400'}`}>Hoy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setDateRange('week')}
                            className={`px-4 py-2 rounded-lg ${dateLabel === 'Esta Semana' ? 'bg-purple-600' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${dateLabel === 'Esta Semana' ? 'text-white' : 'text-slate-400'}`}>Semana</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setDateRange('month')}
                            className={`px-4 py-2 rounded-lg ${dateLabel === 'Este Mes' ? 'bg-purple-600' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${dateLabel === 'Este Mes' ? 'text-white' : 'text-slate-400'}`}>Mes</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center bg-slate-800 px-3 py-2 rounded-xl border border-slate-700">
                        <Calendar size={16} color="#94a3b8" className="mr-2" />
                        <Text className="text-slate-300 text-xs font-medium">{dateLabel}</Text>
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <ActivityIndicator size="large" color="#a855f7" />
                        <Text className="text-slate-400 mt-4">Cargando datos...</Text>
                    </View>
                ) : (
                    <>
                        {/* Summary Metrics */}
                        <View className="flex-row flex-wrap justify-between">
                            <MetricCard
                                title="Ingresos Totales"
                                value={`$${metrics?.totalRevenue.toFixed(2) || '0.00'}`}
                                icon={DollarSign}
                                color="bg-emerald-500"
                                subtitle={`Propinas: $${metrics?.totalTips.toFixed(2) || '0.00'}`}
                            />
                            <MetricCard
                                title="Órdenes"
                                value={metrics?.totalOrders || 0}
                                icon={ShoppingBag}
                                color="bg-blue-500"
                                subtitle={`Promedio: $${metrics?.avgOrderValue.toFixed(2) || '0.00'}`}
                            />
                            <MetricCard
                                title="Mesas Activas"
                                value={metrics?.activeTables || 0}
                                icon={TableIcon}
                                color="bg-orange-500"
                            />
                            <MetricCard
                                title="Clientes"
                                value={metrics?.totalGuests || 0}
                                icon={Users}
                                color="bg-purple-500"
                            />
                        </View>

                        {/* Top Products Table */}
                        <View className="mt-6 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                            <View className="px-5 py-4 border-b border-slate-700 flex-row justify-between items-center bg-slate-800/50">
                                <Text className="text-white font-bold text-lg">Productos Top</Text>
                                <TrendingUp size={18} color="#a855f7" />
                            </View>

                            {/* Table Header */}
                            <View className="flex-row px-5 py-3 border-b border-slate-700 bg-slate-900/30">
                                <Text className="flex-[2] text-slate-400 text-[10px] font-bold uppercase tracking-wider">Nombre</Text>
                                <Text className="flex-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Categoría</Text>
                                <Text className="w-20 text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center">Vendidos</Text>
                                <Text className="w-20 text-slate-400 text-[10px] font-bold uppercase tracking-wider text-right">Total ($)</Text>
                            </View>

                            <View>
                                {topProducts.length > 0 ? (
                                    topProducts.slice(0, 10).map((product, index) => (
                                        <View key={product.id} className={`flex-row items-center px-5 py-4 ${index !== topProducts.length - 1 ? 'border-b border-slate-700/30' : ''}`}>
                                            <View className="flex-[2] flex-row items-center">
                                                <Text className="text-slate-500 text-[10px] font-bold mr-3 w-4">{index + 1}</Text>
                                                <Text className="text-white font-medium text-sm" numberOfLines={1}>{product.name}</Text>
                                            </View>
                                            <View className="flex-1">
                                                <View className="bg-slate-700/50 self-start px-2 py-0.5 rounded-md border border-slate-600/50">
                                                    <Text className="text-slate-400 text-[10px]">{product.category || 'General'}</Text>
                                                </View>
                                            </View>
                                            <Text className="w-20 text-white font-bold text-sm text-center">{product.quantity}</Text>
                                            <Text className="w-20 text-emerald-400 font-bold text-sm text-right">${product.revenue.toFixed(2)}</Text>
                                        </View>
                                    ))
                                ) : (
                                    <View className="py-12 items-center">
                                        <Text className="text-slate-500 text-sm">No hay datos de productos en este periodo</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Payment Methods */}
                        <View className="mt-6 bg-slate-800 rounded-2xl border border-slate-700 p-5">
                            <Text className="text-white font-bold text-lg mb-4">Métodos de Pago</Text>
                            <View className="flex-row justify-between">
                                <View className="items-center w-[30%]">
                                    <Text className="text-slate-400 text-[10px] mb-1 uppercase font-bold">Efectivo</Text>
                                    <Text className="text-white font-bold">${metrics?.paymentMethods.cash.toFixed(2) || '0.00'}</Text>
                                    <View className="h-1 w-full bg-slate-700 rounded-full mt-2 overflow-hidden">
                                        <View
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${metrics?.totalRevenue ? (metrics.paymentMethods.cash / metrics.totalRevenue) * 100 : 0}%` }}
                                        />
                                    </View>
                                </View>
                                <View className="items-center w-[30%]">
                                    <Text className="text-slate-400 text-[10px] mb-1 uppercase font-bold">App</Text>
                                    <Text className="text-white font-bold">${metrics?.paymentMethods.stripe.toFixed(2) || '0.00'}</Text>
                                    <View className="h-1 w-full bg-slate-700 rounded-full mt-2 overflow-hidden">
                                        <View
                                            className="h-full bg-blue-500"
                                            style={{ width: `${metrics?.totalRevenue ? (metrics.paymentMethods.stripe / metrics.totalRevenue) * 100 : 0}%` }}
                                        />
                                    </View>
                                </View>
                                <View className="items-center w-[30%]">
                                    <Text className="text-slate-400 text-[10px] mb-1 uppercase font-bold">Tarjeta</Text>
                                    <Text className="text-white font-bold">${metrics?.paymentMethods.other.toFixed(2) || '0.00'}</Text>
                                    <View className="h-1 w-full bg-slate-700 rounded-full mt-2 overflow-hidden">
                                        <View
                                            className="h-full bg-slate-500"
                                            style={{ width: `${metrics?.totalRevenue ? (metrics.paymentMethods.other / metrics.totalRevenue) * 100 : 0}%` }}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                    </>
                )}
            </ScrollView>
        </View>
    );
}
