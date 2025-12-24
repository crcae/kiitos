import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShoppingBag, ArrowDownLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Schema: { id, title, date, amount, status, type }
const DATA: any[] = [
    // Empty for now
];

export default function ActivityHistoryScreen() {
    const router = useRouter();

    const renderItem = ({ item }: any) => {
        // ... (keep logic if needed later, but irrelevant for empty list)
        return null;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/(app)/profile')} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>History</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.emptyContainer}>
                <ShoppingBag size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No recent activity</Text>
                <Text style={styles.emptyText}>Your orders and transactions will appear here.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700', color: '#111' },
    listContent: { padding: 20 },
    sectionHeader: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', marginBottom: 15, marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 },
    card: {
        backgroundColor: '#fff', flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 16,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
        borderWidth: 1, borderColor: '#F3F4F6'
    },
    iconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    cardContent: { flex: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    itemTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
    amount: { fontSize: 17, fontWeight: '800' },
    date: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
    badgeWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    status: { fontSize: 12, fontWeight: '700' },
    id: { fontSize: 11, color: '#9CA3AF', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 16 },
    emptyText: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' }
});
