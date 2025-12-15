import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { updateRestaurantSettings } from '../../src/services/saas';

const CURRENCIES = [
    { label: 'Peso Mexicano (MXN)', value: 'MXN' },
    { label: 'Dólar Estadounidense (USD)', value: 'USD' },
    { label: 'Euro (EUR)', value: 'EUR' },
];

const TIMEZONES = [
    { label: 'Ciudad de México (GMT-6)', value: 'America/Mexico_City' },
    { label: 'Monterrey (GMT-6)', value: 'America/Monterrey' },
    { label: 'Tijuana (GMT-8)', value: 'America/Tijuana' },
    { label: 'Cancún (GMT-5)', value: 'America/Cancun' },
];

export default function OperationsScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const [settings, setSettings] = useState({
        currency: 'MXN',
        timezone: 'America/Mexico_City',
        taxRate: '16',
        serviceCharge: '',
    });
    const [loading, setLoading] = useState(false);

    const handleNext = async () => {
        // Validation
        const taxRate = parseFloat(settings.taxRate);
        if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
            Alert.alert('Error', 'El IVA debe ser un número entre 0 y 100');
            return;
        }

        try {
            setLoading(true);

            if (!user?.restaurantId) {
                throw new Error('No restaurant ID found');
            }

            const serviceCharge = settings.serviceCharge
                ? parseFloat(settings.serviceCharge)
                : undefined;

            // Update restaurant settings
            await updateRestaurantSettings(user.restaurantId, {
                currency: settings.currency,
                timezone: settings.timezone,
                taxRate,
                serviceCharge,
            });

            console.log('✅ Operations settings saved');
            router.push('/onboarding/staff');

        } catch (error: any) {
            console.error('Error saving operations settings:', error);
            Alert.alert('Error', 'No se pudo guardar la configuración. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.stepIndicator}>Paso 2 de 3</Text>
                <Text style={styles.title}>Configuración Operativa</Text>
                <Text style={styles.subtitle}>
                    Configura los parámetros básicos para el funcionamiento de tu restaurante
                </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '66%' }]} />
            </View>

            {/* Form */}
            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Moneda *</Text>
                    <View style={styles.buttonGroup}>
                        {CURRENCIES.map((currency) => (
                            <TouchableOpacity
                                key={currency.value}
                                style={[
                                    styles.optionButton,
                                    settings.currency === currency.value && styles.optionButtonActive,
                                ]}
                                onPress={() => setSettings({ ...settings, currency: currency.value })}
                                disabled={loading}
                            >
                                <Text style={[
                                    styles.optionButtonText,
                                    settings.currency === currency.value && styles.optionButtonTextActive,
                                ]}>
                                    {currency.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Zona Horaria *</Text>
                    <View style={styles.buttonGroup}>
                        {TIMEZONES.map((tz) => (
                            <TouchableOpacity
                                key={tz.value}
                                style={[
                                    styles.optionButton,
                                    settings.timezone === tz.value && styles.optionButtonActive,
                                ]}
                                onPress={() => setSettings({ ...settings, timezone: tz.value })}
                                disabled={loading}
                            >
                                <Text style={[
                                    styles.optionButtonText,
                                    settings.timezone === tz.value && styles.optionButtonTextActive,
                                ]}>
                                    {tz.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>IVA (%) *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="16"
                        value={settings.taxRate}
                        onChangeText={(text) => setSettings({ ...settings, taxRate: text })}
                        keyboardType="decimal-pad"
                        editable={!loading}
                    />
                    <Text style={styles.hint}>
                        Porcentaje de impuesto aplicado a las ventas
                    </Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Propina Sugerida (%) - Opcional</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="10"
                        value={settings.serviceCharge}
                        onChangeText={(text) => setSettings({ ...settings, serviceCharge: text })}
                        keyboardType="decimal-pad"
                        editable={!loading}
                    />
                    <Text style={styles.hint}>
                        Propina recomendada que se sugerirá a los clientes
                    </Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                    disabled={loading}
                >
                    <Text style={styles.backButtonText}>← Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.nextButton, loading && styles.nextButtonDisabled]}
                    onPress={handleNext}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.nextButtonText}>Continuar →</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFBF7',
    },
    contentContainer: {
        paddingBottom: 40,
    },

    // Header
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    stepIndicator: {
        fontSize: 14,
        color: '#E67E22',
        fontWeight: '600',
        marginBottom: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },

    // Progress Bar
    progressBar: {
        height: 4,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 20,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#E67E22',
    },

    // Form
    form: {
        paddingHorizontal: 20,
        paddingVertical: 40,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#2C3E50',
    },
    buttonGroup: {
        gap: 12,
    },
    optionButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    optionButtonActive: {
        borderColor: '#E67E22',
        backgroundColor: '#FFF5F0',
    },
    optionButtonText: {
        fontSize: 14,
        color: '#2C3E50',
        textAlign: 'center',
    },
    optionButtonTextActive: {
        color: '#E67E22',
        fontWeight: '600',
    },
    hint: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
        lineHeight: 16,
    },

    // Actions
    actions: {
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: 20,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    backButton: {
        flex: 1,
        backgroundColor: '#E0E0E0',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#2C3E50',
        fontSize: 16,
        fontWeight: '600',
    },
    nextButton: {
        flex: 2,
        backgroundColor: '#FF385C',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextButtonDisabled: {
        opacity: 0.6,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
