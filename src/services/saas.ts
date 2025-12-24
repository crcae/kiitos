import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    Timestamp,
    addDoc,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
    Restaurant,
    User,
    SubscriptionPlan,
    UserRole,
    OperationalRole,
    TenantRole,
    StaffInvitation,
    RestaurantSettings
} from '../types/firestore';

/**
 * Creates a new restaurant (tenant) in the system
 * Called during signup flow when a new restaurant owner registers
 */
export async function createRestaurant(
    ownerId: string,
    ownerEmail: string,
    plan: SubscriptionPlan,
    restaurantName: string
): Promise<string> {
    try {
        // Create restaurant document
        const restaurantRef = doc(collection(db, 'restaurants'));
        const restaurantId = restaurantRef.id;

        const now = Timestamp.now();
        const trialEndDate = new Timestamp(
            now.seconds + (30 * 24 * 60 * 60), // 30 days from now
            now.nanoseconds
        );

        const restaurant: Restaurant = {
            id: restaurantId,
            ownerId,
            name: restaurantName,
            onboardingComplete: false,
            settings: {
                currency: 'USD',
                timezone: 'America/Mexico_City',
                taxRate: 16, // Default 16% tax
            },
            subscription: {
                plan,
                status: 'trial',
                startDate: now,
                endDate: trialEndDate,
            },
            createdAt: now,
            updatedAt: now,
            menu: [],
            tables: 10, // Default table count
        };

        await setDoc(restaurantRef, restaurant);
        console.log(`✅ Restaurant created: ${restaurantId}`);

        return restaurantId;
    } catch (error) {
        console.error('Error creating restaurant:', error);
        throw new Error('Failed to create restaurant');
    }
}

/**
 * Assigns a user to a restaurant with a specific role
 * Updates the user document with restaurantId and role
 */
export async function assignUserToRestaurant(
    userId: string,
    restaurantId: string,
    role: UserRole,
    name: string,
    email: string
): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);

        const userData: User = {
            id: userId,
            email,
            name,
            role,
            restaurantId,
            createdAt: Timestamp.now(),
            onboardingComplete: role === 'restaurant_owner' ? false : true,
        };

        await setDoc(userRef, userData);
        console.log(`✅ User ${userId} assigned to restaurant ${restaurantId} as ${role}`);
    } catch (error) {
        console.error('Error assigning user to restaurant:', error);
        throw new Error('Failed to assign user to restaurant');
    }
}

/**
 * Gets the user document from Firestore
 */
export async function getUserData(userId: string): Promise<User | null> {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data() as User;
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

/**
 * Gets the restaurant document from Firestore
 */
export async function getRestaurantData(restaurantId: string): Promise<Restaurant | null> {
    try {
        const restaurantRef = doc(db, 'restaurants', restaurantId);
        const restaurantSnap = await getDoc(restaurantRef);

        if (restaurantSnap.exists()) {
            return restaurantSnap.data() as Restaurant;
        }
        return null;
    } catch (error) {
        console.error('Error getting restaurant data:', error);
        return null;
    }
}

/**
 * Marks onboarding as complete for a restaurant and the owner
 */
export async function completeOnboarding(restaurantId: string, userId: string): Promise<void> {
    try {
        // 1. Update Restaurant
        const restaurantRef = doc(db, 'restaurants', restaurantId);
        await updateDoc(restaurantRef, {
            onboardingComplete: true,
            updatedAt: Timestamp.now(),
        });

        // 2. Update User (Owner)
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            onboardingComplete: true,
        });

        console.log(`✅ Onboarding completed for restaurant ${restaurantId} and user ${userId}`);
    } catch (error) {
        console.error('Error completing onboarding:', error);
        throw new Error('Failed to complete onboarding');
    }
}

/**
 * Updates restaurant business information
 */
export async function updateRestaurantInfo(
    restaurantId: string,
    data: Partial<Pick<Restaurant, 'name' | 'logo' | 'address'>>
): Promise<void> {
    try {
        const restaurantRef = doc(db, 'restaurants', restaurantId);
        await updateDoc(restaurantRef, {
            ...data,
            updatedAt: Timestamp.now(),
        });
        console.log(`✅ Restaurant info updated: ${restaurantId}`);
    } catch (error) {
        console.error('Error updating restaurant info:', error);
        throw new Error('Failed to update restaurant information');
    }
}

/**
 * Updates restaurant operational settings
 */
