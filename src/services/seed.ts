import {
    collection,
    doc,
    setDoc,
    getDocs,
    deleteDoc,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Restaurant, MenuItem, Table } from '../types/firestore';

const RESTAURANT_ID = 'kiitos-main';

const INITIAL_MENU: MenuItem[] = [
    { id: '1', name: 'Classic Burger', price: 12.00, category: 'Main', available: true },
    { id: '2', name: 'Cheese Burger', price: 13.50, category: 'Main', available: true },
    { id: '3', name: 'Veggie Burger', price: 11.00, category: 'Main', available: true },
    { id: '4', name: 'Fries', price: 4.00, category: 'Side', available: true },
    { id: '5', name: 'Onion Rings', price: 5.00, category: 'Side', available: true },
    { id: '6', name: 'Coke', price: 2.50, category: 'Drink', available: true },
    { id: '7', name: 'Water', price: 2.00, category: 'Drink', available: true },
    { id: '8', name: 'Beer', price: 6.00, category: 'Drink', available: true },
    { id: '9', name: 'Chocolate Cake', price: 7.00, category: 'Dessert', available: true },
    { id: '10', name: 'Ice Cream', price: 5.00, category: 'Dessert', available: true },
];

export const seedDatabase = async () => {
    console.log('Starting database seed...');
    const batch = writeBatch(db);

    // 1. Clear existing collections (Tables, Sessions, Orders)
    // Note: In a real app, be careful with this!
    const tablesSnap = await getDocs(collection(db, 'tables'));
    tablesSnap.forEach(doc => batch.delete(doc.ref));

    const sessionsSnap = await getDocs(collection(db, 'sessions'));
    sessionsSnap.forEach(doc => batch.delete(doc.ref));

    const ordersSnap = await getDocs(collection(db, 'orders'));
    ordersSnap.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    console.log('Cleared existing data.');

    // 2. Create Restaurant Config
    const restaurantRef = doc(db, 'restaurants', RESTAURANT_ID);
    await setDoc(restaurantRef, {
        id: RESTAURANT_ID,
        name: 'Kiitos Diner',
        menu: INITIAL_MENU,
        tables: 5
    });
    console.log('Created Restaurant config.');

    // 3. Create Tables
    for (let i = 1; i <= 5; i++) {
        const tableRef = doc(collection(db, 'tables'));
        const tableData: Omit<Table, 'id'> = {
            name: `Table ${i}`,
            status: 'available',
            currentSessionId: null,
            position: { x: 0, y: 0 }
        };
        await setDoc(tableRef, tableData);
    }
    console.log('Created 5 Tables.');

    // 4. Create Users
    const users = [
        { id: 'admin-user', name: 'Admin User', email: 'admin@kiitos.com', role: 'admin' },
        { id: 'waiter-user', name: 'Waiter User', email: 'waiter@kiitos.com', role: 'waiter' },
        { id: 'kitchen-user', name: 'Kitchen User', email: 'kitchen@kiitos.com', role: 'kitchen' },
        { id: 'cashier-user', name: 'Cashier User', email: 'cashier@kiitos.com', role: 'cashier' }
    ];

    for (const user of users) {
        await setDoc(doc(db, 'users', user.id), user);
    }
    console.log('Created Users.');

    return true;
};
