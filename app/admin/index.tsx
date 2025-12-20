import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import {
    TrendingUp,
    DollarSign,
    ShoppingBag,
    Table as TableIcon,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react-native';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { startOfDay, endOfDay } from 'date-fns';

import { useAuth } from '../../src/context/AuthContext';
import { useRestaurant } from '../../src/hooks/useRestaurant';
import { getDashboardMetrics } from '../../src/services/adminAnalytics';
import DateRangeSelector, { DateRange } from '../../src/components/admin/DateRangeSelector';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AdminDashboard() {
    const { user } = useAuth();
    const { restaurant } = useRestaurant();

    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [activeRange, setActiveRange] = useState<DateRange>('today');
    const [startDate, setStartDate] = useState(startOfDay(new Date()));
    const [endDate, setEndDate] = useState(endOfDay(new Date()));

    // Data State
    const [data, setData] = useState<any>(null);

    const fetchData = useCallback(async () => {
        if (!user?.restaurantId) return;
        setLoading(true);
        try {
            const metrics = await getDashboardMetrics(user.restaurantId, startDate, endDate);
            setData(metrics);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.restaurantId, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleRangeChange = useCallback((range: DateRange, start: Date, end: Date) => {
        setActiveRange(range);
        setStartDate(start);
        setEndDate(end);
    }, []);

    const KPICard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
        <View className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800/50 flex-1 min-w-[240px] m-2">
            <View className="flex-row justify-between items-start mb-4">
                <View className={`w-12 h-12 rounded-2xl ${color}/10 items-center justify-center border border-${color}/20`}>
                    <Icon size={24} color={color} />
                </View>
                {trend && (
                    <View className={`flex-row items-center px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        {trend === 'up' ? <ArrowUpRight size={12} color="#10b981" /> : <ArrowDownRight size={12} color="#ef4444" />}
                        <Text className={`text-[10px] font-black ml-1 ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>{trendValue}%</Text>
                    </View>
                )}
            </View>
            <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</Text>
            <Text className="text-white text-3xl font-black">{value}</Text>
        </View>
    );

    if (loading && !refreshing && !data) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#6366f1" />
                <Text className="text-slate-400 mt-4 font-bold tracking-widest">CARGANDO DASHBOARD...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        >
            {/* Top Header & Filters */}
            <View className="flex-row flex-wrap justify-between items-end mb-8 gap-4">
                <View>
                    <Text className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Visión General</Text>
                    <Text className="text-4xl font-black text-white">{restaurant?.name || 'Dashboard'}</Text>
                </View>
                <DateRangeSelector
                    activeRange={activeRange}
                    startDate={startDate}
                    endDate={endDate}
                    onRangeChange={handleRangeChange}
                />
            </View>

            {/* KPI Grid */}
            <View className="flex-row flex-wrap -m-2 mb-8">
                <KPICard
                    title="Ventas Totales"
                    value={`$${(data?.kpis.totalSales || 0).toFixed(2)}`}
                    icon={DollarSign}
                    color="#10b981"
                />
                <KPICard
                    title="Ticket Promedio"
                    value={`$${(data?.kpis.avgTicket || 0).toFixed(2)}`}
                    icon={TrendingUp}
                    color="#6366f1"
                />
                <KPICard
                    title="Propinas"
                    value={`$${(data?.kpis.totalTips || 0).toFixed(2)}`}
                    icon={ShoppingBag}
                    color="#3b82f6"
                />
                <KPICard
                    title="Ocupación"
                    value={`${data?.kpis.activeTables} Activas`}
                    icon={TableIcon}
                    color="#f59e0b"
                />
            </View>

            {/* main charts row */}
            <View className="flex-row flex-wrap -m-3 mb-8">
                {/* Line Chart: Sales over time */}
                <View className="flex-1 min-w-[320px] m-3 bg-slate-900/50 p-6 rounded-[32px] border border-slate-800/50">
                    <Text className="text-white font-black text-lg mb-6">Ventas Historico</Text>
                    <View className="items-center">
                        {data?.charts.salesHistory.length > 0 ? (
                            <LineChart
                                data={data.charts.salesHistory}
                                width={SCREEN_WIDTH > 1000 ? 500 : SCREEN_WIDTH - 120}
                                height={200}
                                color="#6366f1"
                                thickness={4}
                                dataPointsColor="#818cf8"
                                yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
                                xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
                                noOfSections={4}
                                hideDataPoints={false}
                                curved
                            />
                        ) : (
                            <View className="h-[200px] justify-center"><Text className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">No hay datos en este periodo</Text></View>
                        )}
                    </View>
                </View>

                {/* Pie Chart: Payment Methods */}
                <View className="w-full md:w-[320px] m-3 bg-slate-900/50 p-6 rounded-[32px] border border-slate-800/50">
                    <Text className="text-white font-black text-lg mb-6">Métodos de Pago</Text>
                    <View className="items-center">
                        {data?.charts.payments.reduce((a: any, b: any) => a + b.value, 0) > 0 ? (
                            <>
                                <PieChart
                                    data={data?.charts.payments}
                                    donut
                                    showGradient={false}
                                    sectionAutoFocus
                                    radius={80}
                                    innerRadius={50}
                                    innerCircleColor={'#0f172a'}
                                    centerLabelComponent={() => (
                                        <View className="items-center justify-center">
                                            <Text className="text-white font-black text-xs">PAGOS</Text>
                                        </View>
                                    )}
                                />
                                <View className="mt-6 flex-row flex-wrap justify-center gap-4">
                                    {data?.charts.payments.map((p: any) => (
                                        <View key={p.name} className="flex-row items-center">
                                            <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                                            <Text className="text-slate-400 text-[10px] font-bold uppercase">{p.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        ) : (
                            <View className="h-[200px] justify-center"><Text className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Sin pagos</Text></View>
                        )}
                    </View>
                </View>
            </View>

            {/* second row: Peak Hours Distribution */}
            <View className="m-3 bg-slate-900/50 p-6 rounded-[32px] border border-slate-800/50">
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-white font-black text-lg">Análisis de Horas Pico</Text>
                    <View className="bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                        <Text className="text-indigo-400 text-[10px] font-black uppercase">Distribución Mensual/Diaria</Text>
                    </View>
                </View>
                <View className="items-center">
                    {data?.charts.peakHours.length > 0 ? (
                        <BarChart
                            data={data.charts.peakHours}
                            barWidth={SCREEN_WIDTH > 1000 ? 30 : 20}
                            noOfSections={4}
                            barBorderRadius={6}
                            frontColor="#6366f1"
                            isAnimated
                            animationDuration={1000}
                            yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
                            xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                            height={220}
                            width={SCREEN_WIDTH > 1000 ? 800 : SCREEN_WIDTH - 120}
                            showGradient={false}
                        />
                    ) : (
                        <View className="h-[220px] justify-center"><Text className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Sin datos para análisis horario</Text></View>
                    )}
                </View>
                <View className="mt-6 flex-row items-center justify-center">
                    <View className="w-3 h-3 bg-indigo-500 rounded-full mr-2" />
                    <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Volumen de Ventas ($) por Periodo</Text>
                </View>
            </View>
        </ScrollView>
    );
}
