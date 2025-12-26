import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface ShiftCutStats {
    totalSales: number;
    cashSales: number;
    cardSales: number;
    appSales: number; // Kitos App
    deliverySales: number; // Uber/Rappi/Didi
    deliveryBreakdown?: {
        uber?: number;
        rappi?: number;
        didi?: number;
        other?: number;
    };
    itemsSold: number;
    sessionCount: number;
    expectedCash?: number; // Calculated cash
    actualCash?: number; // User input (optional future feature)
    difference?: number;
}

export interface ShiftCut {
    id?: string;
    restaurantId: string;
    createdAt: any; // Timestamp
    closedBy: {
        id: string;
        name: string;
    };
    stats: ShiftCutStats;
    sessionIds: string[]; // IDs of sessions included in this cut
    shiftStart: any; // When this shift started (last cut time or day start)
}

const COLLECTION_NAME = 'shift_cuts';

// Get the request collection ref
const getCollection = (restaurantId: string) => collection(db, 'restaurants', restaurantId, COLLECTION_NAME);

export const recordShiftCut = async (
    restaurantId: string,
    stats: ShiftCutStats,
    user: { id: string; name: string },
    sessionIds: string[],
    shiftStart: Date | Timestamp
): Promise<string> => {
    try {
        const docRef = await addDoc(getCollection(restaurantId), {
            restaurantId,
            createdAt: serverTimestamp(),
            closedBy: user,
            stats,
            sessionIds,
            shiftStart
        });
        console.log('✅ [recordShiftCut] Shift Cut recorded:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ [recordShiftCut] Error:', error);
        throw error;
    }
};

export const getLastShiftCut = async (restaurantId: string): Promise<ShiftCut | null> => {
    try {
        const q = query(
            getCollection(restaurantId),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as ShiftCut;
        }
        return null;
    } catch (error) {
        console.error('❌ [getLastShiftCut] Error:', error);
        return null;
    }
};
