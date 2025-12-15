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
    onSnapshot
} from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from './firebaseConfig';
import { Product, Category, RestaurantSettings } from '../types/firestore';

const RESTAURANT_ID = 'kiitos-main'; // TODO: Dynamically get from auth context

// Generic helpers
const getCollectionRef = (subcollection: string) =>
    collection(db, 'restaurants', RESTAURANT_ID, subcollection);

const getDocRef = (subcollection: string, id: string) =>
    doc(db, 'restaurants', RESTAURANT_ID, subcollection, id);

// ============================================
// PRODUCTS
// ============================================

export const getProducts = async (): Promise<Product[]> => {
    const q = query(getCollectionRef('products'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
};

export const createProduct = async (product: Omit<Product, 'id'>) => {
    console.log('Attempting to create Product in restaurant:', RESTAURANT_ID);
    if (!RESTAURANT_ID) {
        Alert.alert('Error', 'Restaurant ID is missing');
        throw new Error('Restaurant ID is missing');
    }

    try {
        return await addDoc(getCollectionRef('products'), product);
    } catch (e: any) {
        console.error('Error creating product:', e);
        Alert.alert('Error Firebase', e.message);
        throw e;
    }
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
    await updateDoc(getDocRef('products', id), updates);
};

export const deleteProduct = async (id: string) => {
    await deleteDoc(getDocRef('products', id));
};

// ============================================
// CATEGORIES
// ============================================

export const getCategories = async (): Promise<Category[]> => {
    const q = query(getCollectionRef('categories'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const createCategory = async (category: Omit<Category, 'id'>) => {
    console.log('Attempting to create Category in restaurant:', RESTAURANT_ID);
    if (!RESTAURANT_ID) {
        Alert.alert('Error', 'Restaurant ID is missing');
        throw new Error('Restaurant ID is missing');
    }

    try {
        return await addDoc(getCollectionRef('categories'), category);
    } catch (e: any) {
        console.error('Error creating category:', e);
        Alert.alert('Error Firebase', e.message);
        throw e;
    }
};

export const updateCategory = async (id: string, updates: Partial<Category>) => {
    await updateDoc(getDocRef('categories', id), updates);
};

export const deleteCategory = async (id: string) => {
    await deleteDoc(getDocRef('categories', id));
};


export const subscribeToProducts = (callback: (products: Product[]) => void) => {
    const q = query(getCollectionRef('products'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        callback(products);
    }, (error) => {
        console.error("Error subscribing to products:", error);
        Alert.alert('Data Error', 'Failed to subscribe to products: ' + error.message);
    });
};

export const subscribeToCategories = (callback: (categories: Category[]) => void) => {
    const q = query(getCollectionRef('categories'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        callback(categories);
    }, (error) => {
        console.error("Error subscribing to categories:", error);
        Alert.alert('Data Error', 'Failed to subscribe to categories: ' + error.message);
    });
};

export const subscribeToRestaurantConfig = (restaurantId: string, callback: (config: RestaurantSettings) => void) => {
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
    // Construct updates object
    const updates: any = {};
    Object.keys(settings).forEach(key => {
        updates[`settings.${key}`] = settings[key as keyof RestaurantSettings];
    });

    await updateDoc(docRef, updates);
};
