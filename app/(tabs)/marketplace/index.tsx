import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Search, MapPin, Star, ChevronDown, Filter, Clock } from 'lucide-react-native';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../../src/services/firebaseConfig';
import { MarketplaceRestaurant } from '../../../src/types/marketplace';

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
    const [restaurants, setRestaurants] = useState<MarketplaceRestaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    React.useLayoutEffect(() => {
        navigation.setOptions({
            tabBarStyle: { display: 'none' },
        });
    }, [navigation]);

    useEffect(() => {
        fetchRestaurants();
    }, []);

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

    // Safe filtering logic
    const filteredRestaurants = restaurants.filter(r =>
        r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-stone-50">
                <ActivityIndicator size="large" color="#EA580C" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-stone-50">
            {/* Header Section */}
            <View className="bg-white pt-12 pb-4 px-4 shadow-sm z-10">
                {/* Location Header */}
                <View className="flex-row items-center justify-center mb-4">
                    <Text className="text-stone-900 font-bold text-lg">Order to Pickup</Text>
                </View>

                {/* Search Bar */}
                <View className="flex-row gap-3">
                    <View className="flex-1 flex-row items-center bg-stone-100 rounded-xl px-4 h-12">
                        <Search size={20} color="#78716c" />
                        <TextInput
                            placeholder="Restaurants, groceries, dishes"
                            placeholderTextColor="#a8a29e"
                            className="flex-1 ml-3 text-base text-stone-900 h-full"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mt-4 -ml-1 pr-4"
                >
                    {FILTERS.map((filter, index) => (
                        <TouchableOpacity
                            key={index}
                            className="bg-white border border-stone-200 rounded-full px-4 py-1.5 mr-2"
                        >
                            <Text className="text-stone-600 text-xs font-medium">{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Categories Section */}
                <View className="py-6 bg-white mb-3">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    >
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity key={cat.id} className="items-center mr-6">
                                <Image
                                    source={{ uri: cat.image }}
                                    className="w-16 h-16 rounded-full bg-stone-200"
                                    contentFit="cover"
                                />
                                <Text className="text-stone-700 text-xs font-medium mt-2">{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Promo Banner */}
                <View className="px-4 mb-6">
                    <View className="w-full h-40 bg-orange-500 rounded-2xl overflow-hidden relative">
                        {/* Abstract background shapes could go here */}
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' }}
                            className="absolute right-0 top-0 w-1/2 h-full opacity-50"
                            contentFit="cover"
                        />
                        <View className="p-6 justify-center h-full max-w-[60%]">
                            <Text className="text-white font-bold text-2xl mb-1">50% OFF</Text>
                            <Text className="text-white/90 font-medium text-sm mb-3">On your first ordered takeaway</Text>
                            <TouchableOpacity className="bg-white px-4 py-2 rounded-lg self-start">
                                <Text className="text-orange-600 font-bold text-xs">Order Now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Most Popular Section (Real Data) */}
                <View className="px-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-stone-900">Los Más Populares</Text>
                        <TouchableOpacity>
                            <Text className="text-orange-600 font-medium text-sm">See all</Text>
                        </TouchableOpacity>
                    </View>

                    {filteredRestaurants.length === 0 ? (
                        <View className="py-10 items-center bg-white rounded-xl">
                            <Text className="text-stone-400">No restaurants found matching "{searchQuery}"</Text>
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="-mx-4 px-4 pb-4"
                        >
                            {filteredRestaurants.map((restaurant) => (
                                <TouchableOpacity
                                    key={restaurant.id}
                                    onPress={() => router.push(`/takeout/${restaurant.id}`)}
                                    className="mr-4 w-64 bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden"
                                >
                                    <Image
                                        source={{ uri: restaurant.settings?.branding?.cover_image_url || 'https://via.placeholder.com/400x300' }}
                                        className="w-full h-32 bg-stone-200"
                                        contentFit="cover"
                                    />
                                    <View className="p-3">
                                        <View className="flex-row justify-between items-center mb-1">
                                            <Text className="text-base font-bold text-stone-900 flex-1 mr-2" numberOfLines={1}>
                                                {restaurant.name}
                                            </Text>
                                            <View className="flex-row items-center bg-stone-100 px-1.5 py-0.5 rounded-md">
                                                <Star size={10} color="#f59e0b" fill="#f59e0b" />
                                                <Text className="text-xs font-bold ml-1 text-stone-800">{restaurant.rating || 4.5}</Text>
                                            </View>
                                        </View>
                                        <Text className="text-stone-500 text-xs mb-2" numberOfLines={1}>
                                            {restaurant.settings?.branding?.font_style || 'Restaurant'} • {restaurant.distance || '1.2 km'}
                                        </Text>
                                        <View className="flex-row items-center border-t border-stone-100 pt-2">
                                            <Clock size={12} color="#78716c" />
                                            <Text className="text-stone-500 text-xs ml-1">20-30 min</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* Fallback All Restaurants List (for vertical scrolling below) */}
                <View className="px-4 mt-2">
                    <Text className="text-xl font-bold text-stone-900 mb-4">All Stores</Text>
                    {filteredRestaurants.map((restaurant) => (
                        <TouchableOpacity
                            key={`list-${restaurant.id}`}
                            onPress={() => router.push(`/takeout/${restaurant.id}`)}
                            className="flex-row bg-white rounded-xl p-3 mb-4 shadow-sm border border-stone-100"
                        >
                            <Image
                                source={{ uri: restaurant.settings?.branding?.logo_url || restaurant.logo || 'https://via.placeholder.com/100' }}
                                className="w-20 h-20 rounded-lg bg-stone-200"
                                contentFit="cover"
                            />
                            <View className="flex-1 ml-4 justify-center">
                                <Text className="text-lg font-bold text-stone-900 mb-1">{restaurant.name}</Text>
                                <Text className="text-stone-500 text-sm mb-1">{restaurant.settings?.branding?.font_style || 'General'}</Text>
                                <View className="flex-row items-center gap-3">
                                    <View className="flex-row items-center">
                                        <Star size={12} color="#f59e0b" fill="#f59e0b" />
                                        <Text className="text-xs font-medium ml-1 text-stone-700">{restaurant.rating || 4.5}</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <MapPin size={12} color="#a8a29e" />
                                        <Text className="text-stone-400 text-xs ml-1">
                                            {restaurant.distance || '1.2 km'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}
