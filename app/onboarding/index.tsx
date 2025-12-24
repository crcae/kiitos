import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { createRestaurant, completeOnboarding } from '../../src/services/saas';
import { Ionicons } from '@expo/vector-icons';

// Steps: 1. Subscription, 2. Setup (Name)
const STEPS = ['Plan', 'Configuración'];

export default function OnboardingWizard() {
    const router = useRouter();
    const { user, firebaseUser, refreshUser } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Subscription State
    const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('starter');
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Data State
    const [restaurantName, setRestaurantName] = useState('');

    // --- Actions ---

    const handleNext = () => {
        if (currentStep === 0) {
            if (!isSubscribed) {
                Alert.alert('Pago requerido', 'Por favor suscríbete a un plan para continuar.');
                return;
            }
            setCurrentStep(1);
        }
    };

    const handleSubscribe = async () => {
        setLoading(true);
        // Simulate Stripe delay
        setTimeout(() => {
            setLoading(false);
            setIsSubscribed(true);
            Alert.alert('¡Pago Exitoso!', 'Tu suscripción ha sido activada (Simulación).');
        }, 2000);
    };

    const handleFinish = async () => {
        if (!restaurantName.trim()) {
            Alert.alert('Falta información', 'Por favor ingresa el nombre de tu restaurante.');
            return;
        }

        if (!user || !firebaseUser) return;

        setLoading(true);
        try {
            // 1. Create Restaurant with Defaults
            console.log("Creating restaurant...");
            // createRestaurant implicitly sets default settings if not provided in detail
            const restaurantId = await createRestaurant(user.id, user.email, selectedPlan);

            // Note: We are skipping Logo upload and Menu creation as requested.
            // The restaurant will start with default branding (Kitos Orange) and empty menu.
            // Using "Kitos Orange" #EA580C as default is handled in createRestaurant or the UI default.

            // 2. Complete Onboarding
            console.log("Completing onboarding...");
            await completeOnboarding(restaurantId, user.id);

            // 3. Force Context Refresh
            console.log("Refreshing user context...");
            await refreshUser();

            setLoading(false);

            // 4. Redirect Immediately
            router.replace('/admin');

        } catch (error: any) {
            console.error(error);
            setLoading(false);
            Alert.alert('Error', 'Hubo un problema configurando tu cuenta: ' + error.message);
        }
    };


    // --- Render Steps ---

    const renderStepIndicator = () => (
        <View className="flex-row justify-center mb-8">
            {STEPS.map((step, index) => (
                <View key={index} className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${index <= currentStep ? 'bg-orange-500' : 'bg-gray-200'}`}>
                        <Text className={`text-xs font-bold ${index <= currentStep ? 'text-white' : 'text-gray-500'}`}>
                            {index + 1}
                        </Text>
                    </View>
                    {index < STEPS.length - 1 && (
                        <View className={`w-12 h-1 ${index < currentStep ? 'bg-orange-500' : 'bg-gray-200'}`} />
                    )}
                </View>
            ))}
        </View>
    );

    const renderStep1_Subscription = () => (
        <View>
            <Text className="text-2xl font-bold text-gray-800 mb-2">Elige tu Plan</Text>
            <Text className="text-gray-500 mb-6">Selecciona el plan que mejor se adapte a tu negocio.</Text>

            {/* Plan Cards */}
            <TouchableOpacity
                onPress={() => setSelectedPlan('starter')}
                className={`p-4 rounded-xl border-2 mb-4 ${selectedPlan === 'starter' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}
            >
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-bold text-lg">Básico</Text>
                    <Text className="font-bold text-xl">$29/mes</Text>
                </View>
                <Text className="text-gray-600">Ideal para restaurantes pequeños. Hasta 300 pedidos/mes.</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setSelectedPlan('professional')}
                className={`p-4 rounded-xl border-2 mb-8 ${selectedPlan === 'professional' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}
            >
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-bold text-lg">Pro</Text>
                    <Text className="font-bold text-xl">$79/mes</Text>
                </View>
                <Text className="text-gray-600">Para restaurantes en crecimiento. Pedidos ilimitados y analíticas.</Text>
            </TouchableOpacity>

            {!isSubscribed ? (
                <TouchableOpacity
                    onPress={handleSubscribe}
                    disabled={loading}
                    className="w-full bg-gray-900 py-4 rounded-xl items-center flex-row justify-center"
                >
                    {loading ? <ActivityIndicator color="#FFF" className="mr-2" /> : <Ionicons name="card-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />}
                    <Text className="text-white font-bold text-lg">Suscribirse y Pagar</Text>
                </TouchableOpacity>
            ) : (
                <View>
                    <View className="bg-green-100 p-4 rounded-lg mb-6 flex-row items-center">
                        <Ionicons name="checkmark-circle" size={24} color="#166534" />
                        <Text className="text-green-800 ml-2 font-medium">Suscripción Activa</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleNext}
                        className="w-full bg-orange-500 py-4 rounded-xl items-center"
                    >
                        <Text className="text-white font-bold text-lg">Continuar</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderStep2_Setup = () => (
        <View>
            <Text className="text-2xl font-bold text-gray-800 mb-2">Configuración Básica</Text>
            <Text className="text-gray-500 mb-6">Solo necesitamos el nombre de tu restaurante para empezar.</Text>

            <View className="mb-8">
                <Text className="text-gray-700 font-medium mb-1">Nombre del Restaurante</Text>
                <TextInput
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3"
                    placeholder="Ej. La Trattoria"
                    value={restaurantName}
                    onChangeText={setRestaurantName}
                />
            </View>

            <TouchableOpacity
                onPress={handleFinish}
                disabled={loading}
                className="w-full bg-orange-500 py-4 rounded-xl items-center flex-row justify-center"
            >
                {loading && <ActivityIndicator color="#FFF" className="mr-2" />}
                <Text className="text-white font-bold text-lg">Crear Restaurante</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-1 px-6 py-10">
                {renderStepIndicator()}

                <ScrollView showsVerticalScrollIndicator={false}>
                    {currentStep === 0 && renderStep1_Subscription()}
                    {currentStep === 1 && renderStep2_Setup()}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
