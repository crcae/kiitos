import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { updateRestaurantSubscription, completeOnboarding } from '../../src/services/saas';
import { simulateSuccessfulPayment } from '../../src/services/stripe';
import { SubscriptionPlan } from '../../src/types/firestore';
import { CreditCard, CheckCircle, Shield, ArrowRight } from 'lucide-react-native';

export default function OnboardingWizard() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('starter');

    // Load initial plan from user's restaurant logic if possible, or default
    // For now we default to what they might have selected or just 'starter' and let them confirm.

    const handleSubscribe = async () => {
        if (!user || user.role !== 'restaurant_owner' || !user.restaurantId) {
            Alert.alert('Error', 'No se encontró la información del restaurante. Por favor inicia sesión nuevamente.');
            return;
        }

        setLoading(true);
        try {
            // 1. Simulate Payment
            console.log('💳 Processing payment...');
            const paymentResult = await simulateSuccessfulPayment(
                selectedPlan,
                user.email
            );

            if (!paymentResult.success) {
                throw new Error('El pago no pudo ser procesado.');
            }

            // 2. Update Subscription Status
            console.log('🔄 Updating subscription...');
            await updateRestaurantSubscription(user.restaurantId, selectedPlan, 'active');

            // 3. Mark Onboarding as Complete
            console.log('✅ Completing onboarding...');
            await completeOnboarding(user.restaurantId, user.id);
            await refreshUser();

            // 4. Redirect
            Alert.alert('¡Bienvenido!', 'Tu suscripción está activa.', [
                { text: 'Ir al Panel', onPress: () => router.replace('/admin') }
            ]);

        } catch (error: any) {
            console.error('Onboarding Error:', error);
            Alert.alert('Error', error.message || 'Hubo un problema al procesar tu suscripción.');
        } finally {
            setLoading(false);
        }
    };

    const plans = [
        { id: 'starter', name: 'Starter', price: '$49', features: ['Hasta 10 mesas', '3 usuarios'] },
        { id: 'professional', name: 'Professional', price: '$99', features: ['Hasta 30 mesas', 'Usuarios ilimitados'] },
        { id: 'enterprise', name: 'Enterprise', price: 'Custom', features: ['Mesas ilimitadas', 'Soporte 24/7'] },
    ];

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-1 px-6 py-10 max-w-3xl mx-auto w-full">
                {/* Header */}
                <View className="mb-10 items-center">
                    <View className="bg-kiitos-orange/10 p-3 rounded-full mb-4">
                        <CreditCard size={32} color="#f89219" />
                    </View>
                    <Text className="text-3xl font-bold text-kiitos-black mb-2 text-center">
                        Completa tu Suscripción
                    </Text>
                    <Text className="text-gray-500 text-center max-w-md">
                        Estás a un paso de activar tu restaurante. Confirma tu plan y realiza el pago seguro a continuación.
                    </Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                    {/* Plan Selection */}
                    <Text className="text-lg font-bold text-kiitos-black mb-4">Confirma tu Plan</Text>

                    <View className="space-y-4 mb-8">
                        {plans.map((plan) => (
                            <TouchableOpacity
                                key={plan.id}
                                onPress={() => setSelectedPlan(plan.id as SubscriptionPlan)}
                                className={`p-4 rounded-xl border-2 flex-row justify-between items-center transition-all ${selectedPlan === plan.id
                                        ? 'border-kiitos-orange bg-orange-50'
                                        : 'border-gray-200 bg-white'
                                    }`}
                            >
                                <View>
                                    <Text className={`font-bold text-base ${selectedPlan === plan.id ? 'text-kiitos-orange' : 'text-gray-800'}`}>
                                        {plan.name}
                                    </Text>
                                    <Text className="text-gray-500 text-xs">{plan.features.join(' • ')}</Text>
                                </View>
                                <View className="flex-row items-center space-x-3">
                                    <Text className="font-bold text-lg text-kiitos-black">{plan.price}</Text>
                                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedPlan === plan.id ? 'border-kiitos-orange bg-kiitos-orange' : 'border-gray-300'
                                        }`}>
                                        {selectedPlan === plan.id && <CheckCircle size={14} color="white" />}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Payment Summary */}
                    <View className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-500">Subtotal</Text>
                            <Text className="font-medium text-gray-900">{plans.find(p => p.id === selectedPlan)?.price}</Text>
                        </View>
                        <View className="flex-row justify-between mb-4">
                            <Text className="text-gray-500">Impuestos (16%)</Text>
                            <Text className="font-medium text-gray-900">$0.00 (Incluidos)</Text>
                        </View>
                        <View className="border-t border-gray-100 pt-4 flex-row justify-between items-center">
                            <Text className="text-lg font-bold text-kiitos-black">Total a Pagar</Text>
                            <Text className="text-2xl font-bold text-kiitos-orange">{plans.find(p => p.id === selectedPlan)?.price}</Text>
                        </View>
                    </View>

                    {/* Security Note */}
                    <View className="flex-row items-center justify-center space-x-2 mb-8">
                        <Shield size={16} color="#10B981" />
                        <Text className="text-gray-500 text-xs">Pagos procesados de forma segura vía Stripe</Text>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        onPress={handleSubscribe}
                        disabled={loading}
                        className={`w-full py-4 rounded-xl items-center flex-row justify-center space-x-2 shadow-lg shadow-kiitos-orange/20 ${loading ? 'bg-kiitos-orange/70' : 'bg-kiitos-orange hover:bg-orange-600'
                            }`}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Text className="text-white font-bold text-lg">Pagar y Activar</Text>
                                <ArrowRight color="white" size={20} />
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
