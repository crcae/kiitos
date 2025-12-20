import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Modal, Image, Platform, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Clock, MapPin, Palette, Globe, QrCode, Info, X, ExternalLink } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AirbnbButton from '../../../src/components/AirbnbButton';
import AirbnbInput from '../../../src/components/AirbnbInput';
import AirbnbCard from '../../../src/components/AirbnbCard';
import { colors, spacing, typography } from '../../../src/styles/theme';
import { useAuth } from '../../../src/context/AuthContext';
import { useRestaurant } from '../../../src/hooks/useRestaurant';
import { subscribeToRestaurantConfig, updateRestaurantConfig } from '../../../src/services/menu';
import BrandingColorPicker from '../../../src/components/BrandingColorPicker';
import { uploadImage } from '../../../src/services/storage';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';

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
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [brandingModalVisible, setBrandingModalVisible] = useState(false);

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
        });

        return () => unsubscribeConfig();
    }, [restaurantId]);

    const handleSaveGeneral = async () => {
        if (!restaurantId) return;
        try {
            await updateRestaurantConfig(restaurantId, {
                allow_guest_ordering: allowGuestOrdering,
                enable_takeout: enableTakeout,
                opening_hours: openingHours,
                google_place_id: googlePlaceId,
                coordinates: coordinates || undefined,
                location_name: locationName || undefined,
                location_restriction: locationRestriction
            });
            Alert.alert('Éxito', 'Configuración guardada correctamente');
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'No se pudo guardar la configuración');
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setBrandingLogo(result.assets[0].uri);
        }
    };

    const handleSaveBranding = async () => {
        if (!restaurantId) return;
        try {
            setUploading(true);
            let logoUrl = brandingLogo;

            if (brandingLogo && !brandingLogo.startsWith('http')) {
                const filename = `branding/logo_${Date.now()}.jpg`;
                logoUrl = await uploadImage(brandingLogo, `restaurants/${restaurantId}/${filename}`);
            }

            await updateRestaurantConfig(restaurantId, {
                branding: {
                    logo_url: logoUrl || undefined,
                    primary_color: brandingColor,
                }
            });
            setBrandingModalVisible(false);
            Alert.alert('Éxito', 'Configuración de marca actualizada');
        } catch (e: any) {
            console.error(e);
            Alert.alert('Error', 'No se pudo guardar la marca: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const fetchCoordinates = async () => {
        if (!googlePlaceId) {
            Alert.alert('Error', 'Por favor ingresa un Google Place ID');
            return;
        }
        setUploading(true);
        try {
            // Use local API proxy to avoid CORS
            const response = await fetch(`/api/places/details?place_id=${googlePlaceId}`);
            const data = await response.json();

            if (data.status === 'OK' && data.result?.geometry?.location) {
                const { lat, lng } = data.result.geometry.location;
                setCoordinates({ lat, lng });
                const name = data.result.name;
                setLocationName(name);
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
        }
    };

    const updateDayHours = (day: string, field: string, value: any) => {
        setOpeningHours({
            ...openingHours,
            [day]: {
                ...openingHours[day],
                [field]: value
            }
        });
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
                        <Text className="text-slate-400 text-xs">{restaurant?.name || 'Cargando...'}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleSaveGeneral}
                    className="bg-indigo-600 px-4 py-2 rounded-lg flex-row items-center"
                >
                    <Save size={18} color="white" className="mr-2" />
                    <Text className="text-white font-bold">Guardar</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 py-4">
                {/* General Settings */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <Globe size={20} color="#6366f1" className="mr-2" />
                        <Text className="text-lg font-bold text-white">General</Text>
                    </View>
                    <AirbnbCard variant="dark">
                        <View className="flex-row items-center justify-between py-2 border-b border-slate-700">
                            <View>
                                <Text className="text-white font-medium">Pedidos de Clientes</Text>
                                <Text className="text-slate-400 text-xs">Permitir que los clientes pidan desde su mesa</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#334155", true: "#059669" }}
                                thumbColor={allowGuestOrdering ? "#ffffff" : "#cbd5e1"}
                                onValueChange={setAllowGuestOrdering}
                                value={allowGuestOrdering}
                            />
                        </View>
                        <View className="flex-row items-center justify-between py-2">
                            <View>
                                <Text className="text-white font-medium">Módulo Takeout</Text>
                                <Text className="text-slate-400 text-xs">Habilitar pedidos para llevar</Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#334155", true: "#ea580c" }}
                                thumbColor={enableTakeout ? "#ffffff" : "#cbd5e1"}
                                onValueChange={setEnableTakeout}
                                value={enableTakeout}
                            />
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
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <View
                                    style={{ backgroundColor: brandingColor }}
                                    className="w-10 h-10 rounded-full mr-4 border border-slate-600"
                                />
                                <View>
                                    <Text className="text-white font-medium">Identidad Visual</Text>
                                    <Text className="text-slate-400 text-xs">Logo y color principal</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setBrandingModalVisible(true)}
                                className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"
                            >
                                <Text className="text-slate-300 font-bold">Editar</Text>
                            </TouchableOpacity>
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

                        <View className="border-t border-slate-700 pt-4">
                            <View className="flex-row items-center justify-between mb-4">
                                <View>
                                    <Text className="text-white font-medium">Restricción de Radio</Text>
                                    <Text className="text-slate-400 text-xs">Limitar pedidos a una distancia especifica</Text>
                                </View>
                                <Switch
                                    trackColor={{ false: "#334155", true: "#059669" }}
                                    thumbColor={locationRestriction.enabled ? "#ffffff" : "#cbd5e1"}
                                    onValueChange={(val) => setLocationRestriction(prev => ({ ...prev, enabled: val }))}
                                    value={locationRestriction.enabled}
                                />
                            </View>

                            {locationRestriction.enabled && (
                                <View>
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-slate-300 text-sm">Radio Máximo</Text>
                                        <Text className="text-indigo-400 text-sm font-bold">{locationRestriction.radius_meters} metros</Text>
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
                                    <Text className="text-slate-500 text-xs mt-2">
                                        Los clientes fuera de este radio no podrán enviar pedidos a la cocina.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </AirbnbCard>
                </View>

                {/* Takeout QR Section */}
                {enableTakeout && (
                    <View className="mb-12">
                        <View className="flex-row items-center mb-4">
                            <QrCode size={20} color="#6366f1" className="mr-2" />
                            <Text className="text-lg font-bold text-white">QR Takeout</Text>
                        </View>
                        <AirbnbCard variant="dark">
                            <View className="items-center py-4">
                                <View className="bg-white p-4 rounded-xl mb-4">
                                    <QRCode
                                        value={`https://kiitos.app/takeout/${restaurantId}`}
                                        size={150}
                                    />
                                </View>
                                <Text className="text-slate-400 text-center text-sm mb-4">
                                    Este código dirige a los clientes a tu menú de pedidos para llevar.
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setQrModalVisible(true)}
                                    className="bg-indigo-600 px-6 py-2 rounded-full"
                                >
                                    <Text className="text-white font-bold">Ver Pantalla Completa</Text>
                                </TouchableOpacity>
                            </View>
                        </AirbnbCard>
                    </View>
                )}
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

            {/* Branding Modal */}
            <Modal visible={brandingModalVisible} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/60">
                    <View className="bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-white">Personalizar Marca</Text>
                            <TouchableOpacity onPress={() => setBrandingModalVisible(false)}>
                                <Text className="text-slate-400 font-bold">Cerrar</Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-slate-300 font-bold mb-2">Logo del Restaurante</Text>
                        <TouchableOpacity
                            onPress={pickImage}
                            className="w-full h-40 bg-slate-800 rounded-xl border-2 border-dashed border-slate-700 items-center justify-center mb-6 overflow-hidden"
                        >
                            {brandingLogo ? (
                                <Image source={{ uri: brandingLogo }} className="w-full h-full" resizeMode="contain" />
                            ) : (
                                <View className="items-center">
                                    <Palette size={32} color="#94a3b8" />
                                    <Text className="text-slate-500 mt-2">Seleccionar Logo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text className="text-slate-300 font-bold mb-4">Color Principal</Text>
                        <BrandingColorPicker
                            value={brandingColor}
                            onComplete={setBrandingColor}
                        />

                        <TouchableOpacity
                            onPress={handleSaveBranding}
                            disabled={uploading}
                            className="bg-indigo-600 w-full py-4 rounded-xl mt-8 items-center"
                        >
                            <Text className="text-white font-bold text-lg">
                                {uploading ? 'Guardando...' : 'Guardar Cambios'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* QR Fullscreen Modal */}
            <Modal visible={qrModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/90 p-6">
                    <View className="bg-white p-8 rounded-3xl items-center w-full max-w-sm">
                        <Text className="text-2xl font-bold mb-2 text-slate-900">Menú Takeout</Text>
                        <Text className="text-slate-500 text-center mb-8">Escanea para pedir para llevar</Text>

                        <View className="bg-white p-2 rounded-xl mb-8">
                            <QRCode
                                value={`https://kiitos.app/takeout/${restaurantId}`}
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
