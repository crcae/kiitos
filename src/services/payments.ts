import {
    collection,
    doc,
    addDoc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    runTransaction,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Payment, PaymentMethod, Session, PaymentItem, OrderItem } from '../types/firestore';

/**
 * Records a payment for a session with optional tip and item breakdown
 */
export const recordPayment = async (
    restaurantId: string,
    sessionId: string,
    amount: number,
    method: PaymentMethod,
    createdBy: string = 'guest', // was optional, now default 'guest'
    tip?: number,
    items?: PaymentItem[]
): Promise<void> => {
    console.log('🔵 [recordPayment] INICIANDO PAGO:', {
        restaurantId,
        sessionId,
        amount,
        method,
        createdBy,
        tip,
        items
    });

    if (!restaurantId || !sessionId) {
        console.error('❌ [recordPayment] ERROR: Missing restaurantId or sessionId', { restaurantId, sessionId });
        throw new Error('restaurantId y sessionId son requeridos');
    }

    const sessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId);
    console.log('🔵 [recordPayment] Session path:', sessionRef.path);

    try {
        await runTransaction(db, async (transaction) => {
            console.log('🔵 [recordPayment] Iniciando transacción...');

            const sessionDoc = await transaction.get(sessionRef);

            if (!sessionDoc.exists()) {
                console.error('❌ [recordPayment] Session not found:', sessionId);
                throw new Error('Session not found');
            }

            const session = sessionDoc.data() as Session;
            console.log('🔵 [recordPayment] Session data:', {
                total: session.total,
                amount_paid: session.amount_paid,
                status: session.status
            });

            // CRITICAL: Backend validation - prevent overpayment
            const currentlyPaid = session.amount_paid || 0;
            const total = session.total || 0; // Keep total for calculations
            const remaining = session.remaining_amount || (total - currentlyPaid);

            console.log('🔵 [recordPayment] Session state:', {
                total: session.total,
                amount_paid: session.amount_paid,
                remaining,
                requestedAmount: amount,
                requestedTip: tip
            });

            // CRITICAL: Validate ONLY the bill amount (without tip) against remaining
            // Tip is a bonus and doesn't count toward the debt
            let actualAmount = amount;
            if (amount > remaining) {
                console.warn(`⚠️ [recordPayment] Bill amount ($${amount}) exceeds remaining ($${remaining}). Capping to remaining.`);
                actualAmount = remaining;
            }

            console.log('🔵 [recordPayment] Processing payment:', {
                billAmount: actualAmount,
                tip: tip || 0,
                totalCharge: actualAmount + (tip || 0)
            });

            // Update session: add ONLY the bill amount to amount_paid (NOT the tip)
            const newAmountPaid = (session.amount_paid || 0) + actualAmount;
            const newRemaining = Math.max(0, (session.total || 0) - newAmountPaid);
            const totalPayment = actualAmount + (tip || 0); // Define totalPayment here

            console.log('🔵 [recordPayment] New session state:', {
                newAmountPaid,
                newRemaining,
                tipNotIncluded: tip || 0
            });

            console.log('🔵 [recordPayment] Cálculos:', {
                totalPayment,
                newAmountPaid,
                total,
                remaining: newRemaining,
                actualAmountCharged: actualAmount
            });

            // Create payment record in subcollection
            const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', sessionId, 'payments');
            console.log('🔵 [recordPayment] Payments collection path:', paymentsRef.path);

            // Create payment record with BOTH amount and tip stored separately
            const paymentData: any = {
                sessionId,
                amount: actualAmount,  // Bill amount only (what reduces the debt)
                method,
                createdAt: serverTimestamp()
            };

            // Add optional fields only if they exist
            if (tip && tip > 0) paymentData.tip = tip;  // Tip stored separately
            if (createdBy) paymentData.createdBy = createdBy;
            if (items && items.length > 0) paymentData.items = items;

            const paymentRef = doc(paymentsRef);
            transaction.set(paymentRef, paymentData);

            console.log('✅ [recordPayment] Payment record created:', {
                paymentId: paymentRef.id,
                billAmount: actualAmount,
                tip: tip || 0,
                totalCharge: actualAmount + (tip || 0)
            });

            // Determine session status based on bill payment (not including tip)
            let newStatus: 'active' | 'closed' | 'partial_payment' = 'active';
            let newPaymentStatus: 'unpaid' | 'paid' | 'partial' = 'unpaid';

            if (newAmountPaid >= total) {
                newStatus = 'closed';
                newPaymentStatus = 'paid';
            } else if (newAmountPaid > 0) {
                newStatus = 'partial_payment';
                newPaymentStatus = 'partial';
            }

            console.log('🔵 [recordPayment] New status:', { newStatus, newPaymentStatus });

            const sessionUpdates: any = {
                amount_paid: newAmountPaid,
                paidAmount: newAmountPaid,
                remaining_amount: newRemaining,
                status: newStatus,
                paymentStatus: newPaymentStatus,
                ...(newStatus === 'closed' && { endTime: serverTimestamp() }),
                [`payment_breakdown.${method}`]: (session.payment_breakdown?.[method as keyof typeof session.payment_breakdown] || 0) + actualAmount
            };

            // Update OrderItems if specific items were paid
            // Note: We can't query inside transaction, so we'll update session.items directly
            if (items && items.length > 0) {
                console.log('🔵 [recordPayment] Updating item paid_quantity in session...');

                const sessionItems = session.items || [];
                const updatedSessionItems = sessionItems.map((item: OrderItem) => {
                    const paymentItem = items.find(pi => pi.item_id === item.id);
                    if (paymentItem) {
                        console.log(`🔵 [recordPayment] Updating item ${item.id}: paid_quantity ${item.paid_quantity || 0} + ${paymentItem.quantity_paid}`);
                        return {
                            ...item,
                            paid_quantity: (item.paid_quantity || 0) + paymentItem.quantity_paid,
                            payment_ids: [...(item.payment_ids || []), paymentRef.id]
                        };
                    }
                    return item;
                });

                // Update session items with paid quantities
                sessionUpdates.items = updatedSessionItems;
            }

            console.log('🔵 [recordPayment] Updating session:', sessionUpdates);
            transaction.update(sessionRef, sessionUpdates);

            // CRITICAL: Only release table if FULLY paid (with tolerance for rounding)
            const isFullyPaid = newRemaining <= 0.01; // 1 cent tolerance
            if (newStatus === 'closed' && isFullyPaid && session.tableId && session.tableId !== 'counter') {
                console.log('🔵 [recordPayment] Session FULLY PAID, releasing table:', session.tableId);
                const tableRef = doc(db, 'restaurants', restaurantId, 'tables', session.tableId);
                transaction.update(tableRef, {
                    active_session_id: null,
                    currentSessionId: null,
                    status: 'available',
                    updatedAt: serverTimestamp()
                });
                console.log('✅ [recordPayment] Table released:', session.tableId);
            } else if (newStatus === 'partial_payment') {
                console.log('💰 [recordPayment] Partial payment - table remains occupied. Remaining: $' + newRemaining.toFixed(2));
            }

            console.log('✅ [recordPayment] Transaction complete!');
        });

        console.log('✅✅✅ [recordPayment] PAGO REGISTRADO EXITOSAMENTE');
    } catch (error) {
        console.error('❌❌❌ [recordPayment] ERROR EN TRANSACCIÓN:', error);
        throw error;
    }
};

