import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia' as any,
});

// ============================================
// CUSTOM CLAIMS MANAGEMENT
// ============================================

/**
 * Trigger: Quando un nuevo usuario se crea en Firebase Auth
 * 
 * Esta función se dispara automáticamente después de que un usuario
 * se registra. Espera un momento para que el documento de Firestore
 * se cree, luego lee el restaurantId y role del documento y los
 * inyecta como custom claims en el token de autenticación.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    const uid = user.uid;

    try {
        // Esperar 2 segundos para asegurar que el documento de Firestore existe
        // (El signup.tsx crea el documento después de crear el usuario en Auth)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Leer el documento del usuario desde Firestore
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(uid)
            .get();

        if (!userDoc.exists) {
            console.warn(`⚠️ User document not found for UID: ${uid}`);
            return null;
        }

        const userData = userDoc.data();

        if (!userData) {
            console.warn(`⚠️ User document exists but has no data for UID: ${uid}`);
            return null;
        }

        const { restaurantId, role } = userData;

        if (!restaurantId || !role) {
            console.warn(`⚠️ User ${uid} missing restaurantId or role`);
            return null;
        }

        // Setear los custom claims en el token del usuario
        await admin.auth().setCustomUserClaims(uid, {
            restaurantId,
            role,
        });

        console.log(`✅ Custom claims set for user ${uid}: { restaurantId: ${restaurantId}, role: ${role} }`);

        // IMPORTANTE: Actualizar el documento con timestamp de última actualización de claims
        await admin.firestore()
            .collection('users')
            .doc(uid)
            .update({
                customClaimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        return null;
    } catch (error) {
        console.error(`❌ Error setting custom claims for user ${uid}:`, error);
        return null;
    }
});

/**
 * Trigger: Cuando se actualiza el documento de un usuario en Firestore
 * 
 * Esta función detecta cambios en el rol o restaurantId de un usuario
 * y actualiza automáticamente los custom claims para mantener sincronización.
 * 
 * Casos de uso:
 * - Un Owner cambia el rol de un Waiter a Manager
 * - Un usuario es transferido a otro restaurante (edge case)
 */
export const onUserUpdate = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const userId = context.params.userId;
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Verificar si cambió el role o restaurantId
        const roleChanged = beforeData.role !== afterData.role;
        const restaurantChanged = beforeData.restaurantId !== afterData.restaurantId;

        if (!roleChanged && !restaurantChanged) {
            // No hay cambios relevantes, no hacer nada
            return null;
        }

        try {
            const { restaurantId, role } = afterData;

            if (!restaurantId || !role) {
                console.warn(`⚠️ User ${userId} update missing restaurantId or role`);
                return null;
            }

            // Actualizar custom claims
            await admin.auth().setCustomUserClaims(userId, {
                restaurantId,
                role,
            });

            if (roleChanged) {
                console.log(`✅ Role updated for user ${userId}: ${beforeData.role} → ${role}`);
            }
            if (restaurantChanged) {
                console.log(`✅ Restaurant updated for user ${userId}: ${beforeData.restaurantId} → ${restaurantId}`);
            }

            // Actualizar timestamp de claims
            await admin.firestore()
                .collection('users')
                .doc(userId)
                .update({
                    customClaimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

            return null;
        } catch (error) {
            console.error(`❌ Error updating custom claims for user ${userId}:`, error);
            return null;
        }
    });

/**
 * Callable Function: Refrescar custom claims manualmente
 * 
 * Permite que un usuario o un admin fuerce la actualización de custom claims.
 * Útil para debugging o si hay problemas de sincronización.
 */
export const refreshCustomClaims = functions.https.onCall(async (data, context) => {
    // Verificar que el usuario esté autenticado
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be authenticated to refresh claims'
        );
    }

    const userId = data.userId || context.auth.uid;

    // Solo permitir que usuarios refresquen sus propios claims
    // o que SaaS admins refresquen cualquier claim
    const currentUserRole = context.auth.token.role;
    if (userId !== context.auth.uid && currentUserRole !== 'saas_admin') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'You can only refresh your own claims'
        );
    }

    try {
        // Leer documento del usuario
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(userId)
            .get();

        if (!userDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'User document not found'
            );
        }

        const userData = userDoc.data();
        const { restaurantId, role } = userData || {};

        if (!restaurantId || !role) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'User document missing restaurantId or role'
            );
        }

        // Actualizar custom claims
        await admin.auth().setCustomUserClaims(userId, {
            restaurantId,
            role,
        });

        // Actualizar timestamp
        await admin.firestore()
            .collection('users')
            .doc(userId)
            .update({
                customClaimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        console.log(`✅ Custom claims refreshed for user ${userId}`);

        return {
            success: true,
            restaurantId,
            role,
            message: 'Custom claims updated. Please sign out and sign in again for changes to take effect.',
        };
    } catch (error: any) {
        console.error(`❌ Error refreshing claims for user ${userId}:`, error);
        throw new functions.https.HttpsError('unknown', error.message);
    }
});

// ============================================
// STRIPE INTEGRATION
// ============================================

/**
 * Callable Function: Crear sesión de Stripe Checkout
 * 
 * Para procesamiento de pagos de bills (legacy)
 */
export const createCheckoutSession = functions.https.onCall(async (request) => {
    const data = request.data as any;
    const { amountToPay } = data;

    if (!amountToPay) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'The function must be called with one argument "amountToPay".'
        );
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: 'Kiitos Bill Split',
                    },
                    unit_amount: Math.round(amountToPay * 100), // Stripe expects cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
        });

        return { sessionId: session.id };
    } catch (error: any) {
        throw new functions.https.HttpsError('unknown', error.message, error);
    }
});

// ============================================
// SUBSCRIPTION WEBHOOKS (Para implementación futura)
// ============================================

/**
 * Webhook: Stripe subscription events
 * 
 * Maneja eventos de suscripción de Stripe como:
 * - Suscripción creada
 * - Renovación exitosa
 * - Pago fallido
 * - Suscripción cancelada
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('Missing STRIPE_WEBHOOK_SECRET');
        res.status(500).send('Webhook secret not configured');
        return;
    }

    try {
        const event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            webhookSecret
        );

        console.log(`📥 Stripe webhook received: ${event.type}`);

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                // Actualizar estado de suscripción en Firestore
                const subscription = event.data.object as Stripe.Subscription;
                // TODO: Implementar lógica de actualización
                console.log(`Subscription ${subscription.id} updated`);
                break;

            case 'customer.subscription.deleted':
                // Marcar suscripción como cancelada
                const deletedSub = event.data.object as Stripe.Subscription;
                // TODO: Implementar lógica de cancelación
                console.log(`Subscription ${deletedSub.id} deleted`);
                break;

            case 'invoice.payment_failed':
                // Notificar al restaurant owner sobre pago fallido
                const invoice = event.data.object as Stripe.Invoice;
                // TODO: Enviar email de notificación
                console.log(`Payment failed for invoice ${invoice.id}`);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('Webhook error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});
