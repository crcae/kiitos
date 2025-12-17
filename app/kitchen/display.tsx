import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { subscribeToPendingOrders, updateOrderStatus } from '../../src/services/orders';
import { Order } from '../../src/types/firestore';
import AirbnbCard from '../../src/components/AirbnbCard';
import AirbnbButton from '../../src/components/AirbnbButton';
import { colors, spacing, typography } from '../../src/styles/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useRestaurant } from '../../src/hooks/useRestaurant';

export default function KitchenDisplayScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const { signOut, user } = useAuth();
    const { restaurant } = useRestaurant();
    const restaurantId = user?.restaurantId || 'kiitos-main';

    useEffect(() => {
        const unsubscribe = subscribeToPendingOrders(setOrders);
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            Alert.alert('Error', 'Failed to log out');
        }
    };

    const handleStatusUpdate = async (orderId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'pending' ? 'preparing' : 'ready';
        await updateOrderStatus(orderId, nextStatus);
    };

    const renderOrderItem = ({ item }: { item: Order }) => (
        <AirbnbCard
            shadow="md"
            style={[
                styles.ticket,
                item.status === 'preparing' && styles.preparingTicket
            ]}
        >
            <View style={styles.ticketHeader}>
                <Text style={styles.ticketTitle}>Table {item.tableId}</Text>
                <Text style={styles.ticketTime}>
                    {item.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>

            <View style={styles.ticketItems}>
                {item.items.map((orderItem, index) => (
                    <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                        <Text style={styles.itemName}>{orderItem.name}</Text>
                    </View>
                ))}
            </View>

            <AirbnbButton
                title={item.status === 'pending' ? 'Start Preparing' : 'Mark Ready'}
                onPress={() => handleStatusUpdate(item.id, item.status)}
                variant={item.status === 'preparing' ? 'primary' : 'secondary'}
            />
        </AirbnbCard>
    );

    return (
        <View style={styles.container}>
            {/* Header with Branding */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.brandSubtitle}>
                        {restaurant?.name || restaurant?.id || restaurantId || 'Loading...'}
                    </Text>
                    <Text style={styles.title}>Cocina</Text>
                </View>

                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <LogOut size={20} color={colors.white} />
                    <Text style={styles.logoutText}>Salir</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={orders}
                renderItem={renderOrderItem}
                keyExtractor={item => item.id}
                numColumns={3} // Adjust based on screen size
                contentContainerStyle={styles.grid}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.oatCream,
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
        marginBottom: spacing.lg,
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
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6
    },
    logoutText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14
    },
    grid: {
        gap: spacing.lg,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    ticket: {
        flex: 1,
        margin: 10, // Keep margin for spacing between cards in the grid
        backgroundColor: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        minWidth: 250,
        maxWidth: 300,
        marginBottom: spacing.sm,
        padding: 0,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    preparingTicket: {
        borderColor: colors.roastedSaffron,
    },
    ticketHeader: {
        backgroundColor: '#eee',
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ticketTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    ticketTime: {
        fontSize: typography.sm,
        color: colors.gray,
    },
    ticketItems: {
        padding: 15,
    },
    itemRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    itemQuantity: {
        fontWeight: typography.bold,
        marginRight: spacing.sm,
        color: colors.roastedSaffron,
        fontSize: typography.base,
    },
    itemName: {
        flex: 1,
        fontSize: typography.base,
        color: colors.castIron,
    },
});