/**
 * Record payment by specific items
 */
export const recordItemPayment = async (
    restaurantId: string,
    sessionId: string,
    items: Array<{ item_id: string; quantity: number; price: number }>,
    method: 'cash' | 'card' | 'stripe' | 'other',
    createdBy: string,
    tip: number = 0
): Promise<void> => {
    console.log('🔵 [recordItemPayment] INICIANDO PAGO POR ITEMS:', {
        restaurantId,
        sessionId,
        items,
        method,
        createdBy,
        tip
    });

    if (!restaurantId || !sessionId) {
        throw new Error('restaurantId y sessionId son requeridos');
    }

    const sessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId);

    try {
        await runTransaction(db, async (transaction) => {
            const sessionDoc = await transaction.get(sessionRef);

            if (!sessionDoc.exists()) {
                throw new Error('Sesión no encontrada');
            }

            const session = sessionDoc.data() as Session;

            // Calculate bill amount (items only, without tip)
            const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const totalCharge = itemsTotal + tip;  // Total charge to card
            const newAmountPaid = (session.amount_paid || 0) + itemsTotal;  // Only bill amount
            const total = session.total || 0;
            const newRemaining = Math.max(0, total - newAmountPaid);

            console.log('🔵 [recordItemPayment] Calculando totales:', {
                itemsTotal,  // Bill amount
                tip,  // Tip (bonus, not part of debt)
                totalCharge,  // Total charge to card
                currentPaid: session.amount_paid || 0,
                newAmountPaid,  // Updated debt payment (no tip)
                total,
                newRemaining
            });

            // CRITICAL: Validate ONLY items total (without tip) against remaining
            // Tip can exceed the remaining - it's a bonus
            const remaining = session.remaining_amount || (total - (session.amount_paid || 0));
            if (itemsTotal > remaining + 0.01) {
                console.warn(`⚠️ [recordItemPayment] Items total ($${itemsTotal}) exceeds remaining ($${remaining})`);
                throw new Error(`El monto de items ($${itemsTotal.toFixed(2)}) excede el saldo restante ($${remaining.toFixed(2)}). Por favor ajusta tu selección.`);
            }

            // Create payment record
            const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', sessionId, 'payments');

            const paymentItems: PaymentItem[] = items.map(item => ({
                item_id: item.item_id,
                quantity_paid: item.quantity,
                price: item.price,
                amount: item.price * item.quantity
            }));

            const paymentData: any = {
                sessionId,
                amount: itemsTotal,
                method,
                items: paymentItems,
                createdAt: serverTimestamp()
            };

            if (tip > 0) paymentData.tip = tip;
            if (createdBy) paymentData.createdBy = createdBy;

            const paymentRef = doc(paymentsRef);
            transaction.set(paymentRef, paymentData);
            console.log('✅ [recordItemPayment] Payment record creado:', paymentRef.id);

            // CRITICAL: Update session.items array with paid_quantity
            // We must track remaining quantity to pay for each item ID to avoid applying payment to multiple rows
            const quantityToPayMap = new Map<string, number>();
            items.forEach(i => {
                const current = quantityToPayMap.get(i.item_id) || 0;
                quantityToPayMap.set(i.item_id, current + i.quantity);
            });

            const currentItems = session.items || [];
            const updatedItems = currentItems.map((sessionItem: OrderItem) => {
                const qtyRemainingToPay = quantityToPayMap.get(sessionItem.id);

                if (qtyRemainingToPay && qtyRemainingToPay > 0) {
                    // Calculate how much we can pay on this specific row
                    // We can't pay more than the item's quantity
                    // We can't pay more than what's remaining in our payment balance
                    const unpaidQtyInRow = sessionItem.quantity - (sessionItem.paid_quantity || 0);

                    // How much of the payment applies to this row?
                    const amountToApply = Math.min(qtyRemainingToPay, unpaidQtyInRow);

                    if (amountToApply > 0) {
                        const newPaidQuantity = (sessionItem.paid_quantity || 0) + amountToApply;
                        console.log(`🔵 [recordItemPayment] Actualizando item ${sessionItem.id} (row): paid_quantity ${sessionItem.paid_quantity || 0} → ${newPaidQuantity}`);

                        // Decrement our running balance
                        quantityToPayMap.set(sessionItem.id, qtyRemainingToPay - amountToApply);

                        return {
                            ...sessionItem,
                            paid_quantity: newPaidQuantity,
                            payment_ids: [...(sessionItem.payment_ids || []), paymentRef.id]
                        };
                    }
                }
                return sessionItem;
            });

            // Update session status
            let newStatus: 'active' | 'closed' | 'partial_payment' = 'active';
            let newPaymentStatus: 'unpaid' | 'paid' | 'partial' = 'unpaid';

            if (newAmountPaid >= total) {
                newStatus = 'closed';
                newPaymentStatus = 'paid';
            } else if (newAmountPaid > 0) {
                newStatus = 'partial_payment';
                newPaymentStatus = 'partial';
            }

            const sessionUpdates: any = {
                items: updatedItems,  // CRITICAL: Update the items array
                amount_paid: newAmountPaid,
                paidAmount: newAmountPaid,
                remaining_amount: newRemaining,
                status: newStatus,
                paymentStatus: newPaymentStatus,
                ...(newStatus === 'closed' && { endTime: serverTimestamp() }),
                [`payment_breakdown.${method}`]: (session.payment_breakdown?.[method as keyof typeof session.payment_breakdown] || 0) + itemsTotal
            };

            console.log('🔵 [recordItemPayment] Actualizando sesión con items:', {
                totalItems: updatedItems.length,
                newStatus,
                newAmountPaid,
                newRemaining,
                itemsIncluded: 'items' in sessionUpdates,
                firstItemPaidQty: updatedItems[0]?.paid_quantity
            });

            console.log('🔵🔵🔵 [recordItemPayment] Session updates object:', JSON.stringify({
                itemsCount: updatedItems.length,
                firstItem: updatedItems[0] ? {
                    id: updatedItems[0].id,
                    name: updatedItems[0].name,
                    paid_quantity: updatedItems[0].paid_quantity
                } : null,
                hasItems: !!sessionUpdates.items
            }, null, 2));

            transaction.update(sessionRef, sessionUpdates);

            console.log('✅✅✅ [recordItemPayment] Transaction.update CALLED with items array!');

            // Release table if fully paid
            const isFullyPaid = newRemaining <= 0.01;
            if (newStatus === 'closed' && isFullyPaid && session.tableId && session.tableId !== 'counter') {
                console.log('🔵 [recordItemPayment] Sesión completamente pagada, liberando mesa:', session.tableId);
                const tableRef = doc(db, 'restaurants', restaurantId, 'tables', session.tableId);
                transaction.update(tableRef, {
                    active_session_id: null,
                    currentSessionId: null,
                    status: 'available',
                    updatedAt: serverTimestamp()
                });
            }

            console.log('✅ [recordItemPayment] Transacción completada exitosamente');
        });

        console.log('✅✅✅ [recordItemPayment] PAGO DE ITEMS REGISTRADO EXITOSAMENTE');
    } catch (error) {
        console.error('❌❌❌ [recordItemPayment] ERROR:', error);
        throw error;
    }
};