export async function updateRestaurantSettings(
    restaurantId: string,
    settings: Partial<RestaurantSettings>
): Promise<void> {
    try {
        const restaurantRef = doc(db, 'restaurants', restaurantId);
        const restaurantSnap = await getDoc(restaurantRef);

        if (!restaurantSnap.exists()) {
            throw new Error('Restaurant not found');
        }

        const currentSettings = restaurantSnap.data().settings || {};
        const updatedSettings = { ...currentSettings, ...settings };

        await updateDoc(restaurantRef, {
            settings: updatedSettings,
            updatedAt: Timestamp.now(),
        });
        console.log(`✅ Restaurant settings updated: ${restaurantId}`);
    } catch (error) {
        console.error('Error updating restaurant settings:', error);
        throw new Error('Failed to update restaurant settings');
    }
}

/**
 * Updates restaurant subscription status
 */
export async function updateRestaurantSubscription(
    restaurantId: string,
    plan: SubscriptionPlan,
    status: 'active' | 'trial' | 'past_due' | 'cancelled'
): Promise<void> {
    try {
        const restaurantRef = doc(db, 'restaurants', restaurantId);

        await updateDoc(restaurantRef, {
            'subscription.plan': plan,
            'subscription.status': status,
            'subscription.updatedAt': Timestamp.now(),
        });
        console.log(`✅ Restaurant subscription updated: ${restaurantId}`);
    } catch (error) {
        console.error('Error updating restaurant subscription:', error);
        throw new Error('Failed to update restaurant subscription');
    }
}

/**
 * Creates a staff invitation
 * Sends an email invitation (simulated for now) to join the restaurant
 */
export async function inviteStaffMember(
    email: string,
    role: OperationalRole | TenantRole,
    restaurantId: string,
    invitedBy: string
): Promise<string> {
    try {
        const invitationRef = doc(collection(db, 'staffInvitations'));
        const invitationId = invitationRef.id;

        const now = Timestamp.now();
        const expiresAt = new Timestamp(
            now.seconds + (7 * 24 * 60 * 60), // Expires in 7 days
            now.nanoseconds
        );

        const invitation: StaffInvitation = {
            id: invitationId,
            restaurantId,
            email,
            role,
            status: 'pending',
            invitedBy,
            createdAt: now,
            expiresAt,
        };

        await setDoc(invitationRef, invitation);

        // TODO: Send actual email invitation
        console.log(`📧 [SIMULATED] Invitation email sent to ${email} for role ${role}`);
        console.log(`✅ Staff invitation created: ${invitationId}`);

        return invitationId;
    } catch (error) {
        console.error('Error creating staff invitation:', error);
        throw new Error('Failed to create staff invitation');
    }
}

/**
 * Creates a staff member directly (without invitation flow)
 * Used during onboarding when owner creates initial staff
 */
export async function createStaffMember(
    email: string,
    name: string,
    role: OperationalRole | TenantRole,
    restaurantId: string
): Promise<string> {
    try {
        // In a real app, this would trigger Firebase Auth user creation
        // For now, we'll create a placeholder user document
        const userRef = doc(collection(db, 'users'));
        const userId = userRef.id;

        const userData: User = {
            id: userId,
            email,
            name,
            role,
            restaurantId,
            createdAt: Timestamp.now(),
            onboardingComplete: true, // Staff don't need onboarding
        };

        await setDoc(userRef, userData);
        console.log(`✅ Staff member created: ${userId} (${role})`);

        return userId;
    } catch (error) {
        console.error('Error creating staff member:', error);
        throw new Error('Failed to create staff member');
    }
}

/**
 * Gets all staff members for a restaurant
 */
export async function getRestaurantStaff(restaurantId: string): Promise<User[]> {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('restaurantId', '==', restaurantId));
        const querySnapshot = await getDocs(q);

        const staff: User[] = [];
        querySnapshot.forEach((doc) => {
            staff.push(doc.data() as User);
        });

        return staff;
    } catch (error) {
        console.error('Error getting restaurant staff:', error);
        return [];
    }
}

/**
 * Gets pending invitations for a restaurant
 */
export async function getPendingInvitations(restaurantId: string): Promise<StaffInvitation[]> {
    try {
        const invitationsRef = collection(db, 'staffInvitations');
        const q = query(
            invitationsRef,
            where('restaurantId', '==', restaurantId),
            where('status', '==', 'pending')
        );
        const querySnapshot = await getDocs(q);

        const invitations: StaffInvitation[] = [];
        querySnapshot.forEach((doc) => {
            invitations.push(doc.data() as StaffInvitation);
        });

        return invitations;
    } catch (error) {
        console.error('Error getting pending invitations:', error);
        return [];
    }
}
