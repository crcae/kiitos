import { Tabs } from 'expo-router';
import { Store, User, ChefHat } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBaseClassName: 'bg-white border-t border-stone-200',
                tabBarActiveTintColor: '#EA580C', // orange-600
                tabBarInactiveTintColor: '#78716c', // stone-500
            }}
        >
            <Tabs.Screen
                name="marketplace"
                options={{
                    title: 'Discover',
                    tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
                    tabBarStyle: { display: 'none' },
                }}
            />
            {/* Placeholder for future tabs if needed */}
        </Tabs>
    );
}
