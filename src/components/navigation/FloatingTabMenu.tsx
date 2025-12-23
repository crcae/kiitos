import React from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { ShoppingBag, ScanLine, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useMarketStore } from '../../store/marketStore';

export function FloatingTabMenu(props: any) {
    const router = useRouter();
    const pathname = usePathname();
    const { triggerAction } = useMarketStore();
    const isIOS = Platform.OS === 'ios';

    // Determine active tab based on router state OR current pathname
    let activeTab = 'marketplace';

    if (props.state && props.state.routes) {
        const routeName = props.state.routes[props.state.index].name;
        if (routeName === 'profile') activeTab = 'profile';
        else if (routeName === 'marketplace') activeTab = 'marketplace';
    } else {
        if (pathname.includes('profile')) activeTab = 'profile';
        // Note: marketplace is default
    }

    const handlePress = (tab: 'marketplace' | 'scan' | 'profile') => {
        // PRESERVED LOGIC: Sync with MarketStore for UI transitions
        switch (tab) {
            case 'marketplace':
                triggerAction('SCROLL_DOWN');
                router.replace('/(app)/marketplace');
                break;
            case 'scan':
                triggerAction('SCROLL_TOP');
                router.replace('/(app)/marketplace');
                break;
            case 'profile':
                router.replace('/(app)/profile');
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
        borderRadius: 100,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
        paddingVertical: 16,
        gap: 30,
        borderRadius: 100,
        overflow: 'hidden',
    },
    scanButton: {
        padding: 8,
        borderRadius: 9999,
        margin: -8
    }
});
