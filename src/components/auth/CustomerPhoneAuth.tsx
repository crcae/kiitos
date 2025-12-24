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
    ScrollView,
    Modal
} from 'react-native';
import { CountryPicker } from 'react-native-country-codes-picker';
import { Smartphone, User, ChevronDown, X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { auth, db, firebaseConfig } from '../../services/firebaseConfig';
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

    // Native reCAPTCHA/WebView state
    const [showRecaptcha, setShowRecaptcha] = useState(false);

    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    useEffect(() => {
        // Initialize RecaptchaVerifier on web only
        if (Platform.OS === 'web' && !recaptchaVerifierRef.current) {
            try {
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

                verifier.render().then((widgetId) => {
                    console.log('reCAPTCHA widget initialized with ID:', widgetId);
                }).catch((err) => {
                    console.error('❌ Failed to initialize reCAPTCHA Enterprise:', err);
                });
            } catch (e) {
                console.error('RecaptchaVerifier creation error:', e);
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

    const handleNativeRecaptchaMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'verificationId') {
                console.log("✅ Verification ID received from WebView:", data.value);
                setShowRecaptcha(false);
                setVerificationId(data.value);
                setStep('otp');
                setLoading(false);
            } else if (data.type === 'error') {
                console.error("❌ WebView Error:", data.value);
                setShowRecaptcha(false);
                setLoading(false);
                Alert.alert("Error", data.value || "Error en la verificación");
            } else if (data.type === 'log') {
                console.log('📱 WebView Log:', data.value);
            }
        } catch (e) {
            console.log('Raw WebView message:', event.nativeEvent.data);
            if (event.nativeEvent.data === 'expired') {
                Alert.alert('Error', 'La verificación expiró. Inténtalo de nuevo.');
                setShowRecaptcha(false);
                setLoading(false);
            }
        }
    };

    const handleSendCode = async () => {
        if (!phone || phone.length < 8) {
            Alert.alert("Número Inválido", "Por favor ingresa un número de teléfono válido.");
            return;
        }
        setLoading(true);

        const formattedPhone = `${countryCode}${phone.replace(/\s/g, '')}`;

        if (Platform.OS === 'web') {
            try {
                let appVerifier = recaptchaVerifierRef.current;
                if (!appVerifier) {
                    throw new Error("reCAPTCHA no se ha inicializado correctamente. Por favor recarga la página.");
                }
                const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
                setVerificationId(confirmationResult.verificationId);
                setStep('otp');
            } catch (error: any) {
                console.error("Send Code Error Web:", error);
                Alert.alert("Error", error.message);
            } finally {
                setLoading(false);
            }
        } else {
            // Mobile: Open WebView to handle the entire flow
            console.log("Opening WebView for verification:", formattedPhone);
            setShowRecaptcha(true);
            // Loading state remains TRUE until WebView returns success or error
        }
    };

    const handleVerifyCode = async () => {
        if (!code || code.length < 6 || !verificationId) return;
        setLoading(true);
        try {
            const credential = PhoneAuthProvider.credential(verificationId, code);
            const userCredential = await signInWithCredential(auth, credential);
            const fUser = userCredential.user;

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

    // HTML that handles signInWithPhoneNumber internally in the WebView
    const recaptchaHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
            <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
            <style>
                body { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                .loader { border: 4px solid #f3f3f3; border-top: 4px solid #F97316; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                #status { font-size: 16px; color: #333; text-align: center; padding: 20px; }
                #recaptcha-container { margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="loader"></div>
            <div id="status">Iniciando verificación de seguridad...</div>
            <div id="recaptcha-container"></div>
            
            <script>
                const firebaseConfig = ${JSON.stringify(firebaseConfig)};
                firebase.initializeApp(firebaseConfig);
                const auth = firebase.auth();
                auth.languageCode = 'es';
                
                // Force reCAPTCHA verification
                auth.settings.appVerificationDisabledForTesting = false;

                function log(msg) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'log', value: msg}));
                }

                function sendError(msg) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', value: msg}));
                }

                // Global function called by injectedJavaScript
                window.verifyAndSend = function(phoneNumber) {
                    log('Starting flow for: ' + phoneNumber);
                    document.getElementById('status').innerText = "Verificando que no eres un robot...";
                    
                    const verifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                        'size': 'invisible', 
                        'callback': function(response) {
                            log('ReCAPTCHA solved');
                            document.getElementById('status').innerText = "Enviando SMS...";
                        },
                        'expired-callback': function() {
                            sendError('ReCAPTCHA expired');
                        }
                    });

                    auth.signInWithPhoneNumber(phoneNumber, verifier)
                        .then(function(confirmationResult) {
                            log('SMS sent successfully! ID: ' + confirmationResult.verificationId);
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'verificationId', 
                                value: confirmationResult.verificationId
                            }));
                        })
                        .catch(function(error) {
                            log('Firebase Error: ' + error.code + ' - ' + error.message);
                            sendError(error.message);
                        });
                };
            </script>
        </body>
        </html>
    `;

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
                        step === 'phone' ? 'Bienvenido a Kitos' :
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

                {/* Native reCAPTCHA Modal (WebView) */}
                {showRecaptcha && Platform.OS !== 'web' && (
                    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={() => {
                        setShowRecaptcha(false);
                        setLoading(false);
                    }}>
                        <View style={styles.recaptchaModalContainer}>
                            <View style={styles.recaptchaHeader}>
                                <Text style={styles.recaptchaTitle}>Verificación de seguridad</Text>
                                <TouchableOpacity onPress={() => {
                                    setShowRecaptcha(false);
                                    setLoading(false);
                                }}>
                                    <X size={24} color="#000" />
                                </TouchableOpacity>
                            </View>
                            <WebView
                                originWhitelist={['*']}
                                source={{ html: recaptchaHtml, baseUrl: 'https://kiitos-app.firebaseapp.com' }}
                                onMessage={handleNativeRecaptchaMessage}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                injectedJavaScript={`
                                    setTimeout(function() {
                                        if (window.verifyAndSend) {
                                            window.verifyAndSend('${countryCode}${phone.replace(/\s/g, '')}');
                                        } else {
                                            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', value: 'Function not loaded'}));
                                        }
                                    }, 1000);
                                    true;
                                `}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </Modal>
                )}

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
    },
    recaptchaModalContainer: {
        flex: 1,
        backgroundColor: 'white',
        marginTop: 60,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    recaptchaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    recaptchaTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
});
