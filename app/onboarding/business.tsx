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
import { updateRestaurantInfo } from '../../src/services/saas';

export default function BusinessInfoScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        restaurantName: '',
        address: {
            street: '',
            city: '',
            state: '',
            zip: '',
            country: 'México',
        },
    });
    const [loading, setLoading] = useState(false);

    const handleNext = async () => {
        // Validation
        if (!formData.restaurantName.trim()) {
            Alert.alert('Error', 'Por favor ingresa el nombre de tu restaurante');
            return;
        }

        if (!formData.address.street || !formData.address.city) {
            Alert.alert('Error', 'Por favor completa la dirección de tu restaurante');
            return;
        }

        try {
            setLoading(true);

            if (!user?.restaurantId) {
                throw new Error('No restaurant ID found');
            }

            // Update restaurant with business info
            await updateRestaurantInfo(user.restaurantId, {
                name: formData.restaurantName,
                address: formData.address,
            });

            console.log('✅ Business info saved');
            router.push('/onboarding/operations');

        } catch (error: any) {
            console.error('Error saving business info:', error);
            Alert.alert('Error', 'No se pudo guardar la información. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.stepIndicator}>Paso 1 de 3</Text>
                <Text style={styles.title}>Información del Negocio</Text>
                <Text style={styles.subtitle}>
                    Cuéntanos sobre tu restaurante para personalizar tu experiencia
                </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '33%' }]} />
            </View>

            {/* Form */}
            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre del Restaurante *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: La Cocina de María"
                        value={formData.restaurantName}
                        onChangeText={(text) => setFormData({ ...formData, restaurantName: text })}
                        autoCapitalize="words"
                        editable={!loading}
                    />
                </View>

                <Text style={styles.sectionTitle}>Dirección</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Calle y Número *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Av. Insurgentes 123"
                        value={formData.address.street}
                        onChangeText={(text) => setFormData({
                            ...formData,
                            address: { ...formData.address, street: text }
                        })}
                        editable={!loading}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.label}>Ciudad *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ciudad de México"
                            value={formData.address.city}
                            onChangeText={(text) => setFormData({
                                ...formData,
                                address: { ...formData.address, city: text }
                            })}
                            editable={!loading}
                        />
                    </View>

                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.label}>Estado</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="CDMX"
                            value={formData.address.state}
                            onChangeText={(text) => setFormData({
                                ...formData,
                                address: { ...formData.address, state: text }
                            })}
                            editable={!loading}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.label}>Código Postal</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="06700"
                            value={formData.address.zip}
                            onChangeText={(text) => setFormData({
                                ...formData,
                                address: { ...formData.address, zip: text }
                            })}
                            keyboardType="numeric"
                            editable={!loading}
                        />
                    </View>

                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.label}>País</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.address.country}
                            onChangeText={(text) => setFormData({
                                ...formData,
                                address: { ...formData.address, country: text }
                            })}
                            editable={!loading}
                        />
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
        marginTop: 24,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
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
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    halfWidth: {
        flex: 1,
    },

    // Actions
    actions: {
        paddingHorizontal: 20,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    nextButton: {
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
