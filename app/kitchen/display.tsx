import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Dimensions, useWindowDimensions, Switch, Platform } from 'react-native';
import { LogOut, Clock, CheckCircle, Volume2, VolumeX } from 'lucide-react-native';
import { subscribeToPendingOrders, updateOrderStatus } from '../../src/services/orders';
import { Order } from '../../src/types/firestore';
import { colors, spacing, typography } from '../../src/styles/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useRestaurant } from '../../src/hooks/useRestaurant';


// Brand Colors
const BRAND_ORANGE = '#f89219';
const BRAND_GREEN = '#10B981';
const TEXT_DARK = '#1f2937';
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';


const MOCK_ORDERS: Order[] = [
    {
        id: 'mock-1',
        restaurantId: 'mock',
        sessionId: 'mock-session-1',
        tableId: '12',
        tableName: 'Table 12',
        status: 'pending',
        createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 5) } as any, // 5 mins ago
        items: [
            { id: 'i1', name: 'Cheeseburger', quantity: 2, price: 15, session_id: 's1', product_id: 'p1', created_by: 'guest', paid_quantity: 0 },
            { id: 'i2', name: 'Fries', quantity: 1, price: 5, session_id: 's1', product_id: 'p2', created_by: 'guest', paid_quantity: 0 }
        ]
    },
    {
        id: 'mock-2',
        restaurantId: 'mock',
        sessionId: 'mock-session-2',
        tableId: '4',
        tableName: 'Table 4',
        status: 'preparing',
        createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 25) } as any, // 25 mins ago (Late)
        items: [
            { id: 'i3', name: 'Tacos al Pastor', quantity: 3, price: 12, session_id: 's2', product_id: 'p3', created_by: 'guest', paid_quantity: 0 },
            { id: 'i4', name: 'Coca Cola', quantity: 2, price: 3, session_id: 's2', product_id: 'p4', created_by: 'guest', paid_quantity: 0 }
        ]
    },
    {
        id: 'mock-3',
        restaurantId: 'mock',
        sessionId: 'mock-session-3',
        tableId: 'Bar 2',
        tableName: 'Bar 2',
        status: 'pending',
        createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 1) } as any, // 1 min ago
        items: [
            { id: 'i5', name: 'Margarita', quantity: 4, price: 10, session_id: 's3', product_id: 'p5', created_by: 'guest', paid_quantity: 0 },
            { id: 'i6', name: 'Guacamole', quantity: 1, price: 8, session_id: 's3', product_id: 'p6', created_by: 'guest', paid_quantity: 0 }
        ]
    }
];

