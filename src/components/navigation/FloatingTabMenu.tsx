import React from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ShoppingBag, ScanLine, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

interface FloatingTabMenuProps {
    activeTab: 'marketplace' | 'scan' | 'profile';
    onTabPress?: (tab: 'marketplace' | 'scan' | 'profile') => void;
}

export function FloatingTabMenu({ activeTab, onTabPress }: FloatingTabMenuProps) {
    const router = useRouter();
    const isIOS = Platform.OS === 'ios';

    const handlePress = (tab: 'marketplace' | 'scan' | 'profile') => {
        if (onTabPress) {
            onTabPress(tab);
            return;
        }

        switch (tab) {
            case 'marketplace':
                router.push({ pathname: '/(tabs)/marketplace', params: { view: 'list' } });
                break;
            case 'scan':
                router.push('/(tabs)/marketplace');
                break;
            case 'profile':
                router.push('/profile');
                break;
        }
    };

    const Container = isIOS ? BlurView : View;
    const containerStyle = isIOS ? {} : { backgroundColor: 'rgba(255, 255, 255, 0.95)', elevation: 10 };
    const tint = isIOS ? "systemMaterialLight" : undefined;

    return (
        <View style={styles.positionWrapper}>
            <Container
                intensity={50}
                tint={tint as any}
                style={[styles.container, containerStyle]}
            >
                {/* Marketplace Action */}
                <TouchableOpacity onPress={() => handlePress('marketplace')}>
                    <ShoppingBag
                        size={24}
                        color={activeTab === 'marketplace' ? '#000000' : '#9CA3AF'}
                        strokeWidth={activeTab === 'marketplace' ? 2.5 : 2}
                    />
                </TouchableOpacity>

                {/* Scan Action (Middle) */}
                <TouchableOpacity
                    onPress={() => handlePress('scan')}
                    style={[
                        styles.scanButton,
                        { backgroundColor: activeTab === 'scan' ? '#EA580C' : '#E5E7EB' }
                    ]}
                >
                    <ScanLine size={28} color={activeTab === 'scan' ? 'white' : '#9CA3AF'} />
                </TouchableOpacity>

                {/* Profile Action */}
                <TouchableOpacity onPress={() => handlePress('profile')}>
                    <User
                        size={24}
                        color={activeTab === 'profile' ? '#000000' : '#9CA3AF'}
                        strokeWidth={activeTab === 'profile' ? 2.5 : 2}
                    />
                </TouchableOpacity>
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    positionWrapper: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        zIndex: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderRadius: 100, // Important for shadow on wrapper
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        paddingVertical: 16,
        gap: 30,
        borderRadius: 100,
        overflow: 'hidden', // Ensures BlurView respects border radius
    },
    scanButton: {
        padding: 8,
        borderRadius: 9999,
        margin: -8
    }
});
