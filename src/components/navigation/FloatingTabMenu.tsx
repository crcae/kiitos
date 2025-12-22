import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { ShoppingBag, ScanLine, User } from 'lucide-react-native';
import { useMarketStore } from '../../store/marketStore';

// Accepts what standard custom tab bars accept (props.state, props.navigation, etc.)
// But we can keep it flexible if we want to support manual usage too (optional)
export function FloatingTabMenu(props: any) {
    const router = useRouter();
    const pathname = usePathname();
    const { triggerAction } = useMarketStore();

    // Determine active tab based on router state (passed via props from Tabs) OR current pathname fallback
    // If used as tabBar, props.state.index gives us the active route index.
    let activeTab = 'marketplace';

    if (props.state && props.state.routes) {
        const routeName = props.state.routes[props.state.index].name;
        // Map route names to our internal tab keys
        if (routeName === 'profile') activeTab = 'profile';
        else if (routeName === 'marketplace') activeTab = 'marketplace';
    } else {
        // Fallback for standalone usage (though we should avoid this now)
        if (pathname.includes('profile')) activeTab = 'profile';
    }

    const handlePress = (tab: 'marketplace' | 'scan' | 'profile') => {
        // Use router.replace to avoid stacking screens infinitely
        switch (tab) {
            case 'marketplace':
                // Set action FIRST so it's ready when the screen mounts/updates
                // If we are already on marketplace, SCROLL_TOP
                if (activeTab === 'marketplace') {
                    // Toggle or just scroll top? Let's say scroll top for left button
                    // But maybe we want to expand? Let's map it:
                    // Left button -> "Marketplace" -> Ensure sheet is expanded or top?
                    // Use SCROLL_DOWN to expand sheet (show full list), SCROLL_TOP to minimize (show camera)
                    // "Shopping Bag" icon usually means "Show me the items" -> Expand Sheet (Index 1)
                    triggerAction('SCROLL_DOWN');
                } else {
                    // Navigating to it, default to expanding?
                    triggerAction('SCROLL_DOWN');
                }
                router.replace('/(app)/marketplace');
                break;
            case 'scan':
                // Scan -> Minimize sheet (Index 0)
                triggerAction('SCROLL_TOP');
                router.replace('/(app)/marketplace');
                break;
            case 'profile':
                router.replace('/(app)/profile');
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
