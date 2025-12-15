import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/firestore';
import { hasAnyRole, hasPermission } from '../utils/permissions';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    requiredRole?: UserRole;
    fallback?: React.ReactNode;
}

/**
 * Role Guard Component
 * 
 * Conditionally renders children based on user role
 * 
 * Usage:
 * - allowedRoles: Render if user has any of these specific roles
 * - requiredRole: Render if user has this role or higher in hierarchy
 * - fallback: Optional component to render if access denied
 * 
 * Examples:
 * <RoleGuard allowedRoles={['restaurant_owner']}>
 *   <BillingPanel />
 * </RoleGuard>
 * 
 * <RoleGuard requiredRole="waiter">
 *   <TableManagement />
 * </RoleGuard>
 */
export function RoleGuard({
    children,
    allowedRoles,
    requiredRole,
    fallback = null
}: RoleGuardProps) {
    const { user } = useAuth();

    if (!user) {
        return <>{fallback}</>;
    }

    let hasAccess = false;

    if (allowedRoles) {
        // Check if user has any of the allowed roles
        hasAccess = hasAnyRole(user.role, allowedRoles);
    } else if (requiredRole) {
        // Check if user has required role or higher
        hasAccess = hasPermission(user.role, requiredRole);
    } else {
        // No restrictions, allow access
        hasAccess = true;
    }

    if (hasAccess) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}

/**
 * HOC version of RoleGuard for wrapping components
 */
export function withRoleGuard(
    Component: React.ComponentType<any>,
    allowedRoles?: UserRole[],
    requiredRole?: UserRole
) {
    return function GuardedComponent(props: any) {
        return (
            <RoleGuard allowedRoles={allowedRoles} requiredRole={requiredRole}>
                <Component {...props} />
            </RoleGuard>
        );
    };
}
