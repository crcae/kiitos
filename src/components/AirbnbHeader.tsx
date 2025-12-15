import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../styles/theme';

interface AirbnbHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    greeting?: boolean;
}

export default function AirbnbHeader({
    title,
    subtitle,
    showBack = false,
    greeting = false,
}: AirbnbHeaderProps) {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {showBack && (
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.darkText} />
                </TouchableOpacity>
            )}
            <View style={styles.content}>
                <Text style={[styles.title, greeting && styles.titleGreeting]}>
                    {title}
                </Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: spacing.xxxl + spacing.md, // Extra space for status bar
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
        backgroundColor: colors.white,
    },
    content: {
        marginLeft: 0,
    },
    backButton: {
        marginBottom: spacing.sm,
        width: 40,
    },
    title: {
        fontSize: typography.xxxl,
        fontWeight: typography.bold,
        color: colors.castIron,
        marginBottom: spacing.xs,
    },
    titleGreeting: {
        fontSize: typography.xxxxl,
    },
    subtitle: {
        fontSize: typography.lg,
        color: colors.darkGray,
        marginTop: spacing.xs,
    },
});
