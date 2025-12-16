import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Alert, Platform, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2, QrCode } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import AirbnbButton from '../../../src/components/AirbnbButton';
import AirbnbInput from '../../../src/components/AirbnbInput';
import { colors } from '../../../src/styles/theme';
import QRCodeModal from '../../../src/components/QRCodeModal';
import { subscribeToRestaurantConfig } from '../../../src/services/menu';
import { Table, RestaurantSettings } from '../../../src/types/firestore';
import { subscribeToTables, createTable, deleteTable } from '../../../src/services/tables';

const RESTAURANT_ID = 'kiitos-main';

export default function TablesManagementScreen() {
    const insets = useSafeAreaInsets();
    const [tables, setTables] = useState<Table[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [tableName, setTableName] = useState('');
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [restaurantConfig, setRestaurantConfig] = useState<RestaurantSettings | null>(null);

    useEffect(() => {
        const unsubscribeTables = subscribeToTables(RESTAURANT_ID, setTables);
        const unsubscribeConfig = subscribeToRestaurantConfig(RESTAURANT_ID, setRestaurantConfig);

        return () => {
            unsubscribeTables();
            unsubscribeConfig();
        };
    }, []);

    const handleCreateTable = async () => {
        if (!tableName.trim()) return;
        try {
            await createTable(tableName);
            setModalVisible(false);
            setTableName('');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const confirmDelete = (id: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this table?')) {
                deleteTable(id);
            }
        } else {
            Alert.alert('Confirm Delete', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteTable(id) }
            ]);
        }
    };

    const openQrModal = (table: Table) => {
        setSelectedTable(table);
        setQrModalVisible(true);
    };

    // Use hardcoded restaurantId 'kiitos-main' matching services
    // Use dynamic URL for web, fallback for native
    const getQrValue = (tableId: string) => {
        const baseUrl = Platform.OS === 'web' ? window.location.origin : 'https://kiitos.app';
        return `${baseUrl}/menu/kiitos-main/${tableId}`;
    };

    return (
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-slate-800 bg-slate-900 z-10">
                <Text className="text-2xl font-bold text-white">Guest Tables</Text>
                <AirbnbButton
                    title="New Table"
                    variant="primary"
                    size="sm"
                    onPress={() => setModalVisible(true)}
                    fullWidth={false}
                />
            </View>

            {/* Grid */}
            <FlatList
                data={tables}
                keyExtractor={item => item.id}
                numColumns={Platform.OS === 'web' ? 4 : 2} // Adaptive columns
                key={Platform.OS === 'web' ? 'web-4' : 'mobile-2'} // Force re-render on platform change
                columnWrapperStyle={{ gap: 16 }}
                contentContainerStyle={{ padding: 16, gap: 16 }}
                renderItem={({ item }) => (
                    <View className={`flex-1 p-4 rounded-xl border ${item.status === 'occupied' ? 'bg-slate-800 border-red-500' : 'bg-slate-800 border-green-500'}`}>
                        <View className="flex-row justify-between items-start mb-4">
                            <Text className="text-xl font-bold text-white">{item.name}</Text>
                            <View className={`w-3 h-3 rounded-full ${item.status === 'occupied' ? 'bg-red-500' : 'bg-green-500'}`} />
                        </View>

                        <View className="flex-row justify-between items-center mt-2">
                            <TouchableOpacity onPress={() => openQrModal(item)} className="p-2 bg-white rounded-lg">
                                <QrCode size={20} color="black" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => confirmDelete(item.id)} className="p-2">
                                <Trash2 size={20} color={colors.chile} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            {/* Create Table Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                {Platform.OS === 'web' ? (
                    <View className="flex-1 justify-center items-center bg-black/60 px-4">
                        <View className="bg-white w-full max-w-sm p-6 rounded-2xl">
                            <Text className="text-xl font-bold mb-4 text-slate-900">New Table</Text>
                            <AirbnbInput label="Table Name" value={tableName} onChangeText={setTableName} placeholder="Window 1" />
                            <View className="flex-row justify-end mt-4 space-x-2">
                                <TouchableOpacity onPress={() => setModalVisible(false)} className="px-4 py-2">
                                    <Text className="text-slate-500 font-medium">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleCreateTable} className="bg-indigo-600 px-4 py-2 rounded-lg">
                                    <Text className="text-white font-medium">Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center items-center bg-black/60 px-4">
                            <View className="bg-white w-full max-w-sm p-6 rounded-2xl">
                                <Text className="text-xl font-bold mb-4 text-slate-900">New Table</Text>
                                <AirbnbInput label="Table Name" value={tableName} onChangeText={setTableName} placeholder="Window 1" />
                                <View className="flex-row justify-end mt-4 space-x-2">
                                    <TouchableOpacity onPress={() => setModalVisible(false)} className="px-4 py-2">
                                        <Text className="text-slate-500 font-medium">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleCreateTable} className="bg-indigo-600 px-4 py-2 rounded-lg">
                                        <Text className="text-white font-medium">Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                )}
            </Modal>

            {/* QR Modal Component */}
            <QRCodeModal
                visible={qrModalVisible}
                onClose={() => setQrModalVisible(false)}
                table={selectedTable}
                restaurantConfig={restaurantConfig}
                restaurantId={RESTAURANT_ID}
            />
        </View>
    );
}
