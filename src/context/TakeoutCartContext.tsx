import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PickupOrderItem, Product, SelectedModifier } from '../types/firestore';

interface TakeoutCartItem extends PickupOrderItem {
    // Extend with any additional UI-specific fields if needed
}

interface TakeoutCartContextType {
    items: TakeoutCartItem[];
    restaurantId: string | null;
    addItem: (product: Product, quantity: number, modifiers?: SelectedModifier[]) => Promise<void>;
    removeItem: (productId: string) => Promise<void>;
    updateQuantity: (productId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    getCartTotal: () => number;
    getCartSubtotal: () => number;
    getCartTax: (taxRate: number) => number;
    initializeCart: (restaurantId: string) => void;
}

const TakeoutCartContext = createContext<TakeoutCartContextType | undefined>(undefined);

const CART_STORAGE_KEY = '@kiitos_takeout_cart';

export function TakeoutCartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<TakeoutCartItem[]>([]);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    // Load cart from storage on mount
    useEffect(() => {
        loadCart();
    }, []);

    // Save cart to storage whenever it changes
    useEffect(() => {
        if (restaurantId) {
            saveCart();
        }
    }, [items, restaurantId]);

    const loadCart = async () => {
        try {
            const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
            if (cartData) {
                const parsed = JSON.parse(cartData);
                setItems(parsed.items || []);
                setRestaurantId(parsed.restaurantId || null);
            }
        } catch (error) {
            console.error('Error loading cart:', error);
        }
    };

    const saveCart = async () => {
        try {
            const cartData = {
                items,
                restaurantId,
                updatedAt: new Date().toISOString()
            };
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    };

    const initializeCart = (newRestaurantId: string) => {
        // If switching restaurants, clear the cart
        if (restaurantId && restaurantId !== newRestaurantId) {
            setItems([]);
        }
        setRestaurantId(newRestaurantId);
    };

    const addItem = async (product: Product, quantity: number, modifiers: SelectedModifier[] = []) => {
        // Check if item already exists in cart with SAME modifiers
        const existingItemIndex = items.findIndex(item =>
            item.product_id === product.id &&
            JSON.stringify(item.modifiers?.sort((a, b) => a.id.localeCompare(b.id))) ===
            JSON.stringify(modifiers.sort((a, b) => a.id.localeCompare(b.id)))
        );

        if (existingItemIndex >= 0) {
            // Update quantity
            const updatedItems = [...items];
            updatedItems[existingItemIndex].quantity += quantity;
            setItems(updatedItems);
        } else {
            // Add new item
            const newItem: TakeoutCartItem = {
                product_id: product.id,
                name: product.name,
                price: product.price,
                quantity,
                modifiers
            };
            setItems([...items, newItem]);
        }
    };

    const removeItem = async (productId: string) => {
        setItems(items.filter(item => item.product_id !== productId));
    };

    const updateQuantity = async (productId: string, quantity: number) => {
        if (quantity <= 0) {
            await removeItem(productId);
            return;
        }

        const updatedItems = items.map(item =>
            item.product_id === productId
                ? { ...item, quantity }
                : item
        );
        setItems(updatedItems);
    };

    const clearCart = async () => {
        setItems([]);
        try {
            await AsyncStorage.removeItem(CART_STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing cart:', error);
        }
    };

    const getCartSubtotal = (): number => {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const getCartTax = (taxRate: number): number => {
        return getCartSubtotal() * (taxRate / 100);
    };

    const getCartTotal = (): number => {
        return getCartSubtotal(); // Tax will be added separately in checkout
    };

    return (
        <TakeoutCartContext.Provider
            value={{
                items,
                restaurantId,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
                getCartTotal,
                getCartSubtotal,
                getCartTax,
                initializeCart
            }}
        >
            {children}
        </TakeoutCartContext.Provider>
    );
}

export function useTakeoutCart() {
    const context = useContext(TakeoutCartContext);
    if (context === undefined) {
        throw new Error('useTakeoutCart must be used within a TakeoutCartProvider');
    }
    return context;
}
