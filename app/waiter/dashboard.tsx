import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { getWaiterSessions, calculateWaiterMetrics } from '../../src/services/analytics';
import { Session } from '../../src/types/firestore';
import { colors } from '../../src/styles/theme';

export default function WaiterDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [metrics, setMetrics] = useState({ totalSales: 0, totalTips: 0, sessionCount: 0 });
    const [timeRange, setTimeRange] = useState<'today' | 'week'>('today');

    const restaurantId = user?.restaurantId || '';
    const waiterId = user?.id || '';

    useEffect(() => {
        if (!restaurantId || !waiterId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const now = new Date();
                let start = new Date();
                if (timeRange === 'today') {
                    start.setHours(0, 0, 0, 0);
                } else {
                    start.setDate(now.getDate() - 7);
                }

                const fetchedSessions = await getWaiterSessions(restaurantId, waiterId, start, now);
                const calculatedMetrics = await calculateWaiterMetrics(restaurantId, fetchedSessions, waiterId);

                setSessions(fetchedSessions);
                setMetrics(calculatedMetrics);
            } catch (error) {
                console.error('Error fetching waiter metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [restaurantId, waiterId, timeRange]);

    const renderMetricCard = (title: string, value: string, icon: React.ReactNode, color: string) => (
        <View style={styles.metricCard}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                {icon}
            </View>
            <View>
                <Text style={styles.metricLabel}>{title}</Text>
                <Text style={styles.metricValue}>{value}</Text>
            </View>
        </View>
    );

    const renderSessionItem = ({ item }: { item: Session }) => (
        <View style={styles.sessionItem}>
            <View>
                <Text style={styles.sessionTable}>{item.tableName}</Text>
                <Text style={styles.sessionTime}>
                    {item.startTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <View style={styles.sessionRight}>
                <Text style={styles.sessionTotal}>${item.total?.toFixed(2)}</Text>
                <Text style={styles.sessionStatus}>{item.status === 'closed' ? 'Pagado' : 'Activa'}</Text>
            </View>
        </View>
    );

    if (loading && sessions.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.roastedSaffron} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.title}>Mi Desempeño</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Time Range Selector */}
                <View style={styles.rangeSelector}>
                    <TouchableOpacity
                        onPress={() => setTimeRange('today')}
                        style={[styles.rangeButton, timeRange === 'today' && styles.rangeButtonActive]}
                    >
                        <Text style={[styles.rangeText, timeRange === 'today' && styles.rangeTextActive]}>Hoy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setTimeRange('week')}
                        style={[styles.rangeButton, timeRange === 'week' && styles.rangeButtonActive]}
                    >
                        <Text style={[styles.rangeText, timeRange === 'week' && styles.rangeTextActive]}>Esta Semana</Text>
                    </TouchableOpacity>
                </View>

                {/* Metrics Grid */}
                <View style={styles.metricsGrid}>
                    {renderMetricCard('Ventas Totales', `$${metrics.totalSales.toFixed(2)}`, <TrendingUp size={20} color="#10B981" />, '#10B981')}
                    {renderMetricCard('Propinas', `$${metrics.totalTips.toFixed(2)}`, <DollarSign size={20} color="#F59E0B" />, '#F59E0B')}
                    {renderMetricCard('Mesas Atendidas', `${metrics.sessionCount}`, <Users size={20} color="#3B82F6" />, '#3B82F6')}
                </View>

                {/* Session History */}
                <View style={styles.historySection}>
                    <View style={styles.sectionHeader}>
                        <Calendar size={20} color="#64748B" />
                        <Text style={styles.sectionTitle}>Historial Reciente</Text>
                    </View>

                    {sessions.length > 0 ? (
                        sessions.map((session) => (
                            <View key={session.id}>
                                {renderSessionItem({ item: session })}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No hay sesiones registradas en este periodo.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFBF7',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FDFBF7',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    scrollContent: {
        padding: 20,
    },
    rangeSelector: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    rangeButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    rangeButtonActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    rangeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    rangeTextActive: {
        color: '#1E293B',
    },
    metricsGrid: {
        gap: 12,
        marginBottom: 25,
    },
    metricCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metricValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 2,
    },
    historySection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    sessionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    sessionTable: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
    },
    sessionTime: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    sessionRight: {
        alignItems: 'flex-end',
    },
    sessionTotal: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    sessionStatus: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: '600',
        marginTop: 2,
    },
    emptyState: {
        paddingVertical: 30,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14,
        textAlign: 'center',
    },
});
