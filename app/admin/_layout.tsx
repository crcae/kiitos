import React, { useState, useEffect } from 'react';
import { View, Platform, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import { Slot } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu as MenuIcon, X } from 'lucide-react-native';
import AdminSidebar from '../../src/components/admin/AdminSidebar';

export default function AdminLayout() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isWeb = Platform.OS === 'web';

    // Auto-collapse logic for web
    useEffect(() => {
        if (isWeb) {
            if (width < 1280) {
                setIsSidebarCollapsed(true);
            } else {
                setIsSidebarCollapsed(false);
            }
        }
    }, [width]);

    const contentMarginLeft = isWeb ? (isSidebarCollapsed ? 80 : 256) : 0;

    return (
        <View className="flex-1 bg-slate-950">
            {/* Sidebar (Web layout) */}
            {isWeb && (
                <AdminSidebar
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />
            )}
            {!isWeb && (
                <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-900 bg-slate-950" style={{ paddingTop: insets.top }}>
                    <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)}>
                        <MenuIcon color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white font-black tracking-tighter text-xl">KIITOS</Text>
                    <View className="w-6" />
                </View>
            )}

            {/* Main Content Area */}
            <View
                className="flex-1"
                style={{
                    marginLeft: contentMarginLeft,
                    // Ensure the content area itself fills available space and handles its own layout
                    height: '100%'
                }}
            >
                <Slot />
            </View>

            {/* Mobile Sidebar Overlay */}
            {!isWeb && isMobileMenuOpen && (
                <View className="absolute inset-0 z-50 flex-row">
                    <View className="w-64 h-full">
                        <AdminSidebar
                            isCollapsed={false}
                            onItemPress={() => setIsMobileMenuOpen(false)}
                        />
                        <TouchableOpacity
                            onPress={() => setIsMobileMenuOpen(false)}
                            className="absolute top-4 right-[-40px] bg-slate-900 w-8 h-8 rounded-full items-center justify-center border border-slate-800"
                        >
                            <X color="white" size={20} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        className="flex-1 bg-black/70"
                        onPress={() => setIsMobileMenuOpen(false)}
                    />
                </View>
            )}
        </View>
    );
}
