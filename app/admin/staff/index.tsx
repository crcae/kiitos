import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Alert, Platform, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Edit2, Trash2, UserX, UserCheck, Shuffle } from 'lucide-react-native';
import { colors, spacing } from '../../../src/styles/theme';
import {
    subscribeToStaff,
    createStaffMember,
    updateStaffMember,
    toggleStaffActive,
    generateRandomPin
} from '../../../src/services/staff';
import { StaffMember, StaffRole } from '../../../src/types/firestore';
import { useRestaurant } from '../../../src/hooks/useRestaurant';

import { useAuth } from '../../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import QRCode from 'react-native-qrcode-svg';

// Role badge colors
const ROLE_COLORS: Record<StaffRole, { bg: string; text: string; label: string }> = {
    admin: { bg: '#dc2626', text: '#fff', label: 'Admin' },
    waiter: { bg: '#059669', text: '#fff', label: 'Mesero' },
    kitchen: { bg: '#ea580c', text: '#fff', label: 'Cocina' },
    cashier: { bg: '#0891b2', text: '#fff', label: 'Cajero' }
};

export default function StaffManagementScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const { restaurant } = useRestaurant();
    const restaurantId = user?.restaurantId || 'kiitos-main';

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [role, setRole] = useState<StaffRole>('waiter');
    const [pin, setPin] = useState('');
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!restaurantId) return;
        const unsubscribe = subscribeToStaff(restaurantId, setStaff);
        return () => unsubscribe();
    }, [restaurantId]);

    const resetForm = () => {
        setEditingStaff(null);
        setName('');
        setRole('waiter');
        setPin('');
    };

    const openEdit = (member: StaffMember) => {
        setEditingStaff(member);
        setName(member.name);
        setRole(member.role);
        setPin(member.pin_code);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim() || !pin.trim()) {
            Alert.alert('Error', 'Nombre y PIN son requeridos');
            return;
        }

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            Alert.alert('Error', 'El PIN debe ser de 4 dígitos numéricos');
            return;
        }

        try {
            setSaving(true);
            if (editingStaff) {
                await updateStaffMember(restaurantId, editingStaff.id, {
                    name,
                    role,
                    pin_code: pin
                });
            } else {
                await createStaffMember(restaurantId, {
                    name,
                    role,
                    pin_code: pin,
                    active: true
                });
            }
            setModalVisible(false);
            resetForm();
        } catch (e: any) {
            console.error(e);
            Alert.alert('Error', e.message || 'No se pudo guardar el empleado');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (member: StaffMember) => {
        const action = member.active ? 'desactivar' : 'reactivar';
        const confirmMsg = `¿Estás seguro de ${action} a ${member.name}?`;

        const confirm = Platform.OS === 'web'
            ? window.confirm(confirmMsg)
            : await new Promise<boolean>((resolve) => {
                Alert.alert(
                    'Confirmar',
                    confirmMsg,
                    [
                        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                        { text: action === 'desactivar' ? 'Desactivar' : 'Reactivar', onPress: () => resolve(true) }
                    ]
                );
            });

        if (confirm) {
            try {
                await toggleStaffActive(restaurantId, member.id, !member.active);
            } catch (e) {
                console.error(e);
                Alert.alert('Error', 'No se pudo actualizar el estado');
            }
        }
    };

    const handleGeneratePin = () => {
        setPin(generateRandomPin());
    };

    // Filter active and inactive
    const activeStaff = staff.filter(s => s.active);
    const inactiveStaff = staff.filter(s => !s.active);

    const renderStaffCard = (member: StaffMember) => {
        const roleConfig = ROLE_COLORS[member.role];

        return (
            <View
                key={member.id}
                className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-3"
                style={{ opacity: member.active ? 1 : 0.5 }}
            >
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                        <Text className="text-white font-bold text-lg mb-1">{member.name}</Text>
                        <View className="flex-row items-center">
                            <View
                                className="px-3 py-1 rounded-full mr-2"
                                style={{ backgroundColor: roleConfig.bg }}
                            >
                                <Text className="text-xs font-semibold" style={{ color: roleConfig.text }}>
                                    {roleConfig.label}
                                </Text>
                            </View>
                            <Text className="text-slate-400 text-sm">PIN: {member.pin_code}</Text>
                        </View>
                    </View>

                    <View className="flex-row">
                        {member.active && (
                            <TouchableOpacity
                                onPress={() => openEdit(member)}
                                className="p-2 mr-1"
                            >
                                <Edit2 size={18} color={colors.white} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => handleToggleActive(member)}
                            className="p-2"
                        >
                            {member.active ? (
                                <UserX size={18} color={colors.chile} />
                            ) : (
                                <UserCheck size={18} color={colors.albahaca} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {!member.active && (
                    <View className="mt-2 pt-2 border-t border-slate-700">
                        <Text className="text-slate-500 text-xs">Inactivo</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="px-6 py-4 border-b border-slate-800 flex-row justify-between items-center">
                <View>
                    <Text className="text-xs text-orange-500 font-bold uppercase tracking-wider mb-1">
                        {restaurant?.name || restaurant?.id || user?.restaurantId || 'Cargando...'}
                    </Text>
                    <Text className="text-xl font-bold text-white">Gestión de Personal</Text>
                </View>
                <View className="flex-row gap-2">
                    <TouchableOpacity
                        onPress={() => setQrModalVisible(true)}
                        className="bg-slate-800 p-2 px-3 rounded-lg border border-slate-700 flex-row items-center"
                    >
                        <Text className="text-2xl mr-2">🔳</Text>
                        <Text className="text-slate-300 font-bold text-xs">QR Acceso</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            resetForm();
                            setModalVisible(true);
                        }}
                        className="bg-indigo-600 px-4 py-2 rounded-lg flex-row items-center"
                    >
                        <Plus size={20} color="#fff" />
                        <Text className="text-white font-bold ml-2">Nuevo</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* QR Modal */}
            <Modal visible={qrModalVisible} transparent animationType="fade">
                <View className="flex-1 justify-center items-center bg-black/80 p-4">
                    <View className="bg-white p-6 rounded-2xl items-center w-full max-w-sm">
                        <Text className="text-xl font-bold mb-2 text-stone-900">QR de Acceso Personal</Text>
                        <Text className="text-stone-500 text-sm mb-6 text-center">Imprime esto para que tu staff inicie sesión escaneándolo.</Text>

                        <View className="bg-white p-4 rounded-xl mb-6 border border-stone-200">
                            {restaurantId && (
                                <QRCode
                                    value={`${Platform.OS === 'web' ? window.location.origin : 'https://kiitos.app'}/login/staff?restaurantId=${restaurantId}`}
                                    size={200}
                                />
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={() => setQrModalVisible(false)}
                            className="bg-stone-900 w-full py-3 rounded-xl"
                        >
                            <Text className="text-white text-center font-bold">Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ScrollView className="flex-1 p-6">
                {/* Active Staff */}
                <Text className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-3">
                    Personal Activo ({activeStaff.length})
                </Text>
                {activeStaff.length === 0 ? (
                    <Text className="text-slate-500 text-center py-10">No hay empleados activos</Text>
                ) : (
                    activeStaff.map(renderStaffCard)
                )}

                {/* Inactive Staff */}
                {inactiveStaff.length > 0 && (
                    <>
                        <Text className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-3 mt-6">
                            Inactivos ({inactiveStaff.length})
                        </Text>
                        {inactiveStaff.map(renderStaffCard)}
                    </>
                )}
            </ScrollView>

            {/* Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                {Platform.OS === 'web' ? (
                    <View className="flex-1 justify-center items-center bg-black/60 px-4">
                        <View className="bg-white w-full max-w-md p-6 rounded-2xl">
                            <Text className="text-xl font-bold mb-4 text-slate-900">
                                {editingStaff ? 'Editar' : 'Nuevo'} Empleado
                            </Text>

                            <View className="mb-4">
                                <Text className="text-slate-700 font-medium mb-2">Nombre Completo</Text>
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Ej: Juan Pérez"
                                    className="border border-slate-300 rounded-lg px-4 py-3 text-base"
                                />
                            </View>

                            <View className="mb-4">
                                <Text className="text-slate-700 font-medium mb-2">Rol</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {(Object.keys(ROLE_COLORS) as StaffRole[]).map(r => {
                                        const isSelected = role === r;
                                        const config = ROLE_COLORS[r];
                                        return (
                                            <TouchableOpacity
                                                key={r}
                                                onPress={() => setRole(r)}
                                                className="px-4 py-2 rounded-lg border-2"
                                                style={{
                                                    backgroundColor: isSelected ? config.bg : 'transparent',
                                                    borderColor: config.bg
                                                }}
                                            >
                                                <Text
                                                    className="font-semibold"
                                                    style={{ color: isSelected ? config.text : config.bg }}
                                                >
                                                    {config.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View className="mb-4">
                                <Text className="text-slate-700 font-medium mb-2">PIN de Acceso (4 dígitos)</Text>
                                <View className="flex-row gap-2">
                                    <TextInput
                                        value={pin}
                                        onChangeText={(text) => setPin(text.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="####"
                                        keyboardType="number-pad"
                                        maxLength={4}
                                        className="flex-1 border border-slate-300 rounded-lg px-4 py-3 text-base text-center font-mono text-xl"
                                    />
                                    <TouchableOpacity
                                        onPress={handleGeneratePin}
                                        className="bg-slate-100 px-4 rounded-lg items-center justify-center"
                                    >
                                        <Shuffle size={20} color={colors.castIron} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="flex-row justify-end mt-4 gap-2">
                                <TouchableOpacity
                                    onPress={() => setModalVisible(false)}
                                    className="px-4 py-2"
                                >
                                    <Text className="text-slate-500 font-medium">Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={saving}
                                    className="bg-indigo-600 px-6 py-2 rounded-lg"
                                >
                                    <Text className="text-white font-medium">
                                        {saving ? 'Guardando...' : 'Guardar'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            className="flex-1 justify-center items-center bg-black/60 px-4"
                        >
                            <View className="bg-white w-full max-w-md p-6 rounded-2xl">
                                <Text className="text-xl font-bold mb-4 text-slate-900">
                                    {editingStaff ? 'Editar' : 'Nuevo'} Empleado
                                </Text>

                                <ScrollView className="max-h-96">
                                    <View className="mb-4">
                                        <Text className="text-slate-700 font-medium mb-2">Nombre Completo</Text>
                                        <TextInput
                                            value={name}
                                            onChangeText={setName}
                                            placeholder="Ej: Juan Pérez"
                                            className="border border-slate-300 rounded-lg px-4 py-3 text-base"
                                        />
                                    </View>

                                    <View className="mb-4">
                                        <Text className="text-slate-700 font-medium mb-2">Rol</Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {(Object.keys(ROLE_COLORS) as StaffRole[]).map(r => {
                                                const isSelected = role === r;
                                                const config = ROLE_COLORS[r];
                                                return (
                                                    <TouchableOpacity
                                                        key={r}
                                                        onPress={() => setRole(r)}
                                                        className="px-4 py-2 rounded-lg border-2"
                                                        style={{
                                                            backgroundColor: isSelected ? config.bg : 'transparent',
                                                            borderColor: config.bg
                                                        }}
                                                    >
                                                        <Text
                                                            className="font-semibold"
                                                            style={{ color: isSelected ? config.text : config.bg }}
                                                        >
                                                            {config.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    <View className="mb-4">
                                        <Text className="text-slate-700 font-medium mb-2">PIN de Acceso (4 dígitos)</Text>
                                        <View className="flex-row gap-2">
                                            <TextInput
                                                value={pin}
                                                onChangeText={(text) => setPin(text.replace(/\D/g, '').slice(0, 4))}
                                                placeholder="####"
                                                keyboardType="number-pad"
                                                maxLength={4}
                                                className="flex-1 border border-slate-300 rounded-lg px-4 py-3 text-base text-center font-mono text-xl"
                                            />
                                            <TouchableOpacity
                                                onPress={handleGeneratePin}
                                                className="bg-slate-100 px-4 rounded-lg items-center justify-center"
                                            >
                                                <Shuffle size={20} color={colors.castIron} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </ScrollView>

                                <View className="flex-row justify-end mt-4 gap-2">
                                    <TouchableOpacity
                                        onPress={() => setModalVisible(false)}
                                        className="px-4 py-2"
                                    >
                                        <Text className="text-slate-500 font-medium">Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleSave}
                                        disabled={saving}
                                        className="bg-indigo-600 px-6 py-2 rounded-lg"
                                    >
                                        <Text className="text-white font-medium">
                                            {saving ? 'Guardando...' : 'Guardar'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                )}
            </Modal>
        </View>
    );
}
