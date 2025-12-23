import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Alert,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    ScrollView
} from 'react-native';
import { CountryPicker } from 'react-native-country-codes-picker';
import { Smartphone, User, ChevronDown } from 'lucide-react-native';
import { auth, db } from '../../services/firebaseConfig';
import { PhoneAuthProvider, signInWithCredential, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../styles/theme';

interface CustomerPhoneAuthProps {
    onSuccess?: () => void;
    title?: string;
    subtitle?: string;
}

export default function CustomerPhoneAuth({ onSuccess, title, subtitle }: CustomerPhoneAuthProps) {
    const { refreshUser } = useAuth();

    const [countryCode, setCountryCode] = useState('+52');
    const [countryFlag, setCountryFlag] = useState('🇲🇽');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
    const [tempFirebaseUser, setTempFirebaseUser] = useState<any>(null);
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    useEffect(() => {
        if (Platform.OS === 'web') {
            // Hybrid approach: Enable bypass in development, disable in production
            // Development (__DEV__ = true): Use test phone numbers without SMS
            // Production (__DEV__ = false): Real SMS with reCAPTCHA validation
            if (__DEV__) {
                console.log('🔧 Development mode: reCAPTCHA bypass enabled');
                console.log('📱 Use test phone numbers from Firebase Console for testing');
                auth.settings.appVerificationDisabledForTesting = true;
            } else {
                console.log('🚀 Production mode: reCAPTCHA validation enabled');
                auth.settings.appVerificationDisabledForTesting = false;
            }

            if (!recaptchaVerifierRef.current) {
                try {
                    // Initialize invisible reCAPTCHA
                    const verifier = new RecaptchaVerifier(auth, 'customer-recaptcha-container', {
                        'size': 'invisible',
                        'callback': (response: any) => {
                            console.log('✅ reCAPTCHA verification successful');
                        },
                        'expired-callback': () => {
                            console.warn('⚠️ reCAPTCHA expired, user may need to retry');
                        }
                    });

                    recaptchaVerifierRef.current = verifier;

                    // Render the verifier to ensure it's ready
                    verifier.render().then((widgetId) => {
                        console.log('reCAPTCHA widget initialized with ID:', widgetId);
                    }).catch(err => {
                        // In development with bypass enabled, render errors are expected
                        if (__DEV__) {
                            console.log('reCAPTCHA render skipped in development mode:', err.message);
                        } else {
                            // In production, this is a critical error
                            console.error("❌ reCAPTCHA initialization failed:", err);
                            Alert.alert(
                                "Error de Seguridad",
                                "No se pudo inicializar el sistema de seguridad. Por favor verifica tu conexión e intenta de nuevo."
                            );
                        }
                    });
                } catch (e) {
                    console.error('RecaptchaVerifier creation error:', e);
                }
            }
        }

        return () => {
            if (recaptchaVerifierRef.current) {
                try {
                    recaptchaVerifierRef.current.clear();
                    recaptchaVerifierRef.current = null;
                } catch (e) {
                    console.error('Error cleaning up reCAPTCHA:', e);
                }
            }
        };
    }, []);



    const handleSendCode = async () => {
        if (!phone || phone.length < 8) {
            Alert.alert("Número Inválido", "Por favor ingresa un número de teléfono válido.");
            return;
        }
        setLoading(true);
        try {
            const formattedPhone = `${countryCode}${phone.replace(/\s/g, '')}`;

            let appVerifier;
            if (Platform.OS === 'web') {
                appVerifier = recaptchaVerifierRef.current;
                if (!appVerifier) {
                    throw new Error("reCAPTCHA no se ha inicializado correctamente. Por favor recarga la página.");
                }
            } else {
                // For mobile, we might need a different invisible verifier or use the default
                appVerifier = (recaptchaVerifierRef.current as any);
            }

            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier!);
            setVerificationId(confirmationResult.verificationId);
            setStep('otp');
        } catch (error: any) {
            console.error("Send Code Error:", error);
            const errorMessage = error.message || "No se pudo enviar el código. Revisa tu número.";
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!code || code.length < 6 || !verificationId) return;
        setLoading(true);
        try {
            const credential = PhoneAuthProvider.credential(verificationId, code);
            const userCredential = await signInWithCredential(auth, credential);
            const fUser = userCredential.user;

            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, 'users', fUser.uid));
            if (userDoc.exists()) {
                await refreshUser();
                onSuccess?.();
            } else {
                setTempFirebaseUser(fUser);
                setStep('name');
            }
        } catch (error: any) {
            console.error("Verify Code Error:", error);
            Alert.alert("Código Inválido", "El código ingresado es incorrecto.");
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteRegistration = async () => {
        if (!name || !tempFirebaseUser) {
            Alert.alert("Nombre requerido", "Por favor ingresa tu nombre para continuar.");
            return;
        }
        setLoading(true);
        try {
            await setDoc(doc(db, 'users', tempFirebaseUser.uid), {
                id: tempFirebaseUser.uid,
                email: tempFirebaseUser.email || '',
                name: name,
                role: 'customer',
                phoneNumber: tempFirebaseUser.phoneNumber,
                createdAt: Timestamp.now(),
            });
            await refreshUser();
            onSuccess?.();
        } catch (error: any) {
            console.error("Registration Error:", error);
            Alert.alert("Error", "No se pudo completar el registro.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.iconBox}>
                    {step === 'otp' ? (
                        <Smartphone size={60} color="#F97316" />
                    ) : (
                        <User size={60} color="#F97316" />
                    )}
                </View>

                <Text style={styles.title}>
                    {title || (
                        step === 'phone' ? 'Bienvenido a Kiitos' :
                            step === 'otp' ? 'Verifica tu Teléfono' : '¡Casi listo!'
                    )}
                </Text>
                <Text style={styles.subtitle}>
                    {subtitle || (
                        step === 'phone' ? 'Ingresa tu número para acceder a tu perfil y pedidos.' :
                            step === 'otp' ? `Ingresa el código de 6 dígitos enviado al ${countryCode} ${phone}.` :
                                'Solo necesitamos tu nombre para crear tu cuenta.'
                    )}
                </Text>

                <View style={styles.btnGroup}>
                    {step === 'phone' && (
                        <>
                            <View style={styles.phoneInputContainer}>
                                <TouchableOpacity
                                    style={styles.countryPickerButton}
                                    onPress={() => setShowCountryPicker(true)}
                                >
                                    <Text style={styles.flagText}>{countryFlag}</Text>
                                    <Text style={styles.callingCode}>{countryCode}</Text>
                                    <ChevronDown size={16} color="#6B7280" style={{ marginLeft: 4 }} />
                                </TouchableOpacity>

                                <TextInput
                                    style={styles.phoneInput}
                                    placeholder="55 1234 5678"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                    autoFocus
                                />
                            </View>
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleSendCode} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Enviar Código</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 'otp' && (
                        <>
                            <TextInput
                                style={styles.otpInput}
                                placeholder="Código de 6 dígitos"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={code}
                                onChangeText={setCode}
                                autoFocus
                            />
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyCode} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verificar e Iniciar Sesión</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.resendBtn} onPress={() => setStep('phone')}>
                                <Text style={styles.resendText}>Cambiar número de teléfono</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 'name' && (
                        <>
                            <TextInput
                                style={styles.nameInput}
                                placeholder="Tu Nombre Completo"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleCompleteRegistration} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Completar Perfil</Text>}
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {Platform.OS === 'web' && (
                    <View style={styles.recaptchaContainer}>
                        <View id="customer-recaptcha-container" />
                    </View>
                )}

                {/* Country Picker Modal */}
                <CountryPicker
                    show={showCountryPicker}
                    pickerButtonOnPress={(item) => {
                        setCountryCode(item.dial_code);
                        setCountryFlag(item.flag);
                        setShowCountryPicker(false);
                    }}
                    onBackdropPress={() => setShowCountryPicker(false)}
                    style={{
                        modal: {
                            height: 500,
                        },
                    }}
                    lang={'es'}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#111',
        marginBottom: 15,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    btnGroup: {
        width: '100%',
        gap: 16,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 56,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        marginBottom: 8,
        overflow: 'hidden',
    },
    countryPickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    callingCode: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
    },
    flagText: {
        fontSize: 24,
        marginRight: 8,
    },
    phoneInput: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#111',
    },
    otpInput: {
        width: '100%',
        height: 56,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        paddingHorizontal: 20,
        fontSize: 16,
        color: '#111',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 4,
    },
    nameInput: {
        width: '100%',
        height: 56,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        paddingHorizontal: 20,
        fontSize: 16,
        color: '#111',
        marginBottom: 8,
    },
    primaryBtn: {
        backgroundColor: '#F97316',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F97316',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    resendBtn: {
        marginTop: 10,
        alignItems: 'center',
    },
    resendText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    recaptchaContainer: {
        marginTop: 10,
        height: 1,
        width: 1,
        opacity: 0,
        overflow: 'hidden',
    }
});
