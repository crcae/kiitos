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
import { useTenant } from '../../src/context/TenantContext';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, user, loading: authLoading } = useAuth(); // Get user and authLoading
    const { restaurant } = useTenant();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Manual Redirection Effect (Failsafe)
    React.useEffect(() => {
        if (user && !authLoading) {
            console.log('🔄 Login Page Redirecting user:', user.role);
            if (user.role === 'saas_admin' || user.role === 'restaurant_owner' || user.role === 'restaurant_manager') {
                router.replace('/admin');
            } else if (user.role === 'waiter') {
                router.replace('/waiter');
            } else if (user.role === 'cashier') {
                router.replace('/cashier');
            } else if (user.role === 'kitchen') {
                router.replace('/kitchen');
            } else if (user.role === 'customer') {
                router.replace('/(app)/marketplace');
            }
        }
    }, [user, authLoading]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa tu email y contraseña');
            return;
        }

        try {
            setLoading(true);
            console.log('🔐 Attempting login...');
            await signIn(email, password);
            console.log('✅ Login successful!');
            // Loading stays true until redirect happens or component unmounts
        } catch (error: any) {
            console.error('Login error:', error);
            Alert.alert(
                'Error al Iniciar Sesión',
                'Email o contraseña incorrectos. Por favor verifica tus datos.'
            );
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Bienvenido</Text>
                <Text style={styles.subtitle}>
                    Inicia sesión para gestionar tu restaurante
                </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="juan@restaurante.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ingresa tu contraseña"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        editable={!loading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Iniciar Sesión</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.forgotPassword}
                    onPress={() => Alert.alert('Recuperar Contraseña', 'Funcionalidad próximamente.')}
                >
                    <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
            </View>

            {/* Signup Link */}
            <View style={styles.signupContainer}>
                <Text style={styles.signupText}>¿No tienes cuenta? </Text>
                <TouchableOpacity onPress={() => router.push('/signup' as any)}>
                    <Text style={styles.signupLink}>Regístrate aquí</Text>
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
        paddingVertical: 40,
        backgroundColor: '#2C3E50',
    },
    backButton: {
        marginBottom: 20,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#E0E0E0',
    },

    // Form
    form: {
        paddingHorizontal: 20,
        paddingVertical: 40,
        maxWidth: 500,
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
    submitButton: {
        backgroundColor: '#FF385C',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    forgotPassword: {
        alignItems: 'center',
        marginTop: 16,
    },
    forgotPasswordText: {
        color: '#666',
        fontSize: 14,
    },

    // Signup Link
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
    },
    signupText: {
        fontSize: 14,
        color: '#666',
    },
    signupLink: {
        fontSize: 14,
        color: '#E67E22',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
