import {
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    serverTimestamp,
    collection
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Table } from '../types/firestore';

// Helper to get dynamic collection ref
const getCollectionRef = (restaurantId: string) =>
    collection(db, 'restaurants', restaurantId, 'tables');

export const subscribeToTables = (restaurantId: string, callback: (tables: Table[]) => void) => {
    const q = query(getCollectionRef(restaurantId), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
        callback(tables);
    }, (error) => {
        console.error("Error subscribing to tables:", error);
    });
};

export const updateTableStatus = async (restaurantId: string, tableId: string, status: string, sessionId: string | null) => {
    const tableRef = doc(getCollectionRef(restaurantId), tableId);
    await updateDoc(tableRef, {
        status,
        currentSessionId: sessionId,
        active_session_id: sessionId,
        updatedAt: serverTimestamp()
    });
};

export const createTable = async (restaurantId: string, name: string) => {
    const tableData = {
        name,
        status: 'available',
        current_session_id: null,
        active_session_id: null,
        restaurantId: restaurantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await addDoc(getCollectionRef(restaurantId), tableData);
};

export const updateTable = async (restaurantId: string, id: string, data: Partial<Table>) => {
    // Map simplified updates to dual fields if needed
    const updates: any = { ...data, updatedAt: serverTimestamp() };

    // If updating current_session_id, sync active_session_id if not provided
    if (data.currentSessionId !== undefined && data.active_session_id === undefined) {
        updates.active_session_id = data.currentSessionId;
    }

    await updateDoc(doc(getCollectionRef(restaurantId), id), updates);
};

export const deleteTable = async (restaurantId: string, id: string) => {
    await deleteDoc(doc(getCollectionRef(restaurantId), id));
};
