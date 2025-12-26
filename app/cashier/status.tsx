import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { LogOut, Receipt, CreditCard, Banknote, Clock, RotateCcw, Search, Utensils, Plus, X, FileText, Trash2, Smartphone, Home, Layers, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router'; // Updated for Navigation
import { subscribeToActiveSessions, markSessionPaid, subscribeToShiftSessions, createSession, updateSessionNotes, cancelSession } from '../../src/services/sessions';
import { getLastShiftCut, recordShiftCut, ShiftCutStats } from '../../src/services/shifts';
import { subscribeToTables } from '../../src/services/tables';
import { subscribeToActivePickupOrders } from '../../src/services/pickupOrders';
import { Session, OrderItem, Table, PickupOrder } from '../../src/types/firestore';
import AirbnbButton from '../../src/components/AirbnbButton';
import AirbnbInput from '../../src/components/AirbnbInput';
import { colors, spacing, typography, shadows, borderRadius } from '../../src/styles/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useRestaurant } from '../../src/hooks/useRestaurant';
import PaymentInterface from '../../src/components/PaymentInterface';
import DigitalMenuInterfaceCashier from '../../src/components/DigitalMenuInterfaceCashier';
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

    // AUTH & CONTEXT (Moved up for accessibility in Effects)
    const { signOut, user } = useAuth();
    const { restaurant } = useRestaurant();
    const restaurantId = user?.restaurantId || 'kiitos-main';

    // TAB STATE
    // 'active' (All), 'counter', 'preorders', 'delivery', 'history'
    const [activeTab, setActiveTab] = useState<'active' | 'counter' | 'preorders' | 'delivery' | 'history'>('active');

    // RESTORED STATE (Moved up)
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showTableSelector, setShowTableSelector] = useState(false);
    const [showNameInputModal, setShowNameInputModal] = useState(false);
    const [newTableId, setNewTableId] = useState<string | null>(null);
    const [newTableName, setNewTableName] = useState<string>('');
    const [sessionNotes, setSessionNotes] = useState('');
    const notesTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // SHIFT STATE
    const [shiftStart, setShiftStart] = useState<Timestamp | Date>(new Date(new Date().setHours(0, 0, 0, 0))); // Default Today 00:00
    const [shiftHistorySessions, setShiftHistorySessions] = useState<Session[]>([]);
    const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false); // To show full list
    const [showSalesDetailModal, setShowSalesDetailModal] = useState(false); // To show Product/Financial breakdown
    const [shiftStats, setShiftStats] = useState<ShiftCutStats | null>(null);

    // Initial Load: Check for last Shift Cut
    useEffect(() => {
        const checkShift = async () => {
            const lastCut = await getLastShiftCut(restaurantId);
            if (lastCut) {
                console.log('🕒 [Shift] Last cut found at:', lastCut.createdAt.toDate().toLocaleString());
                setShiftStart(lastCut.createdAt);
            } else {
                console.log('🕒 [Shift] No previous cut, using start of day.');
            }
        };
        checkShift();
    }, [restaurantId]);

    // Subscribe to Sessions based on Shift Start
    useEffect(() => {
        // Subscribe to Active Sessions
        const unsubscribeActive = subscribeToActiveSessions(setRealSessions, restaurantId);

        // Subscribe to History (Shift Sessions)
        // [Key Change] Using subscribeToShiftSessions with dynamic start time
        const unsubscribeHistory = subscribeToShiftSessions(restaurantId, shiftStart, setShiftHistorySessions);

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
    }, [restaurantId, shiftStart]);

    // Calculate Shift Stats Effect
    useEffect(() => {
        const stats: ShiftCutStats = {
            totalSales: 0,
            cashSales: 0,
            cardSales: 0,
            appSales: 0,
            deliverySales: 0,
            itemsSold: 0,
            sessionCount: shiftHistorySessions.length,
            deliveryBreakdown: { uber: 0, rappi: 0, didi: 0, other: 0 }
        };

        shiftHistorySessions.forEach(session => {
            stats.totalSales += session.total || 0;
            stats.itemsSold += session.items?.length || 0;

            if (session.payment_breakdown) {
                stats.cashSales += session.payment_breakdown.cash || 0;
                stats.cardSales += session.payment_breakdown.card || 0;
                stats.appSales += (session.payment_breakdown.transfer || 0) + (session.payment_breakdown.other || 0);
                // Future: Add logic for delivery breakdown if stored in payment_breakdown
            } else {
                // Legacy Fallback (assume cash if paid)
                if (session.paymentStatus === 'paid') {
                    stats.cashSales += session.total;
                }
            }
        });
        setShiftStats(stats);
    }, [shiftHistorySessions]);



    // [FIX] Table Inventory & Capacity Logic (Connecting REAL Firestore data)
    // Filter out "Zombie Sessions" that don't belong to a real table
    // [ADD] Include 'counter' as a valid virtual tableId for Counter Service mode
    const validSessions = realSessions.filter(session =>
        session.tableId === 'counter' || allTables.some(t => t.id === session.tableId)
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

    // [NOTES SYNC]
    useEffect(() => {
        if (selectedSession) {
            setSessionNotes(selectedSession.notes || '');
        } else {
            setSessionNotes('');
        }
    }, [selectedSession?.id, selectedSession?.notes]);



    // Handler: Start new order on an available table
    const handleStartNewOrder = async (table?: any) => {
        const isCounter = restaurant?.settings?.serviceType === 'counter';

        if (isCounter) {
            // Check if name is required
            // Default to TRUE to be safe, unless explicitly set to false
            const requireName = restaurant?.settings?.require_guest_name !== false;

            if (requireName) {
                setNewTableId('counter'); // Placeholder
                setShowMenuModal(false); // Close other modals if any
                setShowTableSelector(false);
                setShowNameInputModal(true);
            } else {
                // Auto-generate order number/name
                const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit random
                const autoName = `Order #${randomNum}`;
                handleCreateCounterOrder(autoName);
            }
            return;
        }

        // Table Mode Logic
        if (!table) return;

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

    const handleCreateCounterOrder = async (customerName: string) => {
        try {
            if (!customerName.trim()) {
                Alert.alert('Error', 'Please enter a customer name');
                return;
            }
            console.log('🆕 [handleCreateCounterOrder] Creating counter session for:', customerName);

            // Use 'counter' as tableId, and Name as tableName
            const sessionId = await createSession(restaurantId, 'counter', customerName);

            setSelectedSessionId(sessionId);
            setShowNameInputModal(false);
            setNewTableName(''); // Reset for next use
            setShowMenuModal(true);
        } catch (error) {
            console.error('❌ [handleCreateCounterOrder] Error:', error);
            Alert.alert('Error', 'Failed to create order');
        }
    };

    // Handler: Switch from Menu to Payment (Unify workflow)
    const handleSwitchToPayment = () => {
        console.log('💳 [handleSwitchToPayment] Switching from Menu to Payment');
        setShowMenuModal(false);
        // [BUG FIX] Increase delay to 500ms to allow Menu Modal to fully unmount/animate out
        // before Payment Modal attempts to mount. Prevents "stacked modals" issue.
        setTimeout(() => {
            setShowPaymentModal(true);
        }, 500);
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

    const handleCancelOrder = async () => {
        if (!selectedSession) return;

        // Confirm before cancelling
        if (Platform.OS === 'web') {
            const confirm = window.confirm("¿Estás seguro de cancelar esta orden? Esta acción no se puede deshacer.");
            if (!confirm) return;
        } else {
            // Mobile alert logic could go here, but using web confirm for now as primary interface
        }

        try {
            await cancelSession(restaurantId, selectedSession.id, selectedSession.tableId);
            setSelectedSessionId(null);
        } catch (error) {
            console.error("Error cancelling session:", error);
            Alert.alert("Error", "No se pudo cancelar la orden.");
        }
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
                        <title>Receipt - ${restaurant?.name || 'Kitos'}</title>
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
                            <h2>${restaurant?.name || 'Kitos Restaurant'}</h2>
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
                            <p>Powered by Kitos</p>
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

    const handleEndShift = async () => {
        if (Platform.OS === 'web') {
            const confirm = window.confirm("¿Estás seguro de cerrar el turno? Esto reiniciará los contadores y generará el reporte.");
            if (!confirm) return;
        }

        if (!shiftStats) return;

        try {
            // 1. Record Shift Cut
            const shiftId = await recordShiftCut(
                restaurantId,
                shiftStats,
                { id: user?.id || 'admin', name: 'Cashier' }, // TODO: Real user data
                shiftHistorySessions.map(s => s.id),
                shiftStart
            );

            // 2. Print Z-Report (Using generic print logic for now, similar to daily report but with Z-Header)
            if (Platform.OS === 'web') {
                const printWindow = window.open('', '', 'height=600,width=400');
                if (printWindow) {
                    const dateStr = new Date().toLocaleString();
                    const html = `
                        <html>
                        <head>
                            <title>Z-Report - ${restaurant?.name}</title>
                            <style>
                                body { font-family: 'Courier New', monospace; padding: 20px; text-align: center; }
                                .header { margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                                .item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
                                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                                .total { font-weight: bold; font-size: 20px; margin-top: 20px; text-align: right; }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h2>${restaurant?.name}</h2>
                                <h3>CORTE DE CAJA (Z-REPORT)</h3>
                                <p>${dateStr}</p>
                                <p>Shift ID: ${shiftId.slice(-6)}</p>
                            </div>
                            
                            <div class="item"><span>Total Sales</span><span>$${shiftStats.totalSales.toFixed(2)}</span></div>
                            <div class="divider"></div>
                            <div class="item"><span>Cash</span><span>$${shiftStats.cashSales.toFixed(2)}</span></div>
                            <div class="item"><span>Card</span><span>$${shiftStats.cardSales.toFixed(2)}</span></div>
                            <div class="item"><span>Transfer/App</span><span>$${shiftStats.appSales.toFixed(2)}</span></div>
                            
                            <div class="divider"></div>
                            <p>Items Sold: ${shiftStats.itemsSold}</p>
                            <p>Sessions: ${shiftStats.sessionCount}</p>
                            
                            <div class="total">Global Total: $${shiftStats.totalSales.toFixed(2)}</div>
                        </body>
                        <script>window.onload = function() { window.print(); window.close(); }</script>
                        </html>
                    `;
                    printWindow.document.write(html);
                    printWindow.document.close();
                }
            }

            // 3. Update Shift Start to Now (Effectively resetting view)
            setShiftStart(Timestamp.now());
            setShiftStats(null);
            setShiftHistorySessions([]);

            Alert.alert("Shift Closed", "El turno ha sido cerrado y el reporte generado.");
        } catch (error) {
            console.error("Error closing shift:", error);
            Alert.alert("Error", "No se pudo cerrar el turno.");
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


            {/* Daily Stats Calculation - Only relevant for history tab */}
            {
                activeTab === 'history' && (
                    <View style={{ position: 'absolute' }}>
                        {/* Invisible calculation trigger or just relying on render logic */}
                    </View>
                )
            }

            {/* CENTRAL TABS */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'active' && styles.activeTab]}
                    onPress={() => { setActiveTab('active'); setSelectedSessionId(null); setSelectedPickupOrderId(null); }}
                >
                    <Layers size={16} color={activeTab === 'active' ? colors.roastedSaffron : colors.gray} />
                    <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'counter' && styles.activeTab]}
                    onPress={() => { setActiveTab('counter'); setSelectedSessionId(null); setSelectedPickupOrderId(null); }}
                >
                    <Home size={16} color={activeTab === 'counter' ? colors.roastedSaffron : colors.gray} />
                    <Text style={[styles.tabText, activeTab === 'counter' && styles.activeTabText]}>Counter</Text>
                </TouchableOpacity>
                {(restaurant?.settings?.serviceType !== 'counter' || restaurant?.settings?.enable_takeout) && (
                    <>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'preorders' && styles.activeTab]}
                            onPress={() => { setActiveTab('preorders'); setSelectedSessionId(null); setSelectedPickupOrderId(null); }}
                        >
                            <Utensils size={16} color={activeTab === 'preorders' ? colors.roastedSaffron : colors.gray} />
                            <Text style={[styles.tabText, activeTab === 'preorders' && styles.activeTabText]}>Preorders</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'delivery' && styles.activeTab]}
                            onPress={() => { setActiveTab('delivery'); setSelectedSessionId(null); setSelectedPickupOrderId(null); }}
                        >
                            <Smartphone size={16} color={activeTab === 'delivery' ? colors.roastedSaffron : colors.gray} />
                            <Text style={[styles.tabText, activeTab === 'delivery' && styles.activeTabText]}>Delivery</Text>
                        </TouchableOpacity>
                    </>
                )}
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => { setActiveTab('history'); setSelectedSessionId(null); setSelectedPickupOrderId(null); }}
                >
                    <Clock size={16} color={activeTab === 'history' ? colors.roastedSaffron : colors.gray} />
                    <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Corte de Turno</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* + NEW ORDER BUTTON */}
                <TouchableOpacity
                    style={[styles.logoutBtn, { backgroundColor: colors.albahaca }]}
                    onPress={() => {
                        if (restaurant?.settings?.serviceType === 'counter') {
                            handleStartNewOrder();
                        } else {
                            setShowTableSelector(true);
                        }
                    }}
                >
                    <Plus size={18} color="white" />
                    <Text style={styles.logoutText}>New Order</Text>
                </TouchableOpacity>



                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <LogOut size={20} color="white" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View >
    );

    const lastTap = React.useRef<number>(0);
    const renderActiveSessionCard = ({ item }: { item: Session }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            style={[
                styles.card,
                selectedSession?.id === item.id && styles.selectedCard
            ]}
            onPress={() => {
                const now = Date.now();
                const DOUBLE_PRESS_DELAY = 300;
                if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
                    // Double tap action
                    setSelectedSessionId(item.id);
                    setShowMenuModal(true);
                } else {
                    // Single tap action
                    setSelectedSessionId(item.id);
                }
                lastTap.current = now;
            }}
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


            {/* MAIN CONTENT SPLIT OR FULL DASHBOARD */}
            {activeTab === 'history' ? (
                // SHIFT DASHBOARD (Overlay Full Width)
                <ScrollView style={{ flex: 1, padding: 24 }} contentContainerStyle={{ gap: 24 }}>
                    {/* KPI CARDS ROW */}
                    <View style={{ flexDirection: 'row', gap: 24 }}>
                        {/* TOTAL SALES */}
                        <View style={[styles.kpiCard, { flex: 1, backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: colors.roastedSaffron }]}>
                            <Text style={styles.kpiTitle}>Ventas Totales</Text>
                            <Text style={[styles.kpiValue, { color: colors.castIron }]}>
                                ${shiftStats?.totalSales.toFixed(2) || '0.00'}
                            </Text>
                            <Text style={styles.kpiSubtitle}>{shiftStats?.itemsSold || 0} productos vendidos</Text>
                        </View>

                        {/* BREAKDOWN */}
                        <View style={[styles.kpiCard, { flex: 2, backgroundColor: '#fff' }]}>
                            <Text style={styles.kpiTitle}>Desglose por Método</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                <View>
                                    <Text style={styles.breakdownLabel}>Efectivo</Text>
                                    <Text style={styles.breakdownValue}>${shiftStats?.cashSales.toFixed(2) || '0.00'}</Text>
                                </View>
                                <View>
                                    <Text style={styles.breakdownLabel}>Tarjeta</Text>
                                    <Text style={styles.breakdownValue}>${shiftStats?.cardSales.toFixed(2) || '0.00'}</Text>
                                </View>
                                <View>
                                    <Text style={styles.breakdownLabel}>Apps / Transfer</Text>
                                    <Text style={styles.breakdownValue}>${shiftStats?.appSales.toFixed(2) || '0.00'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* STATUS */}
                        <View style={[styles.kpiCard, { flex: 1, backgroundColor: '#f8f9fa' }]}>
                            <Text style={styles.kpiTitle}>Turno Actual</Text>
                            <View style={{ marginTop: 8, gap: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Clock size={16} color={colors.gray} />
                                    <Text style={{ color: colors.gray, fontSize: 13 }}>
                                        Inicio: {shiftStart instanceof Timestamp
                                            ? shiftStart.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : shiftStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
                                    <Text style={{ color: '#10b981', fontSize: 13, fontWeight: 'bold' }}>Active</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ACTIONS ROW */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => setShowHistoryDetailModal(true)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: colors.gray, borderRadius: 8 }}
                        >
                            <FileText size={20} color={colors.gray} />
                            <Text style={{ fontWeight: '500', color: colors.gray }}>Ver Desglose de Órdenes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowSalesDetailModal(true)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1, borderColor: colors.gray, borderRadius: 8, marginLeft: 12 }}
                        >
                            <TrendingUp size={20} color={colors.gray} />
                            <Text style={{ fontWeight: '500', color: colors.gray }}>Ver Desglose de Ventas</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleEndShift}
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 8,
                                paddingHorizontal: 24, paddingVertical: 14,
                                backgroundColor: '#dc2626', borderRadius: 8,
                                ...shadows.md
                            }}
                        >
                            <LogOut size={20} color="white" />
                            <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 16 }}>Realizar Corte e Imprimir</Text>
                        </TouchableOpacity>
                    </View>

                    {/* HISTORY DETAIL MODAL */}
                    <Modal visible={showHistoryDetailModal} animationType="slide" transparent>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 }}>
                            <View style={{ backgroundColor: 'white', borderRadius: 16, flex: 1, padding: 24 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Desglose de Órdenes (Turno Actual)</Text>
                                    <TouchableOpacity onPress={() => setShowHistoryDetailModal(false)}>
                                        <X size={24} color="black" />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={shiftHistorySessions}
                                    renderItem={renderHistoryItem}
                                    keyExtractor={item => item.id}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                />
                            </View>
                        </View>
                    </Modal>

                    {/* SALES DETAIL MODAL (New Feature) */}
                    <Modal visible={showSalesDetailModal} animationType="slide" transparent>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 }}>
                            <View style={{ backgroundColor: 'white', borderRadius: 16, flex: 1, padding: 24, paddingBottom: 0 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <View>
                                        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Desglose de Ventas</Text>
                                        <Text style={{ color: colors.gray }}>{new Date().toLocaleDateString()}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowSalesDetailModal(false)}>
                                        <X size={24} color="black" />
                                    </TouchableOpacity>
                                </View>

                                {/* Calculate Stats on the fly for display */}
                                {(() => {
                                    // Calculate Stats
                                    const reportStats = shiftHistorySessions.reduce((acc, session) => {
                                        acc.total += session.total || 0;
                                        acc.itemsSold += session.items?.length || 0;

                                        // Payment Methods
                                        if (session.payment_breakdown) {
                                            acc.cash += session.payment_breakdown.cash || 0;
                                            acc.card += session.payment_breakdown.card || 0;
                                            acc.app += session.payment_breakdown.transfer || session.payment_breakdown.other || 0;
                                        } else {
                                            // Legacy Fallback
                                            if (session.paymentStatus === 'paid') {
                                                // Assume cash if not specified or legacy
                                                acc.cash += session.total || 0;
                                            } else {
                                                acc.uncategorized += session.amount_paid || session.total || 0;
                                            }
                                        }

                                        // Product Sales
                                        session.items?.forEach(item => {
                                            if (!acc.products[item.name]) {
                                                acc.products[item.name] = { qty: 0, total: 0 };
                                            }
                                            acc.products[item.name].qty += item.quantity;
                                            acc.products[item.name].total += (item.price * item.quantity);
                                        });

                                        return acc;
                                    }, {
                                        total: 0,
                                        cash: 0,
                                        card: 0,
                                        app: 0,
                                        uncategorized: 0,
                                        itemsSold: 0,
                                        products: {} as Record<string, { qty: number, total: number }>
                                    });

                                    return (
                                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
                                            {/* FINANCIAL SUMMARY */}
                                            <View style={{ padding: 16, backgroundColor: colors.offWhite, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: colors.castIron }}>Resumen Financiero</Text>
                                                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Efectivo (Cash)</Text><Text style={styles.summaryValue}>${reportStats.cash.toFixed(2)}</Text></View>
                                                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Tarjeta (Card)</Text><Text style={styles.summaryValue}>${reportStats.card.toFixed(2)}</Text></View>
                                                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Apps / Transfer</Text><Text style={styles.summaryValue}>${reportStats.app.toFixed(2)}</Text></View>
                                                {reportStats.uncategorized > 0 && (
                                                    <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Sin Categoría</Text><Text style={styles.summaryValue}>${reportStats.uncategorized.toFixed(2)}</Text></View>
                                                )}
                                                <View style={[styles.summaryRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: colors.lightGray }]}>
                                                    <Text style={[styles.totalLabel, { fontSize: 18 }]}>Ventas Totales</Text>
                                                    <Text style={[styles.totalValue, { fontSize: 18 }]}>${reportStats.total.toFixed(2)}</Text>
                                                </View>
                                            </View>

                                            {/* PRODUCT SALES */}
                                            <View style={{ padding: 16, backgroundColor: colors.offWhite, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: colors.castIron }}>Ventas por Producto</Text>
                                                {Object.entries(reportStats.products)
                                                    .sort((a, b) => b[1].total - a[1].total)
                                                    .map(([name, stat], idx) => (
                                                        <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: idx < Object.keys(reportStats.products).length - 1 ? 1 : 0, borderBottomColor: colors.lightGray }}>
                                                            <Text style={{ flex: 1, fontSize: 14 }}>{stat.qty}x {name}</Text>
                                                            <Text style={{ fontWeight: '600' }}>${stat.total.toFixed(2)}</Text>
                                                        </View>
                                                    ))}
                                            </View>
                                        </ScrollView>
                                    );
                                })()}
                            </View>
                        </View>
                    </Modal>


                </ScrollView>
            ) : (
                /* SPLIT LAYOUT FOR ACTIVE/COUNTER/ETC */
                <View style={styles.splitLayout}>
                    {/* LEFT PANEL: GRID */}
                    <View style={styles.leftPanel}>
                        {activeTab === 'active' && (
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
                                            <Layers size={40} color={colors.gray} />
                                        </View>
                                        <Text style={styles.emptyText}>No active orders</Text>
                                        <Text style={styles.emptySubtext}>All active orders will appear here.</Text>
                                    </View>
                                }
                            />
                        )}

                        {activeTab === 'counter' && (
                            <FlatList
                                key="counter-grid"
                                data={validSessions.filter(s => s.tableId === 'counter')}
                                renderItem={({ item }) => renderActiveSessionCard({ item })}

                                keyExtractor={item => `session-${item.id}`}
                                numColumns={3}
                                contentContainerStyle={styles.gridContainer}
                                columnWrapperStyle={{ gap: spacing.md }}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <View style={styles.emptyIconBg}>
                                            <Home size={40} color={colors.gray} />
                                        </View>
                                        <Text style={styles.emptyText}>No counter orders</Text>
                                        <Text style={styles.emptySubtext}>Orders created in "Counter" mode appear here.</Text>
                                    </View>
                                }
                            />
                        )}

                        {activeTab === 'preorders' && (
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
                        )}

                        {activeTab === 'delivery' && (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconBg}>
                                    <Smartphone size={40} color={colors.gray} />
                                </View>
                                <Text style={styles.emptyText}>Delivery Apps</Text>
                                <Text style={styles.emptySubtext}>Integration with Rappi, Uber, Didi coming soon.</Text>
                            </View>
                        )}

                    </View>

                    {/* RIGHT PANEL: DETAILS */}
                    <View style={styles.rightPanel}>
                        {detailData ? (
                            /* ================== STANDARD ORDER DETAIL ================== */
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
                                                : `Order #${(selectedSession?.qrCode || selectedSession?.id || "000000").slice(-6)}`
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
                                        const itemsTotal = (detailData.items as any[]).reduce((sum: number, item: any) => sum + (item.price * (item.quantity || 1)), 0);
                                        const displaySubtotal = (detailData.subtotal || 0) > 0 ? detailData.subtotal : itemsTotal;
                                        const displayTax = (detailData.tax || 0) > 0 ? detailData.tax : displaySubtotal * 0.16;
                                        const displayTotal = (detailData.total || 0) > 0 ? detailData.total : (displaySubtotal + displayTax);

                                        return (
                                            <>
                                                {!isPickupSelected && selectedSession && (
                                                    <View style={{ marginBottom: 16 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                            <FileText size={14} color={colors.gray} />
                                                            <Text style={{ fontSize: 12, color: colors.gray, fontWeight: 'bold' }}>Notas Generales</Text>
                                                        </View>
                                                        <AirbnbInput
                                                            testID="session-notes-input"
                                                            label="Notas"
                                                            value={sessionNotes}
                                                            onChangeText={(text) => {
                                                                setSessionNotes(text);
                                                                if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
                                                                notesTimeoutRef.current = setTimeout(() => {
                                                                    if (selectedSession?.id) {
                                                                        updateSessionNotes(selectedSession.id, text, restaurantId);
                                                                    }
                                                                }, 800);
                                                            }}
                                                            placeholder="Mesa 5, alérgico a nueces, etc."
                                                            multiline
                                                            style={{ minHeight: 60, fontSize: 12 }}
                                                        />
                                                    </View>
                                                )}
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

                                    <View style={styles.actions}>
                                        {!isPickupSelected && (selectedSession?.total === 0 || selectedSession?.items.length === 0) && (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: '#fee2e2', borderColor: '#fee2e2' }]}
                                                onPress={handleCancelOrder}
                                            >
                                                <Trash2 size={24} color={colors.chile} />
                                                <Text style={[styles.actionBtnText, { color: colors.chile }]}>Cancelar</Text>
                                            </TouchableOpacity>
                                        )}

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
                                </View>
                            </View>
                        ) : (
                            <View style={styles.emptyDetail}>
                                <Text style={styles.emptyDetailText}>Select an order to view details</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}
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
                            <TouchableOpacity onPress={handleMenuClose} style={styles.closeModalCircle}>
                                <X size={24} color={colors.castIron} />
                            </TouchableOpacity>
                        </View>
                        <DigitalMenuInterfaceCashier
                            key={`menu-${selectedSession.id}`}
                            restaurantId={restaurantId}
                            tableId={selectedSession.tableId}
                            sessionId={selectedSession.id}
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
                            localSession={selectedSession} // Inject Data
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

            {/* MODAL: NAME INPUT (For Counter Service) */}
            <Modal
                visible={showNameInputModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowNameInputModal(false)}
            >
                <View style={styles.tableSelectOverlay}>
                    <View style={[styles.tableSelectModal, { height: 'auto', paddingBottom: 32 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Customer Name</Text>
                            <TouchableOpacity onPress={() => setShowNameInputModal(false)} style={styles.closeModalBtn}>
                                <Text style={styles.closeModalText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 24 }}>
                            <Text style={{ marginBottom: 8, color: colors.gray, fontWeight: 'bold' }}>Who is this order for?</Text>
                            <AirbnbInput
                                label="Customer Name"
                                value={newTableName} // Reusing newTableName state
                                onChangeText={setNewTableName}
                                placeholder="E.g. Alex, Order #42..."
                                autoFocus
                            />

                            <TouchableOpacity
                                style={[styles.logoutBtn, { backgroundColor: colors.roastedSaffron, marginTop: 24, justifyContent: 'center', width: '100%' }]}
                                onPress={() => handleCreateCounterOrder(newTableName)}
                            >
                                <Text style={[styles.logoutText, { fontSize: 16 }]}>Start Order</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.oatCream,
    },
    // Top Bar
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
        ...shadows.sm,
        zIndex: 10,
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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.offWhite,
        padding: 4,
        borderRadius: borderRadius.lg,
        gap: 4,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    activeTab: {
        backgroundColor: colors.white,
        ...shadows.sm,
    },
    tabText: {
        fontSize: typography.sm,
        fontWeight: typography.medium,
        color: colors.gray,
    },
    activeTabText: {
        color: colors.roastedSaffron,
        fontWeight: typography.bold,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.roastedSaffron,
        borderRadius: borderRadius.md,
    },
    logoutText: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.white,
    },
    // Layout
    splitLayout: {
        flex: 1,
        flexDirection: 'row',
        padding: spacing.lg,
    },
    leftPanel: {
        flex: 0.65,
        paddingRight: spacing.lg,
        borderRightWidth: 1,
        borderRightColor: colors.lightGray,
    },
    rightPanel: {
        flex: 0.35,
        paddingLeft: spacing.lg,
    },
    // Grid
    gridContainer: {
        paddingBottom: spacing.xxl,
    },
    card: {
        width: '32%', // 3 columns
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectedCard: {
        borderColor: colors.roastedSaffron,
        transform: [{ scale: 1.02 }],
        ...shadows.md,
    },
    cardHeader: {
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: colors.offWhite,
    },
    // Card Styles
    tableTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    statusBadge: {
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    unpaid: { backgroundColor: '#FEF3C7' },
    paid: { backgroundColor: '#D1FAE5' },
    ready: { backgroundColor: '#D1FAE5' },
    statusText: {
        fontSize: 10,
        fontWeight: typography.bold,
        color: colors.castIron,
        textTransform: 'uppercase',
    },
    cardInfo: {
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    timeText: {
        color: colors.gray,
        fontSize: typography.sm,
    },
    cardFooter: {
        padding: spacing.md,
        backgroundColor: colors.offWhite,
        borderBottomLeftRadius: borderRadius.lg,
        borderBottomRightRadius: borderRadius.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amount: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    itemCount: {
        fontSize: typography.sm,
        color: colors.gray,
    },
    // Styles for Detail Panel
    detailContent: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        ...shadows.md,
        overflow: 'hidden',
    },
    detailHeader: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailTitle: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    detailSubtitle: {
        fontSize: typography.sm,
        color: colors.gray,
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
        backgroundColor: colors.offWhite,
        borderRadius: 8,
    },
    printText: { fontSize: 12, fontWeight: 'bold', color: colors.castIron },
    itemsList: {
        flex: 1,
        padding: spacing.lg,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    itemInfo: {
        flexDirection: 'row',
        gap: 8,
        flex: 1,
    },
    qtyBadge: {
        backgroundColor: colors.offWhite,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    qtyText: { fontWeight: 'bold', fontSize: 12 },
    itemName: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.castIron,
    },
    itemNotes: {
        fontSize: 12,
        color: colors.gray,
        fontStyle: 'italic',
        marginTop: 2,
    },
    itemPrice: {
        fontWeight: 'bold',
        fontSize: 14,
        color: colors.castIron,
        marginLeft: 8,
    },
    footerSection: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        backgroundColor: colors.offWhite,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    summaryLabel: { color: colors.gray, fontSize: 14 },
    summaryValue: { fontWeight: '500', fontSize: 14 },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        marginBottom: 16,
    },
    totalLabel: { fontSize: 18, fontWeight: 'bold' },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: colors.roastedSaffron },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    menuBtn: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.lightGray,
    },
    payBtn: {
        backgroundColor: colors.roastedSaffron,
        ...shadows.sm,
    },
    actionBtnText: {
        fontWeight: 'bold',
        fontSize: 14,
        color: 'white',
    },
    emptyDetail: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyDetailText: {
        color: colors.gray,
        fontSize: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.offWhite,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.castIron,
    },
    emptySubtext: {
        color: colors.gray,
        marginTop: 4,
    },

    // Modals
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeModalCircle: {
        padding: 4,
    },

    // KPI / Shift Dashboard Styles
    kpiCard: {
        padding: 20,
        borderRadius: 12,
        ...shadows.sm,
        justifyContent: 'center'
    },
    kpiTitle: {
        fontSize: 12,
        color: colors.gray,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    kpiValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 8
    },
    kpiSubtitle: {
        fontSize: 12,
        color: colors.gray,
        marginTop: 4
    },
    breakdownLabel: {
        fontSize: 11,
        color: colors.gray,
        marginBottom: 2
    },
    breakdownValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.castIron
    },

    // History Modal List
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        marginBottom: 8,
    },
    historyInfo: {},
    historyTable: { fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
    historyTime: { fontSize: 12, color: colors.gray },
    historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    historyAmount: { fontWeight: 'bold', fontSize: 16, color: '#059669' },
    miniPrintBtn: {
        padding: 6,
        backgroundColor: '#fff',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },

    // Capacity Badge
    capacityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 4,
        backgroundColor: colors.white,
        alignSelf: 'flex-start',
    },
    capacityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    capacityText: {
        fontSize: 11,
        fontWeight: 'bold',
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
    closeModalBtn: {
        padding: spacing.sm,
    },
    closeModalText: {
        color: colors.roastedSaffron,
        fontWeight: typography.bold,
    },
    listContainer: {
        padding: spacing.lg,
    },
});

