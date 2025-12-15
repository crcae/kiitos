import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../styles/theme';

interface AirbnbInputProps extends TextInputProps {
    label: string;
    error?: string;
}

export default function AirbnbInput({ label, error, ...props }: AirbnbInputProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    isFocused && styles.inputFocused,
                    error && styles.inputError,
                ]}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholderTextColor={colors.gray}
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
        color: colors.darkText,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.lightGray,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        fontSize: typography.base,
        color: colors.darkText,
        minHeight: 48,
        ...shadows.sm,
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
