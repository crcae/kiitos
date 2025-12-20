import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, LayoutDashboard } from 'lucide-react-native';
import { subscribeToTables } from '../../src/services/tables';
import { createSession } from '../../src/services/sessions';
import { Table } from '../../src/types/firestore';
import { useAuth } from '../../src/context/AuthContext';
import { useRestaurant } from '../../src/hooks/useRestaurant';
import { colors } from '../../src/styles/theme';

export default function TablesScreen() {
    const [tables, setTables] = useState<Table[]>([]);
    const router = useRouter();
    const { signOut, user } = useAuth();
    const { restaurant } = useRestaurant();
    const restaurantId = user?.restaurantId || 'kiitos-main';

    useEffect(() => {
        const unsubscribe = subscribeToTables(restaurantId, setTables);
        return () => unsubscribe();
    }, [restaurantId]);

    const handleTablePress = async (table: Table) => {
        if (table.status === 'available') {
            const sessionId = await createSession(restaurantId, table.id, table.name);
            router.push({ pathname: '/waiter/pos', params: { tableId: table.id, sessionId } });
        } else if (table.status === 'occupied' && table.active_session_id) {
            router.push({ pathname: '/waiter/pos', params: { tableId: table.id, sessionId: table.active_session_id } });
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            // Guard will handle redirect
        } catch (error) {
            Alert.alert('Error', 'No se pudo cerrar sesión');
        }
    };

    const renderItem = ({ item }: { item: Table }) => (
        <TouchableOpacity
            style={[styles.tableCard, item.status === 'occupied' && styles.occupiedTable]}
            onPress={() => handleTablePress(item)}
        >
            <Text style={styles.tableName}>{item.name}</Text>
            <Text style={styles.tableStatus}>{item.status === 'occupied' ? 'Ocupada' : 'Disponible'}</Text>

            {item.status === 'occupied' && item.current_session_total !== undefined && (
                <View style={styles.totalBadge}>
                    <Text style={styles.totalText}>${item.current_session_total.toFixed(2)}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header with Branding */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.brandSubtitle}>
                        {restaurant?.name || restaurant?.id || restaurantId || 'Cargando...'}
                    </Text>
                    <Text style={styles.title}>Mesas</Text>
                </View>

                <View style={styles.headerButtons}>
                    <TouchableOpacity onPress={() => router.push('/waiter/dashboard')} style={styles.dashboardButton}>
                        <LayoutDashboard size={20} color={colors.white} />
                        <Text style={styles.buttonText}>Dashboard</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <LogOut size={20} color={colors.white} />
                        <Text style={styles.buttonText}>Salir</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={tables}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFBF7', // Oat Cream
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    brandSubtitle: {
        fontSize: 12,
        color: '#F97316', // Orange-500
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    dashboardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6', // Blue-500
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14
    },
    list: {
        padding: 20,
        gap: 15,
    },
    totalBadge: {
        marginTop: 8,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E67E22',
    },
    totalText: {
        color: '#E67E22',
        fontWeight: 'bold',
        fontSize: 16,
    },
    tableCard: {
        flex: 1,
        margin: 5,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    occupiedTable: {
        backgroundColor: '#FFF4ED',
        borderColor: '#E67E22', // Roasted Saffron
        borderWidth: 3,
    },
    tableName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 5,
        color: '#2C3E50',
    },
    tableStatus: {
        fontSize: 14,
        color: '#717171',
        textTransform: 'capitalize',
    },
});
