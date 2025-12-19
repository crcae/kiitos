import { Stack } from 'expo-router';

export default function WaiterLayout() {
    return (
        <Stack>
            <Stack.Screen name="tables" options={{ title: 'Tables' }} />
            <Stack.Screen name="pos" options={{ title: 'New Order' }} />
            <Stack.Screen name="dashboard" options={{ title: 'Dashboard', headerShown: false }} />
        </Stack>
    );
}
