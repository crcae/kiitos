import { Tabs } from 'expo-router';
import { Store, User, ChefHat } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#EA580C', // orange-600
                tabBarInactiveTintColor: '#78716c', // stone-500
            }}
        >
            <Tabs.Screen
                name="marketplace"
                options={{
                    title: 'Discover',
                    // Icons are handled in FloatingTabBar, but keeping this for fallback/reference
                    tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
                    tabBarStyle: { display: 'none' },
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarStyle: { display: 'none' }, // Also hide default tab bar on profile as we use custom one or none
                }}
            />
            {/* Placeholder for future tabs if needed */}
        </Tabs>
    );
}
