import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { useBill } from '../context/BillContext';

export default function BillDetailsScreen() {
    const router = useRouter();
    const { bill } = useBill();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    return (
        <View className="flex-1 bg-white">
            <View className="p-6 border-b border-gray-100">
                <Text className="text-2xl font-bold text-gray-900">{bill.restaurantName}</Text>
                <Text className="text-gray-500">Detalle de la cuenta</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-4">
                {bill.items.map((item) => (
                    <View key={item.id} className="flex-row justify-between py-3 border-b border-gray-50">
                        <Text className="text-base text-gray-800">{item.name}</Text>
                        <Text className="text-base font-medium text-gray-900">{formatCurrency(item.price)}</Text>
                    </View>
                ))}

                <View className="mt-6 pt-4 border-t border-gray-200">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-600">Subtotal</Text>
                        <Text className="text-gray-900">{formatCurrency(bill.subtotal)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-600">IVA (16%)</Text>
                        <Text className="text-gray-900">{formatCurrency(bill.tax)}</Text>
                    </View>
                    <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-200">
                        <Text className="text-xl font-bold text-gray-900">Total</Text>
                        <Text className="text-xl font-bold text-rose-500">{formatCurrency(bill.total)}</Text>
                    </View>
                </View>
            </ScrollView>

            <View className="p-6 border-t border-gray-100">
                <Button
                    title="Dividir la Cuenta"
                    onPress={() => router.push('/split-bill')}
                />
            </View>
        </View>
    );
}
