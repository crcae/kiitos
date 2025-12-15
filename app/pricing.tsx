import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
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
            // Navigate to signup with selected plan
            router.push(`/signup?plan=${planId}` as any);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Selecciona tu Plan</Text>
                <Text style={styles.subtitle}>
                    Todos los planes incluyen 30 días de prueba gratis. Sin tarjeta de crédito requerida.
                </Text>
            </View>

            {/* Plans */}
            <View style={styles.plansContainer}>
                {PLANS.map((plan) => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        onSelect={() => handleSelectPlan(plan.id)}
                    />
                ))}
            </View>

            {/* FAQ / Info */}
            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>¿Tienes preguntas?</Text>
                <Text style={styles.infoText}>
                    Nuestro equipo está listo para ayudarte a elegir el mejor plan para tu negocio.
                </Text>
                <Text style={styles.infoContact}>📧 ventas@kiitos.com</Text>
            </View>
        </ScrollView>
    );
}

function PlanCard({ plan, onSelect }: { plan: Plan; onSelect: () => void }) {
    return (
        <View style={[
            styles.planCard,
            plan.highlighted && styles.planCardHighlighted,
        ]}>
            {plan.highlighted && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>MÁS POPULAR</Text>
                </View>
            )}

            <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceContainer}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    {plan.period && <Text style={styles.planPeriod}>{plan.period}</Text>}
                </View>
                <Text style={styles.planDescription}>{plan.description}</Text>
            </View>

            <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                        <Check
                            size={20}
                            color={feature.included ? plan.color : '#CCCCCC'}
                        />
                        <Text style={[
                            styles.featureText,
                            !feature.included && styles.featureTextDisabled,
                        ]}>
                            {feature.text}
                        </Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={[
                    styles.selectButton,
                    { backgroundColor: plan.highlighted ? plan.color : '#2C3E50' },
                ]}
                onPress={onSelect}
            >
                <Text style={styles.selectButtonText}>
                    {plan.id === 'enterprise' ? 'Contactar Ventas' : 'Comenzar Prueba Gratis'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFBF7',
    },
    contentContainer: {
        paddingBottom: 40,
    },

    // Header
    header: {
        paddingHorizontal: 20,
        paddingVertical: 40,
        backgroundColor: '#2C3E50',
    },
    backButton: {
        marginBottom: 20,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#E0E0E0',
        lineHeight: 24,
    },

    // Plans
    plansContainer: {
        paddingHorizontal: 20,
        paddingVertical: 40,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 20,
    },
    planCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: 320,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        position: 'relative',
    },
    planCardHighlighted: {
        borderWidth: 3,
        borderColor: '#E67E22',
        transform: [{ scale: 1.05 }],
    },
    badge: {
        position: 'absolute',
        top: -12,
        left: '50%',
        transform: [{ translateX: -60 }],
        backgroundColor: '#E67E22',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },

    // Plan Header
    planHeader: {
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingBottom: 24,
    },
    planName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 12,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    planPrice: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    planPeriod: {
        fontSize: 18,
        color: '#666',
        marginLeft: 4,
    },
    planDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },

    // Features
    featuresContainer: {
        marginBottom: 24,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    featureText: {
        fontSize: 14,
        color: '#2C3E50',
        flex: 1,
    },
    featureTextDisabled: {
        color: '#CCCCCC',
        textDecorationLine: 'line-through',
    },

    // Button
    selectButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    selectButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    // Info Section
    infoSection: {
        paddingHorizontal: 20,
        paddingVertical: 40,
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    infoTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
    },
    infoContact: {
        fontSize: 18,
        color: '#E67E22',
        fontWeight: '600',
    },
});
