import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStripe } from '../services/stripe';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebaseConfig';
import Button from '../components/Button';
import { useBill } from '../context/BillContext';
import { useState, useEffect } from 'react';

export default function CheckoutScreen() {
    const router = useRouter();
    const { bill, resetBill } = useBill();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const [finalAmount, setFinalAmount] = useState(0);

    useEffect(() => {
        calculateTotal();
    }, [bill]);

    const calculateTotal = () => {
        let amountToPay = 0;

        if (bill.splitMode === 'full') {
            amountToPay = bill.total;
        } else if (bill.splitMode === 'equal') {
            amountToPay = bill.total / bill.splitCount;
        } else {
            // Items split logic would go here (sum of assigned items + proportional tax)
            // For simplicity in this mock, defaulting to full if items not implemented
            amountToPay = bill.total;
        }

        // Add tip
        let tipAmount = 0;
        if (bill.customTipAmount > 0) {
            tipAmount = bill.customTipAmount;
        } else {
            tipAmount = amountToPay * (bill.tipPercentage / 100);
        }

        setFinalAmount(amountToPay + tipAmount);
    };

    const handlePayment = async () => {
        setLoading(true);
        try {
            // 1. Call Cloud Function to create PaymentIntent
            // Note: In a real app, you'd fetch the paymentIntent client secret here.
            // Since we don't have a deployed backend, we'll mock the success.

            /* 
            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
            const { data }: any = await createCheckoutSession({ amountToPay: finalAmount });
            
            const { error } = await initPaymentSheet({
              paymentIntentClientSecret: data.clientSecret,
              merchantDisplayName: 'Kiitos App',
            });
            if (error) throw error;
      
            const { error: paymentError } = await presentPaymentSheet();
            if (paymentError) throw paymentError;
            */

            // Mock delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            Alert.alert('¡Pago Exitoso!', 'Gracias por usar Kiitos.', [
                {
                    text: 'OK',
                    onPress: () => {
                        resetBill();
                        router.replace('/');
                    }
                }
            ]);

        } catch (error: any) {
            Alert.alert('Error en el pago', error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    return (
        <View className="flex-1 bg-white p-6">
            <View className="items-center py-10">
                <Text className="text-gray-500 text-lg mb-2">Total a Pagar</Text>
                <Text className="text-5xl font-bold text-gray-900">{formatCurrency(finalAmount)}</Text>
            </View>

            <View className="bg-gray-50 p-4 rounded-xl mb-8">
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Restaurante</Text>
                    <Text className="font-medium text-gray-900">{bill.restaurantName}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Modo de división</Text>
                    <Text className="font-medium text-gray-900">
                        {bill.splitMode === 'full' ? 'Cuenta Completa' :
                            bill.splitMode === 'equal' ? `Entre ${bill.splitCount} personas` : 'Por ítems'}
                    </Text>
                </View>
                <View className="flex-row justify-between">
                    <Text className="text-gray-600">Propina included</Text>
                    <Text className="font-medium text-gray-900">
                        {bill.customTipAmount > 0 ? formatCurrency(bill.customTipAmount) : `${bill.tipPercentage}%`}
                    </Text>
                </View>
            </View>

            <View className="flex-1 justify-end">
                <Button
                    title="Pagar con Tarjeta"
                    onPress={handlePayment}
                    loading={loading}
                />
            </View>
        </View>
    );
}
