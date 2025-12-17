import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, ActivityIndicator, StatusBar, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, ChevronLeft, Plus, Minus, FileText, Utensils, CheckCircle } from 'lucide-react-native';
import { colors } from '../styles/theme';
import { subscribeToGuestCategories, subscribeToGuestProducts, getTableDetails, sendOrderToKitchen, subscribeToActiveSession } from '../services/guestMenu';
import { subscribeToRestaurantConfig } from '../services/menu';
import { Category, Product, Table, OrderItem, RestaurantSettings } from '../types/firestore';

interface CartItem {
    product: Product;
    quantity: number;
}

interface DigitalMenuInterfaceProps {
    restaurantId: string;
    tableId: string;
    mode?: 'guest' | 'waiter';
    sessionId?: string; // Optional pre-supplied session ID
}

export default function DigitalMenuInterface({ restaurantId, tableId, mode = 'guest', sessionId: initialSessionId }: DigitalMenuInterfaceProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Data State
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [table, setTable] = useState<Table | null>(null);
    const [allowOrdering, setAllowOrdering] = useState(false);
    const [loading, setLoading] = useState(true);
    const [branding, setBranding] = useState<RestaurantSettings['branding']>(undefined);

    // UI State
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeTab, setActiveTab] = useState<'menu' | 'bill'>('menu');
    const [successModalVisible, setSuccessModalVisible] = useState(false);

    // Shared Session State
    const [sessionItems, setSessionItems] = useState<OrderItem[]>([]);
    const [sessionTotal, setSessionTotal] = useState(0);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);

    useEffect(() => {
        if (!restaurantId || !tableId) return;

        const loadData = async () => {
            try {
                // Fetch static data
                const tableData = await getTableDetails(restaurantId, tableId);
                setTable(tableData);

                // Realtime subscriptions
                const unsubCats = subscribeToGuestCategories(restaurantId, (data) => {
                    setCategories(data);
                    if (data.length > 0 && !selectedCategory) {
                        setSelectedCategory(data[0].id);
                    }
                });
                const unsubProds = subscribeToGuestProducts(restaurantId, setProducts);

                const unsubConfig = subscribeToRestaurantConfig(restaurantId, (config) => {
                    setAllowOrdering(config.allow_guest_ordering ?? false);
                    setBranding(config.branding);
                });

                const unsubSession = subscribeToActiveSession(restaurantId, tableId, (items, total, sessionId) => {
                    setSessionItems(items);
                    setSessionTotal(total);
                    setCurrentSessionId(sessionId);
                });

                setLoading(false);

                return () => {
                    unsubCats();
                    unsubProds();
                    unsubConfig();
                    if (unsubSession) unsubSession();
                };
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };

        loadData();
    }, [restaurantId, tableId]);

    // Cart Logic
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === productId);
            if (existing && existing.quantity > 1) {
                return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
            }
            return prev.filter(item => item.product.id !== productId);
        });
    };

    const getQuantity = (productId: string) => cart.find(item => item.product.id === productId)?.quantity || 0;

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), [cart]);
    const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

    const handleSendOrder = async () => {
        if (!restaurantId || !tableId) return;
        setLoading(true);
        try {
            // Include created_by in the order
            const createdById = mode === 'waiter' ? `waiter-app` : undefined; // Backend should handle assigning specific waiter ID if not provided, or we can improve this.
            // For now, let's just use 'waiter-app' as a generic ID or allow the service to handle 'waiter' vs 'guest' via the 'created_by' field which sendOrderToKitchen might default to guest.
            // Let's modify sendOrderToKitchen if needed, but for now passing cart is standard.
            // DigitalMenuScreen previously didn't pass created_by, so it defaulted to guest.
            // We need to check if sendOrderToKitchen accepts a creator.
            // As per previous file view of waiter/pos.tsx: await sendOrderToKitchen(restaurantId, tableId!, cart, createdById);

            await sendOrderToKitchen(restaurantId, tableId, cart, createdById);
            setCart([]);
            setSuccessModalVisible(true);
            setTimeout(() => {
                setSuccessModalVisible(false);
                setActiveTab('bill');
            }, 2000);
        } catch (e) {
            console.error(e);
            alert("Error enviando pedido. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    // Render Helper for Status
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return '🕒';
            case 'preparing': return '🍳';
            case 'ready': return '✅';
            case 'served': return '🍽️';
            default: return '🕒';
        }
    };

    const handlePayBill = () => {
        if (currentSessionId) {
            router.push({
                pathname: "/pay/[id]",
                params: {
                    id: currentSessionId,
                    restaurantId: restaurantId,
                    mode: mode // Pass the mode ('guest' or 'waiter') to the payment screen
                }
            });
        } else {
            alert("No active session found.");
        }
    };

    // Filtered Products
    const visibleProducts = useMemo(() => {
        if (!selectedCategory) return [];
        return products.filter(p => p.category_id === selectedCategory && p.available);
    }, [products, selectedCategory]);

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
            <View className="px-5 py-4 flex-row justify-between items-center bg-white border-b border-gray-100">
                <View>
                    {mode === 'waiter' && (
                        <View className="bg-orange-100 px-2 py-0.5 rounded self-start mb-1 border border-orange-200">
                            <Text className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">PORTAL MESERO</Text>
                        </View>
                    )}

                    {branding?.logo_url ? (
                        <Image
                            source={{ uri: branding.logo_url }}
                            className="h-10 w-32"
                            resizeMode="contain"
                        />
                    ) : (
                        <>
                            <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest">MENU</Text>
                            <Text className="text-2xl font-extrabold text-gray-900">{table?.name || 'Table'}</Text>
                        </>
                    )}
                </View>
                {/* Tabs */}
                <View className="flex-row bg-gray-100 p-1 rounded-xl">
                    <TouchableOpacity
                        onPress={() => setActiveTab('menu')}
                        className={`px-4 py-2 rounded-lg ${activeTab === 'menu' ? 'bg-white shadow-sm' : ''}`}
                        style={activeTab === 'menu' && branding?.primary_color ? { borderBottomWidth: 2, borderBottomColor: branding.primary_color } : {}}
                    >
                        <Utensils size={18} color={activeTab === 'menu' && branding?.primary_color ? branding.primary_color : (activeTab === 'menu' ? 'black' : 'gray')} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('bill')}
                        className={`px-4 py-2 rounded-lg ${activeTab === 'bill' ? 'bg-white shadow-sm' : ''}`}
                        style={activeTab === 'bill' && branding?.primary_color ? { borderBottomWidth: 2, borderBottomColor: branding.primary_color } : {}}
                    >
                        <FileText size={18} color={activeTab === 'bill' && branding?.primary_color ? branding.primary_color : (activeTab === 'bill' ? 'black' : 'gray')} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* TAB CONTENT: MENU */}
            {activeTab === 'menu' && (
                <>
                    {/* Categories Pills */}
                    <View className="py-3">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    className={`px-5 py-2 rounded-full border ${selectedCategory === cat.id ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                                    style={selectedCategory === cat.id && branding?.primary_color ? { backgroundColor: branding.primary_color, borderColor: branding.primary_color } : {}}
                                >
                                    <Text className={`font-semibold ${selectedCategory === cat.id ? 'text-white' : 'text-gray-700'}`}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Products List */}
                    <FlatList
                        data={visibleProducts}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View className="items-center justify-center py-20">
                                <Text className="text-gray-400">No products available in this category.</Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <View className="flex-row mb-6 bg-white">
                                {/* Image */}
                                {item.image_url ? (
                                    <Image source={{ uri: item.image_url }} className="w-28 h-28 rounded-xl bg-gray-100 mr-4" resizeMode="cover" />
                                ) : (
                                    <View className="w-28 h-28 rounded-xl bg-gray-100 mr-4 items-center justify-center">
                                        <Text className="text-2xl">🍔</Text>
                                    </View>
                                )}

                                {/* Content */}
                                <View className="flex-1 justify-between py-1">
                                    <View>
                                        <Text className="text-lg font-bold text-gray-900 leading-tight mb-1">{item.name}</Text>
                                        <Text className="text-gray-500 text-sm leading-snug" numberOfLines={2}>{item.description}</Text>
                                    </View>

                                    <View className="flex-row justify-between items-center mt-3">
                                        <Text className="text-base font-semibold text-gray-900" style={branding?.primary_color ? { color: branding.primary_color } : {}}>${item.price.toFixed(2)}</Text>

                                        {/* Ordering Controls - Check allow_guest_ordering unless mode is waiter (waiters always order) */}
                                        {(allowOrdering || mode === 'waiter') && (
                                            getQuantity(item.id) === 0 ? (
                                                <TouchableOpacity
                                                    onPress={() => addToCart(item)}
                                                    className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center active:bg-gray-200"
                                                >
                                                    <Plus size={20} color="black" />
                                                </TouchableOpacity>
                                            ) : (
                                                <View className="flex-row items-center bg-black rounded-full px-1" style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}>
                                                    <TouchableOpacity onPress={() => removeFromCart(item.id)} className="w-8 h-8 items-center justify-center">
                                                        <Minus size={16} color="white" />
                                                    </TouchableOpacity>
                                                    <Text className="text-white font-bold w-4 text-center">{getQuantity(item.id)}</Text>
                                                    <TouchableOpacity onPress={() => addToCart(item)} className="w-8 h-8 items-center justify-center">
                                                        <Plus size={16} color="white" />
                                                    </TouchableOpacity>
                                                </View>
                                            )
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}
                    />

                    {/* Floating Action Bar (Cart) */}
                    {(allowOrdering || mode === 'waiter') && cartCount > 0 && (
                        <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom + 10 }}>
                            <TouchableOpacity
                                onPress={handleSendOrder}
                                className="bg-black py-4 px-6 rounded-2xl flex-row justify-between items-center shadow-lg"
                                style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}
                            >
                                <View className="flex-row items-center">
                                    <View className="bg-white/20 px-2 py-1 rounded text-xs mr-3">
                                        <Text className="text-white font-bold">{cartCount}</Text>
                                    </View>
                                    <Text className="text-white font-bold text-lg">Send to Kitchen</Text>
                                </View>
                                <Text className="text-white font-bold text-lg">${cartTotal.toFixed(2)}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}

            {/* TAB CONTENT: BILL */}
            {activeTab === 'bill' && (
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
                                                Cliente
                                            </Text>
                                        </View>
                                    )}

                                    <Text className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                                        {getStatusIcon(item.status || 'sent')} {item.status || 'Sent'}
                                    </Text>
                                </View>
                            </View>
                            <Text className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</Text>
                        </View>
                    )}
                    ListFooterComponent={
                        sessionItems.length > 0 ? (
                            <View className="mt-8 pt-4 border-t border-gray-200">
                                <View className="flex-row justify-between items-center mb-6">
                                    <Text className="text-xl font-bold text-gray-900">Total</Text>
                                    <Text className="text-2xl font-extrabold text-gray-900">${sessionTotal.toFixed(2)}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={handlePayBill}
                                    className="bg-black py-4 rounded-2xl items-center shadow-lg"
                                    style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}
                                >
                                    <Text className="font-bold text-white text-lg">
                                        {mode === 'waiter' ? 'Cobrar / Pagar' : 'Pay Bill'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Success Modal */}
            <Modal visible={successModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/70">
                    <View className="bg-white p-8 rounded-3xl items-center shadow-xl m-6">
                        <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                            <CheckCircle size={40} color={colors.albahaca} />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">¡Pedido Enviado!</Text>
                        <Text className="text-gray-500 text-center text-lg">Tus alimentos se están preparando.</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
