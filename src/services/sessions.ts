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
    onSnapshot,
    orderBy,
    limit,
    arrayUnion
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Session, OrderItem, Order, SessionStatus, PaymentStatus, SessionStaff } from '../types/firestore';
import { updateTableStatus } from './tables';

const SESSIONS_COLLECTION = 'sessions';
const ORDERS_COLLECTION = 'orders';

/**
 * Helper to get session and order references (Nested vs Top-level)
 * Strategy: Always prefer nested restaurants/{id}/ path if id is provided.
 */
const getSessionRef = (restaurantId: string | undefined, sessionId: string) => {
    if (restaurantId) return doc(db, 'restaurants', restaurantId, 'sessions', sessionId);
    return doc(db, SESSIONS_COLLECTION, sessionId);
};

const getOrdersCollection = (restaurantId: string | undefined) => {
    if (restaurantId) return collection(db, 'restaurants', restaurantId, 'orders');
    return collection(db, ORDERS_COLLECTION);
};

export const createSession = async (restaurantId: string, tableId: string, tableName: string): Promise<string> => {
    console.log('🆕 [createSession] Creating new nested session:', { restaurantId, tableId, tableName });
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
        guestCount: 0,
        amount_paid: 0,
        remaining_amount: 0
    };

    // ALWAYS use NESTED sessions collection for new sessions
    const sessionsRef = collection(db, 'restaurants', restaurantId, 'sessions');
    const docRef = await addDoc(sessionsRef, sessionData);

    // Update table status to link to session
    // [FIX] Skip if tableId is 'counter' (virtual table)
    if (tableId !== 'counter') {
        try {
            await updateTableStatus(restaurantId, tableId, 'occupied', docRef.id);
        } catch (e) {
            console.warn(`⚠️ [createSession] Could not update status for table ${tableId}:`, e);
        }
    }

    console.log('✅ [createSession] Session created with ID:', docRef.id);
    return docRef.id;
};

export const addOrderToSession = async (
    sessionId: string,
    tableId: string,
    tableName: string,
    items: OrderItem[],
    restaurantId?: string // Optional for backward compatibility, but highly recommended
) => {
    console.log('📝 [addOrderToSession] Adding items to session:', { sessionId, restaurantId, itemCount: items.length });

    // 1. Create Order Record in appropriate collection
    const ordersRef = getOrdersCollection(restaurantId);
    const orderData = {
        sessionId,
        tableId,
        tableName,
        items,
        status: 'pending',
        createdAt: serverTimestamp() as Timestamp,
        restaurantId // Store for easy filtering if needed
    };
    await addDoc(ordersRef, orderData);
    console.log('✅ [addOrderToSession] Order record created at:', ordersRef.path);

    // 2. Update Session with new items and total
    const sessionRef = getSessionRef(restaurantId, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
        const session = sessionSnap.data() as Session;
        const currentItems = session.items || [];
        const newItems = [...currentItems, ...items];
        const newSubtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const newTax = newSubtotal * 0.16; // 16% tax
        const newTotal = newSubtotal + newTax;

        await updateDoc(sessionRef, {
            items: newItems,
            subtotal: newSubtotal,
            tax: newTax,
            total: newTotal,
            remaining_amount: newTotal - (session.amount_paid || session.paidAmount || 0)
        });

        console.log('✅ [addOrderToSession] Session updated at:', sessionRef.path);
    } else {
        console.error('❌ [addOrderToSession] Session not found at:', sessionRef.path);
        throw new Error(`Session ${sessionId} not found`);
    }
};

export const closeSession = async (restaurantId: string, sessionId: string, tableId: string) => {
    const sessionRef = getSessionRef(restaurantId, sessionId);
    await updateDoc(sessionRef, {
        status: 'closed',
        endTime: serverTimestamp()
    });

    // [FIX] Skip if tableId is 'counter' (virtual table)
    if (tableId !== 'counter') {
        await updateTableStatus(restaurantId, tableId, 'available', null);
    }
};

