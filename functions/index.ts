```typescript
import * as functions from 'firebase-functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-11-20.acacia' as any, // Force version or use latest supported
});

export const createCheckoutSession = functions.https.onCall(async (request) => {
    const data = request.data as any;
    const { amountToPay } = data;

    if (!amountToPay) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one argument "amountToPay".');
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
