import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ArrowRight, Star } from 'lucide-react-native';
import { SubscriptionPlan } from '../src/types/firestore';

interface PlanFeature {
    text: string;
    included: boolean;
}

interface Plan {
    id: SubscriptionPlan;
    name: string;
    price: string;
    period: string;
    description: string;
    features: PlanFeature[];
    highlighted?: boolean;
    color: string;
}

const PLANS: Plan[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: '$49',
        period: '/mes',
        description: 'Perfecto para restaurantes pequeños que están empezando',
        color: '#27AE60',
        features: [
            { text: 'Hasta 10 mesas', included: true },
            { text: 'Hasta 3 usuarios', included: true },
            { text: 'Gestión de pedidos', included: true },
            { text: 'Menú digital', included: true },
            { text: 'Reportes básicos', included: true },
            { text: 'Soporte por email', included: true },
            { text: 'Integraciones avanzadas', included: false },
            { text: 'Reportes personalizados', included: false },
        ],
    },
    {
        id: 'professional',
        name: 'Professional',
        price: '$99',
        period: '/mes',
        description: 'Ideal para restaurantes en crecimiento',
        color: '#E67E22',
        highlighted: true,
        features: [
            { text: 'Hasta 30 mesas', included: true },
            { text: 'Usuarios ilimitados', included: true },
            { text: 'Gestión de pedidos', included: true },
            { text: 'Menú digital', included: true },
            { text: 'Reportes avanzados', included: true },
            { text: 'Soporte prioritario', included: true },
            { text: 'Integraciones avanzadas', included: true },
            { text: 'Reportes personalizados', included: true },
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'Para cadenas y grupos de restaurantes',
        color: '#8E44AD',
        features: [
            { text: 'Mesas ilimitadas', included: true },
            { text: 'Usuarios ilimitados', included: true },
            { text: 'Múltiples ubicaciones', included: true },
            { text: 'API personalizada', included: true },
            { text: 'Reportes enterprise', included: true },
            { text: 'Gerente de cuenta dedicado', included: true },
            { text: 'SLA garantizado', included: true },
            { text: 'Onboarding personalizado', included: true },
        ],
    },
];

export default function PricingPage() {
    const router = useRouter();

    const handleSelectPlan = (planId: SubscriptionPlan) => {
        if (planId === 'enterprise') {
            // For enterprise, could open a contact form
            alert('Para el plan Enterprise, por favor contáctanos a ventas@kiitos.com');
        } else {
            // Navigate to register with selected plan
            router.push(`/register?plan=${planId}` as any);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Navbar Placeholder / Back Button */}
            <View className="w-full px-6 py-6 flex-row justify-between items-center max-w-7xl mx-auto">
                <TouchableOpacity onPress={() => router.back()} className="flex-row items-center space-x-2">
                    <Text className="text-gray-500 hover:text-kiitos-orange font-medium">← Volver</Text>
                </TouchableOpacity>
                <Text className="font-bold text-2xl text-kiitos-black">Kiitos<Text className="text-kiitos-orange">.</Text></Text>
                <View className="w-16" /> {/* Spacer for centering */}
            </View>

            {/* Header */}
            <View className="px-6 py-16 items-center bg-kiitos-black">
                <View className="bg-white/10 px-4 py-1.5 rounded-full border border-white/20 mb-6">
                    <Text className="text-kiitos-orange font-bold text-xs uppercase tracking-wider">Planes Flexibles</Text>
                </View>
                <Text className="text-4xl md:text-5xl font-bold text-white text-center mb-6">
                    Invierte en el crecimiento de tu <Text className="text-kiitos-orange">Restaurante</Text>
                </Text>
                <Text className="text-lg text-gray-400 text-center max-w-2xl">
                    Todos los planes incluyen 30 días de prueba gratis. Sin compromisos a largo plazo, cancela cuando quieras.
                </Text>
            </View>

            {/* Plans Grid */}
            <View className="px-6 -mt-10 mb-20">
                <View className="max-w-7xl mx-auto flex-row flex-wrap justify-center gap-8">
                    {PLANS.map((plan) => (
                        <View
                            key={plan.id}
                            className={`bg-white rounded-2xl p-8 w-full md:w-[350px] shadow-xl ${plan.highlighted
                                    ? 'border-2 border-kiitos-orange relative transform md:-translate-y-4'
                                    : 'border border-gray-100'
                                }`}
                        >
                            {plan.highlighted && (
                                <View className="absolute -top-4 left-0 right-0 items-center">
                                    <View className="bg-kiitos-orange px-4 py-1 rounded-full flex-row items-center space-x-1 shadow-sm">
                                        <Star size={12} color="white" fill="white" />
                                        <Text className="text-white text-xs font-bold uppercase tracking-wide">Más Popular</Text>
                                    </View>
                                </View>
                            )}

                            <View className="mb-8 border-b border-gray-100 pb-8">
                                <Text className="text-2xl font-bold text-kiitos-black mb-2">{plan.name}</Text>
                                <Text className="text-gray-500 text-sm mb-6 h-10">{plan.description}</Text>
                                <View className="flex-row items-baseline">
                                    <Text className="text-5xl font-extrabold text-kiitos-black">{plan.price}</Text>
                                    {plan.period ? <Text className="text-xl text-gray-500 ml-2">{plan.period}</Text> : null}
                                </View>
                            </View>

                            <View className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, index) => (
                                    <View key={index} className="flex-row items-start space-x-3">
                                        <View className={`mt-0.5 p-0.5 rounded-full ${feature.included ? 'bg-green-100' : 'bg-gray-100'}`}>
                                            <Check
                                                size={14}
                                                color={feature.included ? '#10B981' : '#9CA3AF'}
                                                strokeWidth={3}
                                            />
                                        </View>
                                        <Text className={`text-sm flex-1 ${feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                                            {feature.text}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                className={`py-4 rounded-xl flex-row justify-center items-center space-x-2 transition-all ${plan.highlighted
                                        ? 'bg-kiitos-orange hover:bg-orange-600 shadow-lg shadow-kiitos-orange/20'
                                        : 'bg-kiitos-black hover:bg-gray-800'
                                    }`}
                                onPress={() => handleSelectPlan(plan.id)}
                            >
                                <Text className="text-white font-bold text-base">
                                    {plan.id === 'enterprise' ? 'Contactar Ventas' : 'Comenzar Prueba Gratis'}
                                </Text>
                                {plan.id !== 'enterprise' && <ArrowRight color="white" size={18} />}
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>

            {/* Support / FAQ Teaser */}
            <View className="px-6 py-16 bg-gray-50 items-center">
                <Text className="text-2xl font-bold text-kiitos-black mb-4">¿Tienes preguntas?</Text>
                <Text className="text-gray-500 text-center mb-6 max-w-lg">
                    Nuestro equipo de expertos está listo para ayudarte a elegir la mejor solución para tu restaurante.
                </Text>
                <TouchableOpacity className="flex-row items-center space-x-2">
                    <Text className="text-kiitos-orange font-bold text-lg">Contactar Soporte</Text>
                    <ArrowRight color="#f89219" size={20} />
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="py-8 bg-white border-t border-gray-100 items-center">
                <Text className="text-gray-400 text-sm">© 2025 Kiitos Inc.</Text>
            </View>
        </ScrollView>
    );
}