export const subscribeToActiveSessions = (callback: (sessions: Session[]) => void, restaurantId?: string) => {
    const sessionsRef = restaurantId
        ? collection(db, 'restaurants', restaurantId, 'sessions')
        : collection(db, SESSIONS_COLLECTION);

    const q = query(
        sessionsRef,
        where('status', '==', 'active')
    );

    return onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
        callback(sessions);
    });
};

export const markSessionPaid = async (restaurantId: string, sessionId: string, tableId: string) => {
    const sessionRef = getSessionRef(restaurantId, sessionId);
    const sessionSnap = await getDoc(sessionRef);
    const total = sessionSnap.data()?.total || 0;

    await updateDoc(sessionRef, {
        paymentStatus: 'paid',
        paidAmount: total,
        amount_paid: total,
        remaining_amount: 0
    });
    await closeSession(restaurantId, sessionId, tableId);
};

export const subscribeToSession = (sessionId: string, callback: (session: Session | null) => void, restaurantId?: string) => {
    const sessionRef = getSessionRef(restaurantId, sessionId);
    console.log('📡 [subscribeToSession] Listening at:', sessionRef.path);

    return onSnapshot(sessionRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as Session);
        } else {
            console.warn('⚠️ [subscribeToSession] Session NOT FOUND at:', sessionRef.path);
            callback(null);
        }
    });
};

export const removeItemFromSession = async (sessionId: string, itemIndex: number, restaurantId?: string) => {
    const sessionRef = getSessionRef(restaurantId, sessionId);
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

// Superseded by shift-aware subscription usually, but kept for legacy "Today" view if needed
export const subscribeToDailyPaidSessions = (restaurantId: string, callback: (sessions: Session[]) => void) => {
    // Get start of today
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfDay = Timestamp.fromDate(now);

    return subscribeToShiftSessions(restaurantId, startOfDay, callback);
};

export const subscribeToShiftSessions = (restaurantId: string, startTime: Date | Timestamp, callback: (sessions: Session[]) => void) => {
    const startTimestamp = startTime instanceof Timestamp ? startTime : Timestamp.fromDate(startTime);

    console.log('📡 [subscribeToShiftSessions] Listening for sessions after:', startTimestamp.toDate().toLocaleString());

    const q = query(
        collection(db, 'restaurants', restaurantId, 'sessions'),
        where('status', '==', 'closed'),
        where('endTime', '>=', startTimestamp),
        orderBy('endTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
        callback(sessions);
    });
};

export const joinSession = async (restaurantId: string, sessionId: string, staffId: string, staffName: string) => {
    console.log('👤 [joinSession] Staff joining session:', { restaurantId, sessionId, staffId, staffName });
    const sessionRef = getSessionRef(restaurantId, sessionId);

    const staffEntry: SessionStaff = {
        id: staffId,
        name: staffName,
        joinedAt: Timestamp.now()
    };

    await updateDoc(sessionRef, {
        staff: arrayUnion(staffEntry),
        staff_ids: arrayUnion(staffId)
    });

    console.log('✅ [joinSession] Staff attached to session');
};

export const updateSessionNotes = async (sessionId: string, notes: string, restaurantId?: string) => {
    const sessionRef = getSessionRef(restaurantId, sessionId);
    await updateDoc(sessionRef, { notes });
};

export const cancelSession = async (restaurantId: string, sessionId: string, tableId: string) => {
    const sessionRef = getSessionRef(restaurantId, sessionId);
    await updateDoc(sessionRef, {
        status: 'cancelled',
        endTime: serverTimestamp()
    });

    // Skip if tableId is 'counter' (virtual table)
    if (tableId !== 'counter') {
        await updateTableStatus(restaurantId, tableId, 'available', null);
    }
    console.log(`✅ [cancelSession] Session ${sessionId} cancelled`);
};
