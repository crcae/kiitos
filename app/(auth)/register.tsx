import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { createRestaurant, assignUserToRestaurant, createStaffMember } from '../../src/services/saas';
import { SubscriptionPlan } from '../../src/types/firestore';
import { simulateSuccessfulPayment } from '../../src/services/stripe';
import { validateInvitationCode, markCodeAsUsed } from '../../src/services/invitationCodes';
import { UserRole } from '../../src/types/firestore';

type SignupMode = 'owner' | 'staff';

export default function SignUpPage() {
    const router = useRouter();
    const { plan = 'starter' } = useLocalSearchParams<{ plan?: string }>();
    const { signUp } = useAuth();

    const [mode, setMode] = useState<SignupMode>('owner');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        invitationCode: '',
    });

    const handleSignUp = async () => {
        // Basic Validation
        if (!formData.name || !formData.email || !formData.password) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (mode === 'staff' && !formData.invitationCode) {
            Alert.alert('Error', 'Debes ingresar un código de invitación válido');
            return;
        }

        try {
            setLoading(true);

            if (mode === 'owner') {
                await handleOwnerSignup();
            } else {
                await handleStaffSignup();
            }

        } catch (error: any) {
            console.error('Signup error:', error);
            Alert.alert(
                'Error al Registrarse',
                error.message || 'Hubo un problema al crear tu cuenta. Intenta nuevamente.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleOwnerSignup = async () => {
        // 1. Simulate Payment
        console.log('💳 Processing payment...');
        const paymentResult = await simulateSuccessfulPayment(
            (plan as SubscriptionPlan) || 'starter',
            formData.email
        );

        if (!paymentResult.success) {
            throw new Error('El pago no pudo ser procesado.');
        }

        // 2. Create Firebase Auth User
        console.log('📝 Creating Firebase Auth user...');
        const firebaseUser = await signUp(formData.email, formData.password);

        // 3. Create Restaurant
        console.log('🏢 Creating restaurant...');
        const restaurantId = await createRestaurant(
            firebaseUser.uid,
            formData.email,
            (plan as SubscriptionPlan) || 'starter'
        );

        // 4. Create User Document
        console.log('👤 Creating user document...');
        await assignUserToRestaurant(
            firebaseUser.uid,
            restaurantId,
            'restaurant_owner',
            formData.name,
            formData.email
        );

        // 5. Redirect
        console.log('✅ Owner signup complete!');
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.replace('/onboarding/business');
    };

    const handleStaffSignup = async () => {
        // 1. Validate Invitation Code
        console.log('🔍 Validating invitation code...');
        const codeData = await validateInvitationCode(formData.invitationCode);

        if (!codeData) {
            throw new Error('El código de invitación es inválido o ha expirado.');
        }

        // 2. Create Firebase Auth User
        console.log('📝 Creating Firebase Auth user...');
        const firebaseUser = await signUp(formData.email, formData.password);

        // 3. Create User Document with Role from Code
        console.log('👤 Creating staff user document...');
        // We use assignUserToRestaurant directly since createStaffMember is for admins creating users
        await assignUserToRestaurant(
            firebaseUser.uid,
            codeData.restaurantId,
            codeData.role as UserRole,
            formData.name,
            formData.email
        );

        // 4. Mark Code as Used
        await markCodeAsUsed(codeData.id, firebaseUser.uid);

        // 5. Redirect based on role
        console.log('✅ Staff signup complete!');
        await new Promise(resolve => setTimeout(resolve, 1000));

        switch (codeData.role) {
            case 'restaurant_manager':
                router.replace('/admin/menu' as any); // Assuming this route exists
                break;
            case 'waiter':
                router.replace('/waiter/tables' as any);
                break;
            case 'kitchen':
                router.replace('/kitchen/display' as any);
                break;
            case 'cashier':
                router.replace('/cashier/status' as any); // Assuming this route exists
                break;
            default:
                router.replace('/');
        }
    };

    const selectedPlan = plan || 'starter';
    const planNames: Record<string, string> = {
        starter: 'Starter',
        professional: 'Professional',
        enterprise: 'Enterprise',
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
                <Text style={styles.title}>Crear Cuenta</Text>
                <Text style={styles.subtitle}>
                    {mode === 'owner'
                        ? 'Comienza tu prueba gratis de 30 días'
                        : 'Únete al equipo de tu restaurante'}
                </Text>
            </View>

            {/* Mode Switcher */}
            <View style={styles.modeSwitcher}>
                <TouchableOpacity
                    style={[styles.modeButton, mode === 'owner' && styles.modeButtonActive]}
                    onPress={() => setMode('owner')}
                >
                    <Text style={[styles.modeButtonText, mode === 'owner' && styles.modeButtonTextActive]}>
                        Soy Dueño
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeButton, mode === 'staff' && styles.modeButtonActive]}
                    onPress={() => setMode('staff')}
                >
                    <Text style={[styles.modeButtonText, mode === 'staff' && styles.modeButtonTextActive]}>
                        Soy Staff
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Selected Plan Badge (Only for Owner) */}
            {mode === 'owner' && (
                <View style={styles.planBadge}>
                    <Text style={styles.planBadgeLabel}>Plan seleccionado:</Text>
                    <Text style={styles.planBadgeName}>{planNames[selectedPlan]}</Text>
                    <TouchableOpacity onPress={() => router.push('/pricing')}>
                        <Text style={styles.changePlanText}>Cambiar plan</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Form */}
            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre Completo</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Juan Pérez"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                        autoCapitalize="words"
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="juan@restaurante.com"
                        value={formData.email}
                        onChangeText={(text) => setFormData({ ...formData, email: text })}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                        secureTextEntry
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirmar Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Repite tu contraseña"
                        value={formData.confirmPassword}
                        onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                        secureTextEntry
                        editable={!loading}
                    />
                </View>

                {/* Invitation Code (Only for Staff) */}
                {mode === 'staff' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Código de Invitación</Text>
                        <TextInput
                            style={[styles.input, styles.codeInput]}
                            placeholder="ABC12345"
                            value={formData.invitationCode}
                            onChangeText={(text) => setFormData({ ...formData, invitationCode: text.toUpperCase() })}
                            autoCapitalize="characters"
                            editable={!loading}
                            maxLength={8}
                        />
                        <Text style={styles.helperText}>
                            Pídele este código al dueño o gerente del restaurante.
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSignUp}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {mode === 'owner' ? 'Pagar y Crear Cuenta' : 'Unirse al Equipo'}
                        </Text>
                    )}
                </TouchableOpacity>

                <View style={styles.termsContainer}>
                    <Text style={styles.termsText}>
                        Al crear una cuenta, aceptas nuestros{' '}
                        <Text style={styles.termsLink}>Términos de Servicio</Text>
                        {' '}y{' '}
                        <Text style={styles.termsLink}>Política de Privacidad</Text>
                    </Text>
                </View>
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
                <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
                <TouchableOpacity onPress={() => router.push('/login' as any)}>
                    <Text style={styles.loginLink}>Iniciar Sesión</Text>
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

    // Mode Switcher
    modeSwitcher: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: -24,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    modeButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    modeButtonActive: {
        backgroundColor: '#E67E22',
    },
    modeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    modeButtonTextActive: {
        color: '#FFFFFF',
    },

    // Plan Badge
    planBadge: {
        marginHorizontal: 20,
        marginTop: 24,
        padding: 16,
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    planBadgeLabel: {
        fontSize: 14,
        color: '#666',
    },
    planBadgeName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#27AE60',
    },
    changePlanText: {
        fontSize: 14,
        color: '#E67E22',
        textDecorationLine: 'underline',
        marginLeft: 'auto',
    },

    // Form
    form: {
        paddingHorizontal: 20,
        paddingVertical: 32,
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
    codeInput: {
        fontSize: 20,
        letterSpacing: 2,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 6,
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
    termsContainer: {
        marginTop: 24,
    },
    termsText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
    },
    termsLink: {
        color: '#E67E22',
        textDecorationLine: 'underline',
    },

    // Login Link
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
    },
    loginText: {
        fontSize: 14,
        color: '#666',
    },
    loginLink: {
        fontSize: 14,
        color: '#E67E22',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
