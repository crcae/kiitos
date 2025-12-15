import React, { useState, useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { PhoneAuthProvider, signInWithCredential, PhoneMultiFactorGenerator, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, firebaseConfig } from '../../services/firebaseConfig';
import { X } from 'lucide-react-native';
import AirbnbButton from '../AirbnbButton';
import AirbnbInput from '../AirbnbInput';
import { colors, spacing, typography, borderRadius } from '../../styles/theme';

interface PhoneAuthModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PhoneAuthModal({ visible, onClose, onSuccess }: PhoneAuthModalProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationId, setVerificationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showRecaptcha, setShowRecaptcha] = useState(false);

    // Ref to hold the resolve function for the reCAPTCHA promise (Mobile)
    const recaptchaVerifierRef = useRef<{ resolve: (token: string) => void } | null>(null);

    // Ref for Web RecaptchaVerifier
    const webVerifierRef = useRef<RecaptchaVerifier | null>(null);

    useEffect(() => {
        if (Platform.OS === 'web' && visible && !webVerifierRef.current) {
            // Initialize RecaptchaVerifier for Web
            try {
                webVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': (response: any) => {
                        // reCAPTCHA solved, allow signInWithPhoneNumber.
                    },
                    'expired-callback': () => {
                        // Response expired. Ask user to solve reCAPTCHA again.
                    }
                });
            } catch (e) {
                console.log('Recaptcha already initialized or error:', e);
            }
        }
    }, [visible]);

    // Custom ApplicationVerifier implementation for Mobile
    const mobileVerifier = {
        type: 'recaptcha',
        verify: () => {
            return new Promise<string>((resolve) => {
                setShowRecaptcha(true);
                recaptchaVerifierRef.current = { resolve };
            });
        },
        clear: () => {
            // Required by Firebase internal logic to avoid "_reset is not a function" error
            setShowRecaptcha(false);
            recaptchaVerifierRef.current = null;
        },
        // Internal Firebase method that might be called
        _reset: () => {
            setShowRecaptcha(false);
            recaptchaVerifierRef.current = null;
        }
    };

    const handleSendCode = async () => {
        if (!phoneNumber) {
            Alert.alert('Error', 'Por favor ingresa un número de teléfono válido.');
            return;
        }

        setLoading(true);
        try {
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

            let appVerifier: any;
            if (Platform.OS === 'web') {
                appVerifier = webVerifierRef.current;
            } else {
                appVerifier = mobileVerifier;
            }

            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setVerificationId(confirmationResult.verificationId);

            if (Platform.OS !== 'web') {
                Alert.alert('Código enviado', 'Revisa tus mensajes SMS.');
            }
        } catch (error: any) {
            console.error('Error sending code:', error);
            Alert.alert('Error', error.message || 'No se pudo enviar el código.');
            // Reset captcha if needed (safely)
            if (Platform.OS === 'web' && webVerifierRef.current) {
                try {
                    webVerifierRef.current.clear();
                } catch (e) {
                    console.log('Error clearing recaptcha:', e);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode || !verificationId) return;

        setLoading(true);
        try {
            const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
            await signInWithCredential(auth, credential);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error verifying code:', error);
            Alert.alert('Error', 'Código inválido. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleRecaptchaMessage = (event: any) => {
        const token = event.nativeEvent.data;
        if (token && recaptchaVerifierRef.current) {
            setShowRecaptcha(false);
            recaptchaVerifierRef.current.resolve(token);
            recaptchaVerifierRef.current = null;
        }
    };

    // HTML content for the WebView to render reCAPTCHA (Mobile only)
    const recaptchaHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
            <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
            <style>
                body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
                #recaptcha-container { transform: scale(1.2); }
            </style>
        </head>
        <body>
            <div id="recaptcha-container"></div>
            <script>
                const firebaseConfig = ${JSON.stringify(firebaseConfig)};
                firebase.initializeApp(firebaseConfig);
                
                const recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                    'size': 'normal',
                    'callback': function(response) {
                        window.ReactNativeWebView.postMessage(response);
                    },
                    'expired-callback': function() {
                        window.ReactNativeWebView.postMessage('expired');
                    }
                });
                
                recaptchaVerifier.render();
            </script>
        </body>
        </html>
    `;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContent}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Iniciar Sesión</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X color="#000" size={24} />
                        </TouchableOpacity>
                    </View>

                    {!verificationId ? (
                        <View style={styles.stepContainer}>
                            <AirbnbInput
                                label="Ingresa tu número de teléfono"
                                placeholder="+52 123 456 7890"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                                autoFocus
                            />

                            <AirbnbButton
                                title="Enviar Código"
                                onPress={handleSendCode}
                                loading={loading}
                                disabled={loading}
                                variant="primary"
                            />
                        </View>
                    ) : (
                        <View style={styles.stepContainer}>
                            <AirbnbInput
                                label="Ingresa el código SMS"
                                placeholder="123456"
                                value={verificationCode}
                                onChangeText={setVerificationCode}
                                keyboardType="number-pad"
                                maxLength={6}
                                autoFocus
                            />
                            <AirbnbButton
                                title="Verificar"
                                onPress={handleVerifyCode}
                                loading={loading}
                                disabled={loading}
                                variant="primary"
                            />
                        </View>
                    )}
                    {/* Web Recaptcha Container - Must remain in DOM */}
                    {Platform.OS === 'web' && <View nativeID="recaptcha-container" style={{ marginTop: 10 }} />}
                </KeyboardAvoidingView>

                {/* Mobile Invisible/Visible Recaptcha Modal */}
                {showRecaptcha && Platform.OS !== 'web' && (
                    <Modal visible={true} transparent={true} animationType="fade">
                        <View style={styles.recaptchaContainer}>
                            <View style={styles.recaptchaContent}>
                                <View style={styles.recaptchaHeader}>
                                    <Text>Verificación de seguridad</Text>
                                    <TouchableOpacity onPress={() => setShowRecaptcha(false)}>
                                        <X size={20} color="#000" />
                                    </TouchableOpacity>
                                </View>
                                <WebView
                                    originWhitelist={['*']}
                                    source={{ html: recaptchaHtml, baseUrl: 'https://kiitos-app.firebaseapp.com' }}
                                    onMessage={handleRecaptchaMessage}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.xxl,
        minHeight: 300,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.castIron,
    },
    closeButton: {
        padding: spacing.xs,
    },
    stepContainer: {
        gap: spacing.lg,
    },
    recaptchaContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    recaptchaContent: {
        backgroundColor: colors.white,
        height: 400,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    recaptchaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
    },
});
