import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, ActivityIndicator, StatusBar, Platform, Modal, TextInput, Pressable } from 'react-native';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, ChevronLeft, Plus, Minus, FileText, Utensils, CheckCircle, Clock, Smartphone, UserCircle } from 'lucide-react-native';
import { colors } from '../styles/theme';
import { subscribeToGuestCategories, subscribeToGuestProducts, getTableDetails, sendOrderToKitchen, subscribeToActiveSession } from '../services/guestMenu';
import { subscribeToRestaurantConfig } from '../services/menu';
import { subscribeToSession, joinSession } from '../services/sessions';
import { Category, Product, Table, OrderItem, RestaurantSettings, SelectedModifier, ModifierGroup, ModifierOption, Session, SessionStaff } from '../types/firestore';
import { useAuth } from '../context/AuthContext';
import CustomerPhoneAuth from './auth/CustomerPhoneAuth';

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
    navigationProp?: any;
    routerProp?: any;
}

export default function DigitalMenuInterface({ restaurantId, tableId, mode = 'guest', sessionId: initialSessionId, onCheckout, directSessionData, onSuccess, onRequestPayment, navigationProp, routerProp }: DigitalMenuInterfaceProps) {
    const insets = useSafeAreaInsets();
    // const router = useRouter();
    // const navigation = useNavigation<any>();

    // Data State
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [table, setTable] = useState<Table | null>(null);
    const [allowOrdering, setAllowOrdering] = useState(false);
    const [loading, setLoading] = useState(true);
    const [branding, setBranding] = useState<RestaurantSettings['branding']>(undefined);
    const [openingHours, setOpeningHours] = useState<any>(null);

    // UI State
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeTab, setActiveTab] = useState<'menu' | 'bill'>('menu');
    const [successModalVisible, setSuccessModalVisible] = useState(false);

    // Detail Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
    const [detailQuantity, setDetailQuantity] = useState(1);

    // Modifier Selection State
    const [modifierModalVisible, setModifierModalVisible] = useState(false);
    const [selectedProductForModifiers, setSelectedProductForModifiers] = useState<Product | null>(null);
    const [tempSelectedModifiers, setTempSelectedModifiers] = useState<SelectedModifier[]>([]);

    // Order Preview State
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [clientName, setClientName] = useState('');
    const [authMode, setAuthMode] = useState<'phone' | 'guest'>('phone');

    // Shared Session State
    const [sessionItems, setSessionItems] = useState<OrderItem[]>(directSessionData || []);
    const [sessionTotal, setSessionTotal] = useState(0);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const { user } = useAuth();

    // Auth flow state
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);

    const unsubsRef = useRef<(() => void)[]>([]);

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
                unsubsRef.current.push(unsubCats);

                const unsubProds = subscribeToGuestProducts(restaurantId, setProducts);
                unsubsRef.current.push(unsubProds);

                const unsubConfig = subscribeToRestaurantConfig(restaurantId, (config) => {
                    setAllowOrdering(config.allow_guest_ordering ?? false);
                    setBranding(config.branding);
                    setOpeningHours(config.opening_hours);
                });
                unsubsRef.current.push(unsubConfig);

                if (tableId && tableId !== 'counter') {
                    const unsubSession = subscribeToActiveSession(restaurantId, tableId, (items, total, sessionId, session) => {
                        setSessionItems(items);
                        setSessionTotal(total);
                        setCurrentSessionId(sessionId);
                        if (session) setActiveSession(session);
                    });
                    unsubsRef.current.push(unsubSession);
                }

                // [ADD] If we have a sessionId but no table subscription (e.g., Counter Mode),
                // subscribe to the session directly for live updates.
                if (tableId === 'counter' && currentSessionId) {
                    const unsubSession = subscribeToSession(currentSessionId, (session) => {
                        if (session) {
                            setActiveSession(session);
                            setSessionItems(session.items || []);
                            setSessionTotal(session.total || 0);
                        }
                    }, restaurantId);
                    unsubsRef.current.push(unsubSession);
                }

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

    // Auto-join session for waiters
    useEffect(() => {
        if (mode === 'waiter' && user && activeSession && currentSessionId) {
            const isJoined = activeSession.staff?.some(s => s.id === user.id);
            if (!isJoined) {
                console.log('🤖 [DigitalMenu] Auto-joining waiter to session');
                joinSession(restaurantId, currentSessionId, user.id, user.name).catch(console.error);
            }
        }
    }, [activeSession, user, mode, currentSessionId, restaurantId]);

    const isRestaurantOpen = useMemo(() => {
        if (!openingHours) return true; // Default to open if not configured yet

        const now = new Date();
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDay = days[now.getDay()];
        const dayConfig = openingHours[currentDay];

        if (!dayConfig || dayConfig.closed) return false;

        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [openH, openM] = dayConfig.open.split(':').map(Number);
        const [closeH, closeM] = dayConfig.close.split(':').map(Number);

        const openTime = openH * 60 + openM;
        const closeTime = closeH * 60 + closeM;

        // Handle cases where closing time is after midnight (e.g., 09:00 to 02:00)
        if (closeTime < openTime) {
            return currentTime >= openTime || currentTime <= closeTime;
        }

        return currentTime >= openTime && currentTime <= closeTime;
    }, [openingHours]);

    // Auto-submit order when user authenticates via phone auth in modal
    useEffect(() => {
        if (shouldAutoSubmit && user && previewModalVisible) {
            console.log('🔐 User authenticated, auto-submitting order...');
            setShouldAutoSubmit(false);
            setPreviewModalVisible(false);
            // Small delay to ensure state is fully updated
            setTimeout(() => {
                handleConfirmOrder();
            }, 100);
        }
    }, [user, shouldAutoSubmit, previewModalVisible]);

    // Cart Logic
    const openProductDetails = (product: Product) => {
        setSelectedProductForDetail(product);
        setDetailQuantity(1);
        setDetailModalVisible(true);
    };

    const addToCart = (product: Product, quantity: number = 1) => {
        console.log('🛒 addToCart called for:', product.name, 'Qty:', quantity);

        // Check if product has modifiers
        if (product.modifiers && product.modifiers.length > 0) {
            console.log('✨ Opening modifier modal');
            // Close detail modal if open
            setDetailModalVisible(false);

            setSelectedProductForModifiers(product);
            setTempSelectedModifiers([]);
            setModifierModalVisible(true);
        } else {
            console.log('➕ Adding directly to cart (no modifiers)');
            // Close detail modal if open
            setDetailModalVisible(false);

            addItemToCart(product, [], quantity);
        }
    };

    const addItemToCart = (product: Product, modifiers: SelectedModifier[], quantity: number = 1) => {
        console.log('here')
        setCart(prev => {
            // Check if identical item exists (same product + same modifiers)
            const existingIndex = prev.findIndex(item =>
                item.product.id === product.id &&
                JSON.stringify(item.modifiers.sort((a, b) => a.id.localeCompare(b.id))) === JSON.stringify(modifiers.sort((a, b) => a.id.localeCompare(b.id)))
            );

            if (existingIndex >= 0) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += quantity;
                return newCart;
            }

            return [...prev, {
                cartId: `${product.id}-${Date.now()}-${Math.random()}`,
                product,
                quantity: quantity,
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

        addItemToCart(selectedProductForModifiers, tempSelectedModifiers, 1);
        setModifierModalVisible(false);
        setSelectedProductForModifiers(null);
        setTempSelectedModifiers([]);
    };

    const handleSendOrder = () => {
        if (!isRestaurantOpen && mode !== 'waiter') {
            alert("El restaurante está cerrado en este momento. No se pueden enviar pedidos.");
            return;
        }
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

            // Use logged-in user's name or manually entered name
            const finalName = user?.name || clientName;
            await sendOrderToKitchen(restaurantId, tableId, itemsForService as any, createdById, finalName || undefined);
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
            if (routerProp && typeof routerProp.push === 'function') {
                routerProp.push({
                    pathname: "/pay/[id]",
                    params: {
                        id: currentSessionId,
                        restaurantId: restaurantId,
                        mode: mode
                    }
                });
            } else if (navigationProp) {
                // Fallback
                navigationProp.navigate('pay/[id]', {
                    id: currentSessionId,
                    restaurantId: restaurantId,
                    mode: mode
                });
            } else {
                console.error("No navigation or router prop available");
            }
        } else {
            alert("No active session found.");
        }
    };

    const handleJoinSession = async () => {
        if (!restaurantId || !currentSessionId || !user) return;

        try {
            await joinSession(restaurantId, currentSessionId, user.id, user.name);
            alert("Te has unido a la mesa.");
        } catch (e) {
            console.error(e);
            alert("Error al unirse a la mesa.");
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
            <View className="bg-white border-b border-gray-100 pb-3">
                {branding?.logo_url ? (
                    <View className="items-center py-2">
                        <Image
                            source={{ uri: branding.logo_url }}
                            className="h-24 w-60"
                            resizeMode="contain"
                        />
                    </View>
                ) : (
                    <View className="px-5 py-4">
                        <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                            {mode === 'takeout' ? 'PEDIDO PARA LLEVAR' : 'MENU'}
                        </Text>
                        <Text className="text-2xl font-extrabold text-gray-900">
                            {mode === 'takeout' ? 'Llevar' : (table?.name || 'Table')}
                        </Text>
                    </View>
                )}

                <View className="px-5 flex-row justify-between items-center">
                    <View>
                        {mode === 'waiter' && (
                            <View className="flex-row items-center gap-2 mb-1">
                                <View className="bg-orange-100 px-2 py-0.5 rounded self-start border border-orange-200">
                                    <Text className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">PORTAL MESERO</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Tabs - Only show if not takeout (takeout doesn't have active bill usually) */}
                    {mode !== 'takeout' && (
                        <View className="flex-row bg-gray-100 p-1 rounded-xl self-end ml-auto">
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
            </View>

            {/* Closed Banner */}
            {!isRestaurantOpen && mode !== 'waiter' && (
                <View className="bg-red-50 px-5 py-3 border-b border-red-100 flex-row items-center">
                    <Clock size={16} color="#ef4444" className="mr-2" />
                    <Text className="text-red-600 font-medium text-sm flex-1">
                        El restaurante está cerrado. Puedes ver el menú, pero no es posible realizar pedidos.
                    </Text>
                </View>
            )}

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
                            <TouchableOpacity
                                className="flex-row mb-6 bg-white"
                                onPress={() => openProductDetails(item)}
                                activeOpacity={0.7}
                            >
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

                                        {/* Ordering Controls */}
                                        {isRestaurantOpen && (allowOrdering || mode === 'waiter' || mode === 'takeout') && (
                                            getQuantity(item.id) === 0 ? (
                                                <TouchableOpacity
                                                    onPress={() => addToCart(item, 1)}
                                                    className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center active:bg-gray-200"
                                                >
                                                    <Plus size={20} color="black" />
                                                </TouchableOpacity>
                                            ) : (
                                                <View className="flex-row items-center bg-black rounded-full px-1" style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}>
                                                    {item.modifiers && item.modifiers.length > 0 ? (
                                                        <TouchableOpacity onPress={() => addToCart(item, 1)} className="flex-row items-center px-3 py-2">
                                                            <Text className="text-white font-bold mr-1">{getQuantity(item.id)}</Text>
                                                            <Plus size={16} color="white" />
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <>
                                                            <TouchableOpacity onPress={() => {
                                                                const cartItem = cart.find(c => c.product.id === item.id);
                                                                if (cartItem) removeFromCart(cartItem.cartId);
                                                            }} className="w-8 h-8 items-center justify-center">
                                                                <Minus size={16} color="white" />
                                                            </TouchableOpacity>
                                                            <Text className="text-white font-bold w-4 text-center">{getQuantity(item.id)}</Text>
                                                            <TouchableOpacity onPress={() => addToCart(item, 1)} className="w-8 h-8 items-center justify-center">
                                                                <Plus size={16} color="white" />
                                                            </TouchableOpacity>
                                                        </>
                                                    )}
                                                </View>
                                            )
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
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
                    <View className="bg-white rounded-t-3xl h-[85%] overflow-hidden">
                        <View className="p-6 border-b border-gray-100">
                            <Text className="text-2xl font-bold text-gray-900">Confirmar Pedido</Text>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* Order Summary */}
                            <View className="px-5 pt-4 pb-2">
                                {cart.map((item, idx) => {
                                    const itemTotal = (item.product.price + item.modifiers.reduce((sum, m) => sum + m.price, 0)) * item.quantity;
                                    return (
                                        <View key={item.cartId} className="mb-3 pb-3 border-b border-gray-100">
                                            <View className="flex-row justify-between items-start">
                                                <View className="flex-1">
                                                    <Text className="text-base font-semibold text-gray-900">
                                                        {item.quantity}x {item.product.name}
                                                    </Text>
                                                    {item.modifiers.length > 0 && (
                                                        <View className="mt-1">
                                                            {item.modifiers.map((mod, mIdx) => (
                                                                <Text key={mIdx} className="text-xs text-gray-600">
                                                                    + {mod.name} {mod.price > 0 ? `($${mod.price.toFixed(2)})` : ''}
                                                                </Text>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                                <Text className="text-base font-bold text-gray-900 ml-4">
                                                    ${itemTotal.toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Total */}
                            <View className="px-5 py-3 bg-gray-50">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-lg font-bold text-gray-900">Total</Text>
                                    <Text className="text-xl font-extrabold text-gray-900">${cartTotal.toFixed(2)}</Text>
                                </View>
                            </View>

                            {/* Identity Section */}
                            <View className="border-t border-gray-100 pt-4 px-5">
                                {user ? (
                                    // Logged-in user: Show name
                                    <View className="bg-green-50 p-4 rounded-xl border border-green-200">
                                        <View className="flex-row items-center mb-2">
                                            <CheckCircle size={20} color="#10b981" />
                                            <Text className="ml-2 font-bold text-green-800">Sesión Activa</Text>
                                        </View>
                                        <Text className="text-green-700">Pedido a nombre de: <Text className="font-bold">{user.name}</Text></Text>
                                    </View>
                                ) : (
                                    // Anonymous user: Show auth options
                                    <>
                                        <Text className="text-lg font-bold text-gray-900 mb-4">¿Cómo deseas continuar?</Text>

                                        {/* Tab Selector - Wrapped in NavigationIndependentTree + NavigationContainer to isolate context on iOS Modals (RN7 logic) */}
                                        <NavigationIndependentTree>
                                            <NavigationContainer>
                                                <View className="flex-row bg-gray-100 p-1 rounded-xl mb-4">
                                                    <Pressable
                                                        onPress={() => setAuthMode('phone')}
                                                        style={({ pressed }) => [
                                                            { opacity: pressed ? 0.7 : 1 },
                                                            authMode === 'phone' ? { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 } : {}
                                                        ]}
                                                        className={`flex-1 px-4 py-3 rounded-lg`}
                                                    >
                                                        <View className="flex-row items-center justify-center">
                                                            <Smartphone size={18} color={authMode === 'phone' ? colors.roastedSaffron : '#6B7280'} />
                                                            <Text className={`ml-2 font-semibold ${authMode === 'phone' ? 'text-gray-900' : 'text-gray-600'}`}>Celular</Text>
                                                        </View>
                                                    </Pressable>
                                                    <Pressable
                                                        onPress={() => setAuthMode('guest')}
                                                        style={({ pressed }) => [
                                                            { opacity: pressed ? 0.7 : 1 },
                                                            authMode === 'guest' ? { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 } : {}
                                                        ]}
                                                        className={`flex-1 px-4 py-3 rounded-lg`}
                                                    >
                                                        <View className="flex-row items-center justify-center">
                                                            <UserCircle size={18} color={authMode === 'guest' ? colors.roastedSaffron : '#6B7280'} />
                                                            <Text className={`ml-2 font-semibold ${authMode === 'guest' ? 'text-gray-900' : 'text-gray-600'}`}>Invitado</Text>
                                                        </View>
                                                    </Pressable>
                                                </View>
                                            </NavigationContainer>
                                        </NavigationIndependentTree>

                                        {/* Content based on selected mode */}
                                        {authMode === 'phone' ? (
                                            <View>
                                                <Text className="text-xs text-gray-600 mb-3">
                                                    ✨ <Text className="font-semibold">Recomendado:</Text> Guarda tus datos para futuros pedidos y accede a tu historial.
                                                </Text>
                                                <CustomerPhoneAuth
                                                    key={authMode}
                                                    active={authMode === 'phone'}
                                                    compact
                                                    onSuccess={() => {
                                                        // User authenticated, flag for auto-submit
                                                        setIsAuthenticating(false);
                                                        setShouldAutoSubmit(true);
                                                    }}
                                                />
                                            </View>
                                        ) : (
                                            <View>
                                                <Text className="text-sm text-gray-600 mb-3">Continúa sin crear una cuenta. Solo necesitamos tu nombre.</Text>
                                                <TextInput
                                                    value={clientName}
                                                    onChangeText={setClientName}
                                                    placeholder="Tu nombre"
                                                    className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-base"
                                                    autoCapitalize="words"
                                                    placeholderTextColor="#999"
                                                />
                                                <Text className="text-xs text-gray-500 mt-1">
                                                    Para identificar tu pedido en la cuenta
                                                </Text>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </ScrollView>

                        {/* Footer Actions - Only show if user exists OR guest mode */}
                        {(user || authMode === 'guest') && (
                            <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom + 10 }}>
                                <TouchableOpacity
                                    onPress={handleConfirmOrder}
                                    className="bg-black py-4 rounded-xl items-center shadow-lg mb-2"
                                    style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}
                                    disabled={!user && authMode === 'guest' && !clientName}
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
                        )}
                    </View>
                </View>
            </Modal>

            {/* Product Detail Modal */}
            <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-white">
                    <ScrollView>
                        {selectedProductForDetail?.image_url && (
                            <Image source={{ uri: selectedProductForDetail.image_url }} className="w-full h-80 bg-gray-100" resizeMode="cover" />
                        )}
                        <View className="p-6">
                            <View className="flex-row justify-between items-start mb-2">
                                <Text className="text-3xl font-bold text-gray-900 flex-1 mr-4">{selectedProductForDetail?.name}</Text>
                                <Text className="text-2xl font-bold text-gray-900">${selectedProductForDetail?.price.toFixed(2)}</Text>
                            </View>
                            <Text className="text-lg text-gray-500 leading-relaxed mb-6">{selectedProductForDetail?.description}</Text>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View className="p-4 border-t border-gray-100 bg-white shadow-lg" style={{ paddingBottom: insets.bottom + 20 }}>
                        <View className="flex-row items-center gap-4">
                            {/* Quantity Control */}
                            <View className="flex-row items-center bg-gray-100 rounded-full h-14 px-2">
                                <TouchableOpacity
                                    onPress={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                                    className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
                                >
                                    <Minus size={20} color="black" />
                                </TouchableOpacity>
                                <Text className="text-xl font-bold mx-4 w-6 text-center">{detailQuantity}</Text>
                                <TouchableOpacity
                                    onPress={() => setDetailQuantity(detailQuantity + 1)}
                                    className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
                                >
                                    <Plus size={20} color="black" />
                                </TouchableOpacity>
                            </View>

                            {/* Add Button */}
                            <TouchableOpacity
                                onPress={() => selectedProductForDetail && addToCart(selectedProductForDetail, detailQuantity)}
                                className="flex-1 h-14 bg-black rounded-full items-center justify-center"
                                style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}
                            >
                                <Text className="text-white text-lg font-bold">Add to Order</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => setDetailModalVisible(false)} className="mt-4 items-center">
                            <Text className="text-gray-500 font-bold">Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View >
    );
}
