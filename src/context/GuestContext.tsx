import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebaseConfig';
import { User } from 'firebase/auth';

interface GuestSession {
    sessionId: string;
    createdAt: string;
    tempName: string;
}

interface GuestContextType {
    isGuest: boolean;
    guestSession: GuestSession | null;
    initializeGuestSession: () => Promise<void>;
    clearGuestSession: () => Promise<void>;
    getGuestName: () => string;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

const GUEST_SESSION_KEY = '@kiitos_guest_session';

export function GuestProvider({ children }: { children: ReactNode }) {
    const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
    const [isGuest, setIsGuest] = useState(true);

    useEffect(() => {
        // Monitor auth state
        const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
            setIsGuest(!user);
            if (user) {
                // User logged in, clear guest session
                clearGuestSession();
            }
        });

        // Load existing guest session on mount
        loadGuestSession();

        return unsubscribe;
    }, []);

    const loadGuestSession = async () => {
        try {
            const sessionData = await AsyncStorage.getItem(GUEST_SESSION_KEY);
            if (sessionData) {
                const session = JSON.parse(sessionData);

                // Check if session is expired (7 days)
                const createdDate = new Date(session.createdAt);
                const now = new Date();
                const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);

                if (daysDiff > 7) {
                    // Session expired, create new one
                    await initializeGuestSession();
                } else {
                    setGuestSession(session);
                }
            } else {
                // No session exists, create one
                await initializeGuestSession();
            }
        } catch (error) {
            console.error('Error loading guest session:', error);
            await initializeGuestSession();
        }
    };

    const initializeGuestSession = async () => {
        const newSession: GuestSession = {
            sessionId: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            tempName: 'Invitado',
        };

        try {
            await AsyncStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(newSession));
            setGuestSession(newSession);
        } catch (error) {
            console.error('Error saving guest session:', error);
        }
    };

    const clearGuestSession = async () => {
        try {
            await AsyncStorage.removeItem(GUEST_SESSION_KEY);
            setGuestSession(null);
        } catch (error) {
            console.error('Error clearing guest session:', error);
        }
    };

    const getGuestName = () => {
        return guestSession?.tempName || 'Invitado';
    };

    return (
        <GuestContext.Provider
            value={{
                isGuest,
                guestSession,
                initializeGuestSession,
                clearGuestSession,
                getGuestName,
            }}
        >
            {children}
        </GuestContext.Provider>
    );
}

export function useGuest() {
    const context = useContext(GuestContext);
    if (context === undefined) {
        throw new Error('useGuest must be used within a GuestProvider');
    }
    return context;
}
