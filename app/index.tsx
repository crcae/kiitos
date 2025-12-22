import { Redirect } from "expo-router";
import { Platform } from "react-native";
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

    if (userIsLoggedIn) {
        return <Redirect href="/(app)/marketplace" />;
    } else {
        // En móvil, vamos directo al marketplace como pidió el usuario
        return <Redirect href="/(app)/marketplace" />;
    }
}
