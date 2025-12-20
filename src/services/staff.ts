import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { StaffMember, StaffRole } from '../types/firestore';

const getStaffCollectionRef = (restaurantId: string) =>
    collection(db, 'restaurants', restaurantId, 'staff');

const getStaffDocRef = (restaurantId: string, staffId: string) =>
    doc(db, 'restaurants', restaurantId, 'staff', staffId);

// ============================================
// VALIDATION
// ============================================

export const validatePinUnique = async (
    restaurantId: string,
    pin: string,
    excludeId?: string
): Promise<boolean> => {
    const q = query(
        getStaffCollectionRef(restaurantId),
        where('pin_code', '==', pin),
        where('active', '==', true)
    );

    const snapshot = await getDocs(q);

    // If excludeId is provided (editing), filter it out
    if (excludeId) {
        return !snapshot.docs.some(doc => doc.id !== excludeId);
    }

    return snapshot.empty;
};

export const validateStaffPin = async (
    restaurantId: string,
    pin: string
): Promise<StaffMember | null> => {
    const q = query(
        getStaffCollectionRef(restaurantId),
        where('pin_code', '==', pin),
        where('active', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    // Return the first match (PINs should be unique)
    const doc = snapshot.docs[0];
    return {
        id: doc.id,
        ...doc.data()
    } as StaffMember;
};

// ============================================
// CRUD OPERATIONS
// ============================================

export const subscribeToStaff = (
    restaurantId: string,
    callback: (staff: StaffMember[]) => void
) => {
    const q = query(
        getStaffCollectionRef(restaurantId),
        orderBy('joined_at', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const staff = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as StaffMember));
        callback(staff);
    });
};

export const createStaffMember = async (
    restaurantId: string,
    data: Omit<StaffMember, 'id' | 'joined_at'>
) => {
    // Validate PIN uniqueness
    const isUnique = await validatePinUnique(restaurantId, data.pin_code);
    if (!isUnique) {
        throw new Error('PIN code already exists. Please choose a different PIN.');
    }

    const staffData = {
        ...data,
        joined_at: serverTimestamp(),
        active: true // Always start as active
    };

    return await addDoc(getStaffCollectionRef(restaurantId), staffData);
};

export const updateStaffMember = async (
    restaurantId: string,
    staffId: string,
    updates: Partial<Omit<StaffMember, 'id' | 'joined_at'>>
) => {
    // If updating PIN, validate uniqueness
    if (updates.pin_code) {
        const isUnique = await validatePinUnique(restaurantId, updates.pin_code, staffId);
        if (!isUnique) {
            throw new Error('PIN code already exists. Please choose a different PIN.');
        }
    }

    await updateDoc(getStaffDocRef(restaurantId, staffId), updates);
};

export const toggleStaffActive = async (
    restaurantId: string,
    staffId: string,
    active: boolean
) => {
    await updateDoc(getStaffDocRef(restaurantId, staffId), { active });
};

export const deleteStaffMember = async (
    restaurantId: string,
    staffId: string
) => {
    // Hard delete - use toggleStaffActive for soft delete
    await deleteDoc(getStaffDocRef(restaurantId, staffId));
};

export const getStaff = async (restaurantId: string): Promise<StaffMember[]> => {
    const snap = await getDocs(getStaffCollectionRef(restaurantId));
    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as StaffMember));
};

// ============================================
// UTILITIES
// ============================================

export const generateRandomPin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};
