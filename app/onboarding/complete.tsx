import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { completeOnboarding } from '../../src/services/saas';

export default function CompleteScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleLaunch = async () => {
        try {
            setLoading(true);

            if (!user?.restaurantId) {
                throw new Error('No restaurant ID found');
            }

            // Mark onboarding as complete
            await completeOnboarding(user.restaurantId);

            console.log('🎉 Onboarding completed!');

            // Small delay to ensure Firestore write completes
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Redirect to admin dashboard
            router.replace('/admin/menu');

        } catch (error: any) {
            console.error('Error completing onboarding:', error);
            alert('Hubo un error al finalizar. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <CheckCircle size={80} color="#27AE60" />
                </View>

                <Text style={styles.title}>¡Todo Listo!</Text>
                <Text style={styles.subtitle}>
                    Tu restaurante está configurado y listo para operar.
                </Text>

                <View style={styles.features}>
                    <FeatureItem text="Información del negocio guardada" />
                    <FeatureItem text="Configuración operativa completada" />
                    <FeatureItem text="Tu cuenta está activa" />
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>🎁 Prueba Gratis de 30 Días</Text>
                    <Text style={styles.infoText}>
                        Tienes acceso completo a todas las funciones. Sin cargos hasta que termine tu prueba.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.launchButton, loading && styles.launchButtonDisabled]}
                    onPress={handleLaunch}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.launchButtonText}>Lanzar Mi Restaurante →</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <View style={styles.featureItem}>
            <CheckCircle size={20} color="#27AE60" />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFBF7',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 60,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginBottom: 32,
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 48,
        textAlign: 'center',
        lineHeight: 26,
    },
    features: {
        width: '100%',
        marginBottom: 40,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    featureText: {
        fontSize: 16,
        color: '#2C3E50',
    },
    infoBox: {
        backgroundColor: '#E8F5E9',
        borderRadius: 16,
        padding: 24,
        marginBottom: 40,
        width: '100%',
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#27AE60',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    launchButton: {
        backgroundColor: '#FF385C',
        paddingHorizontal: 48,
        paddingVertical: 20,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    launchButtonDisabled: {
        opacity: 0.6,
    },
    launchButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
});
