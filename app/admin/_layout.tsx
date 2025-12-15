import { Stack } from 'expo-router';

export default function AdminLayout() {
    return (
        <Stack>
            <Stack.Screen name="menu/index" options={{ title: 'Menu Management' }} />
        </Stack>
    );
}
