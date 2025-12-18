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
 * Fetch all unified metrics for the dashboard home
 */
export const getDashboardMetrics = async (restaurantId: string, startDate: Date, endDate: Date) => {
    const sessionsRef = collection(db, 'restaurants', restaurantId, 'sessions');

    // We fetch all sessions in range. Using startTime for filtering.
    // Client-side filtering/sorting to avoid complex indexes for now
    const q = query(
        sessionsRef,
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate))
    );

    const snap = await getDocs(q);
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));

    const closedSessions = sessions.filter(s => s.status === 'closed');
    const activeSessions = sessions.filter(s => s.status === 'active');

    // KPIs
    const totalSales = closedSessions.reduce((sum, s) => sum + (s.total || 0), 0);
    const avgTicket = closedSessions.length > 0 ? totalSales / closedSessions.length : 0;

    // Tips calculation (requires subcollection fetch)
    let totalTips = 0;
    const paymentMethods = { Cash: 0, Card: 0, App: 0 };
    const categorySales = new Map<string, number>();
    // Track two types of aggregations
    const historicalSales: { [key: string]: number } = {};
    const peakSales: { [key: string]: number } = {};

    // Initialize 24 hours for peaks
    for (let i = 0; i < 24; i++) {
        const h = i < 10 ? `0${i}:00` : `${i}:00`;
        peakSales[h] = 0;
    }

    const dayDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));

    for (const session of sessions) {
        // Fetch tips and methods
        const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', session.id, 'payments');
        const psnap = await getDocs(paymentsRef);
        psnap.forEach(d => {
            const p = d.data() as Payment;
            totalTips += (p.tip || 0);

            const method = p.method === 'cash' ? 'Cash' : (p.method === 'stripe' ? 'App' : 'Card');
            paymentMethods[method] += (p.amount || 0);
        });

        // Categories aggregation
        (session.items || []).forEach(item => {
            const category = 'General';
            const current = categorySales.get(category) || 0;
            categorySales.set(category, current + (item.price * item.quantity));
        });

        // Aggregations
        if (session.status === 'closed' && session.startTime) {
            const date = session.startTime.toDate();

            // 1. Historical Key (Hour if <2 days, else Day)
            const histKey = dayDiff <= 2 ? format(date, 'HH:00') : format(date, 'dd/MM');
            historicalSales[histKey] = (historicalSales[histKey] || 0) + (session.total || 0);

            // 2. Peak Key (Always Hour)
            const peakKey = format(date, 'HH:00');
            peakSales[peakKey] += (session.total || 0);
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

    // Convert category sales to donut format
    const categoryChartData = Array.from(categorySales.entries()).map(([name, value]) => ({
        name,
        value,
        text: name,
        color: '#6366f1' // Placeholder color
    }));

    // Convert payment methods to pie format
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
            activeTables: activeSessions.length,
            closedTables: closedSessions.length
        },
        charts: {
            salesHistory: historicalData,
            peakHours: peakData,
            categories: categoryChartData,
            payments: paymentChartData
        }
    };
};
