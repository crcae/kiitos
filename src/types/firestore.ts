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

// Combined role type
export type UserRole = SaaSRole | TenantRole | OperationalRole;

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
}

// ============================================
// ORDERS & SESSIONS
// ============================================

export interface OrderItem {
    id: string; // Product/MenuItem ID
    session_id: string;
    product_id: string;
    modifiers?: ProductModifier[];
    created_by: 'guest' | 'waiter'; // For legacy compatibility
    created_by_id?: string; // Format: "guest-1", "guest-2", "waiter-1", etc.

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
}

export interface Category {
    id: string;
    name: string;
    sort_order?: number;
    image_url?: string;
}

export interface ProductModifier {
    id: string;
    name: string;
    price_adjustment: number;
}

export interface Product {
    id: string;
    category_id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    modifiers?: ProductModifier[];
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

