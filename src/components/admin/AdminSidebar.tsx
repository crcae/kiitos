import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
    LayoutDashboard,
    UtensilsCrossed,
    LayoutGrid,
    Users,
    ReceiptText,
    CreditCard,
    BarChart3,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Settings,
    Star
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

interface SidebarItemProps {
    title: string;
    icon: any;
    route: string;
    isActive: boolean;
    onPress: (route: string) => void;
    isCollapsed?: boolean;
}

const SidebarItem = ({ title, icon: Icon, route, isActive, onPress, isCollapsed }: SidebarItemProps) => (
    <TouchableOpacity
        onPress={() => onPress(route)}
        className={`flex-row items-center px-4 py-3 mb-1 rounded-xl ${isActive ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
    >
        <Icon size={20} color={isActive ? 'white' : '#94a3b8'} />
        {!isCollapsed && (
            <Text className={`ml-3 font-semibold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {title}
            </Text>
        )}
    </TouchableOpacity>
);

export default function AdminSidebar({
    isCollapsed,
    onToggleCollapse,
    onItemPress
}: {
    isCollapsed?: boolean,
    onToggleCollapse?: () => void,
    onItemPress?: () => void
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { signOut } = useAuth();

    const menuItems = [
        { title: 'Dashboard', icon: LayoutDashboard, route: '/admin' },
        { title: 'Mesas', icon: LayoutGrid, route: '/admin/tables' },
        { title: 'Menú', icon: UtensilsCrossed, route: '/admin/menu' },
        { title: 'Staff', icon: Users, route: '/admin/staff' },
        { title: 'Cuentas', icon: ReceiptText, route: '/admin/bills' },
        { title: 'Pagos', icon: CreditCard, route: '/admin/payments' },
        { title: 'Ventas', icon: BarChart3, route: '/admin/sales' },
        { title: 'Reseñas', icon: Star, route: '/admin/reviews' },
        { title: 'Estadísticas Staff', icon: Users, route: '/admin/staff-stats' },
        { title: 'Configuración', icon: Settings, route: '/admin/settings' },
    ];

    const handleOnItemPress = (route: string) => {
        router.push(route as any);
        if (onItemPress) onItemPress();
    };

    const handleLogout = async () => {
        await signOut();
        router.replace('/login');
    };

    return (
        <View
            className={`bg-slate-900 border-r border-slate-800 h-full flex-col justify-between ${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 shadow-2xl`}
            style={Platform.OS === 'web' ? { position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 } as any : {}}
        >
            <View className="px-4 py-6 flex-1">
                {/* Logo Section */}
                <View className={`flex-row items-center mb-10 px-2 ${isCollapsed ? 'justify-center' : ''}`}>
                    <View className="w-10 h-10 bg-indigo-600 rounded-2xl items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Text className="text-white font-black text-xl">K</Text>
                    </View>
                    {!isCollapsed && <Text className="ml-4 text-white font-black text-2xl tracking-tighter">KIITOS</Text>}
                </View>

                {!isCollapsed && (
                    <View className="mb-6 px-3">
                        <Text className="text-slate-500 text-[10px] uppercase font-black tracking-[2px] mb-4">Panel de Control</Text>
                    </View>
                )}

                <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                    {menuItems.map((item) => (
                        <SidebarItem
                            key={item.route}
                            {...item}
                            isActive={pathname === item.route}
                            onPress={handleOnItemPress}
                            isCollapsed={isCollapsed}
                        />
                    ))}
                </ScrollView>
            </View>

            <View className="px-4 py-8 border-t border-slate-800 bg-slate-900/50">
                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center px-4 py-4 rounded-2xl hover:bg-red-500/10 active:bg-red-500/10 transition-colors"
                >
                    <LogOut size={22} color="#ef4444" />
                    {!isCollapsed && <Text className="ml-4 font-bold text-red-500">Cerrar Sesión</Text>}
                </TouchableOpacity>

                {Platform.OS === 'web' && onToggleCollapse && (
                    <TouchableOpacity
                        onPress={onToggleCollapse}
                        className="absolute -right-3 top-[-24px] bg-slate-800 w-8 h-8 rounded-full border border-slate-700 items-center justify-center shadow-xl hover:bg-slate-700 hover:border-slate-600"
                    >
                        {isCollapsed ? <ChevronRight size={16} color="#94a3b8" /> : <ChevronLeft size={16} color="#94a3b8" />}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
