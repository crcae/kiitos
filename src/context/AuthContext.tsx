import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { getUserData } from '../services/saas';
import { User, UserRole } from '../types/firestore';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<FirebaseUser>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    // Legacy method for testing - will be removed
    signInWithRole?: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen to Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setFirebaseUser(firebaseUser);

            if (firebaseUser) {
                // Fetch user data from Firestore
                const userData = await getUserData(firebaseUser.uid);
                if (userData) {
                    setUser(userData);
                } else {
                    // User authenticated but no Firestore document
                    // This might happen immediately after signup before document creation
                    console.warn('User authenticated but no Firestore document found');
                    setUser(null);
                }
            } else {
                setUser(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signUp = async (email: string, password: string): Promise<FirebaseUser> => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (error: any) {
            console.error('Error signing up:', error);
            throw new Error(error.message || 'Failed to sign up');
        }
    };

    const signIn = async (email: string, password: string): Promise<void> => {
        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email, password);
            // Auth state listener will handle user data loading
        } catch (error: any) {
            console.error('Error signing in:', error);
            setLoading(false);
            throw new Error(error.message || 'Failed to sign in');
        }
    };

    const signOut = async (): Promise<void> => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setFirebaseUser(null);
        } catch (error: any) {
            console.error('Error signing out:', error);
            throw new Error(error.message || 'Failed to sign out');
        }
    };

    // Legacy mock sign-in for testing existing flows
    const signInWithRole = async (role: UserRole): Promise<void> => {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        // This is a temporary mock - will be removed once all flows use real auth
        setUser({
            id: 'test-user-id',
            email: `${role}@kiitos.com`,
            name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            role: role,
            restaurantId: 'test-restaurant',
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
            onboardingComplete: true,
        });
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            loading,
            signUp,
            signIn,
            signOut,
            signInWithRole // Legacy - for backward compatibility
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

