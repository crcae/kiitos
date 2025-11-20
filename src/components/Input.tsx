import { TextInput, View, Text } from 'react-native';

interface InputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric';
    className?: string;
}

export default function Input({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType = 'default', className = '' }: InputProps) {
    return (
        <View className={`mb-4 ${className}`}>
            <Text className="text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">
                {label}
            </Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                className="border border-gray-300 rounded-lg p-3.5 text-base text-gray-900 bg-white focus:border-rose-500"
                placeholderTextColor="#9CA3AF"
            />
        </View>
    );
}
