import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { subscribeToTables } from '../../src/services/tables';
import { createSession } from '../../src/services/sessions';
import { Table } from '../../src/types/firestore';

const RESTAURANT_ID = 'kiitos-main';

export default function TablesScreen() {
    const [tables, setTables] = useState<Table[]>([]);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = subscribeToTables(RESTAURANT_ID, setTables);
        return () => unsubscribe();
    }, []);

    const handleTablePress = async (table: Table) => {
        if (table.status === 'available') {
            // Start a new session
            const sessionId = await createSession(RESTAURANT_ID, table.id, table.name);
            router.push({ pathname: '/waiter/pos', params: { tableId: table.id, sessionId } });
        } else if (table.status === 'occupied' && table.active_session_id) {
            // Go to existing session
            router.push({ pathname: '/waiter/pos', params: { tableId: table.id, sessionId: table.active_session_id } });
        }
    };

    const renderItem = ({ item }: { item: Table }) => (
        <TouchableOpacity
            style={[styles.tableCard, item.status === 'occupied' && styles.occupiedTable]}
            onPress={() => handleTablePress(item)}
        >
            <Text style={styles.tableName}>{item.name}</Text>
            <Text style={styles.tableStatus}>{item.status}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Mesas</Text>
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
        padding: 20,
        backgroundColor: '#FDFBF7', // Oat Cream
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    list: {
        gap: 15,
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
