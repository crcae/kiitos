import {
    collection,
    query,
    where,
    getDocs,
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Session, Payment, OrderItem } from '../types/firestore';

export interface DashboardMetrics {
    totalRevenue: number;
    totalTips: number;
    totalOrders: number;
    activeTables: number;
    avgOrderValue: number;
    totalGuests: number;
    paymentMethods: {
        cash: number;
        stripe: number;
        other: number;
    };
}

export interface ProductMetric {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    category: string;
}

/**
 * Fetches sessions within a specific date range for a restaurant
 */
export const getSessionsInDateRange = async (
    restaurantId: string,
    startDate: Date,
    endDate: Date
): Promise<Session[]> => {
    const sessionsRef = collection(db, 'restaurants', restaurantId, 'sessions');
    const q = query(
        sessionsRef,
        where('startTime', '>=', Timestamp.fromDate(startDate)),
        where('startTime', '<=', Timestamp.fromDate(endDate)),
        orderBy('startTime', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
};

/**
 * Calculates dashboard metrics from a list of sessions
 */
export const calculateDashboardMetrics = async (
    restaurantId: string,
    sessions: Session[]
): Promise<DashboardMetrics> => {
    let totalRevenue = 0;
    let totalTips = 0;
    let totalGuests = 0;
    const paymentMethods = { cash: 0, stripe: 0, other: 0 };

    // We need to fetch payments for each session to get accurate tips and methods
    // In a high-volume app, we might want to denormalize this or use a different strategy
    for (const session of sessions) {
        totalRevenue += session.total || 0;
        totalGuests += session.guestCount || 0;

        // Fetch payments for this session
        const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', session.id, 'payments');
        const paymentsSnap = await getDocs(paymentsRef);

        paymentsSnap.forEach(doc => {
            const payment = doc.data() as Payment;
            totalTips += payment.tip || 0;
            if (payment.method === 'cash') paymentMethods.cash += payment.amount;
            else if (payment.method === 'stripe') paymentMethods.stripe += payment.amount;
            else paymentMethods.other += payment.amount;
        });
    }

    return {
        totalRevenue,
        totalTips,
        totalOrders: sessions.length,
        activeTables: sessions.filter(s => s.status === 'active').length,
        avgOrderValue: sessions.length > 0 ? totalRevenue / sessions.length : 0,
        totalGuests,
        paymentMethods
    };
};

/**
 * Aggregates product sales from sessions
 */
export const aggregateProductMetrics = (sessions: Session[]): ProductMetric[] => {
    const productMap = new Map<string, ProductMetric>();

    sessions.forEach(session => {
        (session.items || []).forEach(item => {
            const existing = productMap.get(item.product_id);

            // Calculate item revenue including modifiers
            const modifiersTotal = item.modifiers?.reduce((sum, mod) => sum + (mod.price || 0), 0) || 0;
            const itemRevenue = (item.price + modifiersTotal) * item.quantity;

            if (existing) {
                existing.quantity += item.quantity;
                existing.revenue += itemRevenue;
            } else {
                productMap.set(item.product_id, {
                    id: item.product_id,
                    name: item.name,
                    quantity: item.quantity,
                    revenue: itemRevenue,
                    category: 'General' // Category might need to be fetched or denormalized
                });
            }
        });
    });

    return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
};

/**
 * Formats sessions for CSV export
 */
export const formatSessionsForCSV = (sessions: Session[]) => {
    return sessions.map(s => ({
        id: s.id,
        table: s.tableName || s.tableId,
        startTime: s.startTime?.toDate().toLocaleString() || '',
        endTime: s.endTime?.toDate().toLocaleString() || '',
        status: s.status,
        subtotal: s.subtotal?.toFixed(2) || '0.00',
        tax: s.tax?.toFixed(2) || '0.00',
        total: s.total?.toFixed(2) || '0.00',
        paid: s.amount_paid?.toFixed(2) || '0.00',
        paymentStatus: s.paymentStatus
    }));
};
