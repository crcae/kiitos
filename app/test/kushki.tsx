// NOTE: This test is designed for Web. Ensure you replace 'YOUR_PUBLIC_MERCHANT_ID_HERE' with your Kushki Sandbox Public Credential.

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Kushki } from '@kushki/js';
import { Stack } from 'expo-router';

export default function KushkiTestScreen() {
    // State Management
    const [name, setName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cvc, setCvc] = useState('');
    const [expiryMonth, setExpiryMonth] = useState('');
    const [expiryYear, setExpiryYear] = useState('');
    const [testLog, setTestLog] = useState('No logs yet. Fill the form and press "Tokenize".');

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setTestLog(prev => `[${timestamp}] ${message}\n${prev}`);
    };

    const handlePayTest = async () => {
        addLog('Starting Kushki Tokenization Test...');

        try {
            // Step A: Initialize
            const kushki = new Kushki({
                publicCredentialId: "YOUR_PUBLIC_MERCHANT_ID_HERE", // User will replace this
                inTestEnvironment: true,
            });

            addLog('Kushki initialized. Requesting token...');

            // Step B: Tokenize
            const token = await kushki.card.requestToken({
                amount: {
                    totalAmount: 10,
                    currency: "MXN",
                },
                card: {
                    name: name,
                    number: cardNumber,
                    cvc: cvc,
                    expiryMonth: expiryMonth,
                    expiryYear: expiryYear,
                },
            });

            // Step C: Handle Result
            if (token && token.token) {
                addLog(`SUCCESS! Token: ${token.token}`);
            } else {
                addLog('ERROR: Token identification failed or returned empty.');
            }
        } catch (error: any) {
            addLog(`ERROR: ${error.message || JSON.stringify(error)}`);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Kushki Token Test' }} />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.header}>Kushki Payment Test</Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Cardholder Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Juan Perez"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Card Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="4111 1111 1111 1111"
                            value={cardNumber}
                            onChangeText={setCardNumber}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                            <Text style={styles.label}>Month (MM)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="12"
                                value={expiryMonth}
                                onChangeText={setExpiryMonth}
                                keyboardType="numeric"
                                maxLength={2}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                            <Text style={styles.label}>Year (YY)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="25"
                                value={expiryYear}
                                onChangeText={setExpiryYear}
                                keyboardType="numeric"
                                maxLength={2}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CVC</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="123"
                            value={cvc}
                            onChangeText={setCvc}
                            keyboardType="numeric"
                            maxLength={4}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.buttonContainer}>
                        <Button
                            title="PRUEBA KUSHKI (Tokenize)"
                            onPress={handlePayTest}
                            color="#003366"
                        />
                    </View>
                </View>

                <View style={styles.logContainer}>
                    <Text style={styles.logLabel}>Test Log:</Text>
                    <View style={styles.logBox}>
                        <Text style={styles.logText}>{testLog}</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    content: {
        padding: 24,
    },
    header: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 32,
        textAlign: 'center',
    },
    form: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        color: '#1F2937',
        backgroundColor: '#F9FAFB',
    },
    buttonContainer: {
        marginTop: 10,
        borderRadius: 10,
        overflow: 'hidden',
    },
    logContainer: {
        marginTop: 8,
    },
    logLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 10,
    },
    logBox: {
        backgroundColor: '#374151',
        padding: 16,
        borderRadius: 12,
        minHeight: 150,
    },
    logText: {
        color: '#F9FAFB',
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: 20,
    },
});
