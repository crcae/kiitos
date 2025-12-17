import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { Restaurant } from '../types/firestore';
import { useAuth } from '../context/AuthContext';

export function useRestaurant() {
    const { user } = useAuth();
    const restaurantId = user?.restaurantId;

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!restaurantId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsub = onSnapshot(doc(db, 'restaurants', restaurantId), (doc) => {
            if (doc.exists()) {
                setRestaurant({ id: doc.id, ...doc.data() } as Restaurant);
            } else {
                setRestaurant(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching restaurant:", err);
            setError(err);
            setLoading(false);
        });

        return () => unsub();
    }, [restaurantId]);

    return { restaurant, loading, error };
}
