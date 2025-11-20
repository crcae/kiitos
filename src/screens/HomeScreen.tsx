import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { useBill } from '../context/BillContext';
import { auth } from '../services/firebaseConfig';

export default function HomeScreen() {
    const router = useRouter();
    const { setBill } = useBill();
    const user = auth.currentUser;

    const handleScanBill = () => {
        // Mock scanning a bill
        const mockItems = [
            { id: '1', name: 'Tacos al Pastor', price: 150.00 },
            { id: '2', name: 'Guacamole', price: 90.00 },
            { id: '3', name: 'Cerveza Victoria', price: 45.00 },
            { id: '4', name: 'Quesadilla', price: 65.00 },
        ];

        const subtotal = mockItems.reduce((sum, item) => sum + item.price, 0);
        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        setBill({
            restaurantName: 'Taquería El Califa',
            items: mockItems,
            subtotal,
            tax,
            total,
            splitMode: 'full',
            splitCount: 1,
            tipPercentage: 0,
            customTipAmount: 0,
        });

        router.push('/bill-details');
    };

    return (
        <View className="flex-1 bg-white items-center justify-center p-6">
            <View className="mb-10 items-center">
                <Text className="text-4xl font-bold text-rose-500 mb-2">Kiitos</Text>
                <Text className="text-xl text-gray-600">Hola, {user?.displayName || 'Usuario'}</Text>
            </View>

            <View className="w-full max-w-xs">
                <Button
                    title="Escanear Cuenta"
                    onPress={handleScanBill}
                    className="mb-4 py-5"
                />

                <Button
                    title="Historial"
                    onPress={() => { }}
                    variant="secondary"
                />
            </View>

            <Button
                title="Cerrar Sesión"
                onPress={() => auth.signOut()}
                variant="outline"
                className="mt-20"
            />
        </View>
    );
}
