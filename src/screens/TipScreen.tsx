import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import { useBill } from '../context/BillContext';
import { useState } from 'react';

export default function TipScreen() {
    const router = useRouter();
    const { updateTip } = useBill();
    const [selectedTip, setSelectedTip] = useState<number | null>(null);
    const [customTip, setCustomTip] = useState('');

    const handleContinue = () => {
        if (selectedTip !== null) {
            updateTip(selectedTip);
        } else if (customTip) {
            updateTip(0, parseFloat(customTip));
        }
        router.push('/checkout');
    };

    const tipOptions = [10, 15, 20];

    return (
        <View className="flex-1 bg-white p-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">¿Deseas agregar propina?</Text>
            <Text className="text-gray-500 mb-8">Elige un porcentaje o ingresa un monto.</Text>

            <View className="flex-row justify-between mb-6">
                {tipOptions.map((tip) => (
                    <TouchableOpacity
                        key={tip}
                        onPress={() => {
                            setSelectedTip(tip);
                            setCustomTip('');
                        }}
                        className={`flex-1 mx-1 p-4 rounded-xl border items-center ${selectedTip === tip ? 'bg-rose-500 border-rose-500' : 'bg-white border-gray-200'}`}
                    >
                        <Text className={`font-bold text-lg ${selectedTip === tip ? 'text-white' : 'text-gray-900'}`}>
                            {tip}%
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View className="mb-6">
                <Text className="text-gray-600 mb-2 font-medium">Monto personalizado</Text>
                <TextInput
                    value={customTip}
                    onChangeText={(text) => {
                        setCustomTip(text);
                        setSelectedTip(null);
                    }}
                    placeholder="$0.00"
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-lg p-4 text-lg text-gray-900 bg-white focus:border-rose-500"
                />
            </View>

            <View className="flex-1 justify-end">
                <Button
                    title="Continuar al Pago"
                    onPress={handleContinue}
                />
                <Button
                    title="Sin Propina"
                    onPress={() => {
                        updateTip(0);
                        router.push('/checkout');
                    }}
                    variant="outline"
                    className="mt-4"
                />
            </View>
        </View>
    );
}
