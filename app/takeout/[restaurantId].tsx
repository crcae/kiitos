import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShoppingCart, Plus } from 'lucide-react-native';
import { useTakeoutCart } from '../../src/context/TakeoutCartContext';
import { subscribeToGuestCategories, subscribeToGuestProducts } from '../../src/services/guestMenu';
import { subscribeToRestaurantConfig } from '../../src/services/menu';
import { Category, Product, RestaurantSettings } from '../../src/types/firestore';

export default function TakeoutMenuScreen() {
    const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
    const router = useRouter();
    const { items, addItem, initializeCart } = useTakeoutCart();

    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [orderingEnabled, setOrderingEnabled] = useState(false);

    useEffect(() => {
        if (!restaurantId) return;

        // Initialize cart for this restaurant
        initializeCart(restaurantId);

        // Subscribe to categories
        const unsubCategories = subscribeToGuestCategories(restaurantId, (cats: Category[]) => {
            setCategories(cats);
            if (cats.length > 0 && !selectedCategory) {
                setSelectedCategory(cats[0].id);
            }
            setLoading(false);
        });

        // Subscribe to products
        const unsubProducts = subscribeToGuestProducts(restaurantId, setProducts);

        // Subscribe to restaurant config (for takeout toggle)
        const unsubConfig = subscribeToRestaurantConfig(restaurantId, (config: RestaurantSettings) => {
            setOrderingEnabled(config.enable_takeout ?? false);
        });

        return () => {
            unsubCategories();
            unsubProducts();
            unsubConfig();
        };
    }, [restaurantId]);

    const handleAddToCart = async (product: Product) => {
        await addItem(product, 1);
    };

    const filteredProducts = selectedCategory
        ? products.filter(p => p.category_id === selectedCategory && p.available)
        : products.filter(p => p.available);

    const cartItemCount = items.reduce((sum: number, item) => sum + item.quantity, 0);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-stone-50">
                <ActivityIndicator size="large" color="#EA580C" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-stone-50">
            {/* Header */}
            <View className="bg-white border-b border-stone-200 px-4 py-4 pt-12">
                <Text className="text-2xl font-bold text-stone-900">Menú para Llevar</Text>
                <Text className="text-sm text-stone-600 mt-1">Selecciona tus productos favoritos</Text>
            </View>

            {/* Offline Banner */}
            {!orderingEnabled && !loading && (
                <View className="bg-stone-800 px-4 py-3 items-center justify-center">
                    <Text className="text-white font-bold text-center">
                        ⚠️ Los pedidos para llevar están cerrados por ahora.
                    </Text>
                    <Text className="text-stone-300 text-xs text-center mt-1">
                        Puedes ver el menú, pero no ordenar.
                    </Text>
                </View>
            )}

            {/* Categories */}
            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
                    className="bg-white border-b border-stone-200"
                >
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            onPress={() => setSelectedCategory(category.id)}
                            className={`px-4 py-2 rounded-full ${selectedCategory === category.id
                                ? 'bg-orange-600'
                                : 'bg-stone-100'
                                }`}
                        >
                            <Text className={`font-medium ${selectedCategory === category.id
                                ? 'text-white'
                                : 'text-stone-700'
                                }`}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Products Grid */}
            <ScrollView className="flex-1 px-4 py-4">
                <View className="flex-row flex-wrap justify-between">
                    {filteredProducts.map((product) => (
                        <View
                            key={product.id}
                            className="w-[48%] bg-white rounded-xl border border-stone-200 mb-4 overflow-hidden"
                        >
                            {product.image_url && (
                                <Image
                                    source={{ uri: product.image_url }}
                                    className="w-full h-32"
                                    resizeMode="cover"
                                />
                            )}
                            <View className="p-3">
                                <Text className="text-base font-semibold text-stone-900" numberOfLines={2}>
                                    {product.name}
                                </Text>
                                {product.description && (
                                    <Text className="text-xs text-stone-500 mt-1" numberOfLines={2}>
                                        {product.description}
                                    </Text>
                                )}
                                <Text className="text-lg font-bold text-orange-600 mt-2">
                                    ${product.price.toFixed(2)}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => handleAddToCart(product)}
                                    disabled={!orderingEnabled}
                                    className={`rounded-lg py-2 mt-3 flex-row items-center justify-center ${orderingEnabled ? 'bg-orange-600' : 'bg-stone-300'}`}
                                >
                                    {orderingEnabled ? (
                                        <>
                                            <Plus size={16} color="white" />
                                            <Text className="text-white font-semibold ml-1">Agregar</Text>
                                        </>
                                    ) : (
                                        <Text className="text-stone-500 font-semibold ml-1">No Disponible</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {filteredProducts.length === 0 && (
                    <View className="items-center justify-center py-20">
                        <Text className="text-stone-400 text-center">
                            No hay productos disponibles en esta categoría
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Floating Cart Button */}
            {cartItemCount > 0 && (
                <TouchableOpacity
                    onPress={() => router.push('/takeout/checkout')}
                    className="absolute bottom-8 right-4 bg-orange-600 rounded-full px-6 py-4 flex-row items-center shadow-lg"
                >
                    <ShoppingCart size={24} color="white" />
                    <Text className="text-white font-bold text-lg ml-2">{cartItemCount}</Text>
                    <Text className="text-white font-semibold ml-2">Ver Carrito</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
