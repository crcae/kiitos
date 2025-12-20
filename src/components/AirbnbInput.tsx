import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

type InputVariant = 'light' | 'dark';

interface AirbnbInputProps extends TextInputProps {
    label: string;
    error?: string;
    variant?: InputVariant;
}

export default function AirbnbInput({ label, error, variant = 'light', ...props }: AirbnbInputProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    styles[`${variant}Input`],
                    isFocused && styles.inputFocused,
                    error && styles.inputError,
                ]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholderTextColor={variant === 'light' ? colors.gray : '#94a3b8'}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        marginBottom: spacing.xs,
    },
    lightLabel: {
        color: colors.darkText,
    },
    darkLabel: {
        color: '#e2e8f0', // slate-200
    },
    input: {
        borderRadius: borderRadius.md,
        borderWidth: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        fontSize: typography.base,
        minHeight: 48,
        ...shadows.sm,
    },
    lightInput: {
        backgroundColor: colors.white,
        borderColor: colors.lightGray,
        color: colors.darkText,
    },
    darkInput: {
        backgroundColor: '#1e293b', // slate-800
        borderColor: '#334155', // slate-700
        color: colors.white,
    },
    inputFocused: {
        borderColor: colors.roastedSaffron,
        borderWidth: 2,
    },
    inputError: {
        borderColor: colors.error,
        borderWidth: 2,
    },
    errorText: {
        fontSize: typography.sm,
        color: colors.error,
        marginTop: spacing.xs,
    },
});
