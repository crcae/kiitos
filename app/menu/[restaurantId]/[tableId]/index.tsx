import { useGlobalSearchParams } from 'expo-router';
import MenuScreen from '../../../../src/components/DigitalMenu/MenuScreen';

export default function MenuRoute() {
    const { restaurantId, tableId } = useGlobalSearchParams<{ restaurantId: string; tableId: string }>();

    if (!restaurantId || !tableId) return null;

    return <MenuScreen restaurantId={restaurantId} tableId={tableId} />;
}
