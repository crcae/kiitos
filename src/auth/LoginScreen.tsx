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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import AirbnbButton from '../components/AirbnbButton';
import AirbnbInput from '../components/AirbnbInput';
import { colors, spacing, typography } from '../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({ email: '', password: '' });

    const handleLogin = async () => {
        // Reset errors
        setErrors({ email: '', password: '' });

        // Validate
        if (!email) {
            setErrors(prev => ({ ...prev, email: 'El correo es requerido' }));
            return;
        }
        if (!password) {
            setErrors(prev => ({ ...prev, password: 'La contraseña es requerida' }));
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/');
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.code === 'auth/invalid-credential'
                    ? 'Correo o contraseña incorrectos'
                    : 'Error al iniciar sesión'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
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
                            <Text style={styles.title}>Bienvenido a Kiitos</Text>
                            <Text style={styles.subtitle}>Divide cuentas de forma fácil</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
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
                                autoComplete="password"
                                placeholder="••••••••"
                                error={errors.password}
                            />

                            <AirbnbButton
                                title="Continuar"
                                onPress={handleLogin}
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

                        {/* Google Sign-In */}
                        <AirbnbButton
                            title="Iniciar sesión con Google"
                            onPress={handleGoogleLogin}
                            variant="google"
                            icon="logo-google"
                        />

                        {/* Sign Up Link */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
                            <Link href="/sign-up" asChild>
                                <Text style={styles.footerLink}>Regístrate</Text>
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
