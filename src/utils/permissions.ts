import { UserRole, SaaSRole, TenantRole, OperationalRole } from '../types/firestore';

/**
 * Role hierarchy levels (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
    // SaaS level
    saas_admin: 100,

    // Tenant level
    restaurant_owner: 50,
    restaurant_manager: 40,

    // Operational level
    waiter: 20,
    kitchen: 15,
    cashier: 10,
};

/**
 * Check if a user role has permission to perform an action requiring a specific role
 * Uses hierarchical comparison - higher roles have all permissions of lower roles
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    return userLevel >= requiredLevel;
}

/**
 * Check if user has one of the allowed roles
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(userRole);
}

/**
 * Check if user is a SaaS admin
 */
export function isSaaSAdmin(role: UserRole): role is SaaSRole {
    return role === 'saas_admin';
}

/**
 * Check if user is a restaurant owner
 */
export function isRestaurantOwner(role: UserRole): role is 'restaurant_owner' {
    return role === 'restaurant_owner';
}

/**
 * Check if user is a restaurant manager
 */
export function isRestaurantManager(role: UserRole): role is 'restaurant_manager' {
    return role === 'restaurant_manager';
}

/**
 * Check if user has management-level access (owner or manager)
 */
export function hasManagementAccess(role: UserRole): boolean {
    return isRestaurantOwner(role) || isRestaurantManager(role);
}

/**
 * Check if user is operational staff (waiter, kitchen, cashier)
 */
export function isOperationalStaff(role: UserRole): role is OperationalRole {
    return ['waiter', 'kitchen', 'cashier'].includes(role);
}

/**
 * Get human-readable role name
 */
export function getRoleDisplayName(role: UserRole): string {
    const displayNames: Record<UserRole, string> = {
        saas_admin: 'Platform Administrator',
        restaurant_owner: 'Restaurant Owner',
        restaurant_manager: 'Restaurant Manager',
        waiter: 'Waiter',
        kitchen: 'Kitchen Staff',
        cashier: 'Cashier',
    };
    return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
        saas_admin: 'Full platform access for system administration',
        restaurant_owner: 'Complete control over restaurant settings, staff, and billing',
        restaurant_manager: 'Operational management without billing access',
        waiter: 'Table and order management',
        kitchen: 'Kitchen display and order preparation',
        cashier: 'Payment processing and billing',
    };
    return descriptions[role] || '';
}

/**
 * Get available actions for a role
 */
export function getRolePermissions(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
        saas_admin: [
            'View all restaurants',
            'Access all tenant data',
            'Manage platform settings',
            'View system metrics',
        ],
        restaurant_owner: [
            'Manage restaurant settings',
            'View and modify menu',
            'Create and manage staff',
            'Access billing and subscription',
            'View all reports',
            'Configure operations',
        ],
        restaurant_manager: [
            'View and modify menu',
            'Manage daily operations',
            'View staff (cannot create/delete)',
            'View sales reports',
            'Manage tables and floor plan',
        ],
        waiter: [
            'View tables',
            'Create orders',
            'Update table status',
            'View menu',
        ],
        kitchen: [
            'View orders',
            'Update order status',
            'Mark items as ready',
        ],
        cashier: [
            'Process payments',
            'View active sessions',
            'Generate receipts',
            'Close bills',
        ],
    };
    return permissions[role] || [];
}

/**
 * Check if a role can manage users
 */
export function canManageUsers(role: UserRole): boolean {
    return isSaaSAdmin(role) || isRestaurantOwner(role);
}

/**
 * Check if a role can access billing
 */
export function canAccessBilling(role: UserRole): boolean {
    return isSaaSAdmin(role) || isRestaurantOwner(role);
}

/**
 * Check if a role can modify menu
 */
export function canModifyMenu(role: UserRole): boolean {
    return hasPermission(role, 'restaurant_manager');
}

/**
 * Check if a role can manage tables
 */
export function canManageTables(role: UserRole): boolean {
    return hasPermission(role, 'waiter');
}

/**
 * Check if a role can process orders
 */
export function canProcessOrders(role: UserRole): boolean {
    return hasPermission(role, 'kitchen');
}
