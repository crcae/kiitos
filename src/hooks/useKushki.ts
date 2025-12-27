import { useState, useEffect } from 'react';
import { Kushki } from '@kushki/js';

interface UseKushkiResult {
    kushki: Kushki | null;
    isLoading: boolean;
    error: Error | null;
}

export const useKushki = (publicMerchantId: string | undefined): UseKushkiResult => {
    const [kushki, setKushki] = useState<Kushki | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initializeKushki = async () => {
            if (!publicMerchantId) {
                setIsLoading(false);
                setError(new Error('Public Merchant ID is missing'));
                return;
            }

            try {
                const kushkiInstance = new Kushki({
                    inTestEnvironment: true, // TODO: Make this configurable via env if needed
                    merchantId: publicMerchantId,
                });
                setKushki(kushkiInstance);
                setIsLoading(false);
            } catch (err) {
                console.error('Error initializing Kushki:', err);
                setError(err instanceof Error ? err : new Error('Failed to initialize Kushki'));
                setIsLoading(false);
            }
        };

        initializeKushki();
    }, [publicMerchantId]);

    return { kushki, isLoading, error };
};
