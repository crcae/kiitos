import { useGlobalSearchParams } from 'expo-router';
import BillScreen from '../../../../src/components/DigitalMenu/BillScreen';

export default function BillRoute() {
    const { restaurantId, tableId } = useGlobalSearchParams<{ restaurantId: string; tableId: string }>();

    if (!restaurantId || !tableId) return null;

    return <BillScreen restaurantId={restaurantId} tableId={tableId} />;
}