/**
 * Get payment summary for a session
 */
export const getPaymentSummary = async (
    restaurantId: string,
    sessionId: string
): Promise<{
    total: number;
    amount_paid: number;
    remaining: number;
    payments: Payment[];
}> => {
    const sessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
        throw new Error('Session not found');
    }

    const session = sessionDoc.data() as Session;

    // Get all payments
    const paymentsRef = collection(db, 'restaurants', restaurantId, 'sessions', sessionId, 'payments');
    const paymentsSnapshot = await getDocs(paymentsRef);
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));

    return {
        total: session.total || 0,
        amount_paid: session.amount_paid || 0,
        remaining: session.remaining_amount || (session.total - (session.amount_paid || 0)),
        payments
    };
};

/**
 * Calculate remaining amount for a session
 */
export const calculateRemainingAmount = (session: Session): number => {
    return Math.max(0, session.total - (session.amount_paid || 0));
};

/**
 * Get session balance
 */
export const getSessionBalance = async (
    restaurantId: string,
    sessionId: string
): Promise<{ total: number; paid: number; remaining: number }> => {
    const sessionRef = doc(db, 'restaurants', restaurantId, 'sessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (!sessionDoc.exists()) {
        throw new Error('Session not found');
    }

    const session = sessionDoc.data() as Session;
    const total = session.total || 0;
    const paid = session.amount_paid || 0;
    const remaining = Math.max(0, total - paid);

    return { total, paid, remaining };
};
