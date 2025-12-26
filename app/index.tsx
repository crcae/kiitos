import { Redirect, Link } from "expo-router";
import { Platform, View, Text, TouchableOpacity } from "react-native";
import LandingPage from "./landing";
// import { useAuth } from "../src/context/AuthContext"; // Descomentar cuando quieras usar auth real

export default function Index() {
    // 1. Lógica para WEB 🌐
    if (Platform.OS === 'web') {
        // Opción A: Renderizar la Landing directamente en la raíz para mejor SEO
        return <LandingPage />;
    }

    // 2. Lógica para MÓVIL (App) 📱
    // Aquí decidimos a dónde va la app al abrirse.

    // Placeholder temporal. En el futuro usar:
    // const { user } = useAuth();
    // const userIsLoggedIn = !!user;
    const userIsLoggedIn = false;

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
            <Redirect href="/(app)/marketplace" />
            <Link href="/test/kushki" asChild>
                <TouchableOpacity style={{ backgroundColor: '#DC2626', padding: 15, borderRadius: 8 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Go to Kushki Test (DEV ONLY)</Text>
                </TouchableOpacity>
            </Link>
        </View>
    );
}
