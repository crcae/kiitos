import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Modal, Alert, Switch, Platform, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2, Edit2, Settings, ArrowLeft } from 'lucide-react-native';
import AirbnbButton from '../../../src/components/AirbnbButton';
import AirbnbInput from '../../../src/components/AirbnbInput';
import AirbnbCard from '../../../src/components/AirbnbCard';
import { colors, spacing, typography } from '../../../src/styles/theme';
import {
    getProducts, createProduct, updateProduct, deleteProduct,
    getCategories, createCategory, updateCategory, deleteCategory,
    subscribeToCategories, subscribeToProducts, subscribeToRestaurantConfig, updateRestaurantConfig
} from '../../../src/services/menu';
import { RestaurantSettings } from '../../../src/types/firestore';
import { uploadImage } from '../../../src/services/storage';
import { Product, Category, ProductModifier } from '../../../src/types/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

// Helper component for Tab Button
const TabButton = ({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
        onPress={onPress}
        className={`px-4 py-2 mr-2 rounded-full ${active ? 'bg-indigo-600' : 'bg-slate-700'}`}
    >
        <Text className={`font-semibold ${active ? 'text-white' : 'text-slate-300'}`}>{title}</Text>
    </TouchableOpacity>
);

export default function MenuManagementScreen() {
    const insets = useSafeAreaInsets();
    // Removed activeTab since we show both
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [allowGuestOrdering, setAllowGuestOrdering] = useState(false); // Should fetch initially
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // UI State
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [productModalVisible, setProductModalVisible] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form State
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // New/Edit Item Fields
    const [catName, setCatName] = useState('');
    const [catImage, setCatImage] = useState<string | null>(null);

    const [prodName, setProdName] = useState('');
    const [prodDesc, setProdDesc] = useState('');
    const [prodPrice, setProdPrice] = useState('');
    // prodCategory is now derived from selectedCategoryId for new products
    const [prodImage, setProdImage] = useState<string | null>(null);
    // Simple modifier implementation: comma separated strings for now or just generic
    const [prodModifiersText, setProdModifiersText] = useState('');

    useEffect(() => {
        const unsubscribeCategories = subscribeToCategories((data) => {
            setCategories(data);
        });

        const unsubscribeProducts = subscribeToProducts((data) => {
            setProducts(data);
        });

        const unsubscribeConfig = subscribeToRestaurantConfig('kiitos-main', (config) => {
            setAllowGuestOrdering(config.allow_guest_ordering ?? false);
        });

        // TODO: Load config for allowGuestOrdering

        return () => {
            unsubscribeCategories();
            unsubscribeProducts();
            unsubscribeConfig();
        };
    }, []);

    const pickImage = async (setFunction: (uri: string) => void) => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setFunction(result.assets[0].uri);
        }
    };

    // --- Categories Handlers ---

    const handleSaveCategory = async () => {
        if (!catName) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        try {
            setUploading(true);
            let imageUrl = editingCategory?.image_url;

            if (catImage && catImage !== editingCategory?.image_url) {
                try {
                    const filename = `categories/${Date.now()}.jpg`;
                    imageUrl = await uploadImage(catImage, `restaurants/kiitos-main/${filename}`);
                } catch (uploadError: any) {
                    console.error("Upload failed", uploadError);
                    Alert.alert('Error', 'No se pudo subir la imagen. Inténtalo de nuevo.');
                    setUploading(false);
                    return; // STOP execution
                }
            }

            const categoryData: any = { name: catName };
            if (imageUrl) categoryData.image_url = imageUrl;

            if (editingCategory) {
                await updateCategory(editingCategory.id, categoryData);
            } else {
                await createCategory(categoryData);
            }
            // Realtime listener updates UI
            setCategoryModalVisible(false);
            resetForms();
        } catch (e: any) {
            console.error(e);
            Alert.alert('Error', 'Failed to save category: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const confirmDelete = (title: string, message: string, onConfirm: () => void) => {
        if (Platform.OS === 'web') {
            const confirm = window.confirm('¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.');
            if (confirm) {
                onConfirm();
            }
        } else {
            Alert.alert(
                'Confirmar eliminación',
                '¿Estás seguro?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: onConfirm }
                ]
            );
        }
    };

    const handleDeleteCategory = (id: string) => {
        confirmDelete('Confirm', 'Delete this category?', async () => {
            await deleteCategory(id);
            if (selectedCategoryId === id) setSelectedCategoryId(null);
        });
    };

    // --- Products Handlers ---

    const handleSaveProduct = async () => {
        // Use selectedCategoryId if creating new, or the product's existing category id (though we usually edit in context)
        // For simplicity in this layout, we enforce creating products in the selected category.
        const targetCategoryId = editingProduct ? editingProduct.category_id : selectedCategoryId;

        if (!prodName || !prodPrice || !targetCategoryId) {
            Alert.alert('Error', 'Name, Price and Category (Implicit) are required');
            return;
        }

        const modifiers: ProductModifier[] = prodModifiersText.split(',').filter(m => m.trim()).map((m, idx) => ({
            id: `${Date.now()}-${idx}`,
            name: m.trim(),
            price_adjustment: 0 // Default 0 for simple list
        }));

        try {
            setUploading(true);
            let imageUrl = editingProduct?.image_url;

            if (prodImage && prodImage !== editingProduct?.image_url) {
                try {
                    const filename = `products/${Date.now()}.jpg`;
                    imageUrl = await uploadImage(prodImage, `restaurants/kiitos-main/${filename}`);
                } catch (uploadError: any) {
                    console.error("Upload failed", uploadError);
                    Alert.alert('Error', 'No se pudo subir la imagen. Inténtalo de nuevo.');
                    setUploading(false);
                    return; // STOP execution
                }
            }

            const productData: any = {
                name: prodName,
                description: prodDesc,
                price: parseFloat(prodPrice),
                category_id: targetCategoryId,
                available: true,
                modifiers: modifiers
            };
            if (imageUrl) productData.image_url = imageUrl;

            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
            } else {
                await createProduct(productData);
            }
            setProductModalVisible(false);
            resetForms();
        } catch (e: any) {
            console.error(e);
            Alert.alert('Error', 'Failed to save product: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteProduct = (id: string) => {
        confirmDelete('Confirm', 'Delete this product?', async () => {
            await deleteProduct(id);
        });
    };

    const resetForms = () => {
        setEditingCategory(null);
        setEditingProduct(null);
        setCatName('');
        setCatImage(null);
        setProdName('');
        setProdDesc('');
        setProdPrice('');
        setProdModifiersText('');
        setProdImage(null);
    };

    const openEditCategory = (cat: Category) => {
        setEditingCategory(cat);
        setCatName(cat.name);
        setCatImage(cat.image_url || null);
        setCategoryModalVisible(true);
    };

    const openEditProduct = (prod: Product) => {
        setEditingProduct(prod);
        setProdName(prod.name);
        setProdDesc(prod.description || '');
        setProdPrice(prod.price.toString());
        setProdModifiersText(prod.modifiers?.map(m => m.name).join(', ') || '');
        setProdImage(prod.image_url || null);
        setProductModalVisible(true);
    };

    const toggleGuestOrdering = async (val: boolean) => {
        setAllowGuestOrdering(val);
        try {
            await updateRestaurantConfig('kiitos-main', { allow_guest_ordering: val });
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to update config');
            setAllowGuestOrdering(!val); // Revert
        }
    };

    // --- Renders ---

    // Filter products for the right column
    const filteredProducts = selectedCategoryId
        ? products.filter(p => p.category_id === selectedCategoryId)
        : [];

    return (
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>


            {/* Header / Settings Bar */}
            <View className="px-6 py-4 border-b border-slate-800 flex-row justify-between items-center bg-slate-900 border-t border-t-slate-800">
                <Text className="text-xl font-bold text-white">Menu Manager</Text>

                <View className="flex-row items-center space-x-3 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
                    <Text className={`font-medium ${allowGuestOrdering ? 'text-green-400' : 'text-slate-400'}`}>
                        {allowGuestOrdering ? 'Guest Ordering ON' : 'Guest Ordering OFF'}
                    </Text>
                    <Switch
                        trackColor={{ false: "#334155", true: "#059669" }} // Slate-700 / Emerald-600
                        thumbColor={allowGuestOrdering ? "#ffffff" : "#cbd5e1"} // White / Slate-300
                        ios_backgroundColor="#334155"
                        onValueChange={toggleGuestOrdering}
                        value={allowGuestOrdering}
                    />
                </View>
            </View>

            {/* Two Column Layout */}
            <View className="flex-1 flex-col md:flex-row">

                {/* Left Column: Categories (30% on desktop, 100% on mobile - toggles with selectedCategoryId) */}
                <View className={`w-full md:w-[30%] border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/50 ${selectedCategoryId ? 'hidden md:flex' : 'flex'}`}>
                    <View className="p-4 border-b border-slate-800 flex-row justify-between items-center">
                        <Text className="text-slate-400 font-bold uppercase text-xs tracking-wider">Categories</Text>
                        <TouchableOpacity
                            onPress={() => {
                                resetForms();
                                setCategoryModalVisible(true);
                            }}
                            className="bg-slate-800 p-2 rounded-lg"
                        >
                            <Plus size={16} color={colors.white} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={categories}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ padding: 12, gap: 8 }}
                        renderItem={({ item }) => {
                            const isSelected = selectedCategoryId === item.id;
                            return (
                                <TouchableOpacity
                                    onPress={() => setSelectedCategoryId(item.id)}
                                    className={`p-3 rounded-lg flex-row items-center justify-between ${isSelected ? 'bg-indigo-600' : 'bg-slate-800'}`}
                                >
                                    <View className="flex-row items-center flex-1">
                                        {item.image_url ? (
                                            <Image source={{ uri: item.image_url }} className="w-8 h-8 rounded-md mr-3 bg-slate-700" />
                                        ) : (
                                            <View className="w-8 h-8 rounded-md mr-3 bg-slate-700 items-center justify-center">
                                                <Text className="text-xs text-white uppercase">{item.name.charAt(0)}</Text>
                                            </View>
                                        )}
                                        <Text className={`font-medium flex-1 ${isSelected ? 'text-white' : 'text-slate-300'}`}>{item.name}</Text>
                                    </View>

                                    <View className="flex-row">
                                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); openEditCategory(item); }} className="p-1.5 ml-1">
                                            <Edit2 size={14} color={isSelected ? colors.white : '#94a3b8'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteCategory(item.id); }} className="p-1.5 ml-1">
                                            <Trash2 size={14} color={colors.chile} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>

                {/* Right Column: Products (70% on desktop, 100% on mobile - toggles with selectedCategoryId) */}
                <View className={`flex-1 bg-slate-900 ${selectedCategoryId ? 'flex' : 'hidden md:flex'}`}>
                    <View className="p-4 border-b border-slate-800 flex-row justify-between items-center bg-slate-900">
                        <View className="flex-row items-center">
                            {/* Back Button (Mobile Only) */}
                            {selectedCategoryId && (
                                <TouchableOpacity onPress={() => setSelectedCategoryId(null)} className="mr-3 md:hidden">
                                    <ArrowLeft size={24} color={colors.white} />
                                </TouchableOpacity>
                            )}
                            <Text className="text-slate-400 font-bold uppercase text-xs tracking-wider">
                                {selectedCategoryId ? 'Products' : 'Select a Category'}
                            </Text>
                        </View>
                        {selectedCategoryId && (
                            <View className="md:w-auto">
                                <AirbnbButton
                                    title="New Product"
                                    variant="primary"
                                    onPress={() => {
                                        resetForms();
                                        setProductModalVisible(true);
                                    }}
                                    fullWidth={false}
                                />
                            </View>
                        )}
                    </View>

                    {!selectedCategoryId ? (
                        <View className="flex-1 items-center justify-center opacity-40">
                            <Settings size={48} color="#64748b" />
                            <Text className="text-slate-500 mt-4 text-center">Select a category from the left{'\n'}to view and manage products.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ padding: 24, gap: 12 }}
                            ListEmptyComponent={
                                <Text className="text-slate-400 text-center mt-10">No products in this category.</Text>
                            }
                            renderItem={({ item }) => (
                                <View className="bg-slate-800 p-4 rounded-xl flex-row justify-between items-center border border-slate-700">
                                    {item.image_url && (
                                        <Image source={{ uri: item.image_url }} className="w-16 h-16 rounded-lg mr-4 bg-slate-700" />
                                    )}
                                    <View className="flex-1">
                                        <Text className="text-lg font-medium text-white">{item.name}</Text>
                                        <Text className="text-slate-400 text-sm">${item.price.toFixed(2)}</Text>
                                        {item.description && <Text className="text-slate-500 text-xs mt-1" numberOfLines={1}>{item.description}</Text>}
                                    </View>
                                    <View className="flex-row items-center">
                                        <TouchableOpacity onPress={() => openEditProduct(item)} className="p-2 mr-2">
                                            <Edit2 size={20} color={colors.white} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteProduct(item.id)} className="p-2">
                                            <Trash2 size={20} color={colors.chile} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>

            <Modal visible={categoryModalVisible} transparent animationType="fade">
                {Platform.OS === 'web' ? (
                    <View className="flex-1 justify-center items-center bg-black/60 px-4">
                        <View className="bg-white w-full max-w-sm p-6 rounded-2xl">
                            <Text className="text-xl font-bold mb-4 text-slate-900">{editingCategory ? 'Edit' : 'New'} Category</Text>
                            <AirbnbInput label="Name" value={catName} onChangeText={setCatName} placeholder="e.g., Drinks" />

                            <TouchableOpacity onPress={() => pickImage(setCatImage)} className="mb-4 mt-2 items-center justify-center h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300">
                                {catImage ? (
                                    <Image source={{ uri: catImage }} className="w-full h-full rounded-lg" resizeMode="cover" />
                                ) : (
                                    <Text className="text-slate-500">Pick Image</Text>
                                )}
                            </TouchableOpacity>

                            <View className="flex-row justify-end mt-4 space-x-2">
                                <TouchableOpacity onPress={() => setCategoryModalVisible(false)} className="px-4 py-2">
                                    <Text className="text-slate-500 font-medium">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSaveCategory} disabled={uploading} className="bg-indigo-600 px-4 py-2 rounded-lg">
                                    <Text className="text-white font-medium">{uploading ? 'Uploading...' : 'Save'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center items-center bg-black/60 px-4">
                            <View className="bg-white w-full max-w-sm p-6 rounded-2xl">
                                <Text className="text-xl font-bold mb-4 text-slate-900">{editingCategory ? 'Edit' : 'New'} Category</Text>
                                <AirbnbInput label="Name" value={catName} onChangeText={setCatName} placeholder="e.g., Drinks" />

                                <TouchableOpacity onPress={() => pickImage(setCatImage)} className="mb-4 mt-2 items-center justify-center h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300">
                                    {catImage ? (
                                        <Image source={{ uri: catImage }} className="w-full h-full rounded-lg" resizeMode="cover" />
                                    ) : (
                                        <Text className="text-slate-500">Pick Image</Text>
                                    )}
                                </TouchableOpacity>

                                <View className="flex-row justify-end mt-4 space-x-2">
                                    <TouchableOpacity onPress={() => setCategoryModalVisible(false)} className="px-4 py-2">
                                        <Text className="text-slate-500 font-medium">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleSaveCategory} disabled={uploading} className="bg-indigo-600 px-4 py-2 rounded-lg">
                                        <Text className="text-white font-medium">{uploading ? 'Uploading...' : 'Save'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                )}
            </Modal>

            {/* Product Modal */}
            <Modal visible={productModalVisible} transparent animationType="fade">
                {Platform.OS === 'web' ? (
                    <View className="flex-1 justify-center items-center bg-black/60 px-4">
                        <View className="bg-white w-full max-w-md p-6 rounded-2xl">
                            <Text className="text-xl font-bold mb-4 text-slate-900">{editingProduct ? 'Edit' : 'New'} Product</Text>
                            <ScrollView className="max-h-96">
                                <AirbnbInput label="Name" value={prodName} onChangeText={setProdName} placeholder="e.g., Burger" />
                                <AirbnbInput label="Description" value={prodDesc} onChangeText={setProdDesc} placeholder="Delicious beef burger" />
                                <AirbnbInput label="Price" value={prodPrice} onChangeText={setProdPrice} placeholder="0.00" keyboardType="numeric" />

                                {/* Removed Category Picker - Implicitly uses selectedCategoryId */}

                                <AirbnbInput
                                    label="Modifiers (comma separated)"
                                    value={prodModifiersText}
                                    onChangeText={setProdModifiersText}
                                    placeholder="Cheese, Bacon, No Pickle"
                                />

                                <TouchableOpacity onPress={() => pickImage(setProdImage)} className="mb-4 mt-2 items-center justify-center h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300">
                                    {prodImage ? (
                                        <Image source={{ uri: prodImage }} className="w-full h-full rounded-lg" resizeMode="cover" />
                                    ) : (
                                        <Text className="text-slate-500">Pick Product Image</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>

                            <View className="flex-row justify-end mt-4 space-x-2">
                                <TouchableOpacity onPress={() => setProductModalVisible(false)} className="px-4 py-2">
                                    <Text className="text-slate-500 font-medium">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSaveProduct} disabled={uploading} className="bg-indigo-600 px-4 py-2 rounded-lg">
                                    <Text className="text-white font-medium">{uploading ? 'Uploading...' : 'Save'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center items-center bg-black/60 px-4">
                            <View className="bg-white w-full max-w-md p-6 rounded-2xl">
                                <Text className="text-xl font-bold mb-4 text-slate-900">{editingProduct ? 'Edit' : 'New'} Product</Text>
                                <ScrollView className="max-h-96" keyboardShouldPersistTaps="handled">
                                    <AirbnbInput label="Name" value={prodName} onChangeText={setProdName} placeholder="e.g., Burger" />
                                    <AirbnbInput label="Description" value={prodDesc} onChangeText={setProdDesc} placeholder="Delicious beef burger" />
                                    <AirbnbInput label="Price" value={prodPrice} onChangeText={setProdPrice} placeholder="0.00" keyboardType="numeric" />

                                    {/* Removed Category Picker - Implicitly uses selectedCategoryId */}

                                    <AirbnbInput
                                        label="Modifiers (comma separated)"
                                        value={prodModifiersText}
                                        onChangeText={setProdModifiersText}
                                        placeholder="Cheese, Bacon, No Pickle"
                                    />

                                    <TouchableOpacity onPress={() => pickImage(setProdImage)} className="mb-4 mt-2 items-center justify-center h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300">
                                        {prodImage ? (
                                            <Image source={{ uri: prodImage }} className="w-full h-full rounded-lg" resizeMode="cover" />
                                        ) : (
                                            <Text className="text-slate-500">Pick Product Image</Text>
                                        )}
                                    </TouchableOpacity>
                                </ScrollView>

                                <View className="flex-row justify-end mt-4 space-x-2">
                                    <TouchableOpacity onPress={() => setProductModalVisible(false)} className="px-4 py-2">
                                        <Text className="text-slate-500 font-medium">Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleSaveProduct} disabled={uploading} className="bg-indigo-600 px-4 py-2 rounded-lg">
                                        <Text className="text-white font-medium">{uploading ? 'Uploading...' : 'Save'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                )}
            </Modal>
        </View>
    );
}
