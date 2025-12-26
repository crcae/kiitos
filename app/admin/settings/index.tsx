import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Modal, Image, Platform, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MapPin, Palette, Globe, QrCode, Info, X, ExternalLink, UtensilsCrossed, ShoppingBag, Store, Camera } from 'lucide-react-native';

import { useRouter } from 'expo-router';
import AirbnbButton from '../../../src/components/AirbnbButton';
import AirbnbInput from '../../../src/components/AirbnbInput';
import AirbnbCard from '../../../src/components/AirbnbCard';
import { colors, spacing, typography } from '../../../src/styles/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { useRestaurant } from '../../../src/hooks/useRestaurant';
import { subscribeToRestaurantConfig, updateRestaurantConfig, updateRestaurant } from '../../../src/services/menu';
import { uploadImage } from '../../../src/services/storage';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import ColorPicker, { HueSlider, Panel1 } from 'reanimated-color-picker';
import useDebounce from '../../../src/hooks/useDebounce';

const DAYS = [
    { key: 'mon', label: 'Lunes' },
    { key: 'tue', label: 'Martes' },
    { key: 'wed', label: 'Miércoles' },
    { key: 'thu', label: 'Jueves' },
    { key: 'fri', label: 'Viernes' },
    { key: 'sat', label: 'Sábado' },
    { key: 'sun', label: 'Domingo' },
];

