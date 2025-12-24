import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Calendar, Lock, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function AddCardScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [cardData, setCardData] = useState({
        number: '',
        expiry: '',
        cvc: '',
        name: ''
    });

    const handleAddCard = () => {
        if (!cardData.number || !cardData.expiry || !cardData.cvc || !cardData.name) {
            Alert.alert("Missing Information", "Please fill in all card details.");
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            Alert.alert("Success", "Card added successfully!");
            router.replace('/(app)/profile');
        }, 1500);
    };

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

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.replace('/(app)/profile')} style={styles.backBtn}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Add New Card</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.cardPreview}>
                        <View style={styles.cardTop}>
                            <CreditCard color="#fff" size={32} />
                            <Text style={styles.cardBrand}>Pay</Text>
                        </View>
                        <Text style={styles.cardNumberPreview}>
                            {cardData.number || '•••• •••• •••• ••••'}
                        </Text>
                        <View style={styles.cardBottom}>
                            <View>
                                <Text style={styles.cardLabel}>Card Holder</Text>
                                <Text style={styles.cardValue}>{cardData.name.toUpperCase() || 'YOUR NAME'}</Text>
                            </View>
                            <View>
                                <Text style={styles.cardLabel}>Expires</Text>
                                <Text style={styles.cardValue}>{cardData.expiry || 'MM/YY'}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Card Number</Text>
                            <View style={styles.inputWrapper}>
                                <CreditCard size={20} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="0000 0000 0000 0000"
                                    keyboardType="numeric"
                                    maxLength={19}
                                    value={cardData.number}
                                    onChangeText={(t) => setCardData({ ...cardData, number: formatCardNumber(t) })}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 15 }]}>
                                <Text style={styles.label}>Expiry Date</Text>
                                <View style={styles.inputWrapper}>
                                    <Calendar size={20} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="MM/YY"
                                        keyboardType="numeric"
                                        maxLength={5}
                                        value={cardData.expiry}
                                        onChangeText={(t) => setCardData({ ...cardData, expiry: formatExpiry(t) })}
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>CVC / CVV</Text>
                                <View style={styles.inputWrapper}>
                                    <Lock size={20} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="123"
                                        keyboardType="numeric"
                                        maxLength={3}
                                        secureTextEntry
                                        value={cardData.cvc}
                                        onChangeText={(t) => setCardData({ ...cardData, cvc: t })}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Cardholder Name</Text>
                            <View style={styles.inputWrapper}>
                                <User size={20} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="As it appears on your card"
                                    autoCapitalize="characters"
                                    value={cardData.name}
                                    onChangeText={(t) => setCardData({ ...cardData, name: t })}
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                        onPress={handleAddCard}
                        disabled={loading}
                    >
                        <Text style={styles.saveBtnText}>
                            {loading ? 'Processing...' : 'Securely Add Card'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.secureBadge}>
                        <Lock size={14} color="#6B7280" />
                        <Text style={styles.secureText}>PCI-DSS Compliant Encryption</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    backBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '700', color: '#111' },
    content: { padding: 20 },
    cardPreview: { height: 180, backgroundColor: '#1F2937', borderRadius: 20, padding: 25, justifyContent: 'space-between', marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardBrand: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    cardNumberPreview: { color: '#fff', fontSize: 22, letterSpacing: 2, marginVertical: 15, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
    cardLabel: { color: '#9CA3AF', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
    cardValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
    form: { gap: 20, marginBottom: 30 },
    inputGroup: {},
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, textTransform: 'uppercase' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#E5E7EB' },
    input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#111' },
    row: { flexDirection: 'row' },
    saveBtn: { backgroundColor: '#111', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secureBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    secureText: { color: '#6B7280', fontSize: 12, marginLeft: 6 }
});
