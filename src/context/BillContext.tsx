import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface BillItem {
    id: string;
    name: string;
    price: number;
    assignedTo?: string[]; // userIds
}

export interface BillState {
    restaurantName: string;
    items: BillItem[];
    subtotal: number;
    tax: number;
    total: number;
    splitMode: 'full' | 'equal' | 'items';
    splitCount: number; // for equal split
    tipPercentage: number;
    customTipAmount: number;
}

interface BillContextType {
    bill: BillState;
    setBill: (bill: BillState) => void;
    updateSplitMode: (mode: 'full' | 'equal' | 'items') => void;
    updateSplitCount: (count: number) => void;
    updateTip: (percentage: number, customAmount?: number) => void;
    assignItem: (itemId: string, userId: string) => void;
    resetBill: () => void;
}

const initialBill: BillState = {
    restaurantName: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    splitMode: 'full',
    splitCount: 1,
    tipPercentage: 0,
    customTipAmount: 0,
};

const BillContext = createContext<BillContextType | undefined>(undefined);

export function BillProvider({ children }: { children: ReactNode }) {
    const [bill, setBill] = useState<BillState>(initialBill);

    const updateSplitMode = (mode: 'full' | 'equal' | 'items') => {
        setBill(prev => ({ ...prev, splitMode: mode }));
    };

    const updateSplitCount = (count: number) => {
        setBill(prev => ({ ...prev, splitCount: count }));
    };

    const updateTip = (percentage: number, customAmount: number = 0) => {
        setBill(prev => ({ ...prev, tipPercentage: percentage, customTipAmount: customAmount }));
    };

    const assignItem = (itemId: string, userId: string) => {
        // Logic to toggle assignment
        setBill(prev => {
            const newItems = prev.items.map(item => {
                if (item.id === itemId) {
                    const assigned = item.assignedTo || [];
                    const isAssigned = assigned.includes(userId);
                    return {
                        ...item,
                        assignedTo: isAssigned
                            ? assigned.filter(id => id !== userId)
                            : [...assigned, userId]
                    };
                }
                return item;
            });
            return { ...prev, items: newItems };
        });
    };

    const resetBill = () => setBill(initialBill);

    return (
        <BillContext.Provider value={{ bill, setBill, updateSplitMode, updateSplitCount, updateTip, assignItem, resetBill }}>
            {children}
        </BillContext.Provider>
    );
}

export function useBill() {
    const context = useContext(BillContext);
    if (context === undefined) {
        throw new Error('useBill must be used within a BillProvider');
    }
    return context;
}
