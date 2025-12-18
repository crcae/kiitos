import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Vibration } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Delete, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useRestaurant } from '../../src/hooks/useRestaurant'; // To show restaurant name

export default function StaffLoginScreen() {
    const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
    const { loginStaff, loading: authLoading } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    // Quick fetch of basic restaurant details to show "Login to [Rest Name]"
    // Optional, but nice. Using the params ID.
    // Ideally we had a hook that takes an ID arg, but useRestaurant reads from AUTH context.
    // So here we assume we just rely on the ID passed. 
    // Maybe show "Staff Login" and default text.

    const handleNumberPress = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                handleSubmit(newPin);
            }
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleSubmit = async (code: string) => {
        if (!restaurantId) {
            Alert.alert('Error', 'Missing Restaurant ID in link.');
            return;
        }

        setLoading(true);
        try {
            await loginStaff(restaurantId, code);
            // RootRouteGuard in _layout will handle the redirect based on the role 
            // once "user" state is updated in AuthContext.
        } catch (error: any) {
            console.error(error);
            Alert.alert('Acceso Denegado', 'PIN incorrecto.');
            Vibration.vibrate();
            setPin('');
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
            <View className="flex-1 px-8 items-center justify-center">

                <Text className="text-white text-2xl font-bold mb-2">Acceso de Personal</Text>
                <Text className="text-slate-400 mb-10 text-center">Ingresa tu PIN de 4 dígitos para comenzar tu turno.</Text>

                {/* PIN Display */}
                <View className="flex-row space-x-6 mb-12">
                    {[0, 1, 2, 3].map((i) => (
                        <View
                            key={i}
                            className={`w-6 h-6 rounded-full ${i < pin.length ? 'bg-orange-500' : 'bg-slate-700'}`}
                        />
                    ))}
                </View>

                {/* Number Pad */}
                <View className="w-full max-w-sm gap-y-6">
                    {[
                        ['1', '2', '3'],
                        ['4', '5', '6'],
                        ['7', '8', '9'],
                    ].map((row, rowIdx) => (
                        <View key={rowIdx} className="flex-row justify-between px-4">
                            {row.map((num) => (
                                <TouchableOpacity
                                    key={num}
                                    onPress={() => handleNumberPress(num)}
                                    disabled={loading}
                                    className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center border border-slate-700 active:bg-slate-700"
                                >
                                    <Text className="text-white text-3xl font-medium">{num}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}

                    <View className="flex-row justify-between px-4 items-center">
                        <View className="w-20 h-20" />

                        <TouchableOpacity
                            onPress={() => handleNumberPress('0')}
                            disabled={loading}
                            className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center border border-slate-700 active:bg-slate-700"
                        >
                            <Text className="text-white text-3xl font-medium">0</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleDelete}
                            disabled={loading}
                            className="w-20 h-20 rounded-full items-center justify-center active:bg-slate-800"
                        >
                            <Delete size={32} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>

                {loading && <ActivityIndicator size="large" color="#F97316" className="mt-8" />}
            </View>
        </View>
    );
}
