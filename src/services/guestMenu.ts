
import { collection, query, orderBy, onSnapshot, getDocs, doc, getDoc, runTransaction, serverTimestamp, where, limit, addDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Product, Category, Table, Session, OrderItem } from '../types/firestore';

const getCollectionRef = (restaurantId: string, subcollection: string) =>
    collection(db, 'restaurants', restaurantId, subcollection);

export const subscribeToGuestCategories = (restaurantId: string, callback: (categories: Category[]) => void) => {
    const q = query(getCollectionRef(restaurantId, 'categories'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        callback(categories);
    }, (error) => {
        console.error("Error subscribing to guest categories:", error);
    });
};

export const subscribeToGuestProducts = (restaurantId: string, callback: (products: Product[]) => void) => {
    const q = query(getCollectionRef(restaurantId, 'products'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        callback(products);
    }, (error) => {
        console.error("Error subscribing to guest products:", error);
    });
};

export const getTableDetails = async (restaurantId: string, tableId: string): Promise<Table | null> => {
    try {
        const docRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as Table;
        }
        return null;
    } catch (e) {
        console.error("Error fetching table details:", e);
        return null;
    }
};

export const getRestaurantConfig = async (restaurantId: string) => {
    try {
        // Assuming config is in a 'config' doc or similar in the restaurant doc
        // For now, returning a mock or reading a specific doc if defined in your schema
        // Based on previous chats, config might be in 'settings' field of restaurant doc
        const docRef = doc(db, 'restaurants', restaurantId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            const data = snapshot.data();
            return { allow_guest_ordering: data.settings?.allow_guest_ordering ?? false };
        }
        return { allow_guest_ordering: false };

    } catch (e) {
        console.error("Error fetching restaurant config:", e);
        return { allow_guest_ordering: false };
    }
};

export const sendOrderToKitchen = async (
    restaurantId: string,
    tableId: string,
    items: { product: Product, quantity: number, modifiers?: any[] }[],
    createdById?: string,  // Format: "guest-1", "waiter-1", etc.
    createdByName?: string, // Name of the person creating the order
    targetSessionId?: string // [NEW] Explicit session ID targeting
) => {
    if (items.length === 0) return;

    const isCounter = tableId === 'counter';
    const tableRef = isCounter ? null : doc(db, 'restaurants', restaurantId, 'tables', tableId);

    await runTransaction(db, async (transaction) => {
        // ============================================
        // PHASE 1: ALL READS FIRST
        // ============================================

        let sessionId: string | null = targetSessionId || null;
        let tableData: Partial<Table> = { name: 'Counter' };

        if (!sessionId && !isCounter && tableRef) {
            // Read 1: Get table (Only if we don't have a target session)
            const tableDoc = await transaction.get(tableRef);
            if (!tableDoc.exists()) throw new Error("Table not found");
            tableData = tableDoc.data() as Table;
            sessionId = tableData.active_session_id || null;
        }

        let currentSession: Session | null = null;

        // Read 2: Get or prepare session reference
        if (!sessionId) {
            // Will create new session - no existing session to read
            const newSessionRef = doc(collection(db, 'restaurants', restaurantId, 'sessions'));
            sessionId = newSessionRef.id;
        } else {
            // Read existing session
            const sessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId);
            const sessionDoc = await transaction.get(sessionRef);
            if (sessionDoc.exists()) {
                currentSession = sessionDoc.data() as Session;
            }
        }

        // ============================================
        // PHASE 2: CALCULATE (No DB operations)
        // ============================================

        const createdBy = createdById?.startsWith('waiter') ? 'waiter' : 'guest';

        const orderItems: OrderItem[] = items.map((item, idx) => ({
            id: item.product.id,
            session_id: sessionId!,
            product_id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            status: 'sent',
            created_by: createdBy,
            created_by_id: createdById || 'guest-1',
            created_by_name: createdByName,
            modifiers: item.modifiers || [],
            paid_quantity: 0  // Initialize to 0
        }));


        // Calculate totals including modifiers
        const newItemsSubtotal = orderItems.reduce((sum, item) => {
            const modifiersTotal = item.modifiers?.reduce((mSum, mod) => mSum + mod.price, 0) || 0;
            return sum + ((item.price + modifiersTotal) * item.quantity);
        }, 0);
        const newItemsTax = newItemsSubtotal * 0.00; // 0% tax for now
        const newItemsTotal = newItemsSubtotal + newItemsTax;

        console.log('🔵 [sendOrderToKitchen] Calculated totals:', {
            newItemsSubtotal,
            newItemsTax,
            newItemsTotal,
            sessionExists: !!currentSession
        });

        // ============================================
        // PHASE 3: ALL WRITES
        // ============================================

        // Write 1: Create/Update Session if needed
        if (!currentSession) {
            // Create new session
            const newSessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId!);
            const newSession: Partial<Session> = {
                restaurantId,
                tableId,
                tableName: tableData.name || 'Counter',
                status: 'active',
                startTime: serverTimestamp() as any,
                total: newItemsTotal,
                subtotal: newItemsSubtotal,
                tax: newItemsTax,
                remaining_amount: newItemsTotal,
                amount_paid: 0,
                paidAmount: 0,
                paymentStatus: 'unpaid',
                items: orderItems
            };

            transaction.set(newSessionRef, newSession);

            // Link session to table AND mark as occupied (since we have orders)
            if (!isCounter && tableRef) {
                transaction.update(tableRef, {
                    active_session_id: sessionId,
                    status: 'occupied',
                    currentSessionId: sessionId,
                    current_session_total: newItemsTotal
                });
            }
        } else {
            // Update existing session
            const sessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId!);
            const currentItems = currentSession.items || [];
            const updatedItems = [...currentItems, ...orderItems];
            const newSessionTotal = (currentSession.total || 0) + newItemsTotal;

            transaction.update(sessionRef, {
                items: updatedItems,
                subtotal: (currentSession.subtotal || 0) + newItemsSubtotal,
                tax: (currentSession.tax || 0) + newItemsTax,
                total: newSessionTotal,
                remaining_amount: (currentSession.remaining_amount || 0) + newItemsTotal
            });

            // Sync total to Table and ensure it is occupied
            if (!isCounter && tableRef) {
                transaction.update(tableRef, {
                    current_session_total: newSessionTotal,
                    status: 'occupied' // Ensure it's occupied just in case
                });
            }

            console.log('✅ [sendOrderToKitchen] Session updated:', {
                newTotal: newSessionTotal,
                newRemaining: (currentSession.remaining_amount || 0) + newItemsTotal
            });
        }

        // Write 2: Create Order document
        const orderRef = doc(collection(db, 'restaurants', restaurantId, 'orders'));
        transaction.set(orderRef, {
            restaurantId,
            sessionId,
            tableId,
            tableName: tableData.name || 'Counter',
            items: orderItems,
            status: 'sent',
            createdAt: serverTimestamp()
        });

        console.log('✅ [sendOrderToKitchen] Order created with', orderItems.length, 'items');
    });
};

