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

// TODO: Get this dynamically from Auth Context
const RESTAURANT_ID = 'kiitos-main';

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

export const updateTableStatus = async (tableId: string, status: string, sessionId: string | null) => {
    const tableRef = doc(getCollectionRef(RESTAURANT_ID), tableId);
    await updateDoc(tableRef, {
        status,
        currentSessionId: sessionId,
        active_session_id: sessionId,
        updatedAt: serverTimestamp()
    });
};

export const createTable = async (name: string) => {
    const tableData = {
        name,
        status: 'available',
        current_session_id: null,
        active_session_id: null, // Syncing both for legacy support
        restaurantId: RESTAURANT_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await addDoc(getCollectionRef(RESTAURANT_ID), tableData);
};

export const updateTable = async (id: string, data: Partial<Table>) => {
    // Map simplified updates to dual fields if needed
    const updates: any = { ...data, updatedAt: serverTimestamp() };

    // If updating current_session_id, sync active_session_id if not provided
    if (data.currentSessionId !== undefined && data.active_session_id === undefined) {
        updates.active_session_id = data.currentSessionId;
    }

    await updateDoc(doc(getCollectionRef(RESTAURANT_ID), id), updates);
};

export const deleteTable = async (id: string) => {
    await deleteDoc(doc(getCollectionRef(RESTAURANT_ID), id));
};
