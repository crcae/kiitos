import React from 'react';
import { View, StyleSheet, ViewProps, TouchableOpacity, Animated } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../styles/theme';

type ShadowSize = 'sm' | 'md' | 'lg' | 'xl';

interface AirbnbCardProps extends ViewProps {
    children: React.ReactNode;
    shadow?: ShadowSize;
    pressable?: boolean;
    onPress?: () => void;
}

export default function AirbnbCard({
    children,
    shadow = 'md',
    pressable = false,
    onPress,
    style,
    ...props
}: AirbnbCardProps) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.98,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const cardStyle = [
        styles.card,
        shadows[shadow],
        style,
    ];

    if (pressable && onPress) {
        return (
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
                {...props}
            >
                <Animated.View style={[cardStyle, { transform: [{ scale: scaleAnim }] }]}>
                    {children}
                </Animated.View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={cardStyle} {...props}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
    },
});
