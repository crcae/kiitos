import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function PrivacyScreen() {
    return (
        <SafeAreaView style={styles.mainContainer}>
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* The "Document Card" */}
                <View style={styles.documentCard}>

                    {/* Header Section */}
                    <View style={styles.header}>
                        <View style={styles.logoRow}>
                            <Text style={styles.logoText}>Kitos</Text>
                            <Text style={styles.logoDot}>.</Text>
                        </View>
                        <Text style={styles.docTitle}>Privacy Policy</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Last Updated: Dec 22, 2025</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Content */}
                    <View style={styles.body}>
                        <Section title="1. Introduction">
                            <Text style={styles.paragraph}>
                                Welcome to Kitos. Your privacy is non-negotiable. This document explains exactly how we handle your data—transparently and securely—while you use our table-side ordering platform.
                            </Text>
                        </Section>

                        <Section title="2. The Data We Collect">
                            <Text style={styles.paragraph}>
                                We believe in minimalism. We only collect what is strictly needed to get your food to your table:
                            </Text>
                            <Bullet point="Identity: Your name and email (to send digital receipts)." />
                            <Bullet point="Location: To display restaurants near you and estimate pickup times." />
                            <Bullet point="Payments: Encrypted transaction logs. We never see or store your full card number; Stripe handles that." />
                        </Section>

                        <Section title="3. Why We Need Your Camera">
                            <Text style={styles.paragraph}>
                                You will notice the app asks for Camera permissions. This is used for <Text style={styles.highlight}>one specific purpose</Text>: scanning QR codes at restaurant tables.
                            </Text>
                            <Text style={[styles.paragraph, { marginTop: 10 }]}>
                                We do not record video, take photos, or upload camera feeds to any server. It is strictly a local scanning tool.
                            </Text>
                        </Section>

                        <Section title="4. Sharing Data">
                            <Text style={styles.paragraph}>
                                We do not sell your data. We only share necessary info with:
                            </Text>
                            <Bullet point="Restaurants: So they know who placed the order." />
                            <Bullet point="Stripe: To securely process your payment." />
                        </Section>

                        <Section title="5. Contact Us">
                            <Text style={styles.paragraph}>
                                Have a question or want your data deleted? Reach out directly:
                            </Text>
                            <TouchableOpacity>
                                <Text style={styles.link}>support@kitos.app</Text>
                            </TouchableOpacity>
                        </Section>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>© 2025 Kitos App. All rights reserved.</Text>
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- SUBCOMPONENTS ---
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionHeader}>{title}</Text>
        {children}
    </View>
);

const Bullet = ({ point }: { point: string }) => (
    <View style={styles.bulletRow}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletText}>{point}</Text>
    </View>
);

// --- STYLES ---
const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F3F4F6', // Light gray background for the app
    },
    scrollContent: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    documentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 40,
        paddingHorizontal: 30,
        width: '100%',
        maxWidth: 800, // Keeps it readable on web
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3, // Android shadow
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#111827',
        letterSpacing: -1,
    },
    logoDot: {
        fontSize: 32,
        fontWeight: '900',
        color: '#F97316', // Kitos Orange
    },
    docTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#374151',
        marginTop: 4,
    },
    badge: {
        marginTop: 12,
        backgroundColor: '#F3F4F6',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 100,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        width: '100%',
        marginVertical: 30,
    },
    body: {
        width: '100%',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937', // Darker gray for headings
        marginBottom: 12,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 26, // Good line height for readability
        color: '#4B5563', // Softer gray for body text
    },
    highlight: {
        fontWeight: '600',
        color: '#111827',
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 10,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F97316', // Orange accent
        marginTop: 10,
        marginRight: 12,
    },
    bulletText: {
        fontSize: 16,
        lineHeight: 26,
        color: '#4B5563',
        flex: 1,
    },
    link: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F97316',
        marginTop: 5,
    },
    footer: {
        marginTop: 40,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
});
