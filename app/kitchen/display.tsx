import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { subscribeToPendingOrders, updateOrderStatus } from '../../src/services/orders';
import { Order } from '../../src/types/firestore';
import AirbnbCard from '../../src/components/AirbnbCard';
import AirbnbButton from '../../src/components/AirbnbButton';
import { colors, spacing, typography } from '../../src/styles/theme';

export default function KitchenDisplayScreen() {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToPendingOrders(setOrders);
        return () => unsubscribe();
    }, []);

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
        padding: spacing.xl,
        backgroundColor: colors.oatCream,
    },
    grid: {
        gap: spacing.lg,
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
