import { Stack } from 'expo-router';

export default function CashierLayout() {
    return (
        <Stack>
            <Stack.Screen name="status" options={{ title: 'Cashier Station' }} />
        </Stack>
    );
}
