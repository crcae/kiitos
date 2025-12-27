import React, { useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, ScrollView, TextInput, TouchableOpacity, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreditCard, Calendar, Lock, User } from 'lucide-react-native';
import { httpsCallable } from 'firebase/functions';
import { useKushki } from '../../hooks/useKushki';
import AirbnbButton from '../AirbnbButton';
import { functions } from '../../services/firebaseConfig';
import { colors, spacing, typography } from '../../styles/theme';

interface KushkiPaymentProps {
    onSuccess: (token: any) => void;
    onError: (error: any) => void;
    amount?: number;
    currency?: string;
    publicMerchantId?: string;
    hideSuccessView?: boolean;
}

type PaymentInternalStatus = 'idle' | 'success' | 'error';

export const KushkiPayment: React.FC<KushkiPaymentProps> = ({
    onSuccess,
    onError,
    amount,
    currency = 'MXN',
    publicMerchantId = process.env.EXPO_PUBLIC_KUSHKI_PUBLIC_MERCHANT_ID,
    hideSuccessView = false,
}) => {
    const { kushki, isLoading: isKushkiLoading, error: kushkiError } = useKushki(publicMerchantId);

    const [cardNumber, setCardNumber] = useState('');
    const [cardHolderName, setCardHolderName] = useState('');
    const [expiry, setExpiry] = useState(''); // Combined MM/YY
    const [cvc, setCvc] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Refs for auto-advancing focus
    const cardNumberRef = useRef<TextInput>(null);
    const expiryRef = useRef<TextInput>(null);
    const cvcRef = useRef<TextInput>(null);
    const cardHolderRef = useRef<TextInput>(null);

    // Internal state for UI feedback
    const [paymentStatus, setPaymentStatus] = useState<PaymentInternalStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\s?/g, '').replace(/\D/g, '');
        const groups = cleaned.match(/.{1,4}/g);
        return groups ? groups.join(' ') : cleaned;
    };

    const formatExpiry = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length > 2) {
            return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
        }
        return cleaned;
    };

    const validateFields = () => {
        const newErrors: { [key: string]: string } = {};

        if (!cardHolderName.trim()) {
            newErrors.cardHolderName = 'Requerido';
        } else if (cardHolderName.trim().length < 3) {
            newErrors.cardHolderName = 'Muy corto';
        }

        const cleanCardNumber = cardNumber.replace(/\s/g, '');
        if (!cleanCardNumber) {
            newErrors.cardNumber = 'Requerido';
        } else if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
            newErrors.cardNumber = 'Inválido';
        }

        const expiryParts = expiry.split('/');
        const month = expiryParts[0] ? parseInt(expiryParts[0], 10) : 0;
        let yearDigit = expiryParts[1] ? parseInt(expiryParts[1], 10) : 0;

        if (!expiry || expiryParts.length < 2) {
            newErrors.expiry = 'Requerido';
        } else if (isNaN(month) || month < 1 || month > 12) {
            newErrors.expiry = 'Mes inválido';
        } else {
            const currentYearLastTwo = new Date().getFullYear() % 100;
            const currentMonth = new Date().getMonth() + 1;

            if (yearDigit < currentYearLastTwo) {
                newErrors.expiry = 'Expirado';
            } else if (yearDigit === currentYearLastTwo && month < currentMonth) {
                newErrors.expiry = 'Expirado';
            }
        }

        if (!cvc) {
            newErrors.cvc = 'Requerido';
        } else if (!/^\d{3,4}$/.test(cvc)) {
            newErrors.cvc = 'Inválido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const getKushkiErrorMessage = (error: any): string => {
        if (typeof error === 'string') {
            try {
                const parsed = JSON.parse(error);
                if (parsed.code) return getMessageByCode(parsed.code);
                if (parsed.message) return parsed.message;
            } catch (e) {
                return error;
            }
        }
        if (error.code) return getMessageByCode(error.code);
        if (error.message) return error.message;
        return 'Ocurrió un error inesperado al procesar el pago.';
    };

    const getMessageByCode = (code: string): string => {
        const errorMap: { [key: string]: string } = {
            '001': 'Transacción rechazada por el banco.',
            '002': 'Transacción rechazada. Contacte a su banco.',
            '012': 'Número de tarjeta inválido.',
            '013': 'Monto de transacción inválido.',
            '306': 'Tarjeta expirada.',
            '401': 'Código de seguridad (CVC) inválido.',
            '402': 'La tarjeta ha expirado.',
            '405': 'Tarjeta bloqueada.',
            '407': 'Fondos insuficientes.',
            '999': 'Error interno del sistema de pagos. Reintente más tarde.',
            'L001': 'Límite de intentos excedido.',
            'K001': 'Datos de la petición inválidos. Verifique.',
        };
        return errorMap[code] || `Error (${code}): Problema al procesar el pago.`;
    };

    const handlePay = async () => {
        if (!kushki) {
            setErrorMessage('El sistema de pago no está listo. Intente de nuevo más tarde.');
            setPaymentStatus('error');
            return;
        }

        if (!validateFields()) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        const expiryParts = expiry.split('/');
        const tokenRequestBody = {
            amount: amount || 0,
            currency: currency,
            card: {
                name: cardHolderName.trim(),
                number: cardNumber.replace(/\s/g, ''),
                cvc: cvc,
                expiryMonth: expiryParts[0],
                expiryYear: expiryParts[1],
            },
        };

        console.log('[Kushki] Requesting Token:', JSON.stringify({ ...tokenRequestBody, card: { ...tokenRequestBody.card, number: 'REDACTED', cvc: 'REDACTED' } }, null, 2));

        try {
            // 1. Obtener Token de Kushki.js
            const tokenResponse: any = await new Promise((resolve, reject) => {
                (kushki as any).requestToken(tokenRequestBody, (response: any) => {
                    if (response.token) {
                        resolve(response);
                    } else {
                        reject(response);
                    }
                });
            });

            console.log('[Kushki] Token Received:', tokenResponse.token);

            // 2. Procesar Cargo en el Backend
            const processCharge = httpsCallable(functions, 'processKushkiCharge');

            const chargePayload = {
                token: tokenResponse.token,
                amount: {
                    currency: currency,
                    subtotalIva: 0,
                    subtotalIva0: amount || 0,
                    ice: 0,
                    iva: 0
                },
                metadata: {
                    platform: Platform.OS,
                    cardHolder: cardHolderName.trim()
                },
                contactDetails: {
                    firstName: cardHolderName.split(' ')[0] || 'Cliente',
                    lastName: cardHolderName.split(' ').slice(1).join(' ') || 'Kiitos',
                    email: 'cliente@kiitos.com' // TODO: Get actual customer email
                }
            };

            const backendResponse: any = await processCharge(chargePayload);
            console.log('[Kushki] Backend Response:', JSON.stringify(backendResponse, null, 2));

            if (backendResponse.data?.success) {
                setPaymentStatus('success');
                onSuccess(backendResponse.data.data);
            } else {
                throw new Error(backendResponse.data?.message || 'Error en el procesamiento del cargo.');
            }

        } catch (err: any) {
            console.error('Payment Error Detail:', err);

            // Si el error viene de Firebase HTTPS Callable
            const errorData = err.details || err;
            const userFriendlyMessage = getKushkiErrorMessage(errorData);

            if (errorData.code === '401') setErrors(prev => ({ ...prev, cvc: 'CVC inválido' }));
            if (errorData.code === '012') setErrors(prev => ({ ...prev, cardNumber: 'Número inválido' }));
            if (errorData.code === '306' || errorData.code === '402') setErrors(prev => ({ ...prev, expiry: 'Tarjeta expirada' }));

            setErrorMessage(userFriendlyMessage);
            setPaymentStatus('error');
            onError(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetPayment = () => {
        setPaymentStatus('idle');
        setErrorMessage(null);
        setCardNumber('');
        setCardHolderName('');
        setExpiry('');
        setCvc('');
        setErrors({});
    };

    if (isKushkiLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#111" />
                <Text style={styles.loadingText}>Iniciando sistema de pago...</Text>
            </View>
        );
    }

    if (kushkiError) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {kushkiError.message}</Text>
                {!publicMerchantId && <Text style={styles.errorText}>Falta el ID Público del Comercio</Text>}
            </View>
        );
    }

    if (paymentStatus === 'success' && !hideSuccessView) {
        return (
            <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                <Text style={styles.statusTitle}>¡Pago Exitoso!</Text>
                <Text style={styles.statusSubtitle}>Su transacción ha sido procesada correctamente.</Text>

                <View style={styles.amountDisplay}>
                    <Text style={styles.amountLabel}>Monto procesado:</Text>
                    <Text style={styles.amountValue}>
                        {amount} {currency}
                    </Text>
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={() => onSuccess({ token: 'processed' })}>
                    <Text style={styles.actionBtnText}>Aceptar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (paymentStatus === 'error') {
        return (
            <View style={styles.statusContainer}>
                <Ionicons name="close-circle" size={80} color="#EF4444" />
                <Text style={styles.statusTitle}>Pago Fallido</Text>
                <Text style={styles.statusSubtitle}>{errorMessage || 'No pudimos procesar su pago.'}</Text>

                <TouchableOpacity style={styles.actionBtn} onPress={resetPayment}>
                    <Text style={styles.actionBtnText}>Intentar de nuevo</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header matching add-card.tsx title style */}
            <View style={styles.formHeader}>
                <Text style={styles.headerTitle}>Detalles del Pago</Text>
                {amount && (
                    <Text style={styles.headerSubtitle}>
                        Pagarás {amount} {currency} de forma segura
                    </Text>
                )}
            </View>

            {/* Card Preview exactly like add-card.tsx */}
            <View style={styles.cardPreview}>
                <View style={styles.cardTop}>
                    <CreditCard color="#fff" size={32} />
                    <Text style={styles.cardBrand}>Kushki</Text>
                </View>
                <Text style={styles.cardNumberPreview}>
                    {cardNumber || '•••• •••• •••• ••••'}
                </Text>
                <View style={styles.cardBottom}>
                    <View>
                        <Text style={styles.cardLabelPreview}>Titular</Text>
                        <Text style={styles.cardValuePreview}>{cardHolderName.toUpperCase() || 'NOMBRE EN TARJETA'}</Text>
                    </View>
                    <View>
                        <Text style={styles.cardLabelPreview}>Expira</Text>
                        <Text style={styles.cardValuePreview}>{expiry || 'MM/YY'}</Text>
                    </View>
                </View>
            </View>

            {/* Form Fields matching add-card.tsx */}
            <View style={styles.form}>
                {/* Number */}
                <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Número de Tarjeta</Text>
                        {errors.cardNumber && <Text style={styles.inlineError}>{errors.cardNumber}</Text>}
                    </View>
                    <Pressable
                        onPress={() => cardNumberRef.current?.focus()}
                        style={[
                            styles.inputWrapper,
                            errors.cardNumber && styles.inputWrapperError,
                            focusedField === 'cardNumber' && styles.inputWrapperFocused
                        ]}
                    >
                        <CreditCard size={20} color={errors.cardNumber ? "#EF4444" : (focusedField === 'cardNumber' ? "#111" : "#9CA3AF")} />
                        <TextInput
                            ref={cardNumberRef}
                            style={styles.input}
                            placeholder="0000 0000 0000 0000"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            maxLength={19}
                            value={cardNumber}
                            textContentType="creditCardNumber"
                            autoComplete="cc-number"
                            returnKeyType="next"
                            onSubmitEditing={() => expiryRef.current?.focus()}
                            onFocus={() => setFocusedField('cardNumber')}
                            onBlur={() => setFocusedField(null)}
                            onChangeText={(t) => {
                                setCardNumber(formatCardNumber(t));
                                if (errors.cardNumber) setErrors(prev => ({ ...prev, cardNumber: '' }));
                                // Auto advance if full
                                if (t.replace(/\s/g, '').length === 16) expiryRef.current?.focus();
                            }}
                        />
                    </Pressable>
                </View>

                {/* Expiry and CVC Row */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 15 }]}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Expiración</Text>
                            {errors.expiry && <Text style={styles.inlineError}>{errors.expiry}</Text>}
                        </View>
                        <Pressable
                            onPress={() => expiryRef.current?.focus()}
                            style={[
                                styles.inputWrapper,
                                errors.expiry && styles.inputWrapperError,
                                focusedField === 'expiry' && styles.inputWrapperFocused
                            ]}
                        >
                            <Calendar size={20} color={errors.expiry ? "#EF4444" : (focusedField === 'expiry' ? "#111" : "#9CA3AF")} />
                            <TextInput
                                ref={expiryRef}
                                style={styles.input}
                                placeholder="MM/YY"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                maxLength={5}
                                value={expiry}
                                textContentType="creditCardExpiration"
                                autoComplete="cc-exp"
                                returnKeyType="next"
                                onSubmitEditing={() => cvcRef.current?.focus()}
                                onFocus={() => setFocusedField('expiry')}
                                onBlur={() => setFocusedField(null)}
                                onChangeText={(t) => {
                                    setExpiry(formatExpiry(t));
                                    if (errors.expiry) setErrors(prev => ({ ...prev, expiry: '' }));
                                    // Auto advance if full
                                    if (t.length === 5) cvcRef.current?.focus();
                                }}
                            />
                        </Pressable>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>CVC / CVV</Text>
                            {errors.cvc && <Text style={styles.inlineError}>{errors.cvc}</Text>}
                        </View>
                        <Pressable
                            onPress={() => cvcRef.current?.focus()}
                            style={[
                                styles.inputWrapper,
                                errors.cvc && styles.inputWrapperError,
                                focusedField === 'cvc' && styles.inputWrapperFocused
                            ]}
                        >
                            <Lock size={20} color={errors.cvc ? "#EF4444" : (focusedField === 'cvc' ? "#111" : "#9CA3AF")} />
                            <TextInput
                                ref={cvcRef}
                                style={styles.input}
                                placeholder="123"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                maxLength={4}
                                secureTextEntry
                                value={cvc}
                                textContentType="creditCardSecurityCode"
                                autoComplete="cc-csc"
                                returnKeyType="next"
                                onSubmitEditing={() => cardHolderRef.current?.focus()}
                                onFocus={() => setFocusedField('cvc')}
                                onBlur={() => setFocusedField(null)}
                                onChangeText={(t) => {
                                    setCvc(t);
                                    if (errors.cvc) setErrors(prev => ({ ...prev, cvc: '' }));
                                    // Auto advance if full
                                    if (t.length >= 3) cardHolderRef.current?.focus();
                                }}
                            />
                        </Pressable>
                    </View>
                </View>

                {/* Name */}
                <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                        <Text style={styles.label}>Nombre del Titular</Text>
                        {errors.cardHolderName && <Text style={styles.inlineError}>{errors.cardHolderName}</Text>}
                    </View>
                    <Pressable
                        onPress={() => cardHolderRef.current?.focus()}
                        style={[
                            styles.inputWrapper,
                            errors.cardHolderName && styles.inputWrapperError,
                            focusedField === 'cardHolderName' && styles.inputWrapperFocused
                        ]}
                    >
                        <User size={20} color={errors.cardHolderName ? "#EF4444" : (focusedField === 'cardHolderName' ? "#111" : "#9CA3AF")} />
                        <TextInput
                            ref={cardHolderRef}
                            style={styles.input}
                            placeholder="Como aparece en la tarjeta"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="characters"
                            value={cardHolderName}
                            textContentType="name"
                            autoComplete="name"
                            returnKeyType="done"
                            onSubmitEditing={handlePay}
                            onFocus={() => setFocusedField('cardHolderName')}
                            onBlur={() => setFocusedField(null)}
                            onChangeText={(t) => {
                                setCardHolderName(t);
                                if (errors.cardHolderName) setErrors(prev => ({ ...prev, cardHolderName: '' }));
                            }}
                        />
                    </Pressable>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.saveBtn, (isProcessing || isKushkiLoading) && styles.saveBtnDisabled]}
                onPress={handlePay}
                disabled={isProcessing || isKushkiLoading}
            >
                {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveBtnText}>Pagar de forma segura</Text>
                )}
            </TouchableOpacity>

            <View style={styles.secureBadge}>
                <Lock size={14} color="#6B7280" />
                <Text style={styles.secureText}>Encriptado PCI-DSS Compliant</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#FAFAFA',
        borderRadius: 20,
    },
    formHeader: {
        marginBottom: 25,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    cardPreview: {
        height: 180,
        backgroundColor: '#1F2937',
        borderRadius: 20,
        padding: 25,
        justifyContent: 'space-between',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 5,
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardBrand: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    cardNumberPreview: {
        color: '#fff',
        fontSize: 22,
        letterSpacing: 2,
        marginVertical: 15,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardLabelPreview: {
        color: '#9CA3AF',
        fontSize: 10,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    cardValuePreview: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    form: {
        gap: 20,
        marginBottom: 30,
    },
    inputGroup: {},
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
        textTransform: 'uppercase',
    },
    inlineError: {
        fontSize: 10,
        color: '#EF4444',
        fontWeight: '600',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        minHeight: 56,
    },
    inputWrapperError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    inputWrapperFocused: {
        borderColor: '#111',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#111',
        fontWeight: '500',
        paddingVertical: 0,
        // @ts-ignore - Web specific property to remove blue ring
        outlineStyle: 'none',
    } as any,
    row: {
        flexDirection: 'row',
    },
    saveBtn: {
        backgroundColor: '#111',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    saveBtnDisabled: {
        opacity: 0.7,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    secureText: {
        color: '#6B7280',
        fontSize: 12,
        marginLeft: 6,
    },
    statusContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
    },
    statusTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111',
        marginTop: 20,
        marginBottom: 10,
    },
    statusSubtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 30,
    },
    amountDisplay: {
        backgroundColor: '#F3F4F6',
        padding: 15,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 30,
    },
    amountLabel: {
        fontSize: 12,
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: 5,
    },
    amountValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111',
    },
    actionBtn: {
        backgroundColor: '#111',
        height: 50,
        paddingHorizontal: 30,
        borderRadius: 12,
        justifyContent: 'center',
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    loadingContainer: {
        padding: 50,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontSize: 14,
        color: '#6B7280',
    },
    errorContainer: {
        padding: 20,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    errorText: {
        color: '#B91C1C',
        fontSize: 14,
        textAlign: 'center',
    },
});
