import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { subscribeToActiveSessions, markSessionPaid } from '../../src/services/sessions';
import { Session } from '../../src/types/firestore';
import AirbnbCard from '../../src/components/AirbnbCard';
import AirbnbButton from '../../src/components/AirbnbButton';
import { colors, spacing, typography } from '../../src/styles/theme';

export default function CashierStatusScreen() {
    const [sessions, setSessions] = useState<Session[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToActiveSessions(setSessions);
        return () => unsubscribe();
    }, []);

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
        padding: spacing.xl,
        backgroundColor: colors.oatCream,
    },
    list: {
        gap: spacing.lg,
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
