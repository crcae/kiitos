import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { subscribeToActiveSessions, markSessionPaid } from '../../src/services/sessions';
import { Session } from '../../src/types/firestore';
import AirbnbCard from '../../src/components/AirbnbCard';
import AirbnbButton from '../../src/components/AirbnbButton';
import { colors, spacing, typography } from '../../src/styles/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useRestaurant } from '../../src/hooks/useRestaurant';

export default function CashierStatusScreen() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const { signOut, user } = useAuth();
    const { restaurant } = useRestaurant();
    const restaurantId = user?.restaurantId || 'kiitos-main';

    useEffect(() => {
        const unsubscribe = subscribeToActiveSessions(setSessions);
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            Alert.alert('Error', 'Failed to log out');
        }
    };

    const handlePayment = async (session: Session) => {
        Alert.alert(
            'Confirm Payment',
            `Mark Table ${session.tableId} as paid?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await markSessionPaid(session.id, session.tableId);
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to process payment');
                        }
                    }
                }
            ]
        );
    };

    const renderSessionItem = ({ item }: { item: Session }) => (
        <AirbnbCard shadow="md" style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.tableTitle}>Table {item.tableId}</Text>
                <View style={[styles.statusBadge, item.paymentStatus === 'paid' ? styles.paid : styles.unpaid]}>
                    <Text style={styles.statusText}>
                        {item.paymentStatus}
                    </Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <Text style={styles.amount}>Total: ${item.total.toFixed(2)}</Text>
                <Text style={styles.itemsCount}>{item.items.length} items</Text>
            </View>

            <AirbnbButton
                title="Mark Paid (Cash)"
                onPress={() => handlePayment(item)}
                variant="primary"
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
                    <Text style={styles.title}>Caja</Text>
                </View>

                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <LogOut size={20} color={colors.white} />
                    <Text style={styles.logoutText}>Salir</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={sessions}
                renderItem={renderSessionItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
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
    list: {
        gap: spacing.lg,
        paddingHorizontal: 20, // Add padding to list since container doesn't have it anymore
    },
    card: {
        marginBottom: spacing.sm,
        padding: 0,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    tableTitle: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 15,
        overflow: 'hidden',
    },
    statusText: {
        textTransform: 'capitalize',
        fontWeight: typography.semibold,
        fontSize: typography.sm,
    },
    paid: {
        backgroundColor: '#E8F5E9',
        color: '#27AE60', // Albahaca
    },
    unpaid: {
        backgroundColor: '#FFEBEE',
        color: '#C0392B', // Chile
    },
    cardBody: {
        marginBottom: 20,
    },
    amount: {
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.castIron,
        marginBottom: spacing.xs,
    },
    itemsCount: {
        fontSize: typography.base,
        color: colors.gray,
    },
});
