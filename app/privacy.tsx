import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Stack } from 'expo-router';

export default function PrivacyPolicy() {
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Privacy Policy', headerBackTitle: 'Back' }} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentContainer}>
                    <Text style={styles.header}>Privacy Policy</Text>
                    <Text style={styles.lastUpdated}>Last updated: December 2025</Text>

                    <Text style={styles.paragraph}>
                        Kitos respects your privacy. This policy explains how we collect and use your data when you use our mobile application and services.
                    </Text>

                    <Text style={styles.sectionHeader}>1. Data We Collect</Text>

                    <Text style={styles.subHeader}>Location Information</Text>
                    <Text style={styles.paragraph}>
                        We use your location to show you nearby restaurants and to calculate pickup distances. This data is used to improve your ordering experience.
                    </Text>

                    <Text style={styles.subHeader}>Camera Access</Text>
                    <Text style={styles.paragraph}>
                        Kitos accesses your device's camera exclusively for the purpose of scanning QR codes at restaurant tables. We do not record or store images from your camera.
                    </Text>

                    <Text style={styles.subHeader}>Payment Information</Text>
                    <Text style={styles.paragraph}>
                        All payments are processed securely via Stripe. We do not store your credit card details on our servers. Stripe processes your payment information in accordance with their privacy policy.
                    </Text>

                    <Text style={styles.subHeader}>Personal Information</Text>
                    <Text style={styles.paragraph}>
                        We collect your name and email address when you create an account. This information is used to manage your account, send order receipts, and communicate important updates.
                    </Text>

                    <Text style={styles.sectionHeader}>2. How We Use Your Data</Text>
                    <Text style={styles.paragraph}>
                        We use your data solely to facilitate food ordering, process payments, and improve the quality of our service. We do not sell your personal data to advertisers.
                    </Text>

                    <Text style={styles.sectionHeader}>3. Third-Party Sharing</Text>
                    <Text style={styles.paragraph}>
                        We share necessary data with:
                    </Text>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.paragraph}>Restaurants: To fulfill your orders and manage table service.</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.paragraph}>Stripe: To process secure payments.</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.paragraph}>Firebase/Google: For secure authentication and database services.</Text>
                    </View>

                    <Text style={styles.sectionHeader}>4. Contact Us</Text>
                    <Text style={styles.paragraph}>
                        If you have any questions about this Privacy Policy, please contact us at:
                    </Text>
                    <Text style={[styles.paragraph, styles.link]}>support@kitos.app</Text>

                    <View style={styles.footerSpacer} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: 20,
    },
    contentContainer: {
        width: '100%',
        maxWidth: 800,
        paddingHorizontal: 24,
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
        marginTop: 10,
    },
    lastUpdated: {
        fontSize: 14,
        color: '#666',
        marginBottom: 32,
    },
    sectionHeader: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
        marginTop: 24,
        marginBottom: 12,
    },
    subHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        marginBottom: 12,
    },
    bulletPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        paddingLeft: 8,
    },
    bullet: {
        fontSize: 16,
        marginRight: 8,
        color: '#333',
        lineHeight: 24,
    },
    link: {
        color: '#f89219',
        fontWeight: '600',
    },
    footerSpacer: {
        height: 60,
    },
});
