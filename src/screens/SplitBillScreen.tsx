import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { useBill } from '../context/BillContext';
import { useState } from 'react';

export default function SplitBillScreen() {
    const router = useRouter();
    const { bill, updateSplitMode, updateSplitCount } = useBill();
    const [selectedMode, setSelectedMode] = useState<'full' | 'equal' | 'items'>(bill.splitMode);
    const [peopleCount, setPeopleCount] = useState(bill.splitCount);

    const handleContinue = () => {
        updateSplitMode(selectedMode);
        updateSplitCount(peopleCount);
        router.push('/tip');
    };

    return (
        <View className="flex-1 bg-white p-6">
            <Text className="text-2xl font-bold text-gray-900 mb-6">¿Cómo quieres dividir?</Text>

            <TouchableOpacity
                onPress={() => setSelectedMode('full')}
                className={`p-4 rounded-xl border mb-4 ${selectedMode === 'full' ? 'border-rose-500 bg-rose-50' : 'border-gray-200'}`}
            >
                <Text className={`font-bold text-lg ${selectedMode === 'full' ? 'text-rose-500' : 'text-gray-900'}`}>
                    Pagar la Cuenta Completa
                </Text>
                <Text className="text-gray-500 mt-1">Tú pagas todo el monto</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setSelectedMode('equal')}
                className={`p-4 rounded-xl border mb-4 ${selectedMode === 'equal' ? 'border-rose-500 bg-rose-50' : 'border-gray-200'}`}
            >
                <Text className={`font-bold text-lg ${selectedMode === 'equal' ? 'text-rose-500' : 'text-gray-900'}`}>
                    Dividir en Partes Iguales
                </Text>
                <Text className="text-gray-500 mt-1">Divide el total entre personas</Text>

                {selectedMode === 'equal' && (
                    <View className="flex-row items-center mt-4 bg-white rounded-lg p-2 self-start border border-gray-200">
                        <TouchableOpacity
                            onPress={() => setPeopleCount(Math.max(2, peopleCount - 1))}
                            className="w-8 h-8 items-center justify-center bg-gray-100 rounded-full"
                        >
                            <Text className="font-bold text-lg">-</Text>
                        </TouchableOpacity>
                        <Text className="mx-4 font-bold text-lg">{peopleCount}</Text>
                        <TouchableOpacity
                            onPress={() => setPeopleCount(Math.min(10, peopleCount + 1))}
                            className="w-8 h-8 items-center justify-center bg-gray-100 rounded-full"
                        >
                            <Text className="font-bold text-lg">+</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setSelectedMode('items')}
                className={`p-4 rounded-xl border mb-4 ${selectedMode === 'items' ? 'border-rose-500 bg-rose-50' : 'border-gray-200'}`}
            >
                <Text className={`font-bold text-lg ${selectedMode === 'items' ? 'text-rose-500' : 'text-gray-900'}`}>
                    Seleccionar mis Items
                </Text>
                <Text className="text-gray-500 mt-1">Paga solo lo que consumiste</Text>
            </TouchableOpacity>

            <View className="flex-1 justify-end">
                <Button
                    title="Continuar"
                    onPress={handleContinue}
                />
            </View>
        </View>
    );
}
