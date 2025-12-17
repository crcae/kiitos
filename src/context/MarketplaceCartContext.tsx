import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, MenuItem } from '../types/marketplace';

interface MarketplaceCartContextType {
    cartItems: CartItem[];
    addToCart: (item: MenuItem, quantity: number, instructions?: string) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    cartTotal: number;
    cartItemCount: number;
}

const MarketplaceCartContext = createContext<MarketplaceCartContextType | undefined>(undefined);

export const MarketplaceCartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    const addToCart = (item: MenuItem, quantity: number, instructions?: string) => {
        setCartItems(prev => {
            const existingItem = prev.find(i => i.id === item.id);
            if (existingItem) {
                return prev.map(i =>
                    i.id === item.id
                        ? { ...i, quantity: i.quantity + quantity, specialInstructions: instructions || i.specialInstructions }
                        : i
                );
            }
            // Ensure we map the Firestore MenuItem correctly to CartItem
            return [...prev, { ...item, quantity, specialInstructions: instructions }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCartItems(prev => prev.filter(i => i.id !== itemId));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    return (
        <MarketplaceCartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            clearCart,
            cartTotal,
            cartItemCount
        }}>
            {children}
        </MarketplaceCartContext.Provider>
    );
};

export const useMarketplaceCart = () => {
    const context = useContext(MarketplaceCartContext);
    if (!context) {
        throw new Error('useMarketplaceCart must be used within a MarketplaceCartProvider');
    }
    return context;
};
