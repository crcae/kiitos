import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../../src/services/firebaseConfig';
import { StaffMember } from '../../src/types/firestore';
import { colors } from '../../src/styles/theme';

const RESTAURANT_ID = 'kiitos-main';

export default function WaiterLoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePinSubmit = async () => {
        if (pin.length !== 4) {
            Alert.alert('Error', 'El PIN debe tener 4 dígitos');
            return;
        }

        setLoading(true);
        try {
            // Query staff with matching PIN
            const q = query(
                collection(db, 'restaurants', RESTAURANT_ID, 'staff'),
                where('pin_code', '==', pin),
                where('active', '==', true),
                where('role', '==', 'waiter')
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                Alert.alert('Error', 'PIN incorrecto o no autorizado');
                setPin('');
                return;
            }

            const staffMember = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as StaffMember;

            // Store authenticated waiter (you could use AsyncStorage or Context for persistence)
            // For now, just navigate
            router.replace('/waiter/tables');
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'Error al validar PIN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
            <View className="flex-1 justify-center items-center px-6">
                {/* Logo/Title */}
                <View className="mb-12">
                    <Text className="text-4xl font-bold text-white text-center mb-2">Kiitos</Text>
                    <Text className="text-slate-400 text-center text-lg">Sistema de Meseros</Text>
                </View>

                {/* PIN Input */}
                <View className="w-full max-w-sm">
                    <Text className="text-white text-lg font-semibold mb-4 text-center">
                        Ingresa tu PIN
                    </Text>

                    <TextInput
                        value={pin}
                        onChangeText={(text) => setPin(text.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                        onSubmitEditing={handlePinSubmit}
                        className="bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 py-5 text-white text-center text-3xl font-mono mb-6"
                        autoFocus
                    />

                    <TouchableOpacity
                        onPress={handlePinSubmit}
                        disabled={loading || pin.length !== 4}
                        className={`py-4 rounded-2xl ${pin.length === 4 && !loading ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text className="text-white font-bold text-lg text-center">
                                Ingresar
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* PIN indicator dots */}
                    <View className="flex-row justify-center mt-8 gap-3">
                        {[0, 1, 2, 3].map((i) => (
                            <View
                                key={i}
                                className={`w-4 h-4 rounded-full ${i < pin.length ? 'bg-indigo-500' : 'bg-slate-700'}`}
                            />
                        ))}
                    </View>
                </View>

                {/* Helper text */}
                <Text className="text-slate-500 text-sm mt-12 text-center">
                    Contacta al administrador si olvidaste tu PIN
                </Text>
            </View>
        </View>
    );
}
