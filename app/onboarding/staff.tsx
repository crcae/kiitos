import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { createStaffMember } from '../../src/services/saas';
import { OperationalRole, TenantRole } from '../../src/types/firestore';

interface StaffMemberForm {
    name: string;
    email: string;
    role: OperationalRole | TenantRole;
}

const ROLES = [
    { label: 'Gerente', value: 'restaurant_manager' as const },
    { label: 'Mesero', value: 'waiter' as const },
    { label: 'Cocina', value: 'kitchen' as const },
    { label: 'Cajero', value: 'cashier' as const },
];

export default function StaffScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const [staffMembers, setStaffMembers] = useState<StaffMemberForm[]>([]);
    const [currentMember, setCurrentMember] = useState<StaffMemberForm>({
        name: '',
        email: '',
        role: 'waiter',
    });
    const [loading, setLoading] = useState(false);

    const addStaffMember = () => {
        if (!currentMember.name || !currentMember.email) {
            Alert.alert('Error', 'Por favor completa el nombre y email');
            return;
        }

        setStaffMembers([...staffMembers, currentMember]);
        setCurrentMember({ name: '', email: '', role: 'waiter' });
    };

    const removeStaffMember = (index: number) => {
        setStaffMembers(staffMembers.filter((_, i) => i !== index));
    };

    const handleNext = async () => {
        try {
            setLoading(true);

            if (!user?.restaurantId) {
                throw new Error('No restaurant ID found');
            }

            // Create all staff members
            for (const member of staffMembers) {
                await createStaffMember(
                    member.email,
                    member.name,
                    member.role,
                    user.restaurantId
                );
            }

            console.log(`✅ Created ${staffMembers.length} staff members`);
            router.push('/onboarding/complete');

        } catch (error: any) {
            console.error('Error creating staff:', error);
            Alert.alert('Error', 'No se pudo crear el staff. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        router.push('/onboarding/complete');
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.stepIndicator}>Paso 3 de 3 (Opcional)</Text>
                <Text style={styles.title}>Crea tu Equipo</Text>
                <Text style={styles.subtitle}>
                    Agrega los miembros iniciales de tu staff. Podrás agregar más después.
                </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '100%' }]} />
            </View>

            {/* Form */}
            <View style={styles.form}>
                <Text style={styles.sectionTitle}>Agregar Miembro del Staff</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre Completo</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="María González"
                        value={currentMember.name}
                        onChangeText={(text) => setCurrentMember({ ...currentMember, name: text })}
                        autoCapitalize="words"
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="maria@example.com"
                        value={currentMember.email}
                        onChangeText={(text) => setCurrentMember({ ...currentMember, email: text })}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Rol</Text>
                    <View style={styles.roleButtons}>
                        {ROLES.map((role) => (
                            <TouchableOpacity
                                key={role.value}
                                style={[
                                    styles.roleButton,
                                    currentMember.role === role.value && styles.roleButtonActive,
                                ]}
                                onPress={() => setCurrentMember({ ...currentMember, role: role.value })}
                                disabled={loading}
                            >
                                <Text style={[
                                    styles.roleButtonText,
                                    currentMember.role === role.value && styles.roleButtonTextActive,
                                ]}>
                                    {role.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={addStaffMember}
                    disabled={loading}
                >
                    <Text style={styles.addButtonText}>+ Agregar a la Lista</Text>
                </TouchableOpacity>

                {/* Staff List */}
                {staffMembers.length > 0 && (
                    <View style={styles.staffList}>
                        <Text style={styles.listTitle}>Miembros Agregados ({staffMembers.length})</Text>
                        {staffMembers.map((member, index) => (
                            <View key={index} style={styles.staffItem}>
                                <View style={styles.staffInfo}>
                                    <Text style={styles.staffName}>{member.name}</Text>
                                    <Text style={styles.staffEmail}>{member.email}</Text>
                                    <Text style={styles.staffRole}>
                                        {ROLES.find(r => r.value === member.role)?.label}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => removeStaffMember(index)}
                                    style={styles.deleteButton}
                                    disabled={loading}
                                >
                                    <Trash2 size={20} color="#C0392B" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBack}
                    disabled={loading}
                >
                    <Text style={styles.backButtonText}>← Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                    disabled={loading}
                >
                    <Text style={styles.skipButtonText}>Omitir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.nextButton, loading && styles.nextButtonDisabled]}
                    onPress={handleNext}
                    disabled={loading || staffMembers.length === 0}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.nextButtonText}>Continuar →</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FDFBF7',
    },
    contentContainer: {
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    stepIndicator: {
        fontSize: 14,
        color: '#E67E22',
        fontWeight: '600',
        marginBottom: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 20,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#E67E22',
    },
    form: {
        paddingHorizontal: 20,
        paddingVertical: 40,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#2C3E50',
    },
    roleButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    roleButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    roleButtonActive: {
        borderColor: '#E67E22',
        backgroundColor: '#FFF5F0',
    },
    roleButtonText: {
        fontSize: 14,
        color: '#2C3E50',
    },
    roleButtonTextActive: {
        color: '#E67E22',
        fontWeight: '600',
    },
    addButton: {
        backgroundColor: '#27AE60',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    staffList: {
        marginTop: 32,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 12,
    },
    staffItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    staffInfo: {
        flex: 1,
    },
    staffName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 4,
    },
    staffEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    staffRole: {
        fontSize: 12,
        color: '#E67E22',
        fontWeight: '600',
    },
    deleteButton: {
        padding: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    backButton: {
        flex: 1,
        backgroundColor: '#E0E0E0',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#2C3E50',
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#E0E0E0',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    skipButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    nextButton: {
        flex: 1,
        backgroundColor: '#FF385C',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextButtonDisabled: {
        opacity: 0.6,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
