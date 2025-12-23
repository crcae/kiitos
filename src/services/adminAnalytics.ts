import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    getDoc,
    Timestamp
} from 'firebase/firestore';
import {
    startOfDay,
    endOfDay,
    subDays,
    startOfMonth,
    endOfMonth,
    eachHourOfInterval,
    format,
    isWithinInterval
} from 'date-fns';
import { db } from './firebaseConfig';
import { Session, Payment, OrderItem } from '../types/firestore';

/**
 * Fetch all closed sessions from sessions collection
 */
export const getBills = async (restaurantId: string): Promise<any[]> => {
    const sessionsRef = collection(db, 'restaurants', restaurantId, 'sessions');
    const q = query(
        sessionsRef,
        where('status', '==', 'closed')
    );

    const querySnapshot = await getDocs(q);
    const sessionsPromises = querySnapshot.docs.map(async (d) => {
        const session = { id: d.id, ...d.data() } as Session;

        // Fetch tips for this specific session
        let sessionTips = 0;
        const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', d.id, 'payments');
        const psnap = await getDocs(paymentsRef);
        psnap.forEach(payDoc => {
            const p = payDoc.data() as Payment;
            sessionTips += (p.tip || 0);
        });

        return {
            ...session,
            tips: sessionTips,
            grandTotal: (session.total || 0) + sessionTips
        };
    });

    const sessionsWithTips = await Promise.all(sessionsPromises);

    // Sort client-side to avoid needing a composite index
    return sessionsWithTips.sort((a, b) => {
        const timeA = a.startTime?.toMillis?.() || 0;
        const timeB = b.startTime?.toMillis?.() || 0;
        return timeB - timeA;
    });
};

/**
 * Fetch bill details including items and related payments
 */
export const getBillDetail = async (restaurantId: string, sessionId: string) => {
    const sessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) throw new Error('Cuenta no encontrada');

    const sessionData = { id: sessionSnap.id, ...sessionSnap.data() } as Session;

    // Fetch associated payments from subcollection
    const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', sessionId, 'payments');
    const paymentsSnap = await getDocs(paymentsRef);
    const payments = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));

    const sessionTips = payments.reduce((sum, p) => sum + (p.tip || 0), 0);

    return {
        session: {
            ...sessionData,
            tips: sessionTips,
            grandTotal: (sessionData.total || 0) + sessionTips
        },
        payments
    };
};

/**
 * Fetch all payments for the restaurant by iterating through sessions
 * Note: For high volume, a top-level collection or collectionGroup with indexing is recommended.
 */
export const getPaymentsList = async (restaurantId: string): Promise<Payment[]> => {
    const sessionsRef = collection(db, 'restaurants', restaurantId, 'sessions');
    const sessionsSnap = await getDocs(sessionsRef);

    let allPayments: Payment[] = [];

    for (const sessionDoc of sessionsSnap.docs) {
        const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', sessionDoc.id, 'payments');
        const paymentsSnap = await getDocs(paymentsRef);
        paymentsSnap.forEach(pDoc => {
            const data = pDoc.data();
            // Validation: only include if it looks like a real payment
            if (data.amount !== undefined && data.method !== undefined) {
                allPayments.push({ id: pDoc.id, ...data } as Payment);
            }
        });
    }

    return allPayments.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
};

/**
 * Helper to calculate today's totals
 */
export const getTodayStats = async (restaurantId: string) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sessionsRef = collection(db, 'restaurants', restaurantId, 'sessions');
    const q = query(
        sessionsRef,
        where('startTime', '>=', Timestamp.fromDate(todayStart))
    );

    const snap = await getDocs(q);
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));

    const closedSessions = sessions.filter(s => s.status === 'closed');

    // Aggregations
    const salesTotal = closedSessions.reduce((sum, s) => sum + (s.total || 0), 0);

    // Fetch tips for today's sessions
    let dayTips = 0;
    for (const session of sessions) {
        const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', session.id, 'payments');
        const psnap = await getDocs(paymentsRef);
        psnap.forEach(d => {
            const p = d.data() as Payment;
            dayTips += (p.tip || 0);
        });
    }

    // Most sold product
    const productStats = new Map<string, { name: string, count: number }>();
    sessions.forEach(s => {
        (s.items || []).forEach(item => {
            const current = productStats.get(item.product_id) || { name: item.name, count: 0 };
            current.count += item.quantity;
            productStats.set(item.product_id, current);
        });
    });

    let topProduct = 'Ninguno';
    let maxCount = 0;
    productStats.forEach(stat => {
        if (stat.count > maxCount) {
            maxCount = stat.count;
            topProduct = stat.name;
        }
    });

    return {
        salesToday: salesTotal,
        closedTables: closedSessions.length,
        staffTips: dayTips,
        topProduct: topProduct
    };
};

/**
 * Unified Order interface for internal dashboard representation
 */
export interface UnifiedOrder {
    id: string;
    sourceType: 'dine-in' | 'takeout';
    status: 'active' | 'closed'; // Mapping PickupOrderStatus to active/closed
    timestamp: Date;
    total: number;
    tips: number;
    items: any[];
    paymentMethods: { Cash: number; Card: number; App: number };
}

/**
 * Fetch all unified metrics for the dashboard home
 */
