import React, { createContext, useContext, useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { Restaurant } from '../types/firestore';
import { useAuth } from './AuthContext';

interface TenantContextType {
    restaurant: Restaurant | null;
    loading: boolean;
    error: string | null;
    refreshRestaurant: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !user.restaurantId) {
            setRestaurant(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Real-time listener for restaurant data
        const unsubscribe = onSnapshot(
            doc(db, 'restaurants', user.restaurantId),
            (snapshot) => {
                if (snapshot.exists()) {
                    setRestaurant({
                        id: snapshot.id,
                        ...snapshot.data()
                    } as Restaurant);
                    setError(null);
                } else {
                    setError('Restaurant not found');
                    setRestaurant(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching restaurant data:', err);
                setError('Failed to load restaurant data');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user?.restaurantId]);

    const refreshRestaurant = () => {
        // Force re-fetch by toggling loading state
        // The useEffect will handle the actual refetch
        setLoading(true);
    };

    return (
        <TenantContext.Provider value={{ restaurant, loading, error, refreshRestaurant }}>
            {children}
        </TenantContext.Provider>
    );
}

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};
