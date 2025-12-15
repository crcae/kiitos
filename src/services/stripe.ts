import { getFunctions, httpsCallable } from 'firebase/functions';
import { SubscriptionPlan } from '../types/firestore';

/**
 * CONFIGURACIÓN DE STRIPE
 * 
 * Para usar Stripe en test mode:
 * 1. Obtén tus llaves de: https://dashboard.stripe.com/test/apikeys
 * 2. Agrega a tu archivo .env en la raíz del proyecto:
 * 
 *    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
 * 
 * 3. Para las Cloud Functions, configura la llave secreta:
 *    firebase functions:config:set stripe.secret_key="sk_test_..."
 */

// Llave pública de Stripe (test mode)
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

if (!STRIPE_PUBLISHABLE_KEY) {
    console.warn('⚠️ STRIPE_PUBLISHABLE_KEY not configured. Payment will not work.');
}

/**
 * Precios de los planes (en centavos)
 * Para test mode, puedes usar estos amounts o crear tus propios Price IDs en Stripe Dashboard
 */
const PLAN_PRICES = {
    starter: 4900, // $49.00 MXN
    professional: 9900, // $99.00 MXN
    enterprise: 0, // Custom pricing
};

/**
 * Crea una sesión de Stripe Checkout para suscripción
 * 
 * @param plan - Plan seleccionado (starter, professional, enterprise)
 * @param email - Email del usuario
 * @param successUrl - URL de redirección después de pago exitoso
 * @param cancelUrl - URL de redirección si el usuario cancela
 * @returns URL de Stripe Checkout
 */
export async function createStripeCheckoutSession(
    plan: SubscriptionPlan,
    email: string,
    successUrl: string,
    cancelUrl: string
): Promise<string> {
    try {
        // Por ahora, usamos la función de Cloud Functions existente
        // En producción, deberías crear una función específica para suscripciones
        const functions = getFunctions();
        const createSession = httpsCallable(functions, 'createCheckoutSession');

        const amount = PLAN_PRICES[plan];

        if (amount === 0) {
            throw new Error('Enterprise plan requires custom pricing. Please contact sales.');
        }

        const result = await createSession({
            amountToPay: amount / 100, // Convertir de centavos a pesos
            customerEmail: email,
            successUrl,
            cancelUrl,
            plan,
        });

        const data = result.data as { sessionId: string };

        // En un entorno real con Stripe.js, redirigirías así:
        // const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
        // await stripe.redirectToCheckout({ sessionId: data.sessionId });

        // Por ahora, retornamos el sessionId
        return data.sessionId;
    } catch (error) {
        console.error('Error creating Stripe checkout session:', error);
        throw new Error('Failed to create payment session');
    }
}

/**
 * SIMULACIÓN DE PAGO PARA DESARROLLO
 * 
 * En modo de desarrollo/test, podemos simular un pago exitoso
 * sin necesidad de integrar completamente Stripe Checkout
 */
export async function simulateSuccessfulPayment(
    plan: SubscriptionPlan,
    email: string
): Promise<{
    success: boolean;
    subscriptionId: string;
    customerId: string;
}> {
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generar IDs simulados
    const subscriptionId = `sub_test_${Date.now()}`;
    const customerId = `cus_test_${Date.now()}`;

    console.log(`💳 Simulated payment for plan: ${plan}, email: ${email}`);
    console.log(`   Subscription ID: ${subscriptionId}`);
    console.log(`   Customer ID: ${customerId}`);

    return {
        success: true,
        subscriptionId,
        customerId,
    };
}

/**
 * Verifica el estado de una suscripción
 * (Para implementación futura con webhooks de Stripe)
 */
export async function checkSubscriptionStatus(subscriptionId: string): Promise<{
    status: 'active' | 'past_due' | 'cancelled' | 'trial';
    currentPeriodEnd: Date;
}> {
    // TODO: Implementar con Stripe API
    return {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    };
}

/**
 * Cancela una suscripción
 * (Para implementación futura)
 */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
    // TODO: Implementar con Stripe API
    console.log(`Cancelling subscription: ${subscriptionId}`);
}

/**
 * Información sobre configuración de Stripe
 */
export const StripeConfig = {
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    isConfigured: !!STRIPE_PUBLISHABLE_KEY,
    testMode: STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_'),

    /**
     * Tarjetas de prueba de Stripe para test mode:
     * https://stripe.com/docs/testing#cards
     */
    testCards: {
        success: '4242 4242 4242 4242',
        decline: '4000 0000 0000 0002',
        requiresAuth: '4000 0025 0000 3155',
    },
};
