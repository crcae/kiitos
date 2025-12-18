import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Users, User, TrendingUp, DollarSign } from 'lucide-react-native';
import { getBills } from '../../../src/services/adminAnalytics';
import { getStaff } from '../../../src/services/staff';
import { useAuth } from '../../../src/context/AuthContext';
import DataTable, { Column } from '../../../src/components/DataTable';
import { Session, StaffMember } from '../../../src/types/firestore';

interface StaffStat {
    id: string;
    staffId: string;
    staffName: string;
    sessionsCount: number;
    totalSales: number;
    totalTips: number;
    avgTicket: number;
    role: string;
}

export default function StaffStatsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);

    const fetchData = useCallback(async () => {
        if (!user?.restaurantId) return;
        setLoading(true);
        try {
            const [billsData, staffData] = await Promise.all([
                getBills(user.restaurantId),
                getStaff(user.restaurantId)
            ]);
            setSessions(billsData);
            setStaffList(staffData);
        } catch (error) {
            console.error('Error fetching staff data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.restaurantId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const staffStats = useMemo(() => {
        const statsMap = new Map<string, StaffStat>();

        // 1. Initialize map with ALL staff members from the master list
        staffList.forEach(s => {
            statsMap.set(s.id, {
                id: s.id,
                staffId: s.id,
                staffName: s.name,
                role: s.role,
                sessionsCount: 0,
                totalSales: 0,
                totalTips: 0,
                avgTicket: 0
            });
        });

        // 2. Aggregate from sessions
        sessions.forEach(session => {
            const staffId = (session as any).waiterId || (session as any).createdBy;

            // Only aggregate if we have a valid staff ID from our master list
            if (staffId && statsMap.has(staffId)) {
                const existing = statsMap.get(staffId)!;
                existing.sessionsCount += 1;
                existing.totalSales += (session.total || 0);
                existing.totalTips += (session as any).tips || 0;
            } else if (staffId) {
                // If it's a staff ID not in our list (maybe deleted or admin), add it as extra
                const existing = statsMap.get(staffId);
                if (existing) {
                    existing.sessionsCount += 1;
                    existing.totalSales += (session.total || 0);
                    existing.totalTips += (session as any).tips || 0;
                } else {
                    statsMap.set(staffId, {
                        id: staffId,
                        staffId,
                        staffName: (session as any).waiterName || (session as any).createdByName || 'Desconocido',
                        role: 'N/A',
                        sessionsCount: 1,
                        totalSales: (session.total || 0),
                        totalTips: (session as any).tips || 0,
                        avgTicket: 0
                    });
                }
            }
        });

        return Array.from(statsMap.values())
            .map(s => ({
                ...s,
                avgTicket: s.sessionsCount > 0 ? s.totalSales / s.sessionsCount : 0
            }))
            .sort((a, b) => b.totalSales - a.totalSales); // Sort by highest sales
    }, [sessions, staffList]);

    const columns: Column<StaffStat>[] = [
        {
            key: 'staffName',
            label: 'Staff',
            sortable: true,
            flex: 1.5,
            render: (item) => (
                <View className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-full ${item.sessionsCount > 0 ? 'bg-indigo-500/20' : 'bg-slate-700/50'} items-center justify-center mr-3 border border-indigo-500/30`}>
                        <User size={14} color={item.sessionsCount > 0 ? '#6366f1' : '#64748b'} />
                    </View>
                    <View>
                        <Text className="text-white font-bold text-xs">{item.staffName}</Text>
                        <Text className="text-slate-500 text-[10px] uppercase font-black">{item.role}</Text>
                    </View>
                </View>
            ),
            exportValue: (item) => `${item.staffName} (${item.role})`
        },
        {
            key: 'sessionsCount',
            label: 'Mesas',
            sortable: true,
            align: 'center',
            width: 80,
            render: (item) => (
                <Text className="text-slate-300 font-bold text-xs">{item.sessionsCount}</Text>
            ),
            exportValue: (item) => item.sessionsCount.toString()
        },
        {
            key: 'totalSales',
            label: 'Ventas',
            sortable: true,
            align: 'right',
            width: 100,
            render: (item) => (
                <Text className="text-emerald-400 font-bold text-xs">${item.totalSales.toFixed(2)}</Text>
            ),
            exportValue: (item) => item.totalSales.toString()
        },
        {
            key: 'totalTips',
            label: 'Propinas',
            sortable: true,
            align: 'right',
            width: 90,
            render: (item) => (
                <Text className="text-blue-400 font-medium text-xs">${item.totalTips.toFixed(2)}</Text>
            ),
            exportValue: (item) => item.totalTips.toString()
        },
        {
            key: 'avgTicket',
            label: 'Ticket Prom.',
            sortable: true,
            align: 'right',
            width: 100,
            render: (item) => (
                <View className="bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    <Text className="text-indigo-400 font-black text-[10px]">${item.avgTicket.toFixed(2)}</Text>
                </View>
            ),
            exportValue: (item) => item.avgTicket.toString()
        }
    ];

    return (
        <View className="flex-1 bg-slate-950">
            {/* Header */}
            <View className="px-6 py-8 flex-row justify-between items-center bg-slate-950 border-b border-slate-900">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-5 bg-slate-900 w-10 h-10 rounded-xl border border-slate-800 items-center justify-center">
                        <ChevronLeft size={20} color="#94a3b8" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-1">Analítica</Text>
                        <Text className="text-3xl font-black text-white">Rendimiento Staff</Text>
                    </View>
                </View>
                <View className="bg-indigo-600/10 w-12 h-12 rounded-2xl items-center justify-center border border-indigo-600/20">
                    <TrendingUp size={24} color="#6366f1" />
                </View>
            </View>

            <View className="flex-1 p-6">
                <DataTable
                    data={staffStats}
                    columns={columns}
                    isLoading={loading}
                    searchKey="staffName"
                    searchPlaceholder="Buscar por nombre..."
                    title="reporte_rendimiento_staff"
                />
            </View>
        </View>
    );
}
