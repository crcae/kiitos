import { Text, TouchableOpacity, ActivityIndicator } from 'react-native';

interface ButtonProps {
    onPress: () => void;
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'google';
    loading?: boolean;
    className?: string;
}

export default function Button({ onPress, title, variant = 'primary', loading = false, className = '' }: ButtonProps) {
    let bgClass = 'bg-rose-500'; // Airbnb-ish red/pink
    let textClass = 'text-white';
    let borderClass = '';

    if (variant === 'secondary') {
        bgClass = 'bg-gray-800';
        textClass = 'text-white';
    } else if (variant === 'outline') {
        bgClass = 'bg-transparent';
        textClass = 'text-gray-800';
        borderClass = 'border border-gray-800';
    } else if (variant === 'google') {
        bgClass = 'bg-white';
        textClass = 'text-gray-800';
        borderClass = 'border border-gray-300';
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading}
            className={`py-3.5 px-6 rounded-lg items-center justify-center flex-row ${bgClass} ${borderClass} ${loading ? 'opacity-70' : ''} ${className}`}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' || variant === 'google' ? '#000' : '#fff'} />
            ) : (
                <Text className={`font-bold text-base ${textClass}`}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}
