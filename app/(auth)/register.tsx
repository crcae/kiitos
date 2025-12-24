import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { createRestaurant, assignUserToRestaurant } from '../../src/services/saas';
import { SubscriptionPlan } from '../../src/types/firestore';
import { simulateSuccessfulPayment } from '../../src/services/stripe';
import { Mail, Lock, User, Briefcase, ArrowRight, ChefHat, CheckCircle } from 'lucide-react-native';

export default function RegisterPage() {
    const router = useRouter();
    const { plan = 'starter' } = useLocalSearchParams<{ plan?: string }>();
    const { signUp } = useAuth();

    // Defaulting to 'owner' mode implicitly as it is the only one
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        restaurantName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const handleSignUp = async () => {
        // Basic Validation
        if (!formData.name || !formData.email || !formData.password || !formData.restaurantName) {
            Alert.alert('Datos incompletos', 'Por favor completa todos los campos requeridos, incluyendo el nombre de tu restaurante.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden.');
            return;
        }

        if (formData.password.length < 6) {
            Alert.alert('Seguridad', 'La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        try {
            setLoading(true);
            await handleOwnerSignup();
        } catch (error: any) {
            console.error('Signup error:', error);
            Alert.alert(
                'Error al Registrarse',
                error.message || 'Hubo un problema al crear tu cuenta. Intenta nuevamente.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleOwnerSignup = async () => {
        // 1. Create Firebase Auth User
        console.log('📝 Creating Firebase Auth user...');
        const firebaseUser = await signUp(formData.email, formData.password);

        // 2. Create Restaurant (Trial/Pending)
        console.log('🏢 Creating restaurant...');
        // We create it now, but payment happens in Onboarding
        const restaurantId = await createRestaurant(
            firebaseUser.uid,
            formData.email,
            (plan as SubscriptionPlan) || 'starter',
            formData.restaurantName
        );

        // 3. Create User Document
        console.log('👤 Creating user document...');
        await assignUserToRestaurant(
            firebaseUser.uid,
            restaurantId,
            'restaurant_owner',
            formData.name,
            formData.email
        );

        // 4. Redirect to Onboarding for Payment
        console.log('✅ Owner signup complete! Redirecting to onboarding...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.replace('/onboarding');
    };

    const selectedPlan = plan || 'starter';
    const planNames: Record<string, string> = {
        starter: 'Starter',
        professional: 'Professional',
        enterprise: 'Enterprise',
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-white"
        >
            <View className="flex-1 flex-col md:flex-row">
                {/* LEFT SIDE - Branding */}
                <View className="hidden md:flex md:w-1/2 relative bg-kiitos-black">
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop' }}
                        className="absolute inset-0 w-full h-full opacity-60"
                        resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-gradient-to-br from-kiitos-orange/90 to-kiitos-black/80" />

                    <View className="relative z-10 flex-1 justify-between p-16">
                        <View>
                            <Text className="text-white font-bold text-3xl tracking-tight">
                                Kiitos<Text className="text-kiitos-orange">.</Text>
                            </Text>
                            <View className="mt-2 inline-flex flex-row items-center space-x-2 bg-white/10 px-3 py-1 rounded-full self-start border border-white/20">
                                <ChefHat size={14} color="white" />
                                <Text className="text-white text-xs font-medium uppercase tracking-wider">Restaurant Management</Text>
                            </View>
                        </View>

                        <View>
                            <Text className="text-3xl font-bold text-white leading-tight mb-6">
                                "Toma el control de tu restaurante hoy mismo."
                            </Text>
                            <View className="space-y-4">
                                <View className="flex-row items-center space-x-3">
                                    <CheckCircle size={20} color="#10B981" />
                                    <Text className="text-white/90 text-lg">Configuración en minutos</Text>
                                </View>
                                <View className="flex-row items-center space-x-3">
                                    <CheckCircle size={20} color="#10B981" />
                                    <Text className="text-white/90 text-lg">Sin costos ocultos</Text>
                                </View>
                                <View className="flex-row items-center space-x-3">
                                    <CheckCircle size={20} color="#10B981" />
                                    <Text className="text-white/90 text-lg">Soporte 24/7</Text>
                                </View>
                            </View>
                        </View>

                        <View>
                            <Text className="text-white/60 text-sm">© 2025 Kiitos Inc. Restaurant OS.</Text>
                        </View>
                    </View>
                </View>

                {/* RIGHT SIDE - Form */}
                <View className="flex-1 bg-white justify-center">
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                        className="flex-1"
                    >
                        <View className="flex-1 justify-center px-6 py-8 md:px-20 lg:px-32 max-w-2xl mx-auto w-full">

                            {/* Mobile Header */}
                            <View className="md:hidden mb-8 flex-row justify-between items-center">
                                <Text className="text-kiitos-black font-bold text-2xl tracking-tight">
                                    Kiitos<Text className="text-kiitos-orange">.</Text>
                                </Text>
                                <TouchableOpacity onPress={() => router.back()}>
                                    <Text className="text-gray-500">Atrás</Text>
                                </TouchableOpacity>
                            </View>

                            <View className="mb-8">
                                <Text className="text-3xl md:text-4xl font-bold text-kiitos-black mb-3">
                                    Comienza a gestionar tu restaurante
                                </Text>
                                <Text className="text-lg text-gray-500">
                                    Crea tu cuenta de propietario en segundos
                                </Text>
                            </View>

                            {/* Plan Info */}
                            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex-row justify-between items-center">
                                <View>
                                    <Text className="text-green-800 text-xs font-bold uppercase tracking-wide">Plan Seleccionado</Text>
                                    <Text className="text-green-900 font-bold text-lg">{planNames[selectedPlan]}</Text>
                                </View>
                                <TouchableOpacity onPress={() => router.push('/pricing')}>
                                    <Text className="text-green-700 font-medium underline">Cambiar</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Fields */}
                            <View className="space-y-4">
                                {/* Name */}
                                <View>
                                    <Text className="text-sm font-semibold text-kiitos-black mb-2 ml-1">Nombre Completo</Text>
                                    <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 focus:bg-white focus:border-kiitos-orange transition-all">
                                        <User color="#9CA3AF" size={20} />
                                        <TextInput
                                            className="flex-1 ml-3 text-base text-gray-900"
                                            placeholder="Juan Pérez"
                                            placeholderTextColor="#9CA3AF"
                                            value={formData.name}
                                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                                            autoCapitalize="words"
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                {/* Restaurant Name */}
                                <View>
                                    <Text className="text-sm font-semibold text-kiitos-black mb-2 ml-1">Nombre del Restaurante</Text>
                                    <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 focus:bg-white focus:border-kiitos-orange transition-all">
                                        <Briefcase color="#9CA3AF" size={20} />
                                        <TextInput
                                            className="flex-1 ml-3 text-base text-gray-900"
                                            placeholder="La Trattoria Moderna"
                                            placeholderTextColor="#9CA3AF"
                                            value={formData.restaurantName}
                                            onChangeText={(text) => setFormData({ ...formData, restaurantName: text })}
                                            autoCapitalize="words"
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                {/* Email */}
                                <View>
                                    <Text className="text-sm font-semibold text-kiitos-black mb-2 ml-1">Correo Electrónico</Text>
                                    <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 focus:bg-white focus:border-kiitos-orange transition-all">
                                        <Mail color="#9CA3AF" size={20} />
                                        <TextInput
                                            className="flex-1 ml-3 text-base text-gray-900"
                                            placeholder="juan@restaurante.com"
                                            placeholderTextColor="#9CA3AF"
                                            value={formData.email}
                                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                {/* Password */}
                                <View>
                                    <Text className="text-sm font-semibold text-kiitos-black mb-2 ml-1">Contraseña</Text>
                                    <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 focus:bg-white focus:border-kiitos-orange transition-all">
                                        <Lock color="#9CA3AF" size={20} />
                                        <TextInput
                                            className="flex-1 ml-3 text-base text-gray-900"
                                            placeholder="••••••••••••"
                                            placeholderTextColor="#9CA3AF"
                                            value={formData.password}
                                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                                            secureTextEntry
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                {/* Confirm Password */}
                                <View>
                                    <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 focus:bg-white focus:border-kiitos-orange transition-all">
                                        <Lock color="#9CA3AF" size={20} />
                                        <TextInput
                                            className="flex-1 ml-3 text-base text-gray-900"
                                            placeholder="Confirmar contraseña"
                                            placeholderTextColor="#9CA3AF"
                                            value={formData.confirmPassword}
                                            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                                            secureTextEntry
                                            editable={!loading}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Action Button */}
                            <TouchableOpacity
                                className={`bg-kiitos-orange py-4 rounded-xl shadow-lg shadow-kiitos-orange/30 flex-row justify-center items-center space-x-2 mt-8 ${loading ? 'opacity-70' : 'hover:bg-orange-600 active:scale-[0.98]'
                                    } transition-all`}
                                onPress={handleSignUp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Text className="text-white font-bold text-lg">Crear Cuenta</Text>
                                        <ArrowRight color="white" size={20} strokeWidth={2.5} />
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Footer */}
                            <View className="mt-8 pt-6 border-t border-gray-100 flex-row justify-center">
                                <Text className="text-gray-500 text-sm">
                                    ¿Ya tienes cuenta?{' '}
                                </Text>
                                <TouchableOpacity onPress={() => router.push('/login')}>
                                    <Text className="text-kiitos-orange font-bold text-sm">
                                        Iniciar Sesión
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
