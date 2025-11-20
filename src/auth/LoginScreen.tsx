import { useState } from 'react';
import { View, Text, Alert, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import Button from '../components/Button';
import Input from '../components/Input';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa correo y contraseña');
            return;
        }
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/'); // Navigate to home
        } catch (error: any) {
            Alert.alert('Error al iniciar sesión', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // TODO: Implement Google Sign-In
        Alert.alert('Info', 'Google Sign-In requiere configuración adicional (SHA-1, etc.)');
    };

    return (
        <View className="flex-1 bg-white p-6 justify-center">
            <View className="items-center mb-10">
                <Text className="text-3xl font-bold text-rose-500 mb-2">Kiitos</Text>
                <Text className="text-lg text-gray-600">Bienvenido de nuevo</Text>
            </View>

            <Input
                label="Correo Electrónico"
                value={email}
                onChangeText={setEmail}
                placeholder="ejemplo@correo.com"
                keyboardType="email-address"
            />
            <Input
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="********"
                secureTextEntry
            />

            <Button
                title="Iniciar Sesión"
                onPress={handleLogin}
                loading={loading}
                className="mt-4"
            />

            <View className="my-6 flex-row items-center">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="mx-4 text-gray-400">O</Text>
                <View className="flex-1 h-px bg-gray-200" />
            </View>

            <Button
                title="Iniciar sesión con Google"
                onPress={handleGoogleLogin}
                variant="google"
            />

            <View className="flex-row justify-center mt-8">
                <Text className="text-gray-600">¿No tienes cuenta? </Text>
                <Link href="/sign-up" asChild>
                    <Text className="text-rose-500 font-bold">Regístrate</Text>
                </Link>
            </View>
        </View>
    );
}
