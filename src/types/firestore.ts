import { Timestamp } from 'firebase/firestore';

// ============================================
// ROLE HIERARCHY
// ============================================

// SaaS Platform Level - Full system access
export type SaaSRole = 'saas_admin';

// Tenant Level - Restaurant ownership and management
export type TenantRole = 'restaurant_owner' | 'restaurant_manager';

// Operational Level - Day-to-day restaurant operations
export type OperationalRole = 'waiter' | 'kitchen' | 'cashier';

// Customer Level - App users
export type CustomerRole = 'customer';

// Combined role type
export type UserRole = SaaSRole | TenantRole | OperationalRole | CustomerRole;

// Legacy alias for backward compatibility
export type AdminRole = 'admin';

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type TableStatus = 'available' | 'occupied' | 'reserved';
export type OrderStatus = 'pending' | 'sent' | 'preparing' | 'ready' | 'served';
export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

// ============================================
// USER & AUTHENTICATION
// ============================================

export interface User {
    id: string; // Firebase Auth UID
    email: string;
    role: UserRole;
    name: string;
    restaurantId: string; // Tenant isolation - links user to their restaurant
    phoneNumber?: string;
    avatar?: string;
    // Compatibility with Firebase User
    displayName?: string;
    photoURL?: string;
    createdAt: Timestamp;
    onboardingComplete?: boolean; // For restaurant owners
}

// ============================================
// RESTAURANT (TENANT)
// ============================================

export interface RestaurantAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface RestaurantSettings {
    currency: string; // e.g., 'USD', 'EUR', 'MXN'
    timezone: string; // e.g., 'America/Mexico_City'
    taxRate: number; // Percentage (e.g., 16 for 16%)
    serviceCharge?: number; // Optional service charge percentage
    allow_guest_ordering?: boolean; // Whether guests can order via digital menu
    enable_takeout?: boolean;
    branding?: {
        logo_url?: string;
        cover_image_url?: string;
        primary_color?: string;
        accent_color?: string;
        font_style?: 'modern' | 'serif' | 'mono';
    };
    opening_hours?: {
        [key: string]: { open: string; close: string; closed?: boolean };
    };
    address?: RestaurantAddress;
    google_place_id?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    location_name?: string;
    location_restriction?: {
        enabled: boolean;
        radius_meters: number;
    };
}

// ============================================
// REVIEWS
// ============================================

export interface Review {
    id: string;
    rating: number; // 1 to 5
    comment?: string;
    customer_name?: string;
    customer_phone?: string;
    order_id?: string;
    status: 'internal' | 'redirected_to_google';
    createdAt: Timestamp;
}

export interface Subscription {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    startDate: Timestamp;
    endDate?: Timestamp;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
}

export interface Restaurant {
    id: string; // Document ID
    ownerId: string; // User ID of the Restaurant Owner
    name: string;
    logo?: string; // URL to logo image
    address?: RestaurantAddress;
    settings: RestaurantSettings;
    subscription: Subscription;
    onboardingComplete: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;

    // Operational data
    menu: MenuItem[];
    tables: number; // Total count for initialization
}

// ============================================
// MENU
// ============================================

export interface MenuItem {
    id: string;
    restaurantId: string; // Tenant isolation
    name: string;
    price: number;
    category: string;
    description?: string;
    imageUrl?: string;
    available: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// ============================================
// TABLES
// ============================================

export interface Table {
    id: string;
    restaurantId: string; // Tenant isolation
    name: string;
    status: TableStatus;
    qr_code_data?: string;
    active_session_id?: string | null;
    currentSessionId: string | null; // Legacy, prefer active_session_id
    position: {
        x: number;
        y: number;
    };
    capacity?: number; // Number of seats
    current_session_total?: number; // Snapshot of the current session total for dashboard display
}

// ============================================
// ORDERS & SESSIONS
// ============================================

export interface SelectedModifier {
    id: string;
    name: string;
    price: number;
    group_name?: string;
}

export interface OrderItem {
    id: string; // Product/MenuItem ID
    session_id: string;
    product_id: string;
    modifiers?: SelectedModifier[];
    created_by: 'guest' | 'waiter'; // For legacy compatibility
    created_by_id?: string; // Format: "guest-1", "guest-2", "waiter-1", etc.
    created_by_name?: string; // Name of the person who created the order

    // Payment tracking
    paid_quantity: number; // Number of units paid (0 to quantity)
    payment_ids?: string[]; // Which payments covered this item

