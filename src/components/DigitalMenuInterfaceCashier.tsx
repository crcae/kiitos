import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView, ActivityIndicator, Modal, TextInput, StyleSheet, Dimensions, Alert, Platform } from 'react-native';
import { ShoppingBag, ChevronLeft, Plus, Minus, FileText, Utensils, CheckCircle, Clock, Grid, List as ListIcon, Trash2, Send } from 'lucide-react-native';
import { colors, spacing, typography, shadows, borderRadius } from '../styles/theme';
import { subscribeToGuestCategories, subscribeToGuestProducts, sendOrderToKitchen, subscribeToActiveSession } from '../services/guestMenu';
import { subscribeToSession, updateSessionNotes, removeItemFromSession } from '../services/sessions';
import { Category, Product, SelectedModifier, ModifierGroup, ModifierOption, OrderItem, Session } from '../types/firestore';

interface DigitalMenuInterfaceCashierProps {
    restaurantId: string;
    tableId: string;
    sessionId: string;
    onSuccess?: () => void;
    onRequestPayment?: () => void;
}

export default function DigitalMenuInterfaceCashier({
    restaurantId,
    tableId,
    sessionId,
    onSuccess,
    onRequestPayment
}: DigitalMenuInterfaceCashierProps) {
    // Data State
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    // Session State (Live Order)
    const [sessionItems, setSessionItems] = useState<OrderItem[]>([]);
    const [sessionTotal, setSessionTotal] = useState(0);
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [sessionNotes, setSessionNotes] = useState('');

    // Modal State
    const [modifierModalVisible, setModifierModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false); // [NEW] Delete Modal State
    const [itemToDeleteIndex, setItemToDeleteIndex] = useState<number | null>(null); // [NEW] Target to delete
    const [selectedProductForModifiers, setSelectedProductForModifiers] = useState<Product | null>(null);
    const [tempSelectedModifiers, setTempSelectedModifiers] = useState<SelectedModifier[]>([]);
    const [notes, setNotes] = useState('');

    // Click logic timing
    const lastClickTime = useRef<number>(0);
    const clickTimeout = useRef<NodeJS.Timeout | null>(null);
    const unsubsRef = useRef<(() => void)[]>([]);
    const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Load & Subscriptions
    useEffect(() => {
        if (!restaurantId) return;

        const loadData = async () => {
            // PRODUCTS & CATEGORIES
            const unsubCats = subscribeToGuestCategories(restaurantId, setCategories);
            unsubsRef.current.push(unsubCats);

            const unsubProds = subscribeToGuestProducts(restaurantId, (data) => {
                setProducts(data);
                setLoading(false);
            });
            unsubsRef.current.push(unsubProds);

            // ACTIVE SESSION SUBSCRIPTION (Refined)
            const handleSessionUpdate = (session: Session | null | undefined, items: OrderItem[], total: number) => {
                if (session) {
                    setActiveSession(session);
                    setSessionNotes(session.notes || '');
                }
                setSessionItems(items);
                setSessionTotal(total);
            }

            if (tableId && tableId !== 'counter') {
                const unsubSession = subscribeToActiveSession(restaurantId, tableId, (items, total, _, session) => {
                    handleSessionUpdate(session, items, total);
                });
                unsubsRef.current.push(unsubSession);
            } else if (sessionId) {
                const unsubSession = subscribeToSession(sessionId, (session) => {
                    handleSessionUpdate(session, session?.items || [], session?.total || 0);
                }, restaurantId);
                unsubsRef.current.push(unsubSession);
            }
        };

        loadData();

        return () => {
            unsubsRef.current.forEach(u => u());
            unsubsRef.current = [];
            if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
        };
    }, [restaurantId, tableId, sessionId]);

    const handleSessionNotesChange = (text: string) => {
        setSessionNotes(text);
        if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);

        notesTimeoutRef.current = setTimeout(() => {
            if (activeSession?.id) {
                updateSessionNotes(activeSession.id, text, restaurantId);
            }
        }, 800);
    };


    const handleDeleteItem = (index: number) => {
        if (!activeSession?.id) return;
        setItemToDeleteIndex(index);
        setDeleteModalVisible(true);
    };

    const confirmDelete = () => {
        if (activeSession?.id && itemToDeleteIndex !== null) {
            removeItemFromSession(activeSession.id, itemToDeleteIndex, restaurantId);
            setDeleteModalVisible(false);
            setItemToDeleteIndex(null);
        }
    };

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'all') return products;
        return products.filter(p => p.category_id === selectedCategory);
    }, [products, selectedCategory]);

    const handleProductPress = (product: Product) => {
        const now = Date.now();
        const delay = 300; // Double click threshold

        if (now - lastClickTime.current < delay) {
            // DOUBLE CLICK ACTION
            if (clickTimeout.current) clearTimeout(clickTimeout.current);
            handleDoubleClick(product);
        } else {
            // SINGLE CLICK ACTION (delayed to wait for possible double click)
            clickTimeout.current = setTimeout(() => {
                setSelectedProductId(product.id);
            }, delay);
        }
        lastClickTime.current = now;
    };

    const handleDoubleClick = (product: Product) => {
        if (product.modifiers && product.modifiers.length > 0) {
            setSelectedProductForModifiers(product);
            setModifierModalVisible(true);
        } else {
            addToOrder(product, []);
        }
    };

    const addToOrder = async (product: Product, modifiers: SelectedModifier[]) => {
        try {
            // Don't set global loading as it blocks UI, maybe just local feedback
            // setLoading(true); 
            const itemsForService = [{
                product,
                quantity: 1,
                modifiers,
                notes: notes || undefined
            }];

            await sendOrderToKitchen(restaurantId, tableId, itemsForService as any, 'waiter-app', 'Cajero', sessionId);

            // Cleanup
            setSelectedProductId(null);
            setModifierModalVisible(false);
            setNotes('');
            setTempSelectedModifiers([]);
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            alert("Error al agregar a la orden");
        } finally {
            setLoading(false);
        }
    };

    const toggleModifier = (group: ModifierGroup, option: ModifierOption) => {
        setTempSelectedModifiers(prev => {
            const currentInGroup = prev.filter(m => m.group_name === group.name);
            const isSelected = prev.some(m => m.id === option.id);

            if (isSelected) {
                return prev.filter(m => m.id !== option.id);
            } else {
                if (group.max_selections === 1) {
                    const others = prev.filter(m => m.group_name !== group.name);
                    return [...others, { id: option.id, name: option.name, price: option.price, group_name: group.name }];
                }
                if (group.max_selections > 0 && currentInGroup.length >= group.max_selections) return prev;
                return [...prev, { id: option.id, name: option.name, price: option.price, group_name: group.name }];
            }
        });
    };

    const calculateItemTotal = (item: OrderItem) => {
        const modifiersTotal = item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0;
        return (item.price + modifiersTotal) * item.quantity;
    };

    const renderProductCard = ({ item }: { item: Product }) => {
        const isSelected = selectedProductId === item.id;
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleProductPress(item)}
                style={[
                    styles.productCard,
                    isSelected && styles.productCardSelected
                ]}
            >
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
                ) : (
                    <View style={styles.productImagePlaceholder}>
                        <Utensils size={24} color={colors.gray} />
                    </View>
                )}

                <View style={styles.productInfo}>
                    <Text style={[styles.productName, isSelected && styles.textSelected]} numberOfLines={2}>
                        {item.name}
                    </Text>
                    <Text style={[styles.productPrice, isSelected && styles.textSelected]}>
                        ${item.price.toFixed(2)}
                    </Text>
                </View>
                {item.modifiers && item.modifiers.length > 0 && (
                    <View style={styles.modifierBadge}>
                        <Plus size={10} color={isSelected ? colors.white : colors.gray} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading && products.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.roastedSaffron} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* COLUMN 1: Categories (18%) */}
            <View style={styles.sidebar}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                        onPress={() => setSelectedCategory('all')}
                        style={[styles.categoryItem, selectedCategory === 'all' && styles.categoryItemSelected]}
                    >
                        <Grid size={20} color={selectedCategory === 'all' ? colors.white : colors.gray} />
                        <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextSelected]}>Todos</Text>
                    </TouchableOpacity>

                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => setSelectedCategory(cat.id)}
                            style={[styles.categoryItem, selectedCategory === cat.id && styles.categoryItemSelected]}
                        >
                            <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextSelected]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* COLUMN 2: Product Grid (52%) */}
            <View style={styles.mainArea}>
                <FlatList
                    data={filteredProducts}
                    renderItem={renderProductCard}
                    keyExtractor={item => item.id}
                    numColumns={3}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Utensils size={48} color={colors.lightGray} />
                            <Text style={styles.emptyText}>No hay productos en esta categoría</Text>
                        </View>
                    }
                />
            </View>

            {/* COLUMN 3: Order Preview (30%) */}
            <View style={styles.orderPreview}>
                <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle}>Orden Actual</Text>
                    <View style={styles.sessionBadge}>
                        <Text style={styles.sessionBadgeText}>{activeSession?.tableName || 'Sin Nombre'}</Text>
                    </View>
                </View>

                <ScrollView style={styles.orderList} contentContainerStyle={{ paddingBottom: 20 }}>
                    {sessionItems.length === 0 ? (
                        <View style={styles.emptyOrder}>
                            <ShoppingBag size={40} color={colors.lightGray} />
                            <Text style={styles.emptyOrderText}>La orden está vacía</Text>
                            <Text style={styles.emptyOrderSubtext}>Selecciona productos del menú</Text>
                        </View>
                    ) : (
                        sessionItems.map((item, idx) => (
                            <View key={`${item.id}-${idx}`} style={styles.orderItem}>
                                <View style={styles.orderItemHeader}>
                                    <View style={styles.qtyBadge}>
                                        <Text style={styles.qtyText}>{item.quantity}x</Text>
                                    </View>
                                    <View style={styles.orderItemInfo}>
                                        <Text style={styles.orderItemName}>{item.name}</Text>
                                        {item.modifiers && item.modifiers.map((mod, mIdx) => (
                                            <Text key={mIdx} style={styles.modifierText}>+ {mod.name}</Text>
                                        ))}
                                        {item.notes && <Text style={styles.notesText}>Nota: {item.notes}</Text>}
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                        <Text style={styles.orderItemPrice}>${calculateItemTotal(item).toFixed(2)}</Text>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteItem(idx)}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            style={{ padding: 4 }}
                                        >
                                            <Trash2 size={20} color={colors.chile} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>

                <View style={styles.previewFooter}>
                    <View style={styles.notesSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <FileText size={18} color={colors.castIron} />
                            <Text style={styles.notesLabel}>Notas de la Orden</Text>
                        </View>
                        <TextInput
                            style={styles.sessionNotesInput}
                            placeholder="Ej: Mesa 5, Alérgico a nueces, Sin cebolla..."
                            placeholderTextColor={colors.gray}
                            value={sessionNotes}
                            onChangeText={handleSessionNotesChange}
                            multiline
                        />
                    </View>

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>${sessionTotal.toFixed(2)}</Text>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.payBtn} onPress={onRequestPayment}>
                            <Text style={styles.payBtnText}>Cobrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Modifier Modal */}
            <Modal visible={modifierModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Configurar: {selectedProductForModifiers?.name}</Text>
                            <TouchableOpacity onPress={() => setModifierModalVisible(false)}>
                                <Text style={styles.closeBtn}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll}>
                            {selectedProductForModifiers?.modifiers?.map((group) => (
                                <View key={group.id} style={styles.modifierGroup}>
                                    <Text style={styles.groupTitle}>{group.name} {group.required && <Text style={{ color: colors.chile }}>*</Text>}</Text>
                                    <View style={styles.optionsContainer}>
                                        {group.options.map((option) => {
                                            const isSelected = tempSelectedModifiers.some(m => m.id === option.id);
                                            return (
                                                <TouchableOpacity
                                                    key={option.id}
                                                    onPress={() => toggleModifier(group, option)}
                                                    style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                                                >
                                                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.name}</Text>
                                                    {option.price > 0 && <Text style={[styles.optionPrice, isSelected && styles.optionTextSelected]}>+${option.price}</Text>}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}

                            <View style={styles.notesContainer}>
                                <Text style={styles.groupTitle}>Notas del pedido</Text>
                                <TextInput
                                    style={styles.notesInput}
                                    placeholder="Sin cebolla, extra salsa..."
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                />
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={() => selectedProductForModifiers && addToOrder(selectedProductForModifiers, tempSelectedModifiers)}
                        >
                            <Text style={styles.addBtnText}>Agregar a la Orden</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal visible={deleteModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteDialog}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ backgroundColor: '#fee2e2', padding: 16, borderRadius: 100, marginBottom: 16 }}>
                                <Trash2 size={32} color={colors.chile} />
                            </View>
                            <Text style={styles.deleteTitle}>¿Eliminar producto?</Text>
                            <Text style={styles.deleteMessage}>Esta acción no se puede deshacer.</Text>
                        </View>

                        <View style={styles.deleteActions}>
                            <TouchableOpacity
                                style={[styles.deleteBtn, { backgroundColor: colors.offWhite }]}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={[styles.deleteBtnText, { color: colors.castIron }]}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.deleteBtn, { backgroundColor: colors.chile }]}
                                onPress={confirmDelete}
                            >
                                <Text style={[styles.deleteBtnText, { color: colors.white }]}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.oatCream,
    },
    // COLUMN 1
    sidebar: {
        width: '18%',
        backgroundColor: colors.white,
        borderRightWidth: 1,
        borderRightColor: colors.lightGray,
        paddingTop: spacing.md,
    },
    // COLUMN 2
    mainArea: {
        width: '52%',
        padding: spacing.md,
    },
    // COLUMN 3
    orderPreview: {
        width: '30%',
        backgroundColor: colors.white,
        borderLeftWidth: 1,
        borderLeftColor: colors.lightGray,
        display: 'flex',
        flexDirection: 'column',
    },

    // Categories
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        marginHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    categoryItemSelected: {
        backgroundColor: colors.castIron,
        ...shadows.sm,
    },
    categoryText: {
        fontSize: typography.sm,
        color: colors.gray,
        fontWeight: typography.bold,
    },
    categoryTextSelected: {
        color: colors.white,
    },

    // Grid
    gridContent: {
        paddingBottom: 100,
    },
    gridRow: {
        justifyContent: 'flex-start',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    productCard: {
        width: '31%', // Fits 3 columns comfortably with gaps
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        padding: spacing.xs, // Reduced padding
        paddingBottom: spacing.sm,
        justifyContent: 'flex-start',
        alignItems: 'center',
        ...shadows.sm,
        borderWidth: 2,
        borderColor: 'transparent',
        overflow: 'hidden'
    },
    productCardSelected: {
        borderColor: colors.roastedSaffron,
        backgroundColor: colors.oatCream,
        ...shadows.md,
    },
    productImage: {
        width: '100%',
        aspectRatio: 1.2, // Fixed aspect ratio instead of flex height
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
        backgroundColor: colors.lightGray,
    },
    productImagePlaceholder: {
        width: '100%',
        aspectRatio: 1.2,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
        backgroundColor: colors.offWhite,
        alignItems: 'center',
        justifyContent: 'center',
    },
    productInfo: {
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 2,
    },
    productName: {
        fontSize: typography.xs,
        fontWeight: typography.bold,
        color: colors.castIron,
        textAlign: 'center',
        marginBottom: 2,
    },
    productPrice: {
        fontSize: typography.xs,
        color: colors.gray,
        fontWeight: typography.bold,
    },
    textSelected: {
        color: colors.roastedSaffron,
    },
    modifierBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 100,
        padding: 4,
    },

    // ORDER PREVIEW STYLES
    previewHeader: {
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
        backgroundColor: colors.offWhite,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    previewTitle: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    sessionBadge: {
        backgroundColor: colors.castIron,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    sessionBadgeText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: typography.bold,
    },
    orderList: {
        flex: 1,
        padding: spacing.md,
    },
    emptyOrder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
        gap: spacing.sm,
    },
    emptyOrderText: {
        fontWeight: typography.bold,
        color: colors.gray,
    },
    emptyOrderSubtext: {
        fontSize: typography.xs,
        color: colors.gray,
    },
    orderItem: {
        marginBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.offWhite,
        paddingBottom: spacing.sm,
    },
    orderItemHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    qtyBadge: {
        backgroundColor: colors.lightGray,
        borderRadius: borderRadius.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: spacing.sm,
    },
    qtyText: {
        fontSize: typography.xs,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    orderItemInfo: {
        flex: 1,
    },
    orderItemName: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    modifierText: {
        fontSize: 11,
        color: colors.gray,
    },
    notesText: {
        fontSize: 11,
        color: colors.roastedSaffron,
        fontStyle: 'italic',
        marginTop: 2,
    },
    orderItemPrice: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    notesSection: {
        marginBottom: spacing.md,
    },
    sessionNotesInput: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.lightGray,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: typography.base, // Larger text
        color: colors.castIron,
        minHeight: 80,
    },
    notesLabel: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.castIron,
        marginBottom: spacing.xs,
    },

    // Footer
    previewFooter: {
        padding: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        backgroundColor: colors.white,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    totalLabel: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.gray,
    },
    totalValue: {
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    payBtn: {
        backgroundColor: colors.albahaca,
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    payBtnText: {
        color: colors.white,
        fontWeight: typography.bold,
        fontSize: typography.lg,
    },

    // Standard Loading/Empty
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
        gap: spacing.md,
    },
    emptyText: {
        color: colors.gray,
        fontSize: typography.base,
    },

    // Modal Styles (Kept same)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '60%',
        maxHeight: '80%',
        backgroundColor: colors.white,
        borderRadius: borderRadius.xxl,
        padding: spacing.xl,
        ...shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    // ... Existing Styles ...

    // Delete Dialog
    deleteDialog: {
        width: 400,
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        ...shadows.lg,
    },
    deleteTitle: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.castIron,
        marginBottom: 8,
    },
    deleteMessage: {
        fontSize: typography.sm,
        color: colors.gray,
        textAlign: 'center',
    },
    deleteActions: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    deleteBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteBtnText: {
        fontWeight: typography.bold,
        fontSize: typography.sm,
    },
    modalTitle: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    closeBtn: {
        color: colors.gray,
        fontWeight: typography.bold,
    },
    modalScroll: {
        marginBottom: spacing.xl,
    },
    modifierGroup: {
        marginBottom: spacing.lg,
    },
    groupTitle: {
        fontSize: typography.base,
        fontWeight: typography.bold,
        color: colors.castIron,
        marginBottom: spacing.md,
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    optionBtn: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.lightGray,
        flexDirection: 'row',
        gap: spacing.sm,
    },
    optionBtnSelected: {
        backgroundColor: colors.roastedSaffron,
        borderColor: colors.roastedSaffron,
    },
    optionText: {
        color: colors.castIron,
        fontWeight: typography.medium,
    },
    optionTextSelected: {
        color: colors.white,
    },
    optionPrice: {
        color: colors.gray,
        fontSize: 12,
    },
    addBtn: {
        backgroundColor: colors.albahaca,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    addBtnText: {
        color: colors.white,
        fontSize: typography.lg,
        fontWeight: typography.bold,
    },
    notesContainer: {
        marginTop: spacing.md,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: colors.lightGray,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        height: 80,
        textAlignVertical: 'top',
    }
});
