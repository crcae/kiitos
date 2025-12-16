import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { PickupOrder, PickupOrderItem, PickupOrderStatus, PickupTimeOption } from '../types/firestore';

/**
 * Generate a unique 6-character pickup code
 * Format: XXX-XXX (e.g., "KII-9X2")
 */
export const generatePickupCode = async (restaurantId: string): Promise<string> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar looking chars (I/1, O/0)

    // Keep trying until we get a unique code
    let isUnique = false;
    let code = '';

    while (!isUnique) {
        // Generate 6 random characters
        const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        const part2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        code = `${part1}-${part2}`;

        // Check if it already exists
        const ordersRef = collection(db, 'restaurants', restaurantId, 'pickup_orders');
        const q = query(ordersRef, where('pickup_code', '==', code));
        const snapshot = await getDocs(q);

        isUnique = snapshot.empty;
    }

    return code;
};

/**
 * Create a new pickup order in Firestore
 */
export const createPickupOrder = async (
    restaurantId: string,
    items: PickupOrderItem[],
    subtotal: number,
    tax: number,
    total: number,
    timeOption: PickupTimeOption,
    scheduledTime: Date,
    paymentIntentId?: string,
    customerInfo?: {
        name?: string;
        phone?: string;
        email?: string;
    },

    notes?: string,
    diningOption: 'takeout' | 'eat_in' = 'takeout'
): Promise<string> => {
    const pickupCode = await generatePickupCode(restaurantId);

    // Determine initial status based on time option
    const status: PickupOrderStatus = timeOption === 'asap' ? 'preparing' : 'scheduled';

    const orderData: Omit<PickupOrder, 'id'> = {
        restaurantId,
        pickup_code: pickupCode,
        dining_option: diningOption,
        ...(customerInfo?.name ? { customer_name: customerInfo.name } : {}),
        ...(customerInfo?.phone ? { customer_phone: customerInfo.phone } : {}),
        ...(customerInfo?.email ? { customer_email: customerInfo.email } : {}),
        items,
        subtotal,
        tax,
        total,
        time_option: timeOption,
        scheduled_time: scheduledTime as any, // Will be converted to Firestore Timestamp
        created_at: serverTimestamp() as any,
        status,
        payment_intent_id: paymentIntentId,
        notes
    };

    const ordersRef = collection(db, 'restaurants', restaurantId, 'pickup_orders');
    const docRef = await addDoc(ordersRef, orderData);

    console.log('✅ Created pickup order:', docRef.id, 'Code:', pickupCode);

    return docRef.id;
};

/**
 * Get a pickup order by ID
 */
export const getPickupOrder = async (
    restaurantId: string,
    orderId: string
): Promise<PickupOrder | null> => {
    try {
        const docRef = doc(db, 'restaurants', restaurantId, 'pickup_orders', orderId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as PickupOrder;
        }

        return null;
    } catch (error) {
        console.error('Error fetching pickup order:', error);
        return null;
    }
};

/**
 * Update pickup order status
 */
export const updatePickupOrderStatus = async (
    restaurantId: string,
    orderId: string,
    status: PickupOrderStatus
): Promise<void> => {
    const docRef = doc(db, 'restaurants', restaurantId, 'pickup_orders', orderId);
    await updateDoc(docRef, { status });
    console.log('✅ Updated pickup order status:', orderId, 'to', status);
};
