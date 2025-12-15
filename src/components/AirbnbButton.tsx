import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    View,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'google';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AirbnbButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    icon?: keyof typeof Ionicons.glyphMap;
    fullWidth?: boolean;
}

export default function AirbnbButton({
    title,
    onPress,
    variant = 'primary',
    size = 'lg',
    loading = false,
    disabled = false,
    icon,
    fullWidth = true,
}: AirbnbButtonProps) {
    const buttonStyle: ViewStyle[] = [
        styles.button,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
    ].filter(Boolean) as ViewStyle[];

    const textStyle: TextStyle[] = [
        styles.buttonText,
        styles[`${variant}Text`],
        styles[`size_${size}Text`],
    ].filter(Boolean) as TextStyle[];

    return (
        <TouchableOpacity
            style={buttonStyle}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? colors.white : colors.roastedSaffron}
                />
            ) : (
                <View style={styles.content}>
                    {icon && (
                        <Ionicons
                            name={icon}
                            size={20}
                            color={variant === 'primary' ? colors.white : colors.darkText}
                            style={styles.icon}
                        />
                    )}
                    <Text style={textStyle}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    fullWidth: {
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginRight: spacing.sm,
    },

    // Variants
    primary: {
        backgroundColor: colors.roastedSaffron,
    },
    secondary: {
        backgroundColor: colors.offWhite,
        borderWidth: 1,
        borderColor: colors.lightGray,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.darkText,
    },
    google: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.darkText,
    },
    disabled: {
        opacity: 0.5,
    },

    // Sizes
    size_sm: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        minHeight: 36,
    },
    size_md: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: 44,
    },
    size_lg: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        minHeight: 52,
    },

    // Text styles
    buttonText: {
        fontWeight: typography.semibold,
    },
    primaryText: {
        color: colors.white,
        fontSize: typography.base,
    },
    secondaryText: {
        color: colors.darkText,
        fontSize: typography.base,
    },
    outlineText: {
        color: colors.darkText,
        fontSize: typography.base,
    },
    googleText: {
        color: colors.darkText,
        fontSize: typography.base,
    },
    size_smText: {
        fontSize: typography.sm,
    },
    size_mdText: {
        fontSize: typography.base,
    },
    size_lgText: {
        fontSize: typography.lg,
    },
});
