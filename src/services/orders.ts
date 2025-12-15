import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Order, OrderStatus } from '../types/firestore';

const ORDERS_COLLECTION = 'orders';

export const subscribeToPendingOrders = (callback: (orders: Order[]) => void) => {
    const q = query(
        collection(db, ORDERS_COLLECTION),
        where('status', 'in', ['pending', 'preparing']),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        callback(orders);
    });
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, { status });
};
