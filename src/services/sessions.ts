import {
    collection,
    doc,
    addDoc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    getDoc,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Session, OrderItem, Order, SessionStatus, PaymentStatus } from '../types/firestore';
import { updateTableStatus } from './tables';

const SESSIONS_COLLECTION = 'sessions';
const ORDERS_COLLECTION = 'orders';

export const createSession = async (restaurantId: string, tableId: string, tableName: string): Promise<string> => {
    const sessionData: Omit<Session, 'id'> = {
        restaurantId,
        tableId,
        tableName,
        status: 'active',
        startTime: serverTimestamp() as Timestamp,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        paidAmount: 0,
        paymentStatus: 'unpaid',
        qrCode: `kiitos-session-${Date.now()}`,
        guestCount: 0
    };

    const docRef = await addDoc(collection(db, 'restaurants', restaurantId, 'sessions'), sessionData);
    // User Request: Table should NOT appear occupied until orders are placed.
    // We set status to 'available' but link the session. If user returns, they create a new session (abandoning this one).
    await updateTableStatus(restaurantId, tableId, 'available', docRef.id);
    return docRef.id;
};

export const addOrderToSession = async (sessionId: string, tableId: string, items: OrderItem[]) => {
    // 1. Create Order Record
    const orderData: Omit<Order, 'id'> = {
        sessionId,
        tableId,
        items,
        status: 'pending',
        createdAt: serverTimestamp() as Timestamp,
    };
    await addDoc(collection(db, ORDERS_COLLECTION), orderData);

    // 2. Update Session with new items and total
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
        const session = sessionSnap.data() as Session;
        const newItems = [...session.items, ...items];
        const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        await updateDoc(sessionRef, {
            items: newItems,
            total: newTotal
        });

        // Also update table to occupied + total (this function seems legacy but we support it)
        // Note: restaurantId is missing in this legacy function signature, ignoring for now as Waiter uses guestMenu.ts
    }
};

export const closeSession = async (sessionId: string, tableId: string) => {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await updateDoc(sessionRef, {
        status: 'closed',
        endTime: serverTimestamp()
    });
    await updateTableStatus(tableId, 'available', null);
};

export const subscribeToActiveSessions = (callback: (sessions: Session[]) => void) => {
    const q = query(
        collection(db, SESSIONS_COLLECTION),
        where('status', '==', 'active')
    );

    return onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
        callback(sessions);
    });
};

export const markSessionPaid = async (sessionId: string, tableId: string) => {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    await updateDoc(sessionRef, {
        paymentStatus: 'paid',
        paidAmount: (await getDoc(sessionRef)).data()?.total || 0
    });
    await closeSession(sessionId, tableId);
};

export const subscribeToSession = (sessionId: string, callback: (session: Session | null) => void, restaurantId?: string) => {
    if (!restaurantId) {
        const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                callback({ id: doc.id, ...doc.data() } as Session);
            } else {
                callback(null);
            }
        });
    }

    // Smart Sync for Tenant Sessions
    const sessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId);
    const ordersQuery = query(
        collection(db, 'restaurants', restaurantId, 'orders'),
        where('sessionId', '==', sessionId)
    );

    let sessionData: Session | null = null;
    let orderItems: OrderItem[] = [];
    let sessionLoaded = false;
    let ordersLoaded = false;

    const updateCallback = () => {
        if (!sessionLoaded) return;  // Only wait for session, not orders

        if (!sessionData) {
            callback(null);
            return;
        }

        // CRITICAL: Use session.items directly, NOT orderItems
        // session.items has paid_quantity which is updated by recordItemPayment
        // orderItems from the orders collection does NOT have paid_quantity
        callback(sessionData);
    };

    const unsubSession = onSnapshot(sessionRef, (doc) => {
        sessionLoaded = true;
        if (doc.exists()) {
            sessionData = { id: doc.id, ...doc.data() } as Session;
        } else {
            sessionData = null;
        }
        updateCallback();
    });

    // Return only session unsubscribe
    return () => {
        unsubSession();
    };
};

export const removeItemFromSession = async (sessionId: string, itemIndex: number) => {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
        const session = sessionSnap.data() as Session;
        const newItems = [...session.items];

        if (itemIndex >= 0 && itemIndex < newItems.length) {
            newItems.splice(itemIndex, 1);
            const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            await updateDoc(sessionRef, {
                items: newItems,
                total: newTotal
            });
        }
    }
};