    // Legacy / Shared
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    status?: OrderStatus;
}

export type SessionStatus = 'active' | 'closed' | 'partial_payment';
export type PaymentStatus = 'unpaid' | 'paid' | 'partial' | 'refunded';

export interface SessionStaff {
    id: string;
    name: string;
    joinedAt: Timestamp;
}

export interface Session {
    id: string;
    restaurantId: string; // Tenant isolation
    tableId: string;
    tableName: string; // Denormalized for convenience
    status: SessionStatus;
    startTime: Timestamp;
    endTime?: Timestamp;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    serviceCharge?: number;
    total: number;
    paidAmount: number; // Legacy
    amount_paid: number; // Total payments received
    remaining_amount: number; // Calculated: total - amount_paid
    paymentStatus: PaymentStatus;
    qrCode: string;
    guestCount?: number;
    staff?: SessionStaff[];
    staff_ids?: string[];
}

export interface Order {
    id: string;
    restaurantId: string; // Tenant isolation
    sessionId: string;
    tableId: string;
    tableName: string; // Denormalized
    items: OrderItem[];
    status: OrderStatus;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    notes?: string;
}

// ============================================
// STAFF INVITATIONS
// ============================================

export interface StaffInvitation {
    id: string;
    restaurantId: string;
    email: string;
    role: OperationalRole | TenantRole;
    status: 'pending' | 'accepted' | 'expired';
    invitedBy: string; // User ID of the inviter
    createdAt: Timestamp;
    expiresAt: Timestamp;
    acceptedAt?: Timestamp;
}

// ============================================
// POS MODULE TYPES
// ============================================

export interface RestaurantConfig {
    currency: string;
    timezone?: string; // Optional as it might be in settings
    tax_rate: number;
    allow_guest_ordering: boolean;
    enable_takeout?: boolean; // New switch for takeout module
    preparation_time_minutes?: number; // Default prep time for ASAP orders
    opening_hours?: {
        mon?: { open: string; close: string }; // Format: "09:00", "22:00"
        tue?: { open: string; close: string };
        wed?: { open: string; close: string };
        thu?: { open: string; close: string };
        fri?: { open: string; close: string };
        sat?: { open: string; close: string };
        sun?: { open: string; close: string };
    };
}

export interface Category {
    id: string;
    name: string;
    sort_order?: number;
    image_url?: string;
}

export interface ModifierOption {
    id: string;
    name: string;
    price: number;
    available: boolean;
}

export interface ModifierGroup {
    id: string;
    name: string; // The label/question e.g. "Choose Sauce"
    min_selections: number;
    max_selections: number;
    required: boolean;
    options: ModifierOption[];
}

export interface Product {
    id: string;
    category_id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    modifiers?: ModifierGroup[];
    available: boolean;
}

export interface OrderSession {
    id: string;
    table_id: string;
    status: 'open' | 'closed';
    subtotal: number;
    total: number;
    paid_amount: number;
    notes?: string;
    created_at: Timestamp;
    updated_at: Timestamp;
}

// ============================================
// STAFF MANAGEMENT
// ============================================

export type StaffRole = 'admin' | 'waiter' | 'kitchen' | 'cashier';

export interface StaffMember {
    id: string;
    name: string;
    role: StaffRole;
    pin_code: string; // 4-digit numeric PIN
    active: boolean;
    joined_at: Timestamp;
}

// ============================================
// PAYMENTS
// ============================================

export type PaymentMethod = 'cash' | 'stripe' | 'other';

export interface PaymentItem {
    item_id: string;
    quantity_paid: number;
    amount: number;
}

export interface Payment {
    id: string;
    sessionId: string;
    amount: number; // Amount for consumption (excluding tip)
    tip?: number; // Tip amount (separate)
    method: PaymentMethod;
    createdAt: Timestamp;
    createdBy?: string; // Waiter ID, guest ID, or other identifier
    notes?: string;
    items?: PaymentItem[]; // Item-level breakdown for "pay by item" mode
}

// ============================================
// PICKUP/TAKEOUT ORDERS
// ============================================

export type PickupOrderStatus = 'scheduled' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PickupTimeOption = 'asap' | 'scheduled';
export type DiningOption = 'takeout' | 'eat_in';

export interface PickupOrderItem {
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    modifiers?: SelectedModifier[];
}

export interface PickupOrder {
    id: string;
    restaurantId: string;
    pickup_code: string; // 6-character unique code (e.g., "KII-9X2")
    dining_option?: DiningOption; // 'takeout' or 'eat_in'
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;

    items: PickupOrderItem[];
    subtotal: number;
    tax: number;
    total: number;

    time_option: PickupTimeOption;
    scheduled_time: Timestamp; // When customer wants to pick up
    created_at: Timestamp;

    status: PickupOrderStatus;
    payment_intent_id?: string; // Stripe payment reference

    notes?: string;
}

