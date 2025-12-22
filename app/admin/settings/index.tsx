import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Modal, Image, Platform, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MapPin, Palette, Globe, QrCode, Info, X, ExternalLink } from 'lucide-react-native';

import { useRouter } from 'expo-router';
import AirbnbButton from '../../../src/components/AirbnbButton';
import AirbnbInput from '../../../src/components/AirbnbInput';
import AirbnbCard from '../../../src/components/AirbnbCard';
import { colors, spacing, typography } from '../../../src/styles/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { useRestaurant } from '../../../src/hooks/useRestaurant';
import { subscribeToRestaurantConfig, updateRestaurantConfig } from '../../../src/services/menu';
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

    // UI State
    const [uploading, setUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [qrModalVisible, setQrModalVisible] = useState(false);
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
        } catch (e) {
            console.error('Auto-save error:', e);
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
                {/* General Settings */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <Globe size={20} color="#6366f1" className="mr-2" />
                        <Text className="text-lg font-bold text-white">General</Text>
                    </View>
                    <AirbnbCard variant="dark">
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

                            {/* Takeout QR Section Moved Here */}
                            {enableTakeout && (
                                <View className="mt-4 pt-4 border-t border-slate-700/50">
                                    <View className="flex-row items-center mb-4">
                                        <QrCode size={18} color="#ea580c" className="mr-2" />
                                        <Text className="text-sm font-bold text-white">QR Takeout</Text>
                                    </View>
                                    <View className="items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
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

                            <ColorPicker
                                style={{ width: '100%' }}
                                value={brandingColor}
                                onComplete={({ hex }) => setBrandingColor(hex)}
                            >
                                <Panel1 style={{ height: 160, borderRadius: 12, marginBottom: 16 }} />
                                <HueSlider style={{ height: 30, borderRadius: 15, marginBottom: 16 }} />
                            </ColorPicker>

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
            </ScrollView>


            {/* QR Fullscreen Modal */}
            <Modal visible={qrModalVisible} transparent animationType="fade">
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
            </Modal>
        </View>
    );
}
