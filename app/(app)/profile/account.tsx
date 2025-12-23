import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../../src/services/firebaseConfig';
import { updateProfile, updateEmail, deleteUser } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Camera, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../src/context/AuthContext';

export default function AccountScreen() {
    const router = useRouter();
    const { user: contextUser, refreshUser } = useAuth();
    const user = auth.currentUser;

    // Local state variables
    const [name, setName] = useState(user?.displayName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phoneNumber || '');
    const [photo, setPhoto] = useState(user?.photoURL || '');
    const [isLoading, setIsLoading] = useState(false);

    // FORCE UPDATE when user loads
    useEffect(() => {
        if (user) {
            // Using logic: existing local state OR new user state (prefer user state on initial load)
            // But to fix "missing name", we should update if user has data.
            setName(user.displayName || '');
            setEmail(user.email || '');
            setPhone(user.phoneNumber || contextUser?.phoneNumber || '');
            setPhoto(user.photoURL || contextUser?.avatar || '');
        }
    }, [user, contextUser]);

    const handleChangePhoto = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "You've refused to allow this app to access your photos!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await updateProfile(user, {
                displayName: name,
                photoURL: photo
            });

            if (email !== user.email) {
                await updateEmail(user, email);
            }

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                name: name,
                email: email,
                phoneNumber: phone,
                avatar: photo,
            });

            await refreshUser();
            Alert.alert("Success", "Profile updated successfully.");
            router.back();
        } catch (error: any) {
            console.error("Update Error:", error);
            Alert.alert("Update Failed", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure? This action cannot be undone and you will lose all data.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (user) await deleteUser(user);
                            router.replace('/');
                        } catch (error: any) {
                            Alert.alert("Error", "Please log out and log in again to delete your account (Security Requirement).");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* CUSTOM HEADER */}
            <View style={styles.customHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Personal Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        {photo ? (
                            <Image source={{ uri: photo }} style={styles.avatar} />
                        ) : (
                            <View style={styles.initialsAvatar}>
                                <Text style={styles.initialsText}>
                                    {name ? name.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'U')}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.cameraBtn} onPress={handleChangePhoto}>
                            <Camera size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.headerText}>Tap camera to edit</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholder="name@example.com"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            placeholder="Type number here"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, isLoading && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
                        <Text style={styles.deleteText}>Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
    header: { alignItems: 'center', marginVertical: 20 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6' },
    cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#111', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: '#fff' },
    headerText: { color: '#9CA3AF', marginTop: 10, fontSize: 13 },
    form: { padding: 24 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, fontSize: 16, color: '#111' },
    saveBtn: { backgroundColor: '#F97316', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10 },
    saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 30 },
    deleteBtn: { padding: 15, alignItems: 'center' },
    deleteText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },
    initialsAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
    initialsText: { fontSize: 40, fontWeight: '700', color: '#6B7280' },
});
