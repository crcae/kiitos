import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingBag, ScanLine, User } from 'lucide-react-native';

interface FloatingTabMenuProps {
    activeTab: 'marketplace' | 'scan' | 'profile';
    onTabPress?: (tab: 'marketplace' | 'scan' | 'profile') => void;
}

export function FloatingTabMenu({ activeTab, onTabPress }: FloatingTabMenuProps) {
    const router = useRouter();

    const handlePress = (tab: 'marketplace' | 'scan' | 'profile') => {
        if (onTabPress) {
            onTabPress(tab);
            return;
        }

        // Default Navigation Logic if no override provided
        switch (tab) {
            case 'marketplace':
                // Navigate to list view
                router.push({ pathname: '/(tabs)/marketplace', params: { view: 'list' } });
                break;
            case 'scan':
                // Navigate to camera view
                router.push('/(tabs)/marketplace');
                break;
            case 'profile':
                router.push('/profile');
                break;
        }
    };

    return (
        <View
            className="absolute self-center z-50 bg-[#222] rounded-full flex-row items-center justify-between px-8 py-4 shadow-xl"
            style={{ bottom: 40, gap: 30 }}
        >
            {/* Marketplace Action */}
            <TouchableOpacity onPress={() => handlePress('marketplace')}>
                <ShoppingBag
                    size={24}
                    color={activeTab === 'marketplace' ? '#EA580C' : 'white'}
                    strokeWidth={activeTab === 'marketplace' ? 3 : 2}
                />
            </TouchableOpacity>

            {/* Scan Action (Middle) */}
            <TouchableOpacity
                onPress={() => handlePress('scan')}
                className={`p-2 rounded-full -m-2 ${activeTab === 'scan' ? 'bg-orange-600' : 'bg-stone-700/50'}`}
            >
                <ScanLine size={28} color="white" />
            </TouchableOpacity>

            {/* Profile Action */}
            <TouchableOpacity onPress={() => handlePress('profile')}>
                <User
                    size={24}
                    color={activeTab === 'profile' ? '#EA580C' : 'white'}
                    strokeWidth={activeTab === 'profile' ? 3 : 2}
                />
            </TouchableOpacity>
        </View>
    );
}
