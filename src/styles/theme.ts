import { StyleSheet } from 'react-native';

// Culinary Canvas Design Tokens - Gastronomy-Inspired Palette
export const colors = {
    // Brand Core & Text
    castIron: '#2C3E50',        // Primary text, headers
    darkText: '#222222',         // Secondary text (kept for compatibility)

    // Action & Accents (replaces Airbnb pink)
    roastedSaffron: '#E67E22',  // Primary CTA, active elements
    saffronHover: '#D35400',    // Hover state for saffron

    // Light Mode Backgrounds (Cliente/Admin)
    oatCream: '#FDFBF7',        // Base background
    white: '#FFFFFF',           // Pure white for cards
    stoneGrey: '#F0EFEB',       // Alternative surface

    // Dark Mode Backgrounds (Cocina/Mesero)
    deepCharcoal: '#1F2933',    // Base dark background
    surfaceDark: '#2D3748',     // Cards/surfaces in dark mode

    // Neutrals
    offWhite: '#F7F7F7',
    lightGray: '#E5E5E5',
    gray: '#717171',
    darkGray: '#484848',

    // State Colors (Gastronomy-themed)
    albahaca: '#27AE60',        // Success/Ready (Basil green)
    curcuma: '#F39C12',         // Pending/Warning (Turmeric yellow)
    chile: '#C0392B',           // Error/Danger (Chili red)

    // Legacy compatibility (will be phased out)
    airbnbPink: '#E67E22',      // Mapped to roastedSaffron for backward compatibility
    error: '#C0392B',           // Mapped to chile
    success: '#27AE60',         // Mapped to albahaca
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    rounded: 100,
};

export const typography = {
    // Font sizes
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 36,

    // Font weights
    regular: '400' as '400',
    medium: '500' as '500',
    semibold: '600' as '600',
    bold: '700' as '700',
};

// Shared shadow styles
export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
};

// Common reusable styles
export const commonStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        ...shadows.md,
    },
});
