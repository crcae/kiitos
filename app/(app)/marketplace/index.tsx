import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Dimensions, Linking, Alert, Vibration } from 'react-native';
import { useRouter, useNavigation, usePathname } from 'expo-router';
import { Search, MapPin, Star, ChevronDown, Clock, Camera as CameraIcon, ShoppingBag, ScanLine, User } from 'lucide-react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { db } from '../../../src/services/firebaseConfig';
import { MarketplaceRestaurant } from '../../../src/types/marketplace';
import { useMarketStore } from '../../../src/store/marketStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mock Data for Categories (updated to match Admin Settings)
const CATEGORIES = [
    { id: 'burger', name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=80' },
    { id: 'pizza', name: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&q=80' },
    { id: 'sushi', name: 'Sushi', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&q=80' },
    { id: 'tacos', name: 'Tacos', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80' },
    { id: 'asian', name: 'Asian', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=200&q=80' },
    { id: 'italian', name: 'Italian', image: 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=200&q=80' },
    { id: 'healthy', name: 'Healthy/Salad', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=80' },
    { id: 'breakfast', name: 'Breakfast/Brunch', image: 'https://images.unsplash.com/photo-1533089862017-d5d9b53d53b9?w=200&q=80' },
    { id: 'coffee', name: 'Coffee', image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=200&q=80' },
    { id: 'dessert', name: 'Dessert', image: 'https://images.unsplash.com/photo-1563729768-b652c672e843?w=200&q=80' },
    { id: 'wings', name: 'Wings', image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=200&q=80' },
    { id: 'sandwiches', name: 'Sandwiches', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=200&q=80' },
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
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('Sort');
    const isFocused = useIsFocused();
    const [sheetIndex, setSheetIndex] = useState(0);
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

    // BottomSheet Ref
    const bottomSheetRef = useRef<BottomSheet>(null);
    // SnapPoints: 25% (Higher Peek/Scan Mode), ScreenHeight - 140px (Snap-to-Header ceiling)
    const snapPoints = useMemo(() => [SCREEN_HEIGHT * 0.25, SCREEN_HEIGHT - 140], [SCREEN_HEIGHT]);

    const pathname = usePathname();
    const { currentAction, resetAction, setMode, currentMode } = useMarketStore();

    // Strict Camera Lifecycle: Only on Marketplace screen AND in SCAN mode
    const isCameraActive = (pathname === '/(app)/marketplace' || pathname === '/marketplace') && currentMode === 'SCAN' && isFocused;

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

    // Handle remote scroll actions -> Sheet Actions
    useEffect(() => {
        if (currentAction === 'IDLE') return;

        console.log('[Marketplace] Action received:', currentAction);

        // Add shorter delay to ensure BottomSheet is mounted and ready
        const timer = setTimeout(() => {
            if (currentAction === 'SCROLL_TOP') {
                // Minimize sheet to show camera (Index 0)
                bottomSheetRef.current?.snapToIndex(0);
            } else if (currentAction === 'SCROLL_DOWN') {
                // Expand sheet (Index 1)
                bottomSheetRef.current?.snapToIndex(1);
            }
            resetAction();
        }, 100); // Reduced delay from 300ms

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

        // Request Location Permissions
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let location = await Location.getCurrentPositionAsync({});
                setUserLocation(location);
            }
        })();

        fetchRestaurants();
    }, [permission]);

    const fetchRestaurants = async () => {
        try {
            const q = query(collection(db, 'restaurants'));
            const querySnapshot = await getDocs(q);

            const fetched: MarketplaceRestaurant[] = [];

            // Use Promise.all to fetch reviews in parallel
            await Promise.all(querySnapshot.docs.map(async (doc) => {
                const data = doc.data() as any;

                // Fetch reviews for this restaurant
                let averageRating = 5.0; // Default new
                let reviewCount = 0;

                try {
                    const reviewsQuery = query(
                        collection(db, 'reviews'),
                        where('restaurantId', '==', doc.id)
                    );
                    const reviewsSnap = await getDocs(reviewsQuery);

                    if (!reviewsSnap.empty) {
                        const total = reviewsSnap.docs.reduce((acc, rDoc) => acc + (rDoc.data().rating || 0), 0);
                        reviewCount = reviewsSnap.size;
                        averageRating = total / reviewCount;
                    }
                } catch (e) {
                    console.log(`Error fetching reviews for ${doc.id}:`, e);
                }

                // Push to array
                fetched.push({
                    ...data,
                    id: doc.id,
                    distance: '1.2 km', // Mock logic for now
                    rating: Number(averageRating.toFixed(1))
                });
            }));

            setRestaurants(fetched);
        } catch (error) {
            console.error("Error fetching restaurants:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned || !isFocused || sheetIndex !== 0 || isProcessingScan.current) return;

        // ... (Existing QR logic remains same, omitting for brevity in replace block if possible, but tool requires contiguous block)
        // Since I need to replace the whole logic for displayedRestaurants later, I have to include this or make a smaller replacement.
        // I will include the logic as it was to be safe.

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
            const validDomains = ['kitos.app', 'localhost', 'kiitos-app.web.app', 'kiitos-app.firebaseapp.com', '192.168.', '10.0.', '172.']; // Add internal IPs for dev
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

        } catch (error) {
            console.warn("QR Scan Error:", error);
            Alert.alert("Error", "Could not process this QR code.", [
                { text: "OK", onPress: () => setTimeout(() => setScanned(false), 2000) }
            ]);
        }
    };

    const displayedRestaurants = useMemo(() => {
        // 1. Filter by Search Query
        let result = restaurants.filter(r =>
            r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // 2. Filter by Visibility Settings (NEW)
        result = result.filter(r => {
            const settings = r.settings as any; // Cast to access custom fields
            return settings?.isVisibleInMarketplace === true;
        });

        // 3. Filter by Category (NEW)
        if (selectedCategory) {
            result = result.filter(r => {
                const settings = r.settings as any;
                const categories = settings?.marketplaceSettings?.categories || [];
                // Check if the restaurant has the selected category
                return categories.includes(selectedCategory);
            });
        }

        if (activeFilter === 'Top Rated') {
            result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }

        // 4. Calculate Distance & Sort by Location (NEW DEFAULT)
        if (userLocation) {
            result = result.map(r => {
                const settings = r.settings as any;
                const coords = settings?.coordinates;
                if (coords && coords.lat && coords.lng) {
                    // Haversine Calc
                    const R = 6371; // km
                    const dLat = (coords.lat - userLocation.coords.latitude) * (Math.PI / 180);
                    const dLon = (coords.lng - userLocation.coords.longitude) * (Math.PI / 180);
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(userLocation.coords.latitude * (Math.PI / 180)) * Math.cos(coords.lat * (Math.PI / 180)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const dist = R * c;

                    return { ...r, _distNum: dist, distance: `${dist.toFixed(1)} km` };
                }
                return r;
            });

            // Default Sort by Distance if "Sort" is active or no specific sort
            if (activeFilter === 'Sort') {
                result.sort((a: any, b: any) => {
                    if (a._distNum !== undefined && b._distNum !== undefined) return a._distNum - b._distNum;
                    if (a._distNum !== undefined) return -1;
                    return 1;
                });
            }
        }

        return result;
    }, [restaurants, searchQuery, selectedCategory, activeFilter]);

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
            <View style={{ flex: 1, backgroundColor: 'black', paddingTop: 60 }}>
                {/* LAYER A: CAMERA (Background) */}
                <View className="absolute top-0 left-0 w-full h-full z-0">
                    {isCameraActive && (
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
                    )}
                </View>

                {/* BRANDING OVERLAY */}
                <View
                    className="absolute left-0 right-0 z-50 items-center"
                    style={{ top: 60, zIndex: 0 }}
                >
                    <Image
                        source={require('../../../assets/logo-marketplace.png')}
                        style={{ width: 336, height: 144 }}
                        resizeMode="contain"
                    />
                </View>

                {/* LAYER B: BOTTOM SHEET */}
                <BottomSheet
                    ref={bottomSheetRef}
                    index={0} // Start collapsed (Scan mode)
                    snapPoints={snapPoints}
                    onChange={(index) => {
                        setSheetIndex(index);
                        setMode(index === 0 ? 'SCAN' : 'MARKET');
                    }}
                    enablePanDownToClose={false}
                    backgroundStyle={{ backgroundColor: "#fafaf9", borderRadius: 24 }}
                    handleIndicatorStyle={{ backgroundColor: "#d6d3d1", width: 40 }}
                >
                    <View className="flex-1">
                        {/* Handle / Hint Header */}
                        <View className="px-4 pb-4 border-b border-stone-100 items-center">
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 16, height: 48, width: '100%', marginTop: 8 }}>
                                <Search size={20} color="#78716c" />
                                <TextInput
                                    placeholder="Search restaurants & food"
                                    placeholderTextColor="#a8a29e"
                                    style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#1c1917', height: '100%' }}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                            </View>


                        </View>

                        {/* SCROLLABLE MARKETPLACE CONTENT */}
                        <BottomSheetScrollView
                            contentContainerStyle={{ paddingBottom: 100 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Categories Section */}
                            <View className="pt-0 pb-4">
                                <View className="px-4 mb-3">
                                    <Text className="text-lg font-bold text-stone-900">Categories</Text>
                                </View>
                                <BottomSheetScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 16 }}
                                >
                                    {CATEGORIES.map((cat) => {
                                        const isSelected = selectedCategory === cat.name;
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                className="items-center mr-6"
                                                onPress={() => setSelectedCategory(isSelected ? null : cat.name)}
                                            >
                                                <Image
                                                    source={{ uri: cat.image }}
                                                    className={`w-16 h-16 rounded-full bg-stone-200 ${isSelected ? 'border-2 border-orange-600' : ''}`}
                                                    resizeMode="cover"
                                                />
                                                <Text className={`text-xs font-medium mt-2 ${isSelected ? 'text-orange-600 font-bold' : 'text-stone-700'}`}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </BottomSheetScrollView>
                            </View>


                            {/* Most Popular */}
                            <View className="px-4">
                                <View className="flex-row justify-between items-center mb-4">
                                    <Text className="text-xl font-bold text-stone-900">Popular Near You</Text>
                                </View>

                                {loading ? (
                                    <ActivityIndicator size="small" color="#EA580C" />
                                ) : displayedRestaurants.length === 0 ? (
                                    <View className="py-10 items-center bg-white rounded-xl">
                                        <Text className="text-stone-400">No restaurants found matching your selection</Text>
                                    </View>
                                ) : (
                                    <View className="gap-4">
                                        {displayedRestaurants.map((restaurant) => {
                                            const settings = restaurant.settings as any;
                                            const marketplaceSettings = settings?.marketplaceSettings || {};
                                            const coverImage = marketplaceSettings.coverImage || settings?.branding?.cover_image_url || 'https://via.placeholder.com/400x300';
                                            const prepTime = marketplaceSettings.prepTime || '20-30 min';

                                            // --- OPENING HOURS LOGIC ---
                                            const getRestaurantStatus = () => {
                                                const now = new Date();
                                                const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                                                const currentDayKey = days[now.getDay()];
                                                const currentTime = now.getHours() * 60 + now.getMinutes();

                                                const hours = settings?.opening_hours?.[currentDayKey];

                                                if (!hours || hours.closed) {
                                                    // Find next open day
                                                    for (let i = 1; i <= 7; i++) {
                                                        const nextDayIndex = (now.getDay() + i) % 7;
                                                        const nextDayKey = days[nextDayIndex];
                                                        const nextHours = settings?.opening_hours?.[nextDayKey];
                                                        if (nextHours && !nextHours.closed) {
                                                            const dayName = i === 1 ? 'Tomorrow' : nextDayKey.charAt(0).toUpperCase() + nextDayKey.slice(1);
                                                            return { isOpen: false, status: 'CLOSED', message: `Opens ${dayName} ${nextHours.open}` };
                                                        }
                                                    }
                                                    return { isOpen: false, status: 'CLOSED', message: 'Temporarily Closed' };
                                                }

                                                const [openH, openM] = hours.open.split(':').map(Number);
                                                const [closeH, closeM] = hours.close.split(':').map(Number);

                                                const openTime = openH * 60 + openM;
                                                const closeTime = closeH * 60 + closeM;

                                                // Handle late night closing (e.g. 02:00) - Simplified for now assuming same day or check logic
                                                // If closeTime < openTime, it means it closes next day. 
                                                // For simplicity, let's assume standard hours or handle the wrap.
                                                let adjustedCloseTime = closeTime;
                                                if (closeTime < openTime) adjustedCloseTime += 24 * 60;

                                                if (currentTime >= openTime && currentTime < adjustedCloseTime) {
                                                    // Check if closing soon (< 60 mins)
                                                    const minsRemaining = adjustedCloseTime - currentTime;
                                                    if (minsRemaining <= 60 && minsRemaining > 0) {
                                                        return { isOpen: true, status: 'CLOSING_SOON', message: `Closing in ${minsRemaining}m` };
                                                    }
                                                    return { isOpen: true, status: 'OPEN', message: 'Open' };
                                                } else {
                                                    // Before open or after close
                                                    if (currentTime < openTime) {
                                                        return { isOpen: false, status: 'CLOSED', message: `Opens ${hours.open}` };
                                                    } else {
                                                        // Closed for the day, find next
                                                        const nextDayIndex = (now.getDay() + 1) % 7;
                                                        const nextDayKey = days[nextDayIndex];
                                                        const nextHours = settings?.opening_hours?.[nextDayKey];
                                                        const dayName = 'Tomorrow'; // Approximate
                                                        return { isOpen: false, status: 'CLOSED', message: nextHours && !nextHours.closed ? `Opens ${dayName} ${nextHours.open}` : 'Closed' };
                                                    }
                                                }
                                            };

                                            const status = getRestaurantStatus();

                                            return (
                                                <TouchableOpacity
                                                    key={restaurant.id}
                                                    onPress={() => router.push(`/takeout/${restaurant.id}`)}
                                                    className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden mb-2"
                                                    disabled={!status.isOpen}
                                                >
                                                    <View>
                                                        <Image
                                                            source={{ uri: coverImage }}
                                                            className={`w-full h-40 bg-stone-200 ${!status.isOpen ? 'opacity-50' : ''}`}
                                                            resizeMode="cover"
                                                        />
                                                        {/* Status Overlay */}
                                                        {!status.isOpen && (
                                                            <View className="absolute inset-0 items-center justify-center bg-black/40">
                                                                <View className="bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm">
                                                                    <Text className="text-white font-bold text-center">CURRENTLY CLOSED</Text>
                                                                    <Text className="text-white/80 text-xs text-center mt-1">{status.message}</Text>
                                                                </View>
                                                            </View>
                                                        )}
                                                        {/* Closing Soon Badge */}
                                                        {status.isOpen && status.status === 'CLOSING_SOON' && (
                                                            <View className="absolute bottom-2 right-2 bg-red-500 px-3 py-1 rounded-full shadow-sm">
                                                                <Text className="text-white text-xs font-bold">{status.message}</Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <View className="p-4">
                                                        <View className="flex-row justify-between items-start mb-1">
                                                            <Text className={`text-xl font-bold flex-1 mr-2 ${!status.isOpen ? 'text-stone-400' : 'text-stone-900'}`}>
                                                                {restaurant.name}
                                                            </Text>
                                                            <View className="flex-row items-center bg-stone-100 px-2 py-1 rounded-lg">
                                                                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                                                                <Text className="font-bold ml-1 text-stone-800">{(restaurant.rating || 4.5).toFixed(1)}</Text>
                                                            </View>
                                                        </View>
                                                        <Text className="text-stone-500 text-sm mb-3">
                                                            {restaurant.settings?.branding?.font_style || 'Restaurant'} • {restaurant.distance || '1.2 km'}
                                                        </Text>
                                                        <View className="flex-row gap-4 border-t border-stone-100 pt-3">
                                                            <View className="flex-row items-center">
                                                                <Clock size={14} color="#78716c" />
                                                                <Text className="text-stone-500 text-sm ml-1">{prepTime}</Text>
                                                            </View>
                                                            {/* Removed Service Type display as requested */}
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            )
                                        })}
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
