import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../styles/theme';
import { getTableDetails, subscribeToActiveSession } from '../../services/guestMenu';
import { subscribeToRestaurantConfig } from '../../services/menu';
import { Table, Session, OrderItem, RestaurantSettings } from '../../types/firestore';

interface BillScreenProps {
    restaurantId: string;
    tableId: string;
}

export default function BillScreen({ restaurantId, tableId }: BillScreenProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter(); // Using router here is safe inside Tabs

    const [table, setTable] = useState<Table | null>(null);
    const [loading, setLoading] = useState(true);
    const [branding, setBranding] = useState<RestaurantSettings['branding']>(undefined);
    const [sessionItems, setSessionItems] = useState<OrderItem[]>([]);
    const [sessionTotal, setSessionTotal] = useState(0);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [activeSession, setActiveSession] = useState<Session | null>(null);

    const unsubsRef = useRef<(() => void)[]>([]);

    useEffect(() => {
        if (!restaurantId || !tableId) return;

        const loadData = async () => {
            try {
                const tableData = await getTableDetails(restaurantId, tableId);
                setTable(tableData);

                const unsubConfig = subscribeToRestaurantConfig(restaurantId, (config) => {
                    setBranding(config.branding);
                });
                unsubsRef.current.push(unsubConfig);

                const unsubSession = subscribeToActiveSession(restaurantId, tableId, (items, total, sessionId, session) => {
                    setSessionItems(items);
                    setSessionTotal(total);
                    setCurrentSessionId(sessionId);
                    if (session) setActiveSession(session);
                });
                unsubsRef.current.push(unsubSession);

                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };

        loadData();

        return () => {
            unsubsRef.current.forEach(unsub => unsub());
            unsubsRef.current = [];
        };
    }, [restaurantId, tableId]);

    const handlePayBill = () => {
        if (currentSessionId) {
            router.push({
                pathname: "/pay/[id]",
                params: {
                    id: currentSessionId,
                    restaurantId: restaurantId,
                    mode: 'guest'
                }
            });
        } else {
            alert("No items to pay.");
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return '🕒';
            case 'preparing': return '🍳';
            case 'ready': return '✅';
            case 'served': return '🍽️';
            default: return '🕒';
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color={colors.roastedSaffron} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="px-5 py-4 bg-white border-b border-gray-100">
                {branding?.logo_url ? (
                    <Image source={{ uri: branding.logo_url }} className="h-10 w-32" resizeMode="contain" />
                ) : (
                    <View>
                        <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest">BILL</Text>
                        <Text className="text-2xl font-extrabold text-gray-900">{table?.name || 'Table'}</Text>
                    </View>
                )}
            </View>

            <FlatList
                data={sessionItems}
                keyExtractor={(item, index) => item.id + index}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                ListHeaderComponent={
                    <View className="mb-6">
                        <Text className="text-3xl font-bold text-gray-900 mb-2">Current Bill</Text>
                        <Text className="text-gray-500">Items ordered by everyone at the table.</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Text className="text-gray-400">No items ordered yet.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View className="flex-row justify-between items-center py-4 border-b border-gray-100">
                        <View className="flex-row items-center flex-1">
                            <Text className="font-bold text-gray-900 text-lg w-8">{item.quantity}x</Text>
                            <View>
                                <Text className="text-gray-900 font-medium text-lg">{item.name}</Text>

                                {/* Creator Badge */}
                                {(item.created_by === 'waiter' || item.created_by_id?.startsWith('waiter')) ? (
                                    <View className="bg-orange-100 border border-orange-200 self-start px-2 py-0.5 rounded mt-1 mb-0.5">
                                        <Text className="text-orange-600 text-[10px] font-bold uppercase tracking-wider">
                                            Mesero
                                        </Text>
                                    </View>
                                ) : (
                                    <View className="bg-gray-100 border border-gray-200 self-start px-2 py-0.5 rounded mt-1 mb-0.5">
                                        <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                            {item.created_by_name || 'Cliente'}
                                        </Text>
                                    </View>
                                )}

                                {item.modifiers && item.modifiers.length > 0 && (
                                    <View className="mt-1">
                                        {item.modifiers.map((mod, mIdx) => (
                                            <Text key={mIdx} className="text-xs text-gray-500">
                                                + {mod.name} {mod.price > 0 ? `($${mod.price.toFixed(2)})` : ''}
                                            </Text>
                                        ))}
                                    </View>
                                )}
                                <Text className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                                    {getStatusIcon(item.status || 'sent')} {item.status || 'Sent'}
                                </Text>
                            </View>
                        </View>
                        <Text className="font-bold text-gray-900">
                            ${((item.price + (item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0)) * item.quantity).toFixed(2)}
                        </Text>
                    </View>
                )}
                ListFooterComponent={
                    sessionItems.length > 0 ? (
                        <View className="mt-8 pt-4 border-t border-gray-200">
                            {/* Staff Section */}
                            {activeSession?.staff && activeSession.staff.length > 0 && (
                                <View className="mb-6">
                                    <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Personal Atendiendo</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        {activeSession.staff.map((s) => (
                                            <View key={s.id} className="bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                                                <Text className="text-gray-700 font-medium text-xs">{s.name}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-xl font-bold text-gray-900">Total</Text>
                                <Text className="text-2xl font-extrabold text-gray-900">${sessionTotal.toFixed(2)}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={handlePayBill}
                                className="bg-black py-4 rounded-2xl items-center shadow-lg"
                                style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}
                            >
                                <Text className="font-bold text-white text-lg">Pay Bill</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}