export const subscribeToActiveSession = (restaurantId: string, tableId: string, callback: (items: OrderItem[], total: number, sessionId: string | null, session?: Session) => void) => {
    // Strategy: Listen to the Table to get active_session_id. 
    // Then Listen to 'orders' collection where sessionId matches.

    if (tableId === 'counter') {
        // For counter sessions, we don't have a stable table doc to find the active_session_id.
        // However, in cashier mode, we usually already have the sessionId.
        // If we don't have it, we just wait.
        return () => { }; // No-op subscription for counter if table-based
    }

    // 1. Listen to Table
    const tableRef = doc(db, 'restaurants', restaurantId, 'tables', tableId);
    return onSnapshot(tableRef, (tableSnap) => {
        const tableData = tableSnap.data() as Table;
        const sessionId = tableData?.active_session_id;

        if (!sessionId) {
            callback([], 0, null);
            return;
        }

        // 2. Listen to the Session document itself (for staff, status, etc.)
        const sessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId);
        const unsubSession = onSnapshot(sessionRef, (sessionSnap) => {
            const sessionData = sessionSnap.exists() ? { id: sessionSnap.id, ...sessionSnap.data() } as Session : undefined;

            // 3. Listen to Orders for this Session
            const q = query(
                collection(db, 'restaurants', restaurantId, 'orders'),
                where('sessionId', '==', sessionId),
                orderBy('createdAt', 'desc')
            );

            const unsubOrders = onSnapshot(q, (snapshot) => {
                let allItems: OrderItem[] = [];
                let total = 0;

                snapshot.docs.forEach(doc => {
                    const orderData = doc.data();
                    const items = orderData.items as OrderItem[];
                    items.forEach(item => {
                        // Inject status from order if not on item
                        const itemWithStatus = { ...item, status: item.status || orderData.status || 'sent' };
                        allItems.push(itemWithStatus);

                        // Calculate total including modifiers
                        const modifiersTotal = item.modifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;
                        total += (item.price + modifiersTotal) * item.quantity;
                    });
                });

                callback(allItems, total, sessionId, sessionData);
            });

            return unsubOrders;
        });

        return unsubSession;
    });
};
