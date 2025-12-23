import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Dimensions, Linking, Alert, Vibration } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Search, MapPin, Star, ChevronDown, Clock, Camera as CameraIcon, ShoppingBag, ScanLine, User } from 'lucide-react-native';
import { collection, getDocs, query } from 'firebase/firestore';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { db } from '../../../src/services/firebaseConfig';
import { MarketplaceRestaurant } from '../../../src/types/marketplace';
import { useMarketStore } from '../../../src/store/marketStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock Data for Categories (Static)
const CATEGORIES = [
    { id: '1', name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80' },
    { id: '2', name: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80' },
    { id: '3', name: 'Sushi', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&q=80' },
    { id: '4', name: 'Tacos', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80' },
    { id: '5', name: 'Dessert', image: 'https://images.unsplash.com/photo-1563729768-b652c672e843?w=200&q=80' },
];

const FILTERS = ['Sort', 'Top Rated', 'Fast Delivery', 'Under 30 min', 'Price: Low to High'];

export default function MarketplaceHome() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [restaurants, setRestaurants] = useState<MarketplaceRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const isFocused = useIsFocused();
    const [sheetIndex, setSheetIndex] = useState(0);

    // BottomSheet Ref
    const bottomSheetRef = useRef<BottomSheet>(null);
    // SnapPoints: 15% (Scan Mode), 90% (Marketplace Mode)
    const snapPoints = useMemo(() => ['15%', '90%'], []);

    // Camera State
    const [scanned, setScanned] = useState(false);
    // Ref to prevent multiple rapid scans before state updates
    const isProcessingScan = useRef(false);

    // Reset scan state when screen is focused
    useEffect(() => {
        if (isFocused) {
            // Add a small delay to prevent immediate rescanning if user just came back
            const timer = setTimeout(() => {
                setScanned(false);
                isProcessingScan.current = false;
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isFocused]);

    const { currentAction, resetAction } = useMarketStore();

    // Handle remote scroll actions -> Sheet Actions
    useEffect(() => {
        if (currentAction === 'IDLE') return;

        console.log('[Marketplace] Action received:', currentAction);

        // Add delay to ensure BottomSheet is mounted and ready
        const timer = setTimeout(() => {
            if (currentAction === 'SCROLL_TOP') {
                // Minimize sheet to show camera (Index 0)
                bottomSheetRef.current?.snapToIndex(0);
            } else if (currentAction === 'SCROLL_DOWN') {
                // Expand sheet (Index 1)
                bottomSheetRef.current?.snapToIndex(1);
            }
            resetAction();
        }, 300);

        return () => clearTimeout(timer);
    }, [currentAction, resetAction]);

    // Hide Tab Bar
    React.useLayoutEffect(() => {
        navigation.setOptions({
            tabBarStyle: { display: 'none' }, // Ensure tab bar is hidden
        });
    }, [navigation]);

    useEffect(() => {
        // Request camera permissions on mount
        if (!permission) {
            requestPermission();
        }
        fetchRestaurants();
    }, [permission]);

    const fetchRestaurants = async () => {
        try {
            const q = query(collection(db, 'restaurants'));
            const querySnapshot = await getDocs(q);

            const fetched: MarketplaceRestaurant[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as any;
                fetched.push({
                    ...data,
                    id: doc.id,
                    distance: '1.2 km', // Mock
                    rating: 4.5 // Mock
                });
            });
            setRestaurants(fetched);
        } catch (error) {
            console.error("Error fetching restaurants:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned || !isFocused || sheetIndex !== 0 || isProcessingScan.current) return;

        isProcessingScan.current = true;
        setScanned(true);
        Vibration.vibrate();

        try {
            // Check if it's a valid URL
            if (!data.startsWith('http://') && !data.startsWith('https://')) {
                throw new Error("Invalid QR Code format");
            }

            const urlObj = new URL(data);
            const { hostname, pathname, searchParams } = urlObj;

            // Domain Validation
            const validDomains = ['localhost', 'kiitos-app.web.app', 'kiitos-app.firebaseapp.com', '192.168.', '10.0.', '172.']; // Add internal IPs for dev
            const isValidDomain = validDomains.some(d => hostname.includes(d));

            if (!isValidDomain) {
                Alert.alert("Invalid QR", "This QR code is outside of the app's domain.", [
                    { text: "OK", onPress: () => setTimeout(() => setScanned(false), 2000) }
                ]);
                return;
            }

            // Route Handling
            if (pathname.includes('/menu/')) {
                // Format: /menu/:restaurantId/:tableId
                // Regex to capture IDs
                const match = pathname.match(/\/menu\/([^/]+)\/([^/]+)/);
                if (match) {
                    const [_, restaurantId, tableId] = match;
                    router.push(`/menu/${restaurantId}/${tableId}`);
                } else {
                    throw new Error("Invalid Menu QR");
                }
            } else if (pathname.includes('/takeout/')) {
                // Format: /takeout/:restaurantId
                const match = pathname.match(/\/takeout\/([^/]+)/);
                if (match) {
                    const [_, restaurantId] = match;
                    router.push(`/takeout/${restaurantId}`);
                } else {
                    throw new Error("Invalid Takeout QR");
                }
            } else if (pathname.includes('/login/staff')) {
                // Format: /login/staff?restaurantId=...
                const restaurantId = searchParams.get('restaurantId');
                if (restaurantId) {
                    router.push({
                        pathname: '/(auth)/login/staff',
                        params: { restaurantId }
                    });
                } else {
                    throw new Error("Missing restaurant info for Login");
                }
            } else {
                Alert.alert("Unknown QR", "This QR code is not supported.", [
                    { text: "OK", onPress: () => setTimeout(() => setScanned(false), 2000) }
                ]);
                return;
            }

            // Navigation happens, state will be reset when coming back to focus
            // Removed automatic setTimeout reset to avoid race conditions

        } catch (error) {
            console.warn("QR Scan Error:", error);
            Alert.alert("Error", "Could not process this QR code.", [
                { text: "OK", onPress: () => setTimeout(() => setScanned(false), 2000) }
            ]);
        }
    };

    const filteredRestaurants = restaurants.filter(r =>
        r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!permission) {
        return <View className="flex-1 bg-black" />;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center items-center bg-stone-900 px-10">
                <Text className="text-white text-center mb-4 text-lg">We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} className="bg-orange-600 px-6 py-3 rounded-full">
                    <Text className="text-white font-bold">Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View className="flex-1 bg-black">
                {/* LAYER A: CAMERA (Background) */}
                <View className="absolute top-0 left-0 w-full h-full z-0">
                    <CameraView
                        style={{ flex: 1 }}
                        facing="back"
                        onBarcodeScanned={scanned || !isFocused || sheetIndex !== 0 ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                    >
                        {/* Only show guide when needed, or maybe just always? */}
                        <View className="flex-1 justify-center items-center mb-48">
                            <View className="w-64 h-64 border-2 border-white/50 rounded-xl" />
                            <Text className="text-white/80 mt-4 font-medium bg-black/40 px-4 py-1 rounded-full overflow-hidden">
                                Scan table QR code
                            </Text>
                        </View>
                    </CameraView>
                </View>

                {/* BRANDING OVERLAY */}
                <View
                    className="absolute left-0 right-0 z-50 items-center"
                    style={{ top: 60, zIndex: 0 }}
                >
                    <Text className="text-white tracking-tighter" style={{ fontSize: 42, fontWeight: '900', letterSpacing: -1 }}>
                        Kitos<Text style={{ color: '#f89219' }}>.</Text>
                    </Text>
                </View>

                {/* LAYER B: BOTTOM SHEET */}
                <BottomSheet
                    ref={bottomSheetRef}
                    index={0} // Start collapsed (Scan mode)
                    snapPoints={snapPoints}
                    onChange={(index) => setSheetIndex(index)}
                    enablePanDownToClose={false}
                    backgroundStyle={{ backgroundColor: "#fafaf9", borderRadius: 24 }}
                    handleIndicatorStyle={{ backgroundColor: "#d6d3d1", width: 40 }}
                >
                    <View className="flex-1">
                        {/* Handle / Hint Header */}
                        <View className="px-4 pb-4 border-b border-stone-100 items-center">
                            <View className="flex-row items-center bg-stone-100 rounded-xl px-4 h-12 w-full mt-2">
                                <Search size={20} color="#78716c" />
                                <TextInput
                                    placeholder="Search restaurants & food"
                                    placeholderTextColor="#a8a29e"
                                    className="flex-1 ml-3 text-base text-stone-900 h-full"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>

                            {/* Filters */}
                            <BottomSheetScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                className="mt-4 w-full"
                                contentContainerStyle={{ paddingRight: 16 }}
                            >
                                {FILTERS.map((filter, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        className="bg-white border border-stone-200 rounded-full px-4 py-1.5 mr-2"
                                    >
                                        <Text className="text-stone-600 text-xs font-medium">{filter}</Text>
                                    </TouchableOpacity>
                                ))}
                            </BottomSheetScrollView>
                        </View>

                        {/* SCROLLABLE MARKETPLACE CONTENT */}
                        <BottomSheetScrollView
                            contentContainerStyle={{ paddingBottom: 100 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Categories Section */}
                            <View className="py-6 mb-3">
                                <View className="px-4 mb-3">
                                    <Text className="text-lg font-bold text-stone-900">Categories</Text>
                                </View>
                                <BottomSheetScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 16 }}
                                >
                                    {CATEGORIES.map((cat) => (
                                        <TouchableOpacity key={cat.id} className="items-center mr-6">
                                            <Image
                                                source={{ uri: cat.image }}
                                                className="w-16 h-16 rounded-full bg-stone-200"
                                                resizeMode="cover"
                                            />
                                            <Text className="text-stone-700 text-xs font-medium mt-2">{cat.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </BottomSheetScrollView>
                            </View>

                            {/* Promo Banner */}
                            <View className="px-4 mb-6">
                                <View className="w-full h-40 bg-orange-600 rounded-2xl overflow-hidden relative shadow-md">
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' }}
                                        className="absolute right-0 top-0 w-3/5 h-full opacity-40"
                                        resizeMode="cover"
                                    />
                                    <View className="p-6 justify-center h-full max-w-[60%]">
                                        <Text className="text-white font-bold text-2xl mb-1">Pickup Deal</Text>
                                        <Text className="text-white/90 font-medium text-sm mb-3">Save 20% on your first order</Text>
                                        <TouchableOpacity className="bg-white px-4 py-2 rounded-lg self-start">
                                            <Text className="text-orange-600 font-bold text-xs">Browse Now</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Most Popular */}
                            <View className="px-4">
                                <View className="flex-row justify-between items-center mb-4">
                                    <Text className="text-xl font-bold text-stone-900">Popular Near You</Text>
                                </View>

                                {loading ? (
                                    <ActivityIndicator size="small" color="#EA580C" />
                                ) : filteredRestaurants.length === 0 ? (
                                    <View className="py-10 items-center bg-white rounded-xl">
                                        <Text className="text-stone-400">No restaurants found matching "{searchQuery}"</Text>
                                    </View>
                                ) : (
                                    <View className="gap-4">
                                        {filteredRestaurants.map((restaurant) => (
                                            <TouchableOpacity
                                                key={restaurant.id}
                                                onPress={() => router.push(`/takeout/${restaurant.id}`)}
                                                className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden mb-2"
                                            >
                                                <Image
                                                    source={{ uri: restaurant.settings?.branding?.cover_image_url || 'https://via.placeholder.com/400x300' }}
                                                    className="w-full h-40 bg-stone-200"
                                                    resizeMode="cover"
                                                />
                                                <View className="p-4">
                                                    <View className="flex-row justify-between items-start mb-1">
                                                        <Text className="text-xl font-bold text-stone-900 flex-1 mr-2">
                                                            {restaurant.name}
                                                        </Text>
                                                        <View className="flex-row items-center bg-stone-100 px-2 py-1 rounded-lg">
                                                            <Star size={14} color="#f59e0b" fill="#f59e0b" />
                                                            <Text className="font-bold ml-1 text-stone-800">{restaurant.rating || 4.5}</Text>
                                                        </View>
                                                    </View>
                                                    <Text className="text-stone-500 text-sm mb-3">
                                                        {restaurant.settings?.branding?.font_style || 'Restaurant'} • {restaurant.distance || '1.2 km'}
                                                    </Text>
                                                    <View className="flex-row gap-4 border-t border-stone-100 pt-3">
                                                        <View className="flex-row items-center">
                                                            <Clock size={14} color="#78716c" />
                                                            <Text className="text-stone-500 text-sm ml-1">20-30 min</Text>
                                                        </View>
                                                        <View className="flex-row items-center">
                                                            <CameraIcon size={14} color="#78716c" />
                                                            <Text className="text-stone-500 text-sm ml-1">Table Service</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </BottomSheetScrollView>
                    </View>
                </BottomSheet>
            </View>
        </GestureHandlerRootView>
    );
}
