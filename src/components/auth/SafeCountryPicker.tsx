import React, { useState } from 'react';

interface SafeCountryPickerProps {
    show: boolean;
    pickerButtonOnPress: (item: any) => void;
    onBackdropPress: () => void;
    style?: any;
    lang: string;
}

/**
 * Wrapper around CountryPicker that safely handles navigation context errors
 * Uses dynamic import to prevent module-level initialization issues
 */
export function SafeCountryPicker(props: SafeCountryPickerProps) {
    const [CountryPicker, setCountryPicker] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        // Only load CountryPicker when actually needed (show === true)
        if (props.show && !CountryPicker && !isLoading) {
            setIsLoading(true);
            import('react-native-country-codes-picker')
                .then((module) => {
                    setCountryPicker(() => module.CountryPicker);
                    setIsLoading(false);
                })
                .catch((error) => {
                    console.error('Failed to load CountryPicker:', error);
                    setIsLoading(false);
                });
        }
    }, [props.show, CountryPicker, isLoading]);

    // Don't render anything if not showing
    if (!props.show) {
        return null;
    }

    // Still loading the component
    if (isLoading || !CountryPicker) {
        return null;
    }

    try {
        return <CountryPicker {...props} />;
    } catch (error) {
        console.warn('CountryPicker navigation context error:', error);
        return null;
    }
}
