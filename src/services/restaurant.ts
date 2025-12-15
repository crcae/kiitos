import {
    doc,
    getDoc,
    setDoc,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Restaurant, MenuItem } from '../types/firestore';

const RESTAURANT_ID = 'kiitos-main';

export const subscribeToRestaurant = (callback: (restaurant: Restaurant | null) => void) => {
    const docRef = doc(db, 'restaurants', RESTAURANT_ID);
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() } as Restaurant);
        } else {
            callback(null);
        }
    });
};

// Menu Management has moved to src/services/menu.ts using subcollections.
// This file continues to handle Restaurant-level configuration and subscriptions.


export const updateRestaurantConfig = async (configUpdates: any) => {
    const docRef = doc(db, 'restaurants', RESTAURANT_ID);
    await setDoc(docRef, { settings: configUpdates }, { merge: true });
};
