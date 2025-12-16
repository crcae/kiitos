import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ColorPicker, { Panel1, Swatches, Preview, OpacitySlider, HueSlider } from 'reanimated-color-picker';

interface BrandingColorPickerProps {
    value: string;
    onComplete: (color: string) => void;
}

const COMMON_COLORS = [
    '#EA580C', // Orange (Default)
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#111827', // Gray-900
    '#000000', // Black
];

export default function BrandingColorPicker({ value, onComplete }: BrandingColorPickerProps) {
    const onSelectColor = ({ hex }: { hex: string }) => {
        onComplete(hex);
    };

    return (
        <View style={styles.container}>
            <View style={styles.pickerContainer}>
                <ColorPicker
                    style={{ width: '100%' }}
                    value={value}
                    onComplete={onSelectColor}
                >
                    <Preview style={styles.preview} hideInitialColor />
                    <Panel1 style={styles.panel} />
                    <HueSlider style={styles.slider} />
                    <OpacitySlider style={styles.slider} />

                    <View style={styles.swatchesContainer}>
                        <Text style={styles.swatchTitle}>Colores Comunes</Text>
                        <Swatches
                            style={styles.swatches}
                            colors={COMMON_COLORS}
                            swatchStyle={styles.swatch}
                        />
                    </View>
                </ColorPicker>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    pickerContainer: {
        width: '100%',
        gap: 20,
    },
    panel: {
        borderRadius: 12,
        height: 180,
        marginBottom: 20,
    },
    slider: {
        borderRadius: 12,
        marginBottom: 15,
        height: 30,
    },
    preview: {
        height: 40,
        borderRadius: 8,
        marginBottom: 20,
    },
    swatchesContainer: {
        marginTop: 10,
    },
    swatchTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b', // slate-500
        marginBottom: 8,
    },
    swatches: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    swatch: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#e2e8f0', // slate-200
    }
});
