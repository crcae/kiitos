import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTenant } from '../../src/context/TenantContext';
import { Mail, Lock, ArrowRight, CheckCircle, ChefHat } from 'lucide-react-native';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, user, loading: authLoading } = useAuth();
    const { restaurant } = useTenant();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Manual Redirection Effect (Failsafe)
    React.useEffect(() => {
        if (user && !authLoading) {
            console.log('🔄 Login Page Redirecting user:', user.role);
            if (user.role === 'saas_admin' || user.role === 'restaurant_owner' || user.role === 'restaurant_manager') {
                router.replace('/admin');
            } else if (user.role === 'waiter') {
                router.replace('/waiter');
            } else if (user.role === 'cashier') {
                router.replace('/cashier');
            } else if (user.role === 'kitchen') {
                router.replace('/kitchen');
            } else if (user.role === 'customer') {
                router.replace('/(app)/marketplace');
            }
        }
    }, [user, authLoading]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Datos incompletos', 'Por favor ingresa tu correo corporativo y contraseña.');
            return;
        }

        try {
            setLoading(true);
            console.log('🔐 Attempting login...');
            await signIn(email, password);
            console.log('✅ Login successful!');
            // Loading stays true until redirect happens or component unmounts
        } catch (error: any) {
            console.error('Login error:', error);
            Alert.alert(
                'Acceso Denegado',
                'Las credenciales no coinciden con nuestros registros. Intenta nuevamente.'
            );
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-white"
        >
            <View className="flex-1 flex-col md:flex-row">

                {/* LEFT SIDE - Brand & Inspiration (Hidden on Mobile, Visible on Tablet/Web) */}
                <View className="hidden md:flex md:w-1/2 relative bg-kiitos-black">
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=2070&auto=format&fit=crop' }}
                        className="absolute inset-0 w-full h-full opacity-60"
                        resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-gradient-to-br from-kiitos-orange/90 to-kiitos-black/80" />

                    <View className="relative z-10 flex-1 justify-between p-16">
                        {/* Logo */}
                        <View>
                            <Text className="text-white font-bold text-3xl tracking-tight">
                                Kiitos<Text className="text-kiitos-orange">.</Text>
                            </Text>
                            <View className="mt-2 inline-flex flex-row items-center space-x-2 bg-white/10 px-3 py-1 rounded-full self-start border border-white/20">
                                <ChefHat size={14} color="white" />
                                <Text className="text-white text-xs font-medium uppercase tracking-wider">ADMIN ACCESS PORTAL</Text>
                            </View>
                        </View>

                        {/* Quote/Testimonial */}
                        <View>
                            <Text className="text-3xl font-bold text-white leading-tight mb-6">
                                "La eficiencia en la cocina empieza con las herramientas correctas."
                            </Text>
                            <View className="space-y-4">
                                <View className="flex-row items-center space-x-3">
                                    <CheckCircle size={20} color="#10B981" />
                                    <Text className="text-white/90 text-lg">Control total de pedidos en tiempo real</Text>
                                </View>
                                <View className="flex-row items-center space-x-3">
                                    <CheckCircle size={20} color="#10B981" />
                                    <Text className="text-white/90 text-lg">Métricas de rendimiento personalizadas</Text>
                                </View>
                                <View className="flex-row items-center space-x-3">
                                    <CheckCircle size={20} color="#10B981" />
                                    <Text className="text-white/90 text-lg">Comunicación fluida entre sala y cocina</Text>
                                </View>
                            </View>
                        </View>

                        <View>
                            <Text className="text-white/60 text-sm">© 2025 Kiitos Inc. Restaurant OS.</Text>
                        </View>
                    </View>
                </View>

                {/* RIGHT SIDE - Login Form */}
                <View className="flex-1 bg-white justify-center">
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                        className="flex-1"
                    >
                        <View className="flex-1 justify-center px-6 py-12 md:px-20 lg:px-32 max-w-2xl mx-auto w-full">

                            {/* Mobile Header (Visible only on mobile) */}
                            <View className="md:hidden mb-10 flex-row justify-between items-center">
                                <Text className="text-kiitos-black font-bold text-2xl tracking-tight">
                                    Kiitos<Text className="text-kiitos-orange">.</Text>
                                </Text>
                                <TouchableOpacity onPress={() => router.back()}>
                                    <Text className="text-gray-500">Atrás</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Back Button (Desktop) */}
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="hidden md:flex self-start mb-8 flex-row items-center space-x-2 group"
                            >
                                <ArrowRight size={16} className="text-gray-400 rotate-180 group-hover:text-kiitos-orange" color="#9CA3AF" />
                                <Text className="text-gray-400 font-medium group-hover:text-kiitos-orange transition-colors">Volver al inicio</Text>
                            </TouchableOpacity>

                            {/* Form Header */}
                            <View className="mb-10">
                                <Text className="text-3xl md:text-4xl font-bold text-kiitos-black mb-3">
                                    Bienvenido a tu Panel
                                </Text>
                                <Text className="text-lg text-gray-500">
                                    Ingresa tus credenciales para gestionar tu restaurante y métricas.
                                </Text>
                            </View>

                            {/* Inputs */}
                            <View className="space-y-6">
                                <View>
                                    <Text className="text-sm font-semibold text-kiitos-black mb-2 ml-1">Correo Corporativo</Text>
                                    <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 focus:bg-white focus:border-kiitos-orange transition-all">
                                        <Mail color="#9CA3AF" size={20} />
                                        <TextInput
                                            className="flex-1 ml-3 text-base text-gray-900"
                                            placeholder="nombre@restaurante.com"
                                            placeholderTextColor="#9CA3AF"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                <View>
                                    <View className="flex-row justify-between items-center mb-2 ml-1">
                                        <Text className="text-sm font-semibold text-kiitos-black">Contraseña</Text>
                                    </View>
                                    <View className="flex-row items-center border border-gray-200 rounded-xl px-4 py-3.5 bg-gray-50 focus:bg-white focus:border-kiitos-orange transition-all">
                                        <Lock color="#9CA3AF" size={20} />
                                        <TextInput
                                            className="flex-1 ml-3 text-base text-gray-900"
                                            placeholder="••••••••••••"
                                            placeholderTextColor="#9CA3AF"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                            editable={!loading}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View className="flex-row justify-end mt-2 mb-6">
                                <TouchableOpacity onPress={() => Alert.alert('Recuperar Contraseña', 'Contacta a tu administrador para restablecer tu acceso.')}>
                                    <Text className="text-sm font-medium text-kiitos-orange hover:text-orange-700">
                                        ¿Olvidaste tu contraseña?
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Action Button */}
                            <TouchableOpacity
                                className={`bg-kiitos-orange py-4 rounded-xl shadow-lg shadow-kiitos-orange/30 flex-row justify-center items-center space-x-2 ${loading ? 'opacity-70' : 'hover:bg-orange-600 active:scale-[0.98]'
                                    } transition-all`}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Text className="text-white font-bold text-lg">Iniciar Sesión</Text>
                                        <ArrowRight color="white" size={20} strokeWidth={2.5} />
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Footer / Helper */}
                            <View className="mt-12 pt-6 border-t border-gray-100 flex-row justify-center">
                                <Text className="text-gray-500 text-sm">
                                    ¿No tienes credenciales?{' '}
                                </Text>
                                <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
                                    <Text className="text-kiitos-orange font-bold text-sm">
                                        Registra tu restaurante
                                    </Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </ScrollView>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}
