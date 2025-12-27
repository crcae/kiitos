import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, ActivityIndicator, StatusBar, Platform, Modal, TextInput, Alert, Pressable } from 'react-native';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, Plus, Minus, CheckCircle, Clock, MapPin, Smartphone, UserCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import { colors } from '../../styles/theme';
import { subscribeToGuestCategories, subscribeToGuestProducts, getTableDetails, sendOrderToKitchen, subscribeToActiveSession } from '../../services/guestMenu';
import { subscribeToRestaurantConfig } from '../../services/menu';
import { Category, Product, Table, OrderItem, RestaurantSettings, SelectedModifier, ModifierGroup, ModifierOption } from '../../types/firestore';
import { useAuth } from '../../context/AuthContext';
import CustomerPhoneAuth from '../auth/CustomerPhoneAuth';

interface MenuScreenProps {
    restaurantId: string;
    tableId: string;
}

interface CartItem {
    cartId: string;
    product: Product;
    quantity: number;
    modifiers: SelectedModifier[];
}

export default function MenuScreen({ restaurantId, tableId }: MenuScreenProps) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    // Data State
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [table, setTable] = useState<Table | null>(null);
    const [allowOrdering, setAllowOrdering] = useState(false);
    const [loading, setLoading] = useState(true);
    const [branding, setBranding] = useState<RestaurantSettings['branding']>(undefined);
    const [openingHours, setOpeningHours] = useState<any>(null);

    // Location Restriction State
    const [locationConfig, setLocationConfig] = useState<{ enabled: boolean, radius: number, coordinates?: { lat: number, lng: number } } | null>(null);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [isLocationLoading, setIsLocationLoading] = useState(false);

    // UI State
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [successModalVisible, setSuccessModalVisible] = useState(false);

    // Modifier Selection State
    const [modifierModalVisible, setModifierModalVisible] = useState(false);
    const [selectedProductForModifiers, setSelectedProductForModifiers] = useState<Product | null>(null);
    const [tempSelectedModifiers, setTempSelectedModifiers] = useState<SelectedModifier[]>([]);

    // Order Preview State
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [clientName, setClientName] = useState('');
    const [authMode, setAuthMode] = useState<'phone' | 'guest'>('phone');

    // Detail Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
    const [detailQuantity, setDetailQuantity] = useState(1);

    // Auth flow state
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);

    const unsubsRef = useRef<(() => void)[]>([]);

    useEffect(() => {
        if (!restaurantId || !tableId) return;

        const loadData = async () => {
            try {
                // Fetch static table data for header
                const tableData = await getTableDetails(restaurantId, tableId);
                setTable(tableData);

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

                    // Location restriction settings
                    if (config.location_restriction?.enabled && config.coordinates) {
                        setLocationConfig({
                            enabled: true,
                            radius: config.location_restriction.radius_meters || 50,
                            coordinates: config.coordinates
                        });
                    } else {
                        setLocationConfig(null);
                    }
                });
                unsubsRef.current.push(unsubConfig);

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

    // Request Location Permission if restriction is active
    useEffect(() => {
        if (!locationConfig?.enabled) return;

        const getLocation = async () => {
            setIsLocationLoading(true);
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Permission to access location was denied');
                    // Treat denial as "out of range" effectively, or just keep location null which blocks logic
                    setIsLocationLoading(false);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({});
                setUserLocation(location);
            } catch (err) {
                console.warn(err);
            } finally {
                setIsLocationLoading(false);
            }
        };

        getLocation();
    }, [locationConfig?.enabled]);

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

    const distanceFromRestaurant = useMemo(() => {
        if (!userLocation || !locationConfig?.coordinates) return null;

        const R = 6371e3; // metres
        const lat1 = userLocation.coords.latitude * Math.PI / 180;
        const lat2 = locationConfig.coordinates.lat * Math.PI / 180;
        const dLat = (locationConfig.coordinates.lat - userLocation.coords.latitude) * Math.PI / 180;
        const dLon = (locationConfig.coordinates.lng - userLocation.coords.longitude) * Math.PI / 180;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // in metres

        return d;
    }, [userLocation, locationConfig]);

    const isLocationValid = useMemo(() => {
        if (!locationConfig?.enabled) return true; // No restriction
        if (!distanceFromRestaurant) return false; // Restriction enabled but location unknown
        return distanceFromRestaurant <= locationConfig.radius;
    }, [locationConfig, distanceFromRestaurant]);

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

        if (closeTime < openTime) {
            return currentTime >= openTime || currentTime <= closeTime;
        }

        return currentTime >= openTime && currentTime <= closeTime;
    }, [openingHours]);

    // Cart Logic
    const openProductDetails = (product: Product) => {
        setSelectedProductForDetail(product);
        setDetailQuantity(1);
        setDetailModalVisible(true);
    };

    const addToCart = (product: Product, quantity: number = 1) => {
        if (product.modifiers && product.modifiers.length > 0) {
            setDetailModalVisible(false);
            setSelectedProductForModifiers(product);
            setTempSelectedModifiers([]);
            setModifierModalVisible(true);
        } else {
            addItemToCart(product, [], quantity);
            setDetailModalVisible(false);
        }
    };

    const addItemToCart = (product: Product, modifiers: SelectedModifier[], quantity: number = 1) => {
        setCart(prev => {
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
                if (group.max_selections > 0 && currentInGroup.length >= group.max_selections) {
                    if (group.max_selections === 1) {
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
        if (!isRestaurantOpen) {
            alert("El restaurante está cerrado en este momento. No se pueden enviar pedidos.");
            return;
        }

        // Validate Location
        if (locationConfig?.enabled && !isLocationValid) {
            Alert.alert(
                "Ubicación incorrecta",
                `Estás a ${distanceFromRestaurant ? Math.round(distanceFromRestaurant) : '?'}m del restaurante. El radio permitido es de ${locationConfig.radius}m.\n\nPor favor acércate para ordenar.`,
                [{ text: "OK" }]
            );
            return;
        }

        setPreviewModalVisible(true);
    };

    const handleConfirmOrder = async () => {
        if (!restaurantId || !tableId) return;
        setLoading(true);
        setPreviewModalVisible(false);
        try {
            const itemsForService = cart.map(item => ({
                product: item.product,
                quantity: item.quantity,
                modifiers: item.modifiers
            }));

            // Use logged-in user's name or manually entered name
            const finalName = user?.name || clientName;
            await sendOrderToKitchen(restaurantId, tableId, itemsForService as any, undefined, finalName || undefined);
            setCart([]);
            setClientName('');
            setSuccessModalVisible(true);
            setTimeout(() => {
                setSuccessModalVisible(false);
                // We don't navigate to Bill here automatically anymore, user can switch tabs.
            }, 2000);
        } catch (e) {
            console.error(e);
            alert("Error enviando pedido. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

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
                        <Image source={{ uri: branding.logo_url }} className="h-24 w-60" resizeMode="contain" />
                    </View>
                ) : (
                    <View className="px-5 py-4">
                        <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest">MENU</Text>
                        <Text className="text-2xl font-extrabold text-gray-900">{table?.name || 'Table'}</Text>
                    </View>
                )}
            </View>

            {/* Closed Banner */}
            {!isRestaurantOpen && (
                <View className="bg-red-50 px-5 py-3 border-b border-red-100 flex-row items-center">
                    <Clock size={16} color="#ef4444" className="mr-2" />
                    <Text className="text-red-600 font-medium text-sm flex-1">
                        El restaurante está cerrado.
                    </Text>
                </View>
            )}

            {/* Location Restriction Banner */}
            {locationConfig?.enabled && !isLocationValid && (
                <View className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex-row items-center">
                    <MapPin size={16} color="#d97706" className="mr-2" />
                    <Text className="text-amber-700 font-medium text-sm flex-1">
                        {!userLocation
                            ? "Se requiere permiso de ubicación para ordenar."
                            : `Estás fuera del rango permitido (${locationConfig.radius}m). Solo lectura.`}
                    </Text>
                </View>
            )}

            {/* Categories */}
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

            {/* Products */}
            <FlatList
                data={visibleProducts}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Text className="text-gray-400">No products available.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        className="flex-row mb-6 bg-white"
                        onPress={() => openProductDetails(item)}
                        activeOpacity={0.7}
                    >
                        {item.image_url ? (
                            <Image source={{ uri: item.image_url }} className="w-28 h-28 rounded-xl bg-gray-100 mr-4" resizeMode="cover" />
                        ) : (
                            <View className="w-28 h-28 rounded-xl bg-gray-100 mr-4 items-center justify-center">
                                <Text className="text-2xl">🍔</Text>
                            </View>
                        )}
                        <View className="flex-1 justify-between py-1">
                            <View>
                                <Text className="text-lg font-bold text-gray-900 leading-tight mb-1">{item.name}</Text>
                                <Text className="text-gray-500 text-sm leading-snug" numberOfLines={2}>{item.description}</Text>
                            </View>
                            <View className="flex-row justify-between items-center mt-3">
                                <Text className="text-base font-semibold text-gray-900" style={branding?.primary_color ? { color: branding.primary_color } : {}}>${item.price.toFixed(2)}</Text>
                                {isRestaurantOpen && allowOrdering && isLocationValid && (
                                    getQuantity(item.id) === 0 ? (
                                        <TouchableOpacity onPress={() => addToCart(item, 1)} className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
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

            {/* Cart Bar */}
            {allowOrdering && cartCount > 0 && (
                <View className="absolute bottom-4 left-4 right-4 shadow-lg">
                    <TouchableOpacity
                        onPress={handleSendOrder}
                        className="bg-black py-4 px-6 rounded-2xl flex-row justify-between items-center"
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

            {/* Modals for Success, Preview, Modifiers would be here (reusing same code as before) */}
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
                            {selectedProductForModifiers?.modifiers?.map((group) => (
                                <View key={group.id} className="mb-6">
                                    <View className="flex-row justify-between items-center mb-3">
                                        <Text className="text-lg font-bold text-gray-800">{group.name}</Text>
                                        <Text className="text-xs text-gray-500 font-medium">{group.required ? 'Required' : 'Optional'}</Text>
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
                                                {option.price > 0 && <Text className="text-gray-500">+${option.price.toFixed(2)}</Text>}
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
                                <Text className="text-white font-bold text-lg">Add to Order</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Preview Modal */}
            <Modal visible={previewModalVisible} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl h-[85%] overflow-hidden">
                        <View className="p-6 border-b border-gray-100">
                            <Text className="text-2xl font-bold text-gray-900">Confirmar Pedido</Text>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* Order Summary */}
                            <View className="px-5 pt-4 pb-2">
                                {cart.map(item => (
                                    <View key={item.cartId} className="flex-row justify-between mb-3">
                                        <Text className="text-gray-700">{item.quantity}x {item.product.name}</Text>
                                        <Text className="font-semibold">${((item.product.price + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.quantity).toFixed(2)}</Text>
                                    </View>
                                ))}
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
                                                />
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        </ScrollView>

                        {/* Footer Actions - Only show if user exists OR guest mode with name */}
                        {(user || authMode === 'guest') && (
                            <View className="p-4 bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom + 10 }}>
                                <TouchableOpacity
                                    onPress={handleConfirmOrder}
                                    className="bg-black py-4 rounded-xl items-center mb-2"
                                    style={branding?.primary_color ? { backgroundColor: branding.primary_color } : {}}
                                    disabled={!user && authMode === 'guest' && !clientName}
                                >
                                    <Text className="text-white font-bold text-lg">Confirmar Pedido</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setPreviewModalVisible(false)} className="bg-gray-100 py-4 rounded-xl items-center">
                                    <Text className="text-gray-700 font-semibold">Cancelar</Text>
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

        </View>
    );
}
