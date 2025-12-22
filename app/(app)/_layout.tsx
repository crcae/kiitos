import { Tabs } from 'expo-router';
import { FloatingTabMenu } from '../../src/components/navigation/FloatingTabMenu';

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props) => <FloatingTabMenu {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="marketplace/index"
                options={{
                    title: 'Marketplace',
                }}
            />
            <Tabs.Screen
                name="profile/index"
                options={{
                    title: 'Profile',
                }}
            />
        </Tabs>
    );
}