export const getDashboardMetrics = async (restaurantId: string, startDate: Date, endDate: Date) => {
    // 1. Fetch Sessions (Dine-in)
    const sessionsRef = collection(db, 'restaurants', restaurantId, 'sessions');
    const qSessions = query(
        sessionsRef,
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate))
    );
    const snapSessions = await getDocs(qSessions);
    const sessions = snapSessions.docs.map(d => ({ id: d.id, ...d.data() } as Session));

    // 2. Fetch Pickup Orders (Takeout)
    const pickupRef = collection(db, 'restaurants', restaurantId, 'pickup_orders');
    const qPickup = query(
        pickupRef,
        where('created_at', '>=', Timestamp.fromDate(startDate)),
        where('created_at', '<=', Timestamp.fromDate(endDate))
    );
    const snapPickup = await getDocs(qPickup);
    const pickupOrders = snapPickup.docs.map(d => ({ id: d.id, ...d.data() } as any)); // Use any to avoid strict interface issues for now

    // 3. Normalize into UnifiedOrders
    const unifiedOrders: UnifiedOrder[] = [];

    // Process Sessions
    for (const session of sessions) {
        let totalTips = 0;
        const paymentMethods = { Cash: 0, Card: 0, App: 0 };

        const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', session.id, 'payments');
        const psnap = await getDocs(paymentsRef);
        psnap.forEach(d => {
            const p = d.data() as Payment;
            totalTips += (p.tip || 0);
            const method = p.method === 'cash' ? 'Cash' : (p.method === 'stripe' ? 'App' : 'Card');
            paymentMethods[method] += (p.amount || 0);
        });

        unifiedOrders.push({
            id: session.id,
            sourceType: 'dine-in',
            status: session.status === 'closed' ? 'closed' : 'active',
            timestamp: session.startTime?.toDate() || new Date(),
            total: session.total || 0,
            tips: totalTips,
            items: session.items || [],
            paymentMethods
        });
    }

    // Process Pickup Orders
    for (const order of pickupOrders) {
        // For pickup orders, we'll assume they are "closed" if they are completed
        // And "active" if they are preparing or ready
        const isClosed = order.status === 'completed';
        const isActive = ['preparing', 'ready', 'scheduled'].includes(order.status);

        unifiedOrders.push({
            id: order.id,
            sourceType: 'takeout',
            status: isClosed ? 'closed' : (isActive ? 'active' : 'closed'), // Defaulting to closed if cancelled? Let's say closed but 0 total if cancelled?
            timestamp: order.created_at?.toDate() || new Date(),
            total: order.status === 'cancelled' ? 0 : (order.total || 0),
            tips: 0, // Pickup orders tip handling might be different, keeping it 0 for now
            items: order.items || [],
            paymentMethods: { Cash: 0, Card: 1, App: (order.payment_intent_id ? (order.total || 0) : 0) } // Stripe for pickup
        });
    }

    const initialMetrics = calculateMetricsFromOrders(unifiedOrders, startDate, endDate);

    return {
        orders: unifiedOrders,
        metrics: initialMetrics
    };
};

/**
 * Pure function to calculate metrics from a list of unified orders
 */
export const calculateMetricsFromOrders = (orders: UnifiedOrder[], startDate: Date, endDate: Date) => {
    const closedOrders = orders.filter(o => o.status === 'closed');
    const activeOrders = orders.filter(o => o.status === 'active');

    // KPIs
    const totalSales = closedOrders.reduce((sum, o) => sum + o.total, 0);
    const avgTicket = closedOrders.length > 0 ? totalSales / closedOrders.length : 0;
    const totalTips = orders.reduce((sum, o) => sum + o.tips, 0);

    const paymentMethods = { Cash: 0, Card: 0, App: 0 };
    const historicalSales: { [key: string]: number } = {};
    const peakSales: { [key: string]: number } = {};

    // Initialize 24 hours for peaks
    for (let i = 0; i < 24; i++) {
        const h = i < 10 ? `0${i}:00` : `${i}:00`;
        peakSales[h] = 0;
    }

    const dayDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));

    for (const order of orders) {
        // Aggregate payment methods
        paymentMethods.Cash += order.paymentMethods.Cash;
        paymentMethods.Card += order.paymentMethods.Card;
        paymentMethods.App += order.paymentMethods.App;

        // Aggregations for charts (only closed orders for sales consistency)
        if (order.status === 'closed') {
            const date = order.timestamp;

            // 1. Historical Key
            const histKey = dayDiff <= 2 ? format(date, 'HH:00') : format(date, 'dd/MM');
            historicalSales[histKey] = (historicalSales[histKey] || 0) + order.total;

            // 2. Peak Key
            const peakKey = format(date, 'HH:00');
            peakSales[peakKey] += order.total;
        }
    }

    // Convert to chart data format
    const historicalData = Object.keys(historicalSales)
        .sort()
        .map(label => ({
            label: dayDiff <= 2 ? label.split(':')[0] : label,
            value: historicalSales[label]
        }));

    const peakData = Object.keys(peakSales)
        .sort()
        .map(label => ({
            label: label.split(':')[0],
            value: Number((peakSales[label] / dayDiff).toFixed(2))
        }));

    const paymentChartData = Object.entries(paymentMethods).map(([name, value], index) => ({
        name,
        value,
        text: name,
        color: index === 0 ? '#10b981' : (index === 1 ? '#3b82f6' : '#6363f1')
    }));

    return {
        kpis: {
            totalSales,
            avgTicket,
            totalTips,
            activeTables: activeOrders.filter(o => o.sourceType === 'dine-in').length,
            activePickup: activeOrders.filter(o => o.sourceType === 'takeout').length,
            closedOrders: closedOrders.length
        },
        charts: {
            salesHistory: historicalData,
            peakHours: peakData,
            payments: paymentChartData
        }
    };
};
