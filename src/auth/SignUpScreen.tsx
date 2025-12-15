import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import AirbnbButton from '../components/AirbnbButton';
import AirbnbInput from '../components/AirbnbInput';
import { colors, spacing, typography } from '../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({ name: '', email: '', password: '' });

    const handleSignUp = async () => {
        // Reset errors
        setErrors({ name: '', email: '', password: '' });

        // Validate
        if (!name) {
            setErrors(prev => ({ ...prev, name: 'El nombre es requerido' }));
            return;
        }
        if (!email) {
            setErrors(prev => ({ ...prev, email: 'El correo es requerido' }));
            return;
        }
        if (!password || password.length < 6) {
            setErrors(prev => ({
                ...prev,
                password: 'La contraseña debe tener al menos 6 caracteres',
            }));
            return;
        }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Update profile with name
            await updateProfile(userCredential.user, {
                displayName: name,
            });

            // Create user document in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                name,
                email,
                createdAt: new Date().toISOString(),
            });

            router.replace('/');
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.code === 'auth/email-already-in-use'
                    ? 'Este correo ya está registrado'
                    : 'Error al crear la cuenta'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = () => {
        Alert.alert(
            'Próximamente',
            'Registro con Google estará disponible pronto'
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>Crea tu cuenta</Text>
                            <Text style={styles.subtitle}>Únete y comienza a dividir cuentas</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            <AirbnbInput
                                label="Nombre Completo"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                autoComplete="name"
                                placeholder="Tu nombre"
                                error={errors.name}
                            />

                            <AirbnbInput
                                label="Correo Electrónico"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                placeholder="ejemplo@correo.com"
                                error={errors.email}
                            />

                            <AirbnbInput
                                label="Contraseña"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoComplete="password-new"
                                placeholder="Mínimo 6 caracteres"
                                error={errors.password}
                            />

                            <AirbnbButton
                                title="Registrarse"
                                onPress={handleSignUp}
                                loading={loading}
                                variant="primary"
                            />
                        </View>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>O</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Google Sign-Up */}
                        <AirbnbButton
                            title="Registrarse con Google"
                            onPress={handleGoogleSignUp}
                            variant="google"
                            icon="logo-google"
                        />

                        {/* Login Link */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
                            <Link href="/login" asChild>
                                <Text style={styles.footerLink}>Inicia Sesión</Text>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xxxl,
    },
    header: {
        marginBottom: spacing.xxxl,
    },
    title: {
        fontSize: typography.xxxxl,
        fontWeight: typography.bold,
        color: colors.darkText,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.lg,
        color: colors.darkGray,
    },
    form: {
        marginBottom: spacing.xl,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.lightGray,
    },
    dividerText: {
        marginHorizontal: spacing.lg,
        fontSize: typography.sm,
        color: colors.gray,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    footerText: {
        fontSize: typography.base,
        color: colors.gray,
    },
    footerLink: {
        fontSize: typography.base,
        color: colors.airbnbPink,
        fontWeight: typography.semibold,
    },
});
