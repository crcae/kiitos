import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    Timestamp,
    onSnapshot,
    setDoc
} from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from './firebaseConfig';
import { Product, Category, RestaurantSettings } from '../types/firestore';

// Generic helpers
const getCollectionRef = (restaurantId: string, subcollection: string) =>
    collection(db, 'restaurants', restaurantId, subcollection);

const getDocRef = (restaurantId: string, subcollection: string, id: string) =>
    doc(db, 'restaurants', restaurantId, subcollection, id);

// ============================================
// PRODUCTS
// ============================================

export const getProducts = async (restaurantId: string): Promise<Product[]> => {
    const q = query(getCollectionRef(restaurantId, 'products'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
};

export const createProduct = async (restaurantId: string, product: Omit<Product, 'id'>) => {
    // console.log('Attempting to create Product in restaurant:', restaurantId);
    if (!restaurantId) {
        Alert.alert('Error', 'Restaurant ID is missing');
        throw new Error('Restaurant ID is missing');
    }

    try {
        return await addDoc(getCollectionRef(restaurantId, 'products'), product);
    } catch (e: any) {
        console.error('Error creating product:', e);
        Alert.alert('Error Firebase', e.message);
        throw e;
    }
};

export const updateProduct = async (restaurantId: string, id: string, updates: Partial<Product>) => {
    await updateDoc(getDocRef(restaurantId, 'products', id), updates);
};

export const deleteProduct = async (restaurantId: string, id: string) => {
    await deleteDoc(getDocRef(restaurantId, 'products', id));
};

// ============================================
// CATEGORIES
// ============================================

export const getCategories = async (restaurantId: string): Promise<Category[]> => {
    const q = query(getCollectionRef(restaurantId, 'categories'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const createCategory = async (restaurantId: string, category: Omit<Category, 'id'>) => {
    // console.log('Attempting to create Category in restaurant:', restaurantId);
    if (!restaurantId) {
        Alert.alert('Error', 'Restaurant ID is missing');
        throw new Error('Restaurant ID is missing');
    }

    try {
        return await addDoc(getCollectionRef(restaurantId, 'categories'), category);
    } catch (e: any) {
        console.error('Error creating category:', e);
        Alert.alert('Error Firebase', e.message);
        throw e;
    }
};

export const updateCategory = async (restaurantId: string, id: string, updates: Partial<Category>) => {
    await updateDoc(getDocRef(restaurantId, 'categories', id), updates);
};

export const deleteCategory = async (restaurantId: string, id: string) => {
    await deleteDoc(getDocRef(restaurantId, 'categories', id));
};


export const subscribeToProducts = (restaurantId: string, callback: (products: Product[]) => void) => {
    if (!restaurantId) return () => { };
    const q = query(getCollectionRef(restaurantId, 'products'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        callback(products);
    }, (error) => {
        console.error("Error subscribing to products:", error);
        // Alert.alert('Data Error', 'Failed to subscribe to products: ' + error.message);
    });
};

export const subscribeToCategories = (restaurantId: string, callback: (categories: Category[]) => void) => {
    if (!restaurantId) return () => { };
    const q = query(getCollectionRef(restaurantId, 'categories'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        callback(categories);
    }, (error) => {
        console.error("Error subscribing to categories:", error);
        // Alert.alert('Data Error', 'Failed to subscribe to categories: ' + error.message);
    });
};

export const subscribeToRestaurantConfig = (restaurantId: string, callback: (config: RestaurantSettings) => void) => {
    if (!restaurantId) return () => { };
    const docRef = doc(db, 'restaurants', restaurantId);
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            // Ensure we return a valid config object even if fields are missing
            const config: RestaurantSettings = {
                currency: data.settings?.currency || 'USD',
                timezone: data.settings?.timezone || 'UTC',
                taxRate: data.settings?.taxRate || 0,
                allow_guest_ordering: data.settings?.allow_guest_ordering ?? false,
                ...data.settings
            };
            callback(config);
        }
    });
};

export const updateRestaurantConfig = async (restaurantId: string, settings: Partial<RestaurantSettings>) => {
    const docRef = doc(db, 'restaurants', restaurantId);
    // Use setDoc with merge: true but with a proper nested object structure
    // NOT dot notation keys, which creates "settings.key" fields literal
    const updates = { settings: settings };
    await setDoc(docRef, updates, { merge: true });
};
