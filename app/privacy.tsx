import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function PrivacyScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentContainer}>

                    {/* NEW BRANDING HEADER (Code-only, no images) */}
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoText}>Kitos</Text>
                            <Text style={styles.logoDot}>.</Text>
                        </View>
                        <Text style={styles.subtitle}>Privacy Policy</Text>
                        <Text style={styles.date}>Last Updated: December 22, 2025</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* LEGAL CONTENT */}
                    <Section title="1. Introduction">
                        <Text style={styles.text}>
                            At Kitos, we believe in transparency. This Privacy Policy outlines how we handle your data when you use our restaurant ordering platform. By using Kitos, you agree to the collection and use of information in accordance with this policy.
                        </Text>
                    </Section>

                    <Section title="2. Information We Collect">
                        <Text style={styles.text}>
                            We collect the minimum amount of data necessary to provide our service:
                        </Text>
                        <Bullet point="Account Info: Name and email (for receipts and identity)." />
                        <Bullet point="Location Data: To show you restaurants nearby and estimate pickup times." />
                        <Bullet point="Transaction Data: Payment history (processed securely by Stripe)." />
                    </Section>

                    <Section title="3. Camera Usage">
                        <Text style={styles.text}>
                            Our app requires access to your device's camera. This permission is used **exclusively** for scanning QR codes at restaurant tables to initiate orders. We do not record, save, or transmit any video or image data from your camera.
                        </Text>
                    </Section>

                    <Section title="4. Data Security">
                        <Text style={styles.text}>
                            We implement industry-standard security measures. Your payment details are tokenized and processed by Stripe; Kitos never stores your full credit card number.
                        </Text>
                    </Section>

                    <Section title="5. Contact & Support">
                        <Text style={styles.text}>
                            If you have any questions or request data deletion, please reach out to our team:
                        </Text>
                        <Text style={[styles.text, { fontWeight: 'bold', marginTop: 5 }]}>
                            support@kitos.app
                        </Text>
                    </Section>

                    <View style={{ height: 60 }} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- SUBCOMPONENTS ---
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

const Bullet = ({ point }: { point: string }) => (
    <View style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.text}>{point}</Text>
    </View>
);

// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        paddingVertical: 40,
        paddingHorizontal: 24,
    },
    contentContainer: {
        width: '100%',
        maxWidth: 800, // optimized for web
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 10,
    },
    logoText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -2,
    },
    logoDot: {
        fontSize: 48,
        fontWeight: '900',
        color: '#f89219', // Brand Orange
    },
    subtitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
        marginTop: 5,
    },
    date: {
        fontSize: 14,
        color: '#999',
        marginTop: 5,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 30,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 12,
    },
    text: {
        fontSize: 16,
        lineHeight: 26,
        color: '#444',
    },
    bulletRow: {
        flexDirection: 'row',
        marginTop: 8,
        paddingLeft: 8,
    },
    bulletDot: {
        fontSize: 16,
        marginRight: 10,
        color: '#444',
        lineHeight: 26,
    },
});
