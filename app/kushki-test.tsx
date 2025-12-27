import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { Stack } from 'expo-router';
import { KushkiPayment } from '../src/components/payments/KushkiPayment';
import { colors, spacing, typography } from '../src/styles/theme';

export default function KushkiTestScreen() {
    const handleSuccess = (tokenResponse: any) => {
        console.log('Token created successfully:', tokenResponse);
    };

    const handleError = (error: any) => {
        console.error('Payment failed:', error);
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            style={styles.scrollView}
        >
            <Stack.Screen options={{ title: 'Prueba de Pago Kushki' }} />

            <View style={styles.headerContainer}>
                <Text style={styles.title}>Prueba de Integración</Text>
                <Text style={styles.subtitle}>
                    Utilice esta pantalla para verificar el funcionamiento del módulo de Kushki.
                </Text>
            </View>

            <View style={styles.cardContainer}>
                <KushkiPayment
                    onSuccess={handleSuccess}
                    onError={handleError}
                    amount={100}
                    currency="MXN"
                />
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Empresa: Kiitos
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        backgroundColor: colors.oatCream,
    },
    container: {
        flexGrow: 1,
        padding: spacing.xl,
        paddingTop: spacing.xxxl,
    },
    headerContainer: {
        marginBottom: spacing.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.castIron,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: typography.base,
        color: colors.gray,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    cardContainer: {
        maxWidth: 550,
        width: '100%',
        alignSelf: 'center',
        // Shadow and background are inside KushkiPayment but we can add extra margin
        marginBottom: spacing.xxxl,
    },
    footer: {
        marginTop: 'auto',
        paddingVertical: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        alignItems: 'center',
    },
    footerText: {
        fontSize: typography.sm,
        color: colors.gray,
    },
});