const MARKETPLACE_CATEGORIES = [
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

export default function SettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { restaurant } = useRestaurant();
    const restaurantId = user?.restaurantId;

    // Settings State
    const [allowGuestOrdering, setAllowGuestOrdering] = useState(false);
    const [enableTakeout, setEnableTakeout] = useState(false);
    const [brandingLogo, setBrandingLogo] = useState<string | null>(null);
    const [brandingColor, setBrandingColor] = useState('#F97316');
    const [openingHours, setOpeningHours] = useState<any>({});
    const [googlePlaceId, setGooglePlaceId] = useState('');
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
    const [locationName, setLocationName] = useState<string | null>(null);
    const [showPlaceIdInfo, setShowPlaceIdInfo] = useState(false);
    const [locationRestriction, setLocationRestriction] = useState({
        enabled: false,
        radius_meters: 1000 // Default 1km
    });

    const [isVisibleInMarketplace, setIsVisibleInMarketplace] = useState(false);
    const [marketplaceSettings, setMarketplaceSettings] = useState<{
        coverImage?: string;
        prepTime?: string;
        categories?: string[];
    }>({});

    // UI State
    const [uploading, setUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [qrModalVisible, setQrModalVisible] = useState(false);

    // New: Local Name State
    const [restaurantName, setRestaurantName] = useState('');
    const debouncedName = useDebounce(restaurantName, 1000);

    // Initial Load - Set Name
    useEffect(() => {
        if (restaurant && restaurant.name && restaurantName === '') {
            setRestaurantName(restaurant.name);
        }
    }, [restaurant]);

    // Save Name Effect
    useEffect(() => {
        if (!restaurantId || isInitialLoad || !debouncedName) return;

        // Only save if different from DB to prevent loops
        if (restaurant && debouncedName !== restaurant.name) {
            console.log("Auto-saving name:", debouncedName);
            setIsSaving(true);
            updateRestaurant(restaurantId, { name: debouncedName })
                .then(() => {
                    setLastSaved(new Date());
                    setIsSaving(false);
                    // Alert.alert("Success", "Name saved."); // Optional: remove alert for seamless auto-save
                })
                .catch(err => {
                    console.error("Name save error:", err);
                    setIsSaving(false);
                });
        }
    }, [debouncedName]);

    // New: Debounce Prep Time
    const debouncedPrepTime = useDebounce(marketplaceSettings.prepTime, 1500);

    // Save Prep Time Effect
    useEffect(() => {
        if (!restaurantId || isInitialLoad || !debouncedPrepTime) return;

        const currentDbVal = restaurant?.settings?.marketplaceSettings?.prepTime;
        if (debouncedPrepTime !== currentDbVal) {
            console.log("Auto-saving prep time:", debouncedPrepTime);
            // We need to pass the FULL marketplaceSettings including this new prepTime
            // actually marketplaceSettings state already has it.
            // But be careful of stale closures if we use 'marketplaceSettings' from scope?
            // autoSave uses its arg to merge.
            // But wait, autoSave logic: updateRestaurantConfig(id, updates).
            // updates = { marketplaceSettings: ... }
            // If I just pass { marketplaceSettings }, it uses the CURRENT state 'marketplaceSettings' which has the new prepTime?
            // Yes, because this effect runs when debouncedPrepTime changes, which tracks state.
            // But to be safe, construct it.

            const newSettings = { ...marketplaceSettings, prepTime: debouncedPrepTime };
            autoSave({ marketplaceSettings: newSettings });
        }
    }, [debouncedPrepTime]);

    const [brandingModalVisible, setBrandingModalVisible] = useState(false);

    // Initial load tracking to prevent auto-saving on first mount
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const debouncedBrandingColor = useDebounce(brandingColor, 1000);
    const debouncedGooglePlaceId = useDebounce(googlePlaceId, 1500);
    const debouncedRadioMeters = useDebounce(locationRestriction.radius_meters, 1500);

    useEffect(() => {
        if (!restaurantId) return;

        const unsubscribeConfig = subscribeToRestaurantConfig(restaurantId, (config) => {
            setAllowGuestOrdering(config.allow_guest_ordering ?? false);
            setEnableTakeout(config.enable_takeout ?? false);
            if (config.branding) {
                setBrandingLogo(config.branding.logo_url || null);
                setBrandingColor(config.branding.primary_color || '#F97316');
            }
            if (config.opening_hours) {
                setOpeningHours(config.opening_hours);
            } else {
                // Initialize default opening hours
                const initialHours: any = {};
                DAYS.forEach(day => {
                    initialHours[day.key] = { open: '09:00', close: '22:00', closed: false };
                });
                setOpeningHours(initialHours);
            }
            if (config.google_place_id) {
                setGooglePlaceId(config.google_place_id);
            }
            if (config.coordinates) {
                setCoordinates(config.coordinates);
            }
            if (config.location_name) {
                setLocationName(config.location_name);
            }
            if (config.location_restriction) {
                setLocationRestriction(config.location_restriction);
            }
            setIsVisibleInMarketplace(config.isVisibleInMarketplace ?? false);
            setMarketplaceSettings(config.marketplaceSettings || {});
            setIsInitialLoad(false);
        });

        return () => unsubscribeConfig();
    }, [restaurantId]);

    // Auto-save function
    const autoSave = async (updates: any) => {
        if (!restaurantId || isInitialLoad) return;
        try {
            setIsSaving(true);
            await updateRestaurantConfig(restaurantId, updates);
            setLastSaved(new Date());
        } catch (e: any) {
            console.error('Auto-save error:', e);
            Alert.alert("Auto-Save Error", e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Effect for debounced branding color
    useEffect(() => {
        if (!isInitialLoad) {
            autoSave({
                branding: {
                    logo_url: brandingLogo || undefined,
                    primary_color: debouncedBrandingColor,
                }
            });
        }
    }, [debouncedBrandingColor]);

    // Effect for debounced Google Place ID
    useEffect(() => {
        if (!isInitialLoad) {
            autoSave({ google_place_id: debouncedGooglePlaceId });
        }
    }, [debouncedGooglePlaceId]);

    // Effect for debounced Radio Meters
    useEffect(() => {
        if (!isInitialLoad) {
            autoSave({ location_restriction: { ...locationRestriction, radius_meters: debouncedRadioMeters } });
        }
    }, [debouncedRadioMeters]);

    // Effect for debounced opening hours could be added if needed, 
    // but usually these are changed one by one, so direct save is fine

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            const localUri = result.assets[0].uri;
            setBrandingLogo(localUri);

            // Immediate upload and save
            if (restaurantId) {
                try {
                    setUploading(true);
                    setIsSaving(true);
                    const filename = `branding/logo_${Date.now()}.jpg`;
                    const logoUrl = await uploadImage(localUri, `restaurants/${restaurantId}/${filename}`);
                    await updateRestaurantConfig(restaurantId, {
                        branding: {
                            logo_url: logoUrl,
                            primary_color: brandingColor,
                        }
                    });
                    setBrandingLogo(logoUrl);
                    setLastSaved(new Date());
                } catch (e) {
                    console.error('Logo upload error:', e);
                    Alert.alert('Error', 'No se pudo subir el logo');
                } finally {
                    setUploading(false);
                    setIsSaving(false);
                }
            }
        }
    };

    const pickCoverImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            const localUri = result.assets[0].uri;

            // Optimistic update
            const newSettings = { ...marketplaceSettings, coverImage: localUri };
            setMarketplaceSettings(newSettings);

            if (restaurantId) {
                try {
                    setUploading(true);
                    setIsSaving(true);
                    const filename = `marketplace/cover_${Date.now()}.jpg`;
                    const coverUrl = await uploadImage(localUri, `restaurants/${restaurantId}/${filename}`);

                    const finalSettings = { ...newSettings, coverImage: coverUrl };
                    setMarketplaceSettings(finalSettings);

                    await updateRestaurantConfig(restaurantId, {
                        marketplaceSettings: finalSettings
                    });
                    setLastSaved(new Date());
                } catch (e) {
                    console.error('Cover upload error:', e);
                    Alert.alert('Error', 'No se pudo subir la imagen de portada');
                } finally {
                    setUploading(false);
                    setIsSaving(false);
                }
            }
        }
    };

    const toggleCategory = (cat: string) => {
        const currentCats = marketplaceSettings.categories || [];
        let newCats;
        if (currentCats.includes(cat)) {
            newCats = currentCats.filter(c => c !== cat);
        } else {
            newCats = [...currentCats, cat];
        }
        const newSettings = { ...marketplaceSettings, categories: newCats };
        setMarketplaceSettings(newSettings);
        autoSave({ marketplaceSettings: newSettings });
    };

    const fetchCoordinates = async () => {
        if (!googlePlaceId) {
            Alert.alert('Error', 'Por favor ingresa un Google Place ID');
            return;
        }
        setUploading(true);
        setIsSaving(true);
        try {
            // Use local API proxy to avoid CORS
            const response = await fetch(`/api/places/details?place_id=${googlePlaceId}`);
            const data = await response.json();

            if (data.status === 'OK' && data.result?.geometry?.location) {
                const { lat, lng } = data.result.geometry.location;
                setCoordinates({ lat, lng });
                const name = data.result.name;
                setLocationName(name);

                // Save coordinates immediately
                await updateRestaurantConfig(restaurantId!, {
                    coordinates: { lat, lng },
                    location_name: name
                });
                setLastSaved(new Date());
                Alert.alert('Éxito', `Ubicación confirmada:\n${name}`);
            } else {
                console.error('Places API Error:', data);
                Alert.alert('Error', 'No se pudieron obtener las coordenadas. Verifica el Place ID.');
            }
        } catch (error) {
            Alert.alert('Error', 'Error de red al conectar con Google Maps');
            console.error(error);
        } finally {
            setUploading(false);
            setIsSaving(false);
        }
    };

    const updateDayHours = (day: string, field: string, value: any) => {
        const newHours = {
            ...openingHours,
            [day]: {
                ...openingHours[day],
                [field]: value
            }
        };
        setOpeningHours(newHours);
        autoSave({ opening_hours: newHours });
    };

    return (
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="px-6 py-4 border-b border-slate-800 flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ArrowLeft size={24} color="white" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-xl font-bold text-white">Configuración</Text>
                        <View className="flex-row items-center">
                            <Text className="text-slate-400 text-xs mr-2">{restaurant?.name || 'Cargando...'}</Text>
                            {isSaving ? (
                                <View className="flex-row items-center">
                                    <View className="w-1 h-1 rounded-full bg-indigo-400 mr-1" />
                                    <Text className="text-indigo-400 text-[10px] font-medium uppercase tracking-tighter">Guardando...</Text>
                                </View>
                            ) : lastSaved ? (
                                <View className="flex-row items-center">
                                    <View className="w-1 h-1 rounded-full bg-emerald-400 mr-1" />
                                    <Text className="text-emerald-400 text-[10px] uppercase tracking-tighter">Sincronizado</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 px-6 py-4">
                {/* NAME & GENERAL */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <Store size={20} color="#6366f1" className="mr-2" />
                        <Text className="text-lg font-bold text-white">General</Text>
                    </View>
                    <AirbnbCard variant="dark">
                        <View className="mb-4">
                            <Text className="text-white font-medium mb-1">Nombre del Restaurante</Text>
                            <Text className="text-slate-400 text-xs mb-3">Este nombre será visible en el Marketplace y tickets.</Text>
                            <TextInput
                                className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 font-bold text-lg"
                                value={restaurantName}
                                onChangeText={setRestaurantName}
                                placeholder="Nombre del Restaurante"
                                placeholderTextColor="#64748b"
                            />
                        </View>
                    </AirbnbCard>
                </View>

                {/* OPERATION MODEL */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <UtensilsCrossed size={20} color="#6366f1" className="mr-2" />
                        <Text className="text-lg font-bold text-white">Modelo de Servicio</Text>
                    </View>
                    <View className="flex-row gap-4">
                        {/* Card for Table Service (Primary/Default) */}
                        <TouchableOpacity
                            onPress={() => autoSave({ serviceType: 'table' })}
                            className={`flex-1 p-4 rounded-xl border-2 ${restaurant?.settings?.serviceType !== 'counter' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}
                        >
                            <View className="items-center mb-2">
                                <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${restaurant?.settings?.serviceType !== 'counter' ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                    <UtensilsCrossed size={24} color="white" />
                                </View>
                                <Text className={`font-bold text-center ${restaurant?.settings?.serviceType !== 'counter' ? 'text-white' : 'text-slate-300'}`}>Table Service</Text>
                            </View>
                            <Text className="text-slate-400 text-xs text-center leading-4">
                                Servicio completo, asignación de mesas y meseros. Restaurante tradicional.
                            </Text>
                        </TouchableOpacity>

                        {/* Card for Counter Service */}
                        <TouchableOpacity
                            onPress={() => autoSave({ serviceType: 'counter' })}
                            className={`flex-1 p-4 rounded-xl border-2 ${restaurant?.settings?.serviceType === 'counter' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}
                        >
                            <View className="items-center mb-2">
                                <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${restaurant?.settings?.serviceType === 'counter' ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                    <ShoppingBag size={24} color="white" />
                                </View>
                                <Text className={`font-bold text-center ${restaurant?.settings?.serviceType === 'counter' ? 'text-white' : 'text-slate-300'}`}>Counter Service</Text>
                            </View>
                            <Text className="text-slate-400 text-xs text-center leading-4">
                                Pedidos en barra, pago inmediato. Ideal para Fast Food o Cafeterías.
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* TAKEOUT MODULE TOGGLE (Only for Counter Service) */}

                    {/* Additional Options for Counter Service ONLY */}
                    {restaurant?.settings?.serviceType === 'counter' && (
                        <View className="mt-4">
                            <AirbnbCard variant="dark">
                                <View className="flex-row items-center justify-between py-2">
                                    <View>
                                        <Text className="text-white font-medium">Pedir nombre del cliente</Text>
                                        <Text className="text-slate-400 text-xs">Ideal para cafés (estilo Starbucks) para llamar al entregar</Text>
                                    </View>
                                    <Switch
                                        trackColor={{ false: "#334155", true: "#059669" }}
                                        thumbColor={restaurant?.settings?.require_guest_name ? "#ffffff" : "#cbd5e1"}
                                        onValueChange={(val) => autoSave({ require_guest_name: val })}
                                        value={restaurant?.settings?.require_guest_name ?? true}
                                    />
                                </View>
                            </AirbnbCard>
                        </View>
                    )}
                </View>



                {/* General Settings */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <Globe size={20} color="#6366f1" className="mr-2" />
                        <Text className="text-lg font-bold text-white">General</Text>
                    </View>
                    <AirbnbCard variant="dark">
                        {restaurant?.settings?.serviceType !== 'counter' && (
                            <View className="py-2 border-b border-slate-700">
                                <View className="flex-row items-center justify-between">
                                    <View>
                                        <Text className="text-white font-medium">Pedidos de Clientes</Text>
                                        <Text className="text-slate-400 text-xs">Permitir que los clientes pidan desde su mesa</Text>
                                    </View>
                                    <Switch
                                        trackColor={{ false: "#334155", true: "#059669" }}
                                        thumbColor={allowGuestOrdering ? "#ffffff" : "#cbd5e1"}
                                        onValueChange={(val) => {
                                            setAllowGuestOrdering(val);
                                            autoSave({ allow_guest_ordering: val });
                                        }}
                                        value={allowGuestOrdering}
                                    />
                                </View>

                                {/* Move Radio Restriction here */}
                                {allowGuestOrdering && (
                                    <View className="mt-4 pt-4 border-t border-slate-700/50">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <View>
                                                <Text className="text-white font-medium">Restricción de Radio</Text>
                                                <Text className="text-slate-400 text-xs">Limitar pedidos a una distancia especifica</Text>
                                            </View>
                                            <Switch
                                                trackColor={{ false: "#334155", true: "#059669" }}
                                                thumbColor={locationRestriction.enabled ? "#ffffff" : "#cbd5e1"}
                                                onValueChange={(val) => {
                                                    const newRest = { ...locationRestriction, enabled: val };
                                                    setLocationRestriction(newRest);
                                                    autoSave({ location_restriction: newRest });
                                                }}
                                                value={locationRestriction.enabled}
                                            />
                                        </View>

                                        {locationRestriction.enabled && (
                                            <View>
                                                <View className="flex-row justify-between mb-2">
                                                    <Text className="text-slate-300 text-sm">Radio Máximo (metros)</Text>
                                                    <Text className="text-indigo-400 text-sm font-bold">{locationRestriction.radius_meters}m</Text>
                                                </View>
                                                <TextInput
                                                    className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 font-bold text-lg"
                                                    keyboardType="numeric"
                                                    value={String(locationRestriction.radius_meters)}
                                                    onChangeText={(t) => {
                                                        const val = parseInt(t) || 0;
                                                        setLocationRestriction(prev => ({ ...prev, radius_meters: val }));
                                                    }}
                                                    placeholder="1000"
                                                />
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                        <View className="py-2">
                            <View className="flex-row items-center justify-between">
                                <View>
                                    <Text className="text-white font-medium">Módulo Takeout</Text>
                                    <Text className="text-slate-400 text-xs">Habilitar pedidos para llevar</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: "#334155", true: "#ea580c" }}
                                    thumbColor={enableTakeout ? "#ffffff" : "#cbd5e1"}
                                    onValueChange={(val) => {
                                        setEnableTakeout(val);
                                        autoSave({ enable_takeout: val });
                                    }}
                                    value={enableTakeout}
                                />
                            </View>

                            {/* Takeout QR and Config Section */}
                            {enableTakeout && (
                                <View className="mt-4 pt-4 border-t border-slate-700/50">
                                    <View className="flex-row items-center mb-4">
                                        <QrCode size={18} color="#ea580c" className="mr-2" />
                                        <Text className="text-sm font-bold text-white">QR Takeout</Text>
                                    </View>
                                    <View className="items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6">
                                        <View className="bg-white p-3 rounded-xl mb-4">
                                            <QRCode
                                                value={`${Platform.OS === 'web' ? window.location.origin : 'https://kiitos-app.web.app'}/takeout/${restaurantId}`}
                                                size={120}
                                            />
                                        </View>
                                        <Text className="text-slate-400 text-center text-xs mb-4 px-4">
                                            Este código dirige a los clientes a tu menú para llevar.
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setQrModalVisible(true)}
                                            className="bg-indigo-600/20 px-4 py-2 rounded-lg border border-indigo-500/30"
                                        >
                                            <Text className="text-indigo-400 font-bold text-xs italic">Ver pantalla completa</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* MARKETPLACE CONFIG SUB-SECTION */}
                                    <View className="flex-row items-center justify-between mb-4 mt-2">
                                        <View>
                                            <Text className="text-white font-medium">Visible en el Marketplace</Text>
                                            <Text className="text-slate-400 text-xs">Muestra tu restaurante en la app de consumidores</Text>
                                        </View>
                                        <Switch
                                            trackColor={{ false: "#334155", true: "#059669" }}
                                            thumbColor={isVisibleInMarketplace ? "#ffffff" : "#cbd5e1"}
                                            onValueChange={(val) => {
                                                setIsVisibleInMarketplace(val);
                                                autoSave({ isVisibleInMarketplace: val });
                                            }}
                                            value={isVisibleInMarketplace}
                                        />
                                    </View>

                                    {/* Conditional Form */}
                                    {isVisibleInMarketplace && (
                                        <View className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">

                                            {/* Cover Image & Prep Time Row */}
                                            <View className="flex-row mb-6">
                                                {/* Compact Cover Image */}
                                                <TouchableOpacity
                                                    onPress={pickCoverImage}
                                                    className="mr-6 items-center"
                                                >
                                                    <View className="w-24 h-24 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden items-center justify-center relative shadow-sm">
                                                        {marketplaceSettings.coverImage ? (
                                                            <Image source={{ uri: marketplaceSettings.coverImage }} className="w-full h-full" resizeMode="cover" />
                                                        ) : (
                                                            <Camera size={32} color="#64748b" />
                                                        )}
                                                        {/* Edit Badge */}
                                                        <View className="absolute bottom-0 right-0 left-0 bg-black/60 py-1 items-center">
                                                            <Text className="text-white text-[10px] font-bold">EDITAR</Text>
                                                        </View>
                                                    </View>
                                                    <Text className="text-white text-xs font-medium mt-2">Portada (16:9)</Text>
                                                </TouchableOpacity>

                                                {/* Prep Time Input */}
                                                <View className="flex-1 justify-center">
                                                    <Text className="text-white font-medium mb-2">Tiempo de Preparación</Text>
                                                    <View className="flex-row items-center bg-slate-800 rounded-xl border border-slate-700 px-4 h-12">
                                                        <Clock size={16} color="#94a3b8" className="mr-2" />
                                                        <TextInput
                                                            className="flex-1 text-white font-bold text-lg h-full"
                                                            placeholder="20"
                                                            placeholderTextColor="#475569"
                                                            keyboardType="numeric"
                                                            value={marketplaceSettings.prepTime?.replace(/[^0-9]/g, '') || ''}
                                                            onChangeText={(t) => {
                                                                const numeric = t.replace(/[^0-9]/g, '');
                                                                const newSettings = { ...marketplaceSettings, prepTime: numeric ? `${numeric} min` : '' };
                                                                setMarketplaceSettings(newSettings);
                                                            }}
                                                        // onEndEditing removed in favor of debounced auto-save
                                                        />
                                                        <Text className="text-slate-500 font-medium ml-1">min</Text>
                                                    </View>
                                                    <Text className="text-slate-500 text-xs mt-1">Promedio estimado por orden</Text>
                                                </View>
                                            </View>

                                            {/* Categories */}
                                            <Text className="text-white font-medium mb-3">Categoría Principal (Selecciona multiples)</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-2 px-2">
                                                <View className="flex-row gap-4 mb-2">
                                                    {MARKETPLACE_CATEGORIES.map(cat => {
                                                        const isSelected = marketplaceSettings.categories?.includes(cat.name);
                                                        return (
                                                            <TouchableOpacity
                                                                key={cat.id}
                                                                onPress={() => toggleCategory(cat.name)}
                                                                className="items-center"
                                                                style={{ width: 70 }}
                                                            >
                                                                <View className={`w-16 h-16 rounded-full overflow-hidden mb-2 border-2 ${isSelected ? 'border-orange-500' : 'border-transparent'}`}>
                                                                    <Image
                                                                        source={{ uri: cat.image }}
                                                                        className={`w-full h-full ${isSelected ? 'opacity-100' : 'opacity-60'}`}
                                                                        resizeMode="cover"
                                                                    />
                                                                    {isSelected && (
                                                                        <View className="absolute inset-0 bg-orange-500/20 items-center justify-center">
                                                                            <View className="bg-orange-500 rounded-full p-1">
                                                                                <UtensilsCrossed size={10} color="white" />
                                                                            </View>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text
                                                                    numberOfLines={1}
                                                                    className={`text-[10px] text-center w-full ${isSelected ? 'text-orange-400 font-bold' : 'text-slate-400'}`}
                                                                >
                                                                    {cat.name}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )
                                                    })}
                                                </View>
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </AirbnbCard>
                </View>

                {/* Branding Section */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <Palette size={20} color="#6366f1" className="mr-2" />
                        <Text className="text-lg font-bold text-white">Marca</Text>
                    </View>
                    <AirbnbCard variant="dark">
                        <View className="flex-row items-center mb-6">
                            <TouchableOpacity
                                onPress={pickImage}
                                className="w-20 h-20 bg-slate-800 rounded-full border border-slate-700 items-center justify-center overflow-hidden mr-4"
                            >
                                {brandingLogo ? (
                                    <Image source={{ uri: brandingLogo }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <Palette size={24} color="#94a3b8" />
                                )}
                                <View className="absolute bottom-0 left-0 right-0 bg-black/50 py-1">
                                    <Text className="text-[8px] text-white text-center font-bold">CAMBIAR</Text>
                                </View>
                            </TouchableOpacity>
                            <View className="flex-1">
                                <Text className="text-white font-medium mb-1">Logo del Restaurante</Text>
                                <Text className="text-slate-400 text-xs">Aparecerá en el menú y tickets</Text>
                            </View>
                        </View>

                        <View className="pt-4 border-t border-slate-800">
                            <Text className="text-white font-medium mb-3">Color Principal</Text>
                            <View className="flex-row items-center mb-4">
                                <View
                                    style={{ backgroundColor: brandingColor }}
                                    className="w-10 h-10 rounded-lg mr-3 border border-slate-700 shadow-sm"
                                />
                                <View className="flex-1">
                                    <TextInput
                                        className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 font-mono text-sm"
                                        value={brandingColor}
                                        onChangeText={setBrandingColor}
                                        placeholder="#000000"
                                        autoCapitalize="characters"
                                        maxLength={7}
                                    />
                                </View>
                            </View>

                            <View style={{ width: '100%', marginTop: 8 }}>
                                <ColorPicker
                                    style={{ width: '100%' }}
                                    value={brandingColor}
                                    onComplete={({ hex }) => setBrandingColor(hex)}
                                >
                                    <View style={{ height: 180, width: '100%', marginBottom: 16, overflow: 'hidden', borderRadius: 12 }}>
                                        <Panel1 style={{ flex: 1 }} />
                                    </View>
                                    <View style={{ height: 35, width: '100%', marginBottom: 16 }}>
                                        <HueSlider style={{ flex: 1, borderRadius: 17.5 }} />
                                    </View>
                                </ColorPicker>
                            </View>

                            <Text className="text-slate-500 text-[10px] mt-3 italic">
                                Desliza para cambiar el tono o escribe el código HEX manualmente.
                            </Text>
                        </View>
                    </AirbnbCard>
                </View>

                {/* Opening Hours */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <Clock size={20} color="#6366f1" className="mr-2" />
                        <Text className="text-lg font-bold text-white">Horarios de Apertura</Text>
                    </View>
                    <AirbnbCard variant="dark">
                        {DAYS.map((day) => (
                            <View key={day.key} className="flex-row items-center justify-between py-3 border-b border-slate-700 last:border-0">
                                <Text className="text-slate-300 font-medium w-24">{day.label}</Text>
                                <View className="flex-row items-center flex-1 justify-end">
                                    {!openingHours[day.key]?.closed ? (
                                        <View className="flex-row items-center">
                                            <TextInput
                                                className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 w-16 text-center"
                                                value={openingHours[day.key]?.open}
                                                onChangeText={(t) => updateDayHours(day.key, 'open', t)}
                                                placeholder="00:00"
                                            />
                                            <Text className="text-slate-500 mx-2">-</Text>
                                            <TextInput
                                                className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-700 w-16 text-center"
                                                value={openingHours[day.key]?.close}
                                                onChangeText={(t) => updateDayHours(day.key, 'close', t)}
                                                placeholder="00:00"
                                            />
                                        </View>
                                    ) : (
                                        <Text className="text-slate-500 italic mr-4">Cerrado</Text>
                                    )}
                                    <Switch
                                        className="ml-4"
                                        trackColor={{ false: "#059669", true: "#334155" }}
                                        thumbColor="#ffffff"
                                        onValueChange={(val) => updateDayHours(day.key, 'closed', !val)}
                                        value={!openingHours[day.key]?.closed}
                                    />
                                </View>
                            </View>
                        ))}
                    </AirbnbCard>
                </View>

                {/* Location Section */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <MapPin size={20} color="#6366f1" className="mr-2" />
                        <Text className="text-lg font-bold text-white">Ubicación y Radio</Text>
                    </View>
                    <AirbnbCard variant="dark">
                        <View className="mb-6">
                            <View className="flex-row items-center mb-1">
                                <Text className="text-white font-medium mr-2">Google Place ID</Text>
                                <TouchableOpacity onPress={() => setShowPlaceIdInfo(true)}>
                                    <Info size={16} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>
                            <Text className="text-slate-400 text-xs mb-3">Identificador único del lugar en Google Maps</Text>
                            <AirbnbInput
                                label=""
                                variant="dark"
                                value={googlePlaceId}
                                onChangeText={setGooglePlaceId}
                                placeholder="ChIJ..."
                            />

                            <TouchableOpacity
                                onPress={fetchCoordinates}
                                disabled={uploading || !googlePlaceId}
                                className="bg-indigo-600 w-full py-3 rounded-xl flex-row items-center justify-center mt-2"
                            >
                                {uploading ? (
                                    <Clock size={20} color="white" className="mr-2" />
                                ) : (
                                    <MapPin size={20} color="white" className="mr-2" />
                                )}
                                <Text className="text-white font-bold">
                                    {uploading ? 'Verificando...' : 'Confirmar Google Place ID'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {coordinates ? (
                            <View className="bg-green-500/10 p-3 rounded-lg flex-row items-center mb-6 border border-green-500/20">
                                <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                <Text className="text-green-400 text-sm font-medium">
                                    {locationName ? `Ubicación confirmada: ${locationName}` : 'Ubicación confirmada correctamente.'}
                                </Text>
                            </View>
                        ) : (
                            <View className="bg-slate-800 p-3 rounded-lg flex-row items-center mb-6 border border-slate-700">
                                <View className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                                <Text className="text-slate-300 text-sm">No se han guardado coordenadas.</Text>
                            </View>
                        )}

                    </AirbnbCard>
                </View>

                {/* Place ID Info Modal */}
                <Modal
                    visible={showPlaceIdInfo}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowPlaceIdInfo(false)}
                >
                    <View className="flex-1 bg-black/80 justify-center items-center p-4">
                        <View className="bg-slate-900 w-full max-w-md p-6 rounded-2xl border border-slate-700">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-xl font-bold text-white">¿Cómo encontrar mi Place ID?</Text>
                                <TouchableOpacity onPress={() => setShowPlaceIdInfo(false)}>
                                    <X size={24} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <Text className="text-slate-300 mb-4 leading-6">
                                El <Text className="font-bold text-white">Place ID</Text> es un código único que Google Maps usa para identificar tu negocio.
                            </Text>

                            <View className="bg-slate-800 p-4 rounded-xl mb-4">
                                <Text className="text-white font-bold mb-2">Pasos para encontrarlo:</Text>
                                <Text className="text-slate-400 mb-2">1. Ve al "Place ID Finder" de Google Developers.</Text>
                                <Text className="text-slate-400 mb-2">2. Escribe el nombre de tu restaurante en el mapa.</Text>
                                <Text className="text-slate-400">3. Copia el código que aparece como "Place ID".</Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    Linking.openURL('https://developers.google.com/maps/documentation/places/web-service/place-id#find-id');
                                }}
                                className="flex-row items-center justify-center bg-indigo-600/20 p-4 rounded-xl mb-4"
                            >
                                <Text className="text-indigo-400 font-bold mr-2">Abrir Buscador de Place ID</Text>
                                <ExternalLink size={16} color="#818cf8" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowPlaceIdInfo(false)}
                                className="bg-slate-800 py-3 rounded-xl items-center"
                            >
                                <Text className="text-white font-bold">Entendido</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView >


            {/* QR Fullscreen Modal */}
            < Modal visible={qrModalVisible} transparent animationType="fade" >
                <View className="flex-1 justify-center items-center bg-black/90 p-6">
                    <View className="bg-white p-8 rounded-3xl items-center w-full max-w-sm">
                        <Text className="text-2xl font-bold mb-2 text-slate-900">Menú Takeout</Text>
                        <Text className="text-slate-500 text-center mb-8">Escanea para pedir para llevar</Text>

                        <View className="bg-white p-2 rounded-xl mb-8">
                            <QRCode
                                value={`${Platform.OS === 'web' ? window.location.origin : 'https://kiitos-app.web.app'}/takeout/${restaurantId}`}
                                size={250}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={() => setQrModalVisible(false)}
                            className="bg-slate-900 w-full py-4 rounded-xl"
                        >
                            <Text className="text-white text-center font-bold text-lg">Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal >
        </View >
    );
}
