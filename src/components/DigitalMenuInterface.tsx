import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, ActivityIndicator, StatusBar, Platform, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, ChevronLeft, Plus, Minus, FileText, Utensils, CheckCircle } from 'lucide-react-native';
import { colors } from '../styles/theme';
import { subscribeToGuestCategories, subscribeToGuestProducts, getTableDetails, sendOrderToKitchen, subscribeToActiveSession } from '../services/guestMenu';
import { subscribeToRestaurantConfig } from '../services/menu';
import { Category, Product, Table, OrderItem, RestaurantSettings, SelectedModifier, ModifierGroup, ModifierOption } from '../types/firestore';

interface CartItem {
    cartId: string;
    product: Product;
    quantity: number;
    modifiers: SelectedModifier[];
}

interface DigitalMenuInterfaceProps {
    restaurantId: string;
    tableId?: string; // Optional for takeout
    mode?: 'guest' | 'waiter' | 'takeout';
    sessionId?: string; // Optional pre-supplied session ID
    onCheckout?: (cart: CartItem[]) => void;
    directSessionData?: OrderItem[]; // [CASHIER MODE] Inject live order items directly
    onSuccess?: () => void; // Callback when order is sent successfully
    onRequestPayment?: () => void; // Callback to switch to payment
}

export default function DigitalMenuInterface({ restaurantId, tableId, mode = 'guest', sessionId: initialSessionId, onCheckout, directSessionData, onSuccess, onRequestPayment }: DigitalMenuInterfaceProps) {
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

    // Modifier Selection State
    const [modifierModalVisible, setModifierModalVisible] = useState(false);
    const [selectedProductForModifiers, setSelectedProductForModifiers] = useState<Product | null>(null);
    const [tempSelectedModifiers, setTempSelectedModifiers] = useState<SelectedModifier[]>([]);

    // Order Preview State
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [clientName, setClientName] = useState('');

    // Shared Session State
    const [sessionItems, setSessionItems] = useState<OrderItem[]>([]);
    const [sessionTotal, setSessionTotal] = useState(0);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);

    useEffect(() => {
        if (!restaurantId) return;
        if (mode !== 'takeout' && !tableId) return;

        const loadData = async () => {
            try {
                // Fetch static data
                if (tableId) {
                    const tableData = await getTableDetails(restaurantId, tableId);
                    setTable(tableData);
                }

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

                if (tableId) {
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
                } else {
                    setLoading(false);
                    return () => {
                        unsubCats();
                        unsubProds();
                        unsubConfig();
                    };
                }
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };

        loadData();
    }, [restaurantId, tableId]);

    // Cart Logic
    const addToCart = (product: Product) => {
        console.log('🛒 addToCart called for:', product.name);
        console.log('🛒 Modifiers:', JSON.stringify(product.modifiers));

        // Check if product has modifiers
        if (product.modifiers && product.modifiers.length > 0) {
            console.log('✨ Opening modifier modal');
            setSelectedProductForModifiers(product);
            setTempSelectedModifiers([]);
            setModifierModalVisible(true);
        } else {
            console.log('➕ Adding directly to cart (no modifiers)');
            addItemToCart(product, []);
        }
    };

    const addItemToCart = (product: Product, modifiers: SelectedModifier[]) => {
        console.log('here')
        setCart(prev => {
            // Check if identical item exists (same product + same modifiers)
            const existingIndex = prev.findIndex(item =>
                item.product.id === product.id &&
                JSON.stringify(item.modifiers.sort((a, b) => a.id.localeCompare(b.id))) === JSON.stringify(modifiers.sort((a, b) => a.id.localeCompare(b.id)))
            );

            if (existingIndex >= 0) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += 1;
                return newCart;
            }

            return [...prev, {
                cartId: `${product.id}-${Date.now()}-${Math.random()}`,
                product,
                quantity: 1,
                modifiers
            }];
        });
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.cartId === cartId);
            if (existing && existing.quantity > 1) {
                return prev.map(item => item.cartId === cartId ? { ...item, quantity: item.quantity - 1 } : item);
            }
            return prev.filter(item => item.cartId !== cartId);
        });
    };

    const getQuantity = (productId: string) => {
        // This is tricky with modifiers. We probably want to show total quantity of that product regardless of modifiers in the list view?
        // Or maybe just show a "+" button always if it has modifiers?
        // For now, let's sum up all instances of this product
        return cart.filter(item => item.product.id === productId).reduce((sum, item) => sum + item.quantity, 0);
    };

    const cartTotal = useMemo(() => cart.reduce((sum, item) => {
        const modifiersPrice = item.modifiers.reduce((mSum, mod) => mSum + mod.price, 0);
        return sum + ((item.product.price + modifiersPrice) * item.quantity);
    }, 0), [cart]);

    const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

    // Modifier Logic
    const toggleModifier = (group: ModifierGroup, option: ModifierOption) => {
        setTempSelectedModifiers(prev => {
            const currentInGroup = prev.filter(m => m.group_name === group.name);
            const isSelected = prev.some(m => m.id === option.id);

            if (isSelected) {
                return prev.filter(m => m.id !== option.id);
            } else {
                // Check Max Selections
                if (group.max_selections > 0 && currentInGroup.length >= group.max_selections) {
                    // If max is 1, swap. Else, do nothing (or alert)
                    if (group.max_selections === 1) {
                        // Remove other items from this group and add new one
                        const others = prev.filter(m => m.group_name !== group.name);
                        return [...others, { id: option.id, name: option.name, price: option.price, group_name: group.name }];
                    }
                    return prev;
                }
                return [...prev, { id: option.id, name: option.name, price: option.price, group_name: group.name }];
            }
        });
    };

    const handleConfirmModifiers = () => {
        if (!selectedProductForModifiers) return;

        // Validate Required Groups
        const missingRequirements = selectedProductForModifiers.modifiers?.filter(group => {
            const count = tempSelectedModifiers.filter(m => m.group_name === group.name).length;
            return count < group.min_selections;
        });

        if (missingRequirements && missingRequirements.length > 0) {
            alert(`Please select at least ${missingRequirements[0].min_selections} option(s) for ${missingRequirements[0].name}`);
            return;
        }

        addItemToCart(selectedProductForModifiers, tempSelectedModifiers);
        setModifierModalVisible(false);
        setSelectedProductForModifiers(null);
        setTempSelectedModifiers([]);
    };

    const handleSendOrder = () => {
        if (mode === 'takeout') {
            if (onCheckout) onCheckout(cart);
            return;
        }
        // Open preview modal instead of sending directly
        setPreviewModalVisible(true);
    };

    const handleConfirmOrder = async () => {
        if (!restaurantId || !tableId) return;
        setLoading(true);
        setPreviewModalVisible(false);
        try {
            // Include created_by in the order
            const createdById = mode === 'waiter' ? `waiter-app` : undefined;

            // Transform cart items to the format expected by sendOrderToKitchen
            const itemsForService = cart.map(item => ({
                product: item.product,
                quantity: item.quantity,
                modifiers: item.modifiers
            }));

            await sendOrderToKitchen(restaurantId, tableId, itemsForService as any, createdById, clientName || undefined);
            setCart([]);
            setClientName(''); // Reset client name
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
        // [CASHIER FIX] If a custom payment handler is provided (e.g. from Dashboard Modal), use it!
        // This prevents navigating away to /pay/* and instead lets the dashboard switch modals.
        if (onRequestPayment) {
            console.log('💳 [DigitalMenu] Delegate payment to parent (onRequestPayment)');
            onRequestPayment();
            return;
        }

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
                            <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                {mode === 'takeout' ? 'PEDIDO PARA LLEVAR' : 'MENU'}
                            </Text>
                            <Text className="text-2xl font-extrabold text-gray-900">
                                {mode === 'takeout' ? 'Llevar' : (table?.name || 'Table')}
                            </Text>
                        </>
                    )}
                </View>
                {/* Tabs - Only show if not takeout (takeout doesn't have active bill usually) */}
                {mode !== 'takeout' && (
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
                )}
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

                                        {/* Ordering Controls - Check allow_guest_ordering unless mode is waiter or takeout (takeout always orders) */}
                                        {(allowOrdering || mode === 'waiter' || mode === 'takeout') && (
                                            getQuantity(item.id) === 0 ? (
                                                <TouchableOpacity
                                                    onPress={() => addToCart(item)}
                                                    className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center active:bg-gray-200"
                                                >
                                                    <Plus size={20} color="black" />
                                                </TouchableOpacity>
                                            ) : (
                                                <View className="flex-row items-center bg-black rounded-full px-1" style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}>
                                                    {/* If item has modifiers, we can't easily remove "one" without knowing which one. 
                                                        So for now, if it has modifiers, maybe just show the count and a plus button to add another config?
                                                        Or we just show the Plus button always if it has modifiers?
                                                        
                                                        Let's simplify: If it has modifiers, always show Plus button style (maybe with a count badge if > 0).
                                                        Removing specific modifier combos is done in the Cart view (which we don't have fully detailed here, just the summary).
                                                        
                                                        For this view, let's just allow ADDING.
                                                    */}
                                                    {item.modifiers && item.modifiers.length > 0 ? (
                                                        <TouchableOpacity onPress={() => addToCart(item)} className="flex-row items-center px-3 py-2">
                                                            <Text className="text-white font-bold mr-1">{getQuantity(item.id)}</Text>
                                                            <Plus size={16} color="white" />
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <>
                                                            <TouchableOpacity onPress={() => {
                                                                // Find the cart item for this product (simple case)
                                                                const cartItem = cart.find(c => c.product.id === item.id);
                                                                if (cartItem) removeFromCart(cartItem.cartId);
                                                            }} className="w-8 h-8 items-center justify-center">
                                                                <Minus size={16} color="white" />
                                                            </TouchableOpacity>
                                                            <Text className="text-white font-bold w-4 text-center">{getQuantity(item.id)}</Text>
                                                            <TouchableOpacity onPress={() => addToCart(item)} className="w-8 h-8 items-center justify-center">
                                                                <Plus size={16} color="white" />
                                                            </TouchableOpacity>
                                                        </>
                                                    )}
                                                </View>
                                            )
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}
                    />

                    {/* Floating Action Bar (Cart) */}
                    {(allowOrdering || mode === 'waiter' || mode === 'takeout') && cartCount > 0 && (
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
                                    <Text className="text-white font-bold text-lg">
                                        {mode === 'takeout' ? 'Ver Carrito / Checkout' : 'Send to Kitchen'}
                                    </Text>
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
                                                {item.created_by_name || 'Cliente'}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Modifiers */}
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

            {/* Modifier Selection Modal */}
            <Modal visible={modifierModalVisible} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl h-[80%] overflow-hidden">
                        <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
                            <Text className="text-lg font-bold text-gray-900">Customize {selectedProductForModifiers?.name}</Text>
                            <TouchableOpacity onPress={() => {
                                setModifierModalVisible(false);
                                setSelectedProductForModifiers(null);
                                setTempSelectedModifiers([]);
                            }}>
                                <Text className="text-gray-500 font-bold">Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                            {selectedProductForModifiers?.modifiers?.map((group, gIdx) => (
                                <View key={group.id} className="mb-6">
                                    <View className="flex-row justify-between items-center mb-3">
                                        <Text className="text-lg font-bold text-gray-800">{group.name}</Text>
                                        <View className="bg-gray-100 px-2 py-1 rounded">
                                            <Text className="text-xs text-gray-500 font-medium">
                                                {group.required ? 'Required' : 'Optional'} • {group.max_selections > 1 ? `Max ${group.max_selections}` : 'Select 1'}
                                            </Text>
                                        </View>
                                    </View>

                                    {group.options.map((option) => {
                                        const isSelected = tempSelectedModifiers.some(m => m.id === option.id);
                                        return (
                                            <TouchableOpacity
                                                key={option.id}
                                                onPress={() => toggleModifier(group, option)}
                                                className={`flex-row justify-between items-center p-4 mb-2 rounded-xl border ${isSelected ? 'bg-orange-50 border-orange-500' : 'bg-white border-gray-200'}`}
                                            >
                                                <Text className={`font-medium ${isSelected ? 'text-orange-700' : 'text-gray-700'}`}>{option.name}</Text>
                                                <View className="flex-row items-center">
                                                    {option.price > 0 && (
                                                        <Text className="text-gray-500 mr-3">+${option.price.toFixed(2)}</Text>
                                                    )}
                                                    <View className={`w-5 h-5 rounded-full border items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                                                        {isSelected && <View className="w-2 h-2 bg-white rounded-full" />}
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ))}
                        </ScrollView>

                        <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom + 10 }}>
                            <TouchableOpacity
                                onPress={handleConfirmModifiers}
                                className="bg-black py-4 rounded-xl items-center shadow-lg"
                                style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}
                            >
                                <Text className="text-white font-bold text-lg">
                                    Add to Order • ${(selectedProductForModifiers ? (selectedProductForModifiers.price + tempSelectedModifiers.reduce((sum, m) => sum + m.price, 0)) : 0).toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Order Preview Modal */}
            <Modal visible={previewModalVisible} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl h-[75%] overflow-hidden">
                        <View className="p-6 border-b border-gray-100">
                            <Text className="text-2xl font-bold text-gray-900">Confirmar Pedido</Text>
                            <Text className="text-gray-500 mt-1">Revisa tu orden antes de enviarla</Text>
                        </View>

                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                            {/* Cart Items */}
                            {cart.map((item, idx) => {
                                const itemTotal = (item.product.price + item.modifiers.reduce((sum, m) => sum + m.price, 0)) * item.quantity;
                                return (
                                    <View key={item.cartId} className="mb-4 pb-4 border-b border-gray-100">
                                        <View className="flex-row justify-between items-start">
                                            <View className="flex-1">
                                                <Text className="text-lg font-semibold text-gray-900">
                                                    {item.quantity}x {item.product.name}
                                                </Text>
                                                {item.modifiers.length > 0 && (
                                                    <View className="mt-2">
                                                        {item.modifiers.map((mod, mIdx) => (
                                                            <Text key={mIdx} className="text-sm text-gray-600">
                                                                + {mod.name} {mod.price > 0 ? `($${mod.price.toFixed(2)})` : ''}
                                                            </Text>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                            <Text className="text-lg font-bold text-gray-900 ml-4">
                                                ${itemTotal.toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}

                            {/* Client Name Input */}
                            <View className="mt-6">
                                <Text className="text-base font-semibold text-gray-900 mb-2">Tu Nombre (Opcional)</Text>
                                <TextInput
                                    value={clientName}
                                    onChangeText={setClientName}
                                    placeholder="Ej: Juan Pérez"
                                    className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                                    placeholderTextColor="#999"
                                />
                                <Text className="text-xs text-gray-500 mt-1">
                                    Para identificar tu pedido en la cuenta
                                </Text>
                            </View>

                            {/* Total */}
                            <View className="mt-6 pt-4 border-t-2 border-gray-200">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-xl font-bold text-gray-900">Total</Text>
                                    <Text className="text-2xl font-extrabold text-gray-900">${cartTotal.toFixed(2)}</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom + 10 }}>
                            <TouchableOpacity
                                onPress={handleConfirmOrder}
                                className="bg-black py-4 rounded-xl items-center shadow-lg mb-2"
                                style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}
                            >
                                <Text className="text-white font-bold text-lg">
                                    Confirmar y Enviar a Cocina
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setPreviewModalVisible(false)}
                                className="bg-gray-100 py-4 rounded-xl items-center"
                            >
                                <Text className="text-gray-700 font-semibold text-base">Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
