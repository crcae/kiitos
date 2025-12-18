import { MenuItem as FirestoreMenuItem, Restaurant as FirestoreRestaurant } from './firestore';

// Re-export or extend Firestore types for Marketplace usage
export interface MarketplaceRestaurant extends FirestoreRestaurant {
    distance?: string; // Calculated field, not in DB
    rating?: number;   // Calculated or separate collection
}

export interface MenuItem extends FirestoreMenuItem {
    // Add any marketplace-specific fields if needed, currently matching Firestore
}

export interface CartItem extends MenuItem {
    quantity: number;
    specialInstructions?: string;
}
