import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ChefHat, Users, TrendingUp, Shield, Zap, Award, Menu, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function LandingPage() {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    return (
        <ScrollView className="flex-1 bg-stone-50">
            {/* Navbar - David AI Style */}
            <View className="w-full px-4 py-4 sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200">
                <View className="max-w-6xl mx-auto w-full flex-row items-center justify-between">
                    <Text className="font-bold text-xl text-stone-900">Kitos</Text>

                    {/* Desktop Menu */}
                    <View className="hidden md:flex flex-row items-center gap-6">
                        <TouchableOpacity onPress={() => router.push('/pricing')}>
                            <Text className="text-sm font-medium text-stone-600 hover:text-stone-900">Planes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/login' as any)}>
                            <Text className="text-sm font-medium text-stone-600 hover:text-stone-900">Login</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/pricing')}
                            className="bg-stone-900 px-4 py-2 rounded-lg shadow-sm hover:bg-stone-800"
                        >
                            <Text className="text-white text-sm font-medium">Comenzar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Mobile Menu Button */}
                    <TouchableOpacity className="md:hidden p-2" onPress={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X size={24} color="#1c1917" /> : <Menu size={24} color="#1c1917" />}
                    </TouchableOpacity>
                </View>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <View className="md:hidden absolute top-full left-0 w-full bg-white border-b border-stone-200 p-4 shadow-lg">
                        <TouchableOpacity className="py-3" onPress={() => router.push('/pricing')}>
                            <Text className="text-stone-800 font-medium">Planes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="py-3" onPress={() => router.push('/login' as any)}>
                            <Text className="text-stone-800 font-medium">Iniciar Sesión</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Hero Section - David AI Style */}
            <View className="w-full px-4 py-16 md:py-24 bg-white">
                <View className="max-w-4xl mx-auto items-center text-center">
                    <View className="bg-stone-100 px-3 py-1 rounded-full mb-6 border border-stone-200">
                        <Text className="text-xs font-medium text-stone-600 uppercase tracking-wider">Sistema Operativo Gastronómico</Text>
                    </View>
                    <Text className="text-4xl md:text-6xl font-bold text-stone-900 mb-6 leading-tight">
                        Gestiona tu Restaurante con <Text className="text-orange-600">Kiitos</Text>
                    </Text>
                    <Text className="text-lg md:text-xl text-stone-500 mb-10 max-w-2xl leading-relaxed">
                        La plataforma todo-en-uno para administración de restaurantes.
                        Desde pedidos hasta pagos, control total de tu negocio.
                    </Text>
                    <View className="flex-row flex-wrap justify-center gap-4">
                        <TouchableOpacity
                            onPress={() => router.push('/pricing')}
                            className="bg-stone-900 px-8 py-4 rounded-xl shadow-lg shadow-stone-900/20 active:scale-95 transition-transform"
                        >
                            <Text className="text-white font-semibold text-lg">Ver Planes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/login' as any)}
                            className="bg-white border border-stone-200 px-8 py-4 rounded-xl shadow-sm active:scale-95 transition-transform"
                        >
                            <Text className="text-stone-700 font-semibold text-lg">Iniciar Sesión</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Features Grid - David AI Style Cards */}
            <View className="w-full px-4 py-20 bg-stone-50">
                <View className="max-w-6xl mx-auto">
                    <Text className="text-3xl font-bold text-stone-900 text-center mb-16">¿Por qué elegir Kiitos?</Text>

                    <View className="flex-row flex-wrap justify-center gap-6">
                        <FeatureCard
                            icon={<ChefHat color="#C0392B" size={32} />}
                            title="Gestión de Cocina"
                            description="Pantalla de cocina en tiempo real con estados de pedidos"
                        />
                        <FeatureCard
                            icon={<Users color="#E67E22" size={32} />}
                            title="Control de Mesas"
                            description="Sistema visual de mesas con asignación dinámica"
                        />
                        <FeatureCard
                            icon={<TrendingUp color="#27AE60" size={32} />}
                            title="Reportes & Métricas"
                            description="Analytics en tiempo real de ventas y rendimiento"
                        />
                        <FeatureCard
                            icon={<Shield color="#2C3E50" size={32} />}
                            title="Multi-tenant Seguro"
                            description="Aislamiento total de datos entre restaurantes"
                        />
                        <FeatureCard
                            icon={<Zap color="#F39C12" size={32} />}
                            title="Pedidos Rápidos"
                            description="Interfaz optimizada para meseros en servicio activo"
                        />
                        <FeatureCard
                            icon={<Award color="#8E44AD" size={32} />}
                            title="Gestión de Staff"
                            description="Roles y permisos personalizados para tu equipo"
                        />
                    </View>
                </View>
            </View>

            {/* Social Proof */}
            <View className="w-full px-4 py-16 bg-white border-y border-stone-100">
                <View className="max-w-4xl mx-auto text-center">
                    <Text className="text-2xl font-bold text-stone-900 mb-4">Más de 100 restaurantes confían en Kiitos</Text>
                    <Text className="text-stone-500 text-lg">
                        Únete a la comunidad de restaurantes que han modernizado su operaciónes
                    </Text>
                </View>
            </View>

            {/* Final CTA - David AI Style */}
            <View className="w-full px-4 py-24 bg-stone-900">
                <View className="max-w-4xl mx-auto text-center">
                    <Text className="text-3xl md:text-4xl font-bold text-white mb-6">¿Listo para empezar?</Text>
                    <Text className="text-stone-400 text-xl mb-10">
                        Prueba gratis por 30 días. Sin tarjeta de crédito.
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/pricing')}
                        className="bg-orange-600 px-10 py-5 rounded-xl shadow-lg shadow-orange-900/20 active:scale-95 transition-transform self-center"
                    >
                        <Text className="text-white font-bold text-xl">Comenzar Ahora</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

function FeatureCard({ icon, title, description }: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <View className="w-full md:w-[350px] bg-white p-8 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
            <View className="w-12 h-12 bg-stone-50 rounded-xl items-center justify-center mb-6 border border-stone-100">
                {icon}
            </View>
            <Text className="text-xl font-bold text-stone-900 mb-3">{title}</Text>
            <Text className="text-stone-500 leading-relaxed">{description}</Text>
        </View>
    );
}
