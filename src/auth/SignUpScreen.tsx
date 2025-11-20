import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import Button from '../components/Button';
import Input from '../components/Input';

export default function SignUpScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async () => {
        if (!email || !password || !name) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user profile in Firestore
            await setDoc(doc(db, 'profiles', user.uid), {
                email: user.email,
                displayName: name,
                createdAt: new Date().toISOString(),
            });

            router.replace('/');
        } catch (error: any) {
            Alert.alert('Error al registrarse', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        Alert.alert('Info', 'Google Sign-In requiere configuración adicional');
    };

    return (
        <View className="flex-1 bg-white p-6 justify-center">
            <View className="items-center mb-10">
                <Text className="text-3xl font-bold text-rose-500 mb-2">Crear Cuenta</Text>
                <Text className="text-lg text-gray-600">Únete a Kiitos</Text>
            </View>

            <Input
                label="Nombre Completo"
                value={name}
                onChangeText={setName}
                placeholder="Juan Pérez"
            />
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
                title="Registrarse"
                onPress={handleSignUp}
                loading={loading}
                className="mt-4"
            />

            <View className="my-6 flex-row items-center">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="mx-4 text-gray-400">O</Text>
                <View className="flex-1 h-px bg-gray-200" />
            </View>

            <Button
                title="Registrarse con Google"
                onPress={handleGoogleLogin}
                variant="google"
            />

            <View className="flex-row justify-center mt-8">
                <Text className="text-gray-600">¿Ya tienes cuenta? </Text>
                <Link href="/login" asChild>
                    <Text className="text-rose-500 font-bold">Inicia Sesión</Text>
                </Link>
            </View>
        </View>
    );
}
