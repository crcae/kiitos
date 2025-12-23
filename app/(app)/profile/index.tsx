import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, CreditCard, ChevronRight, LogOut, Plus, Receipt, User, Smartphone, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../../src/context/AuthContext';
import { auth, db } from '../../../src/services/firebaseConfig';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { FloatingTabMenu } from '../../../src/components/navigation/FloatingTabMenu';
import CustomerPhoneAuth from '../../../src/components/auth/CustomerPhoneAuth';

export default function ProfileScreen() {
    const router = useRouter();
    const authContext = useAuth();
    const { user, firebaseUser, signOut, loading, refreshUser } = authContext;

    console.log('[ProfileScreen] Render State:', {
        hasUser: !!user,
        hasFirebaseUser: !!firebaseUser,
        loading,
        hasSignOut: typeof signOut === 'function'
    });

    useEffect(() => {
        console.log('[ProfileScreen] Mounted');
        return () => console.log('[ProfileScreen] Unmounted');
    }, []);

    useEffect(() => {
        console.log('[ProfileScreen] Auth State Changed:', { hasUser: !!user, loading });
    }, [user, loading]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#F97316" />
            </View>
        );
    }

    // Fallback if no user is loaded yet (Guest Mode)
    if (!user) {
        return <GuestView router={router} refreshUser={refreshUser} />;
    }

    const handleLogout = async () => {
        console.log('[ProfileScreen] handleLogout initiated');
        try {
            await signOut();
            console.log('[ProfileScreen] SignOut successful');
            // We stay on /profile, the GuestView will render automatically because user is now null
        } catch (error) {
            console.error('[ProfileScreen] SignOut error:', error);
            Alert.alert("Logout Error", "Failed to sign out. Please try again.");
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar style="dark" />
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* DYNAMIC HEADER */}
                    <View style={styles.header}>
                        <Image
                            source={{ uri: user.avatar || (firebaseUser as any)?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email || 'User')}&background=F97316&color=fff` }}
                            style={styles.avatar}
                        />
                        <Text style={styles.name}>{user.name || (firebaseUser as any)?.displayName || "Valued Customer"}</Text>
                        <Text style={styles.email}>{user.email}</Text>
                    </View>

                    {/* WALLET SECTION (Empty State + Apple/Google Pay) */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Payment Methods</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletScroll} contentContainerStyle={{ paddingHorizontal: 20 }}>
                        {/* Add New Method (Primary) */}
                        <TouchableOpacity style={styles.addCardBtn} onPress={() => router.push('/profile/add-card')}>
                            <View style={styles.plusIcon}>
                                <Plus size={24} color="#9CA3AF" />
                            </View>
                            <Text style={styles.addText}>Add Card</Text>
                        </TouchableOpacity>

                        {/* Apple/Google Pay Info Card */}
                        <View style={styles.payInfoCard}>
                            <View style={styles.payIconsRow}>
                                {Platform.OS === 'ios' ? (
                                    <Text style={styles.payTextBrand}> Pay</Text>
                                ) : (
                                    <Text style={styles.payTextBrand}>G Pay</Text>
                                )}
                            </View>
                            <Text style={styles.payInfoText}>Fast & Secure checkout available</Text>
                        </View>
                    </ScrollView>

                    {/* UNIFIED MENU */}
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitleInline}>Account & History</Text>
                        <View style={styles.menuGroup}>

                            <MenuItem
                                icon={<Clock size={20} color="#F97316" />}
                                label="Orders & Payments"
                                sub="View empty history"
                                onPress={() => router.push('/profile/activity')}
                                bg="#FFF7ED"
                            />

                            <View style={styles.divider} />

                            <MenuItem
                                icon={<User size={20} color="#3B82F6" />}
                                label="Personal Details"
                                sub="Edit Profile, Name, Phone"
                                onPress={() => router.push('/profile/account')}
                                bg="#EFF6FF"
                            />

                        </View>
                    </View>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LogOut size={20} color="#EF4444" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                    <View style={{ height: 120 }} />
                </ScrollView>
            </SafeAreaView>

            <FloatingTabMenu activeTab="profile" />
        </View>
    );
}

const MenuItem = ({ icon, label, sub, onPress, bg }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
            {icon}
        </View>
        <View style={styles.menuContent}>
            <Text style={styles.menuText}>{label}</Text>
            {sub && <Text style={styles.menuSub}>{sub}</Text>}
        </View>
        <ChevronRight size={20} color="#D1D5DB" />
    </TouchableOpacity>
);

const GuestView = ({ router, refreshUser }: any) => {
    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <SafeAreaView style={styles.container}>
                <StatusBar style="dark" />
                <CustomerPhoneAuth onSuccess={() => { }} />
            </SafeAreaView>
            <FloatingTabMenu activeTab="profile" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    scrollContent: { paddingTop: 20, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 25 },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 15, borderWidth: 4, borderColor: '#fff' },
    name: { fontSize: 24, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
    email: { fontSize: 14, color: '#6B7280', marginTop: 4, fontWeight: '500' },
    sectionHeader: { paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111' },
    sectionTitleInline: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 12, marginLeft: 5 },
    walletScroll: { marginBottom: 30, flexGrow: 0 },
    addCardBtn: { width: 140, height: 100, borderRadius: 20, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', marginRight: 15 },
    plusIcon: { marginBottom: 8 },
    addText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
    payInfoCard: { width: 160, height: 100, borderRadius: 20, backgroundColor: '#111', padding: 15, justifyContent: 'center', marginRight: 20 },
    payIconsRow: { marginBottom: 5 },
    payTextBrand: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    payInfoText: { color: '#9CA3AF', fontSize: 12 },
    sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
    menuGroup: { backgroundColor: '#fff', borderRadius: 24, padding: 6 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    iconBox: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    menuContent: { flex: 1 },
    menuText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
    menuSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 74 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, opacity: 0.8 },
    logoutText: { color: '#EF4444', fontWeight: '600', fontSize: 16, marginLeft: 10 },
});
