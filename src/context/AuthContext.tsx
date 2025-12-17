import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInAnonymously,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User as FirebaseUser
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../services/firebaseConfig';
import { getUserData } from '../services/saas';
import { validateStaffPin } from '../services/staff';
import { User, UserRole } from '../types/firestore';

const SESSION_KEY = 'kiitos_session';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<FirebaseUser>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    signInWithRole: (role: UserRole) => Promise<void>;
    refreshUser: () => Promise<void>;
    loginStaff: (restaurantId: string, pin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen to Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            setFirebaseUser(currentUser);

            if (currentUser) {
                if (currentUser.isAnonymous) {
                    // Check for persisted staff session
                    try {
                        const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
                        if (sessionJson) {
                            const session = JSON.parse(sessionJson);
                            if (session.type === 'staff' && session.restaurantId && session.pin) {
                                console.log('[AuthContext] Restoring staff session...');
                                const staffMember = await validateStaffPin(session.restaurantId, session.pin);

                                if (staffMember) {
                                    // Hydrate user
                                    const staffUser: User = {
                                        id: currentUser.uid,
                                        email: 'staff@kiitos.app',
                                        role: staffMember.role as UserRole,
                                        name: staffMember.name,
                                        restaurantId: session.restaurantId,
                                        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
                                        onboardingComplete: true
                                    };
                                    setUser(staffUser);
                                    setLoading(false);
                                    return; // Exit here, success
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[AuthContext] Error restoring session:', e);
                    }

                    // If we got here, we failed to restore session
                    console.log('Anonymous user detected but no valid session found. Waiting for login.');
                    setUser(null);
                } else {
                    // Standard Email/Password User (Restaurant Owner)
                    // Polling Logic: Retry getting user data if it doesn't exist yet
                    // This handles the race condition where Auth is ready but Firestore trigger hasn't finished
                    let userData = null;
                    let attempts = 0;
                    const maxAttempts = 5;

                    while (!userData && attempts < maxAttempts) {
                        try {
                            userData = await getUserData(currentUser.uid);
                            if (userData) break;

                            console.log(`[AuthContext] Firestore doc not found. Retrying ${attempts + 1}/${maxAttempts}...`);
                            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
                            attempts++;
                        } catch (e) {
                            console.error("Error fetching user data during polling:", e);
                            attempts++; // Count error as attempt
                        }
                    }

                    if (userData) {
                        console.log(`[AuthContext] User data loaded for: ${userData.email}`);
                        setUser(userData);
                    } else {
                        console.warn('[AuthContext] User authenticated but no Firestore document found after retries.');
                        setUser(null);
                    }
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
        } catch (error: any) {
            console.error('Error signing in:', error);
            setLoading(false);
            throw new Error(error.message || 'Failed to sign in');
        }
    };

    const signOut = async (): Promise<void> => {
        try {
            await firebaseSignOut(auth);
            await AsyncStorage.removeItem(SESSION_KEY);
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

    const refreshUser = async () => {
        if (firebaseUser) {
            const userData = await getUserData(firebaseUser.uid);
            if (userData) {
                console.log(`[AuthContext] User data refreshed: ${userData.email} | Onboarding: ${userData.onboardingComplete}`);
                setUser(userData);
            }
        }
    };

    const loginStaff = async (restaurantId: string, pin: string): Promise<void> => {
        setLoading(true);
        try {
            // 1. Validate PIN against restaurant records
            const staffMember = await validateStaffPin(restaurantId, pin);
            if (!staffMember) {
                throw new Error('Invalid PIN code');
            }

            // 2. Persist session for reload/listener hydration
            // IMPORTANT: We do this BEFORE signInAnonymously so that when onAuthStateChanged fires,
            // the session is already in storage. This prevents the "no valid session" race condition.
            await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
                type: 'staff',
                restaurantId,
                pin
            }));

            // 3. Sign in anonymously to Firebase (gives a valid UID)
            // This triggers onAuthStateChanged which will read the storage we just wrote.
            const userCredential = await signInAnonymously(auth);

            // 4. Manually hydrate the user state with staff details
            const staffUser: User = {
                id: userCredential.user.uid,
                email: 'staff@kiitos.app',
                role: staffMember.role as UserRole,
                name: staffMember.name,
                restaurantId: restaurantId,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
                onboardingComplete: true
            };

            setUser(staffUser);
        } catch (error: any) {
            console.error('Staff Login Error:', error);
            setLoading(false);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            loading,
            signUp,
            signIn,
            signOut,
            signInWithRole,
            refreshUser,
            loginStaff
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
