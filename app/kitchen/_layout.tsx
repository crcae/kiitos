import { Stack } from 'expo-router';

export default function KitchenLayout() {
    return (
        <Stack>
            <Stack.Screen name="display" options={{ title: 'Kitchen Display' }} />
        </Stack>
    );
}