const TicketCard = ({ item, onUpdateStatus }: { item: Order; onUpdateStatus: (id: string, status: string) => void }) => {
    // Calculate elapsed time (simple version for demo)
    const getElapsedMinutes = () => {
        if (!item.createdAt) return 0;
        const now = new Date();
        const created = item.createdAt.toDate();
        const diffMs = now.getTime() - created.getTime();
        return Math.floor(diffMs / 60000);
    };

    const elapsed = getElapsedMinutes();
    const isLate = elapsed > 15;

    return (
        <View style={styles.ticketCard}>
            {/* Header */}
            <View style={styles.ticketHeader}>
                <Text style={styles.tableNumber}>Table #{item.tableId}</Text>
                <View style={styles.timerContainer}>
                    <Clock size={14} color={isLate ? '#EF4444' : '#6B7280'} />
                    <Text style={[styles.timeText, isLate && styles.lateText]}>
                        {elapsed} min
                    </Text>
                </View>
            </View>

            {/* Items List */}
            <View style={styles.itemsContainer}>
                {item.items.map((orderItem, index) => (
                    <View key={index} style={styles.itemRow}>
                        <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                        <View style={styles.itemDetails}>
                            <Text style={styles.itemName}>{orderItem.name}</Text>
                            {/* Notes/Modifiers would go here if available in the data model properly */}
                        </View>
                    </View>
                ))}
            </View>

            {/* Action Footer */}
            <TouchableOpacity
                style={[
                    styles.actionButton,
                    { backgroundColor: item.status === 'pending' ? BRAND_ORANGE : BRAND_GREEN }
                ]}
                onPress={() => onUpdateStatus(item.id, item.status)}
            >
                <Text style={styles.actionButtonText}>
                    {item.status === 'pending' ? 'Start Preparing' : 'Mark Ready'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default function KitchenDisplayScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [mockOrders, setMockOrders] = useState<Order[]>(MOCK_ORDERS);
    const [isDevMode, setIsDevMode] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [prevOrderCount, setPrevOrderCount] = useState(0);
    const { signOut, user } = useAuth();
    const { restaurant } = useRestaurant();
    const { width } = useWindowDimensions();

    // Force re-render every minute to update timers
    const [, setTick] = useState(0);

    // Calculate columns based on width (min ticket width 300px)
    const numColumns = Math.floor(width / 320) || 1;

    useEffect(() => {
        const unsubscribe = subscribeToPendingOrders(setOrders);
        const timer = setInterval(() => setTick(t => t + 1), 60000);
        return () => {
            unsubscribe();
            clearInterval(timer);
        };
    }, []);

    // Audio Notification Logic
    useEffect(() => {
        const currentCount = orders.length;
        if (currentCount > prevOrderCount && soundEnabled) {
            if (Platform.OS === 'web') {
                try {
                    const audio = new Audio(NOTIFICATION_SOUND_URL);
                    audio.play().catch(e => console.log('Audio play failed', e));
                } catch (e) {
                    console.log('Audio not supported');
                }
            }
        }
        setPrevOrderCount(currentCount);
    }, [orders, soundEnabled]);


    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            Alert.alert('Error', 'Failed to log out');
        }
    };

    const handleStatusUpdate = async (orderId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'pending' ? 'preparing' : 'ready';

        if (isDevMode) {
            setMockOrders(prev => prev.map(order =>
                order.id === orderId ? { ...order, status: nextStatus as any } : order
            ));
        } else {
            await updateOrderStatus(orderId, nextStatus);
        }
    };

    return (
        <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View>
                        <Text style={styles.brandTitle}>ACME KITCHEN ADMIN</Text>
                        <Text style={styles.restaurantName}>
                            {restaurant?.name || 'Restaurant'}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerControls}>
                    <TouchableOpacity
                        onPress={() => setSoundEnabled(!soundEnabled)}
                        style={[styles.iconButton, soundEnabled ? styles.iconButtonActive : {}]}
                    >
                        {soundEnabled ?
                            <Volume2 size={20} color={soundEnabled ? BRAND_ORANGE : '#6B7280'} /> :
                            <VolumeX size={20} color="#6B7280" />
                        }
                    </TouchableOpacity>

                    <View style={styles.devToggle}>
                        <Text style={styles.devLabel}>Dev: Dummy Data</Text>
                        <Switch
                            value={isDevMode}
                            onValueChange={setIsDevMode}
                            trackColor={{ false: '#767577', true: BRAND_ORANGE }}
                            thumbColor={isDevMode ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <LogOut size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>


            {/* Kanban Grid */}
            <FlatList
                key={`grid-${numColumns}`} // Force re-render when columns change
                data={isDevMode ? mockOrders : orders}
                renderItem={({ item }) => (
                    <TicketCard item={item} onUpdateStatus={handleStatusUpdate} />
                )}
                keyExtractor={item => item.id}
                numColumns={numColumns}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={numColumns > 1 ? styles.gridColumnWrapper : undefined}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <CheckCircle size={64} color="#D1D5DB" />
                        <Text style={styles.emptyText}>All caught up!</Text>
                        <Text style={styles.emptySubtext}>Waiting for new orders...</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6', // Neutral light grey background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginBottom: 16,
    },
    headerLeft: {
        flex: 1,
    },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    devToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    devLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
    },
    brandTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: BRAND_ORANGE,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    restaurantName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: TEXT_DARK,
    },
    logoutButton: {
        padding: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    iconButtonActive: {
        backgroundColor: '#FFF7ED', // light orange
        borderWidth: 1,
        borderColor: BRAND_ORANGE,
    },
    gridContent: {
        padding: 16,
    },
    gridColumnWrapper: {
        gap: 16,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#9CA3AF',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 16,
        color: '#D1D5DB',
    },

    // Ticket Card Styles
    ticketCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
        minWidth: 280,
        marginBottom: 16, // For single column layout
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    tableNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: TEXT_DARK,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    lateText: {
        color: '#EF4444',
    },
    itemsContainer: {
        padding: 16,
        gap: 12,
        minHeight: 100, // Ensure consistent height
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    itemQuantity: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEXT_DARK,
        width: 32,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    actionButton: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
