import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { LogOut, Receipt, CreditCard, Banknote, Clock, RotateCcw, Search, Utensils, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router'; // Updated for Navigation
import { subscribeToActiveSessions, markSessionPaid, subscribeToDailyPaidSessions, createSession } from '../../src/services/sessions';
import { subscribeToTables } from '../../src/services/tables';
import { subscribeToActivePickupOrders } from '../../src/services/pickupOrders';
import { Session, OrderItem, Table, PickupOrder } from '../../src/types/firestore';
import AirbnbButton from '../../src/components/AirbnbButton';
import { colors, spacing, typography, shadows, borderRadius } from '../../src/styles/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useRestaurant } from '../../src/hooks/useRestaurant';
import PaymentInterface from '../../src/components/PaymentInterface';
import DigitalMenuInterface from '../../src/components/DigitalMenuInterface';
import { Timestamp } from 'firebase/firestore'; // Import needed for mock data



export default function CashierStatusScreen() {
    const router = useRouter(); // Initialize Router

    // STATE: Active Sessions (Real)
    const [realSessions, setRealSessions] = useState<Session[]>([]);
    const [pickupOrders, setPickupOrders] = useState<PickupOrder[]>([]);

    // STATE: All Tables (for New Table feature)
    const [allTables, setAllTables] = useState<Table[]>([]);

    const [historySessions, setHistorySessions] = useState<Session[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null); // [LIVE DATA FIX] Store only ID
    const [selectedPickupOrderId, setSelectedPickupOrderId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'preorders' | 'history'>('active');



    // Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showTableSelector, setShowTableSelector] = useState(false); // Renamed: Table Selection Modal
    const [newTableId, setNewTableId] = useState<string | null>(null); // For creating new orders
    const [newTableName, setNewTableName] = useState<string>('');

    const { signOut, user } = useAuth();
    const { restaurant } = useRestaurant();
    const restaurantId = user?.restaurantId || 'kiitos-main';

    useEffect(() => {
        // Subscribe to Active Sessions
        const unsubscribeActive = subscribeToActiveSessions(setRealSessions, restaurantId);

        // Subscribe to Today's History
        const unsubscribeHistory = subscribeToDailyPaidSessions(restaurantId, setHistorySessions);

        // Subscribe to ALL Tables
        const unsubscribeTables = subscribeToTables(restaurantId, setAllTables);

        // Subscribe to Active Preorders (Pickup Orders)
        const unsubscribePickup = subscribeToActivePickupOrders(restaurantId, setPickupOrders);

        return () => {
            unsubscribeActive();
            unsubscribeHistory();
            unsubscribeTables();
            unsubscribePickup();
        };
    }, [restaurantId]);

    // [FIX] Table Inventory & Capacity Logic (Connecting REAL Firestore data)
    // Filter out "Zombie Sessions" that don't belong to a real table
    const validSessions = realSessions.filter(session =>
        allTables.some(t => t.id === session.tableId)
    );

    const activeTableIds = new Set(validSessions.map(s => s.tableId));
    const availableTables = allTables
        .filter(table => !activeTableIds.has(table.id))
        .sort((a, b) => {
            const nameA = a.name || a.id || '';
            const nameB = b.name || b.id || '';
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        });

    const capacityLabelColor = activeTableIds.size >= allTables.length && allTables.length > 0
        ? '#ff4444'
        : (activeTableIds.size > 0 ? colors.roastedSaffron : colors.albahaca);

    // Calculate selectedSession from live validSessions array
    const selectedSession = validSessions.find(session => session.id === selectedSessionId) || null;

    // Calculate selectedPickupOrder from live pickupOrders array
    const selectedPickupOrder = pickupOrders.find(order => order.id === selectedPickupOrderId) || null;

    // Combined selection for Detail Panel
    const detailData = selectedSession || selectedPickupOrder;
    const isPickupSelected = !!selectedPickupOrder;

    // Handler: Start new order on an available table
    const handleStartNewOrder = async (table: any) => {
        try {
            console.log('🆕 [handleStartNewOrder] Creating live session for table:', table.name);

            // 1. Create live session directly in Firestore
            const sessionId = await createSession(restaurantId, table.id, table.name);

            // 2. Set the ID to track it live
            setSelectedSessionId(sessionId);

            // 3. UI Updates
            setShowTableSelector(false);
            setShowMenuModal(true);

            console.log('✅ [handleStartNewOrder] UI transitioned to menu for session:', sessionId);
        } catch (error) {
            console.error('❌ [handleStartNewOrder] Error:', error);
            Alert.alert('Error', 'Failed to create session');
        }
    };

    // Handler: Switch from Menu to Payment (Unify workflow)
    const handleSwitchToPayment = () => {
        console.log('💳 [handleSwitchToPayment] Switching from Menu to Payment');
        setShowMenuModal(false);
        // Small delay to allow modal animation to clear before opening next one
        setTimeout(() => {
            setShowPaymentModal(true);
        }, 300);
    };

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            Alert.alert('Error', 'Failed to log out');
        }
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setSelectedSessionId(null); // [LIVE DATA FIX] Use ID setter
    };

    const handleMenuClose = () => {
        setShowMenuModal(false);
        setNewTableId(null); // Reset new table state
        setNewTableName('');
        // In real mode, subscription updates automatically.
    };


    const handlePrintReceipt = (session: Session) => {
        if (Platform.OS === 'web') {
            const printWindow = window.open('', '', 'height=600,width=400');
            if (!printWindow) return;

            const logoUrl = restaurant?.logo || '';
            const dateStr = session.endTime ? new Date(session.endTime.seconds * 1000).toLocaleString() : new Date().toLocaleString();

            const itemsHtml = session.items.map(item => `
                <div class="item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('');

            const html = `
                <html>
                    <head>
                        <title>Receipt - ${restaurant?.name || 'Kiitos'}</title>
                        <style>
                            body { font-family: 'Courier New', monospace; padding: 20px; text-align: center; }
                            .header { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                            .logo { max-width: 80px; margin-bottom: 10px; }
                            .item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
                            .divider { border-top: 1px dashed #000; margin: 10px 0; }
                            .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px; }
                            .footer { margin-top: 20px; font-size: 12px; color: #555; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
                            <h2>${restaurant?.name || 'Kiitos Restaurant'}</h2>
                            <p>${dateStr}</p>
                            <p>Table: ${session.tableName || session.tableId}</p>
                            <p>Receipt #${session.qrCode.slice(-6)}</p>
                        </div>
                        <div class="items">
                            ${itemsHtml}
                        </div>
                        <div class="divider"></div>
                        <div class="total">
                            <span>TOTAL</span>
                            <span>$${session.total.toFixed(2)}</span>
                        </div>
                        <div class="footer">
                            <p>Thank you for dining with us!</p>
                            <p>Powered by Kiitos</p>
                        </div>
                        <script>
                            window.onload = function() { window.print(); window.close(); }
                        </script>
                    </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();
        } else {
            Alert.alert('Not Supported', 'Printing is currently only supported on Web.');
        }
    };

    const handleEditOrder = () => {
        if (!selectedSession) return;
        setShowMenuModal(true);
    };

    const handleProcessPayment = () => {
        if (!selectedSession) return;
        setShowPaymentModal(true);
    };

    // HEADER RENDER
    const renderHeader = () => (
        <View style={styles.header}>
            <View>
                <Text style={styles.headerTitle}>Cashier Dashboard</Text>
                <Text style={styles.headerSubtitle}>
                    {restaurant?.name || 'Loading...'} • Live Mode
                </Text>

                {/* CAPACITY COUNTER */}
                <View style={[styles.capacityBadge, { borderColor: capacityLabelColor }]}>
                    <View style={[styles.capacityDot, { backgroundColor: capacityLabelColor }]} />
                    <Text style={[styles.capacityText, { color: capacityLabelColor }]}>
                        {Math.min(activeTableIds.size, allTables.length)} (In Use) / {allTables.length} (Total)
                    </Text>
                </View>
            </View>

            {/* CENTRAL TABS */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'active' && styles.activeTab]}
                    onPress={() => { setActiveTab('active'); setSelectedSessionId(null); }}
                >
                    <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active Tables</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'preorders' && styles.activeTab]}
                    onPress={() => { setActiveTab('preorders'); setSelectedSessionId(null); setSelectedPickupOrderId(null); }}
                >
                    <Text style={[styles.tabText, activeTab === 'preorders' && styles.activeTabText]}>Preorders</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => { setActiveTab('history'); setSelectedSessionId(null); setSelectedPickupOrderId(null); }}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Daily History</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* + NEW ORDER BUTTON */}
                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: colors.albahaca }]}
                    onPress={() => setShowTableSelector(true)}
                >
                    <Plus size={18} color="white" />
                    <Text style={styles.logoutText}>New Order</Text>
                </TouchableOpacity>



                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="white" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderActiveSessionCard = ({ item }: { item: Session }) => (
        <TouchableOpacity
            style={[
                styles.card,
                selectedSession?.id === item.id && styles.selectedCard
            ]}
            onPress={() => setSelectedSessionId(item.id)} // [LIVE DATA FIX] Store only ID
        >
            <View style={styles.cardHeader}>
                <Text style={styles.tableTitle}>{item.tableName || `Table ${item.tableId}`}</Text>
                <View style={[styles.statusBadge, styles.unpaid]}>
                    <Text style={styles.statusText}>Active</Text>
                </View>
            </View>

            <View style={styles.cardInfo}>
                <Clock size={16} color={colors.gray} />
                <Text style={styles.timeText}>
                    {item.startTime ? new Date(item.startTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </Text>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.amount}>${item.total.toFixed(2)}</Text>
                <Text style={styles.itemCount}>{item.items.length} items</Text>
            </View>
        </TouchableOpacity>
    );

    const renderPickupOrderCard = ({ item }: { item: PickupOrder }) => (
        <TouchableOpacity
            style={[
                styles.card,
                selectedPickupOrderId === item.id && styles.selectedCard
            ]}
            onPress={() => setSelectedPickupOrderId(item.id)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.tableTitle}>{item.pickup_code}</Text>
                <View style={[styles.statusBadge, item.status === 'ready' ? styles.ready : styles.unpaid]}>
                    <Text style={[styles.statusText, item.status === 'ready' && { color: '#059669' }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View style={styles.cardInfo}>
                <Clock size={16} color={colors.gray} />
                <Text style={styles.timeText}>{item.customer_name || 'Guest'}</Text>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.amount}>${item.total.toFixed(2)}</Text>
                <Text style={styles.itemCount}>{item.items.length} items</Text>
            </View>
        </TouchableOpacity>
    );

    const renderHistoryItem = ({ item }: { item: Session }) => (
        <View style={styles.historyRow}>
            <View style={styles.historyInfo}>
                <Text style={styles.historyTable}>{item.tableName || `Table ${item.tableId}`}</Text>
                <Text style={styles.historyTime}>
                    {item.endTime ? new Date(item.endTime.seconds * 1000).toLocaleTimeString() : 'Unknown'}
                </Text>
            </View>
            <View style={styles.historyMeta}>
                <Text style={styles.historyAmount}>${item.total.toFixed(2)}</Text>
                <TouchableOpacity onPress={() => handlePrintReceipt(item)} style={styles.miniPrintBtn}>
                    <Receipt size={16} color={colors.gray} />
                </TouchableOpacity>
            </View>
        </View>
    );

    // Render Available Table Card (Grey/Ghost style)


    return (
        <View style={styles.container}>
            {/* TOP BAR */}
            {renderHeader()}


            {/* MAIN CONTENT SPLIT */}
            <View style={styles.splitLayout}>
                {/* LEFT PANEL: GRID */}
                <View style={styles.leftPanel}>
                    {activeTab === 'active' ? (
                        <FlatList
                            key="active-grid"
                            data={validSessions}
                            renderItem={({ item }) => renderActiveSessionCard({ item })}
                            keyExtractor={item => `session-${item.id}`}
                            numColumns={3}
                            contentContainerStyle={styles.gridContainer}
                            columnWrapperStyle={{ gap: spacing.md }}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIconBg}>
                                        <Clock size={40} color={colors.gray} />
                                    </View>
                                    <Text style={styles.emptyText}>No active orders</Text>
                                    <Text style={styles.emptySubtext}>New orders will appear here automatically.</Text>
                                </View>
                            }
                        />
                    ) : activeTab === 'preorders' ? (
                        <FlatList
                            key="preorders-grid"
                            data={pickupOrders}
                            renderItem={({ item }) => renderPickupOrderCard({ item })}
                            keyExtractor={item => `pickup-${item.id}`}
                            numColumns={3}
                            contentContainerStyle={styles.gridContainer}
                            columnWrapperStyle={{ gap: spacing.md }}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIconBg}>
                                        <Utensils size={40} color={colors.gray} />
                                    </View>
                                    <Text style={styles.emptyText}>No preorders yet</Text>
                                    <Text style={styles.emptySubtext}>Incoming takeout orders will show up here.</Text>
                                </View>
                            }
                        />
                    ) : (
                        <FlatList
                            key="history-list"
                            data={historySessions}
                            renderItem={renderHistoryItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContainer}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>No history for today</Text>
                                </View>
                            }
                        />
                    )}
                </View>

                {/* RIGHT PANEL: DETAILS */}
                <View style={styles.rightPanel}>
                    {detailData ? (
                        <View style={styles.detailContent}>
                            <View style={styles.detailHeader}>
                                <View>
                                    <Text style={styles.detailTitle}>
                                        {isPickupSelected
                                            ? (selectedPickupOrder?.customer_name || `Pickup ${selectedPickupOrder?.pickup_code}`)
                                            : (selectedSession?.tableName || `Table ${selectedSession?.tableId}`)
                                        }
                                    </Text>
                                    <Text style={styles.detailSubtitle}>
                                        {isPickupSelected
                                            ? `Code: ${selectedPickupOrder?.pickup_code}`
                                            : `Order #${selectedSession?.qrCode.slice(-6)}`
                                        }
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => handlePrintReceipt(detailData as any)} style={styles.printButton}>
                                    <Receipt size={20} color={colors.castIron} />
                                    <Text style={styles.printText}>Print</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.itemsList}>
                                {detailData.items.map((item, index) => (
                                    <View key={('id' in item ? item.id : item.product_id) + '-' + index} style={styles.itemRow}>
                                        <View style={styles.itemInfo}>
                                            <View style={styles.qtyBadge}>
                                                <Text style={styles.qtyText}>{item.quantity}</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.itemName}>{item.name}</Text>
                                                {/* @ts-ignore */}
                                                {item.notes ? <Text style={styles.itemNotes}>{item.notes}</Text> : null}
                                            </View>
                                        </View>
                                        <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                                    </View>
                                ))}
                            </ScrollView>

                            <View style={styles.footerSection}>
                                {(() => {
                                    // Defensive: Calculate totals from items if session totals are missing/zero
                                    const itemsTotal = detailData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                    const displaySubtotal = (detailData.subtotal || 0) > 0 ? detailData.subtotal : itemsTotal;
                                    const displayTax = (detailData.tax || 0) > 0 ? detailData.tax : displaySubtotal * 0.16;
                                    const displayTotal = (detailData.total || 0) > 0 ? detailData.total : (displaySubtotal + displayTax);

                                    return (
                                        <>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Subtotal</Text>
                                                <Text style={styles.summaryValue}>${displaySubtotal.toFixed(2)}</Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Tax</Text>
                                                <Text style={styles.summaryValue}>${displayTax.toFixed(2)}</Text>
                                            </View>
                                            {isPickupSelected && selectedPickupOrder?.payment_intent_id && (
                                                <View style={styles.summaryRow}>
                                                    <Text style={[styles.summaryLabel, { color: '#059669', fontWeight: 'bold' }]}>Paid Online</Text>
                                                    <Text style={[styles.summaryValue, { color: '#059669', fontWeight: 'bold' }]}>Yes</Text>
                                                </View>
                                            )}
                                            <View style={[styles.summaryRow, styles.totalRow]}>
                                                <Text style={styles.totalLabel}>Total</Text>
                                                <Text style={styles.totalValue}>${displayTotal.toFixed(2)}</Text>
                                            </View>
                                        </>
                                    );
                                })()}

                                {activeTab !== 'history' && (
                                    <View style={styles.actions}>
                                        {!isPickupSelected && (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.menuBtn]}
                                                onPress={handleEditOrder}
                                            >
                                                <Utensils size={24} color={colors.castIron} />
                                                <Text style={[styles.actionBtnText, { color: colors.castIron }]}>Edit Order</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.payBtn, (isPickupSelected && selectedPickupOrder?.payment_intent_id) && { backgroundColor: '#059669' }]}
                                            onPress={isPickupSelected && selectedPickupOrder?.payment_intent_id ? () => Alert.alert("Paid", "Order is already paid online.") : handleProcessPayment}
                                        >
                                            <CreditCard size={24} color="white" />
                                            <Text style={styles.actionBtnText}>
                                                {isPickupSelected && selectedPickupOrder?.payment_intent_id ? 'Paid Online' : 'Process Payment'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyDetail}>
                            <Text style={styles.emptyDetailText}>Select a table to view details</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* MODAL: EDIT ORDER or NEW ORDER (DigitalMenu) */}
            <Modal
                visible={showMenuModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleMenuClose}
            >
                {showMenuModal && selectedSession && (
                    <View style={{ flex: 1, backgroundColor: 'white' }}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedSession.tableName || 'Editar Orden'}
                            </Text>
                            <TouchableOpacity onPress={handleMenuClose} style={styles.closeModalBtn}>
                                <Text style={styles.closeModalText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                        <DigitalMenuInterface
                            key={`menu-${selectedSession.id}`}
                            restaurantId={restaurantId}
                            tableId={selectedSession.tableId}
                            sessionId={selectedSession.id}
                            mode="waiter"
                            directSessionData={selectedSession.items}
                            onSuccess={() => {
                                console.log('✅ [Cashier] Order updated successfully - live data will refresh automatically');
                            }}
                            onRequestPayment={handleSwitchToPayment}
                        />
                    </View>
                )}
            </Modal>

            {/* MODAL: PAYMENT (PaymentInterface) */}
            <Modal
                visible={showPaymentModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowPaymentModal(false)}
            >
                {showPaymentModal && selectedSession && (
                    <View style={{ flex: 1, backgroundColor: 'white' }}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Procesar Pago</Text>
                            <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.closeModalBtn}>
                                <Text style={styles.closeModalText}>Cerrar</Text>
                            </TouchableOpacity>
                        </View>
                        <PaymentInterface
                            key={`pay-${selectedSession.id}`}
                            sessionId={selectedSession.id}
                            restaurantId={restaurantId}
                            mode="waiter"
                            onClose={() => setShowPaymentModal(false)}
                            onPaymentSuccess={handlePaymentSuccess}
                            directSessionData={selectedSession} // Inject Data
                        />
                    </View>
                )}
            </Modal>

            {/* MODAL: TABLE SELECTION (For New Orders) */}
            <Modal
                visible={showTableSelector}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowTableSelector(false)}
            >
                <View style={styles.tableSelectOverlay}>
                    <View style={styles.tableSelectModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Table for New Order</Text>
                            <TouchableOpacity onPress={() => setShowTableSelector(false)} style={styles.closeModalBtn}>
                                <Text style={styles.closeModalText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        {availableTables.length === 0 ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text style={{ color: colors.gray, fontSize: 16 }}>All tables are currently occupied.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={availableTables}
                                keyExtractor={(item) => item.id}
                                numColumns={4}
                                contentContainerStyle={{ padding: spacing.md }}
                                columnWrapperStyle={{ gap: spacing.md }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.tableSelectorBtn}
                                        onPress={() => handleStartNewOrder(item)}
                                    >
                                        <Text style={styles.tableSelectorId}>{item.name || `Table ${item.id}`}</Text>
                                        <Text style={styles.tableSelectorStatus}>Available</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.oatCream,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
        ...shadows.sm,
        zIndex: 10,
    },
    brandSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xl,
    },
    brandSubtitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.offWhite,
        borderRadius: borderRadius.lg,
        padding: 4,
    },
    tab: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
    },
    activeTab: {
        backgroundColor: colors.white,
        ...shadows.sm,
    },
    tabText: {
        color: colors.gray,
        fontWeight: typography.medium,
    },
    activeTabText: {
        color: colors.roastedSaffron,
        fontWeight: typography.bold,
    },
    splitLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    leftPanel: {
        flex: 3, // 60% approx
        padding: spacing.lg,
    },
    rightPanel: {
        flex: 2, // 40% approx
        backgroundColor: colors.white,
        borderLeftWidth: 1,
        borderLeftColor: colors.lightGray,
        ...shadows.lg, // Elevate the panel visually
    },
    gridContainer: {
        paddingBottom: spacing.xl,
    },
    card: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedCard: {
        borderColor: colors.roastedSaffron,
        backgroundColor: '#FFF8F0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    tableTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.rounded,
    },
    unpaid: {
        backgroundColor: '#FEF3C7', // Light yellow
    },
    ready: {
        backgroundColor: '#D1FAE5', // Light green
    },
    statusText: {
        color: '#D97706',
        fontSize: typography.xs,
        fontWeight: typography.bold,
        textTransform: 'uppercase',
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    timeText: {
        color: colors.gray,
        fontSize: typography.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    itemCount: {
        color: colors.gray,
        fontSize: typography.sm,
    },
    // Detail Panel
    detailContent: {
        flex: 1,
    },
    detailHeader: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    detailTitle: {
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    detailSubtitle: {
        color: colors.gray,
        fontSize: typography.sm,
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.offWhite,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        gap: spacing.xs,
    },
    printText: {
        color: colors.castIron,
        fontWeight: typography.medium,
    },
    itemsList: {
        flex: 1,
        padding: spacing.lg,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    itemInfo: {
        flexDirection: 'row',
        gap: spacing.sm,
        flex: 1,
    },
    qtyBadge: {
        backgroundColor: colors.offWhite,
        width: 24,
        height: 24,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyText: {
        fontWeight: typography.bold,
        fontSize: typography.xs,
    },
    itemName: {
        fontSize: typography.base,
        color: colors.castIron,
        fontWeight: typography.medium,
    },
    itemNotes: {
        fontSize: typography.xs,
        color: colors.gray,
        marginTop: 2,
    },
    itemPrice: {
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    footerSection: {
        padding: spacing.lg,
        backgroundColor: colors.offWhite,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    totalRow: {
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        marginBottom: spacing.lg,
    },
    summaryLabel: {
        color: colors.gray,
    },
    summaryValue: {
        fontWeight: typography.medium,
        color: colors.castIron,
    },
    totalLabel: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    totalValue: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.roastedSaffron,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.sm,
    },
    cashBtn: {
        backgroundColor: '#10B981', // Emerald
    },
    cardBtn: {
        backgroundColor: '#3B82F6', // Blue
    },
    menuBtn: {
        backgroundColor: colors.offWhite,
        borderWidth: 1,
        borderColor: colors.lightGray,
    },
    payBtn: {
        backgroundColor: colors.roastedSaffron, // Primary Action
    },
    actionBtnText: {
        color: colors.white,
        fontWeight: typography.bold,
        fontSize: typography.lg,
    },
    emptyDetail: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyDetailText: {
        color: colors.gray,
        fontSize: typography.lg,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: spacing.xxxl,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.offWhite,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyText: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    emptySubtext: {
        color: colors.gray,
        marginTop: spacing.xs,
    },
    // History Styles
    listContainer: {
        padding: spacing.lg,
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.sm,
        ...shadows.sm,
    },
    historyInfo: {
        gap: 4,
    },
    historyTable: {
        fontWeight: typography.bold,
        color: colors.castIron,
        fontSize: typography.base,
    },
    historyTime: {
        color: colors.gray,
        fontSize: typography.xs,
    },
    historyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    historyAmount: {
        fontWeight: typography.bold,
        fontSize: typography.lg,
        color: colors.albahaca,
    },
    miniPrintBtn: {
        padding: 8,
        backgroundColor: colors.offWhite,
        borderRadius: borderRadius.sm,
    },
    // Available Table Card Styles
    availableCard: {
        backgroundColor: colors.offWhite,
        borderStyle: 'dashed',
        borderColor: colors.gray,
        borderWidth: 1,
        opacity: 0.8,
    },
    available: {
        backgroundColor: colors.lightGray,
    },
    // Modal Styles
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
    },
    modalTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    closeModalBtn: {
        padding: spacing.sm,
    },
    closeModalText: {
        color: colors.roastedSaffron,
        fontWeight: typography.bold,
    },
    // Header Styles
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
        paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    },
    headerTitle: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    headerSubtitle: {
        fontSize: typography.sm,
        color: colors.gray,
        marginTop: 2,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.sm,
        backgroundColor: colors.castIron,
        borderRadius: borderRadius.md,
        gap: spacing.xs,
    },
    logoutText: {
        color: colors.white,
        fontWeight: typography.medium,
        fontSize: typography.sm,
    },
    // Table Selection Modal Styles
    tableSelectOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableSelectModal: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        maxWidth: 500,
        width: '90%',
        maxHeight: '70%',
        ...shadows.lg,
    },
    tableSelectCard: {
        flex: 1,
        backgroundColor: colors.oatCream,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.lightGray,
        borderStyle: 'dashed',
    },
    tableSelectName: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.castIron,
        marginBottom: spacing.xs,
    },
    tableSelectBadge: {
        backgroundColor: '#D1FAE5',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.rounded,
    },
    tableSelectBadgeText: {
        color: '#059669',
        fontSize: typography.xs,
        fontWeight: typography.bold,
    },
    // Capacity Counter Styles
    capacityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.lg,
        borderWidth: 1.5,
        marginTop: spacing.sm,
        backgroundColor: colors.offWhite,
        alignSelf: 'flex-start',
    },
    capacityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.sm,
    },
    capacityText: {
        fontSize: 12,
        fontWeight: typography.bold,
    },
    // New Table Selector Styles
    tableSelectorBtn: {
        flex: 1,
        backgroundColor: '#F0FDF4', // Light green
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#86EFAC', // Green border
        height: 100,
    },
    tableSelectorId: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: '#166534',
    },
    tableSelectorStatus: {
        fontSize: typography.xs,
        color: '#166534',
        marginTop: 4,
        fontWeight: typography.bold,
    },
});
