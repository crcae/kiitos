import React, { useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

interface AirbnbBottomSheetProps {
    children: React.ReactNode;
    snapPoints?: string[];
    title?: string;
    onClose?: () => void;
}

export interface AirbnbBottomSheetRef {
    open: () => void;
    close: () => void;
}

/**
 * Airbnb-style Bottom Sheet Component
 * 
 * Features:
 * - Drag handle indicator
 * - Smooth spring animations
 * - Backdrop overlay (dimmed background)
 * - Configurable snap points
 * - Used for modals like tip selection, filters
 */
const AirbnbBottomSheet = forwardRef<AirbnbBottomSheetRef, AirbnbBottomSheetProps>(
    ({ children, snapPoints = ['50%', '75%'], title, onClose }, ref) => {
        const bottomSheetRef = React.useRef<BottomSheet>(null);
        const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

        // Expose methods to parent via ref
        useImperativeHandle(ref, () => ({
            open: () => bottomSheetRef.current?.expand(),
            close: () => bottomSheetRef.current?.close(),
        }));

        // Render backdrop with dim effect
        const renderBackdrop = useCallback(
            (props: BottomSheetBackdropProps) => (
                <BottomSheetBackdrop
                    {...props}
                    disappearsOnIndex={-1}
                    appearsOnIndex={0}
                    opacity={0.5}
                />
            ),
            []
        );

        return (
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPointsMemo}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                onChange={(index) => {
                    if (index === -1 && onClose) {
                        onClose();
                    }
                }}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.handleIndicator}
            >
                <BottomSheetView style={styles.contentContainer}>
                    {title && (
                        <View className="pb-4 border-b border-gray-100">
                            <Text className="text-2xl font-bold text-gray-800">
                                {title}
                            </Text>
                        </View>
                    )}
                    <View className="pt-4">
                        {children}
                    </View>
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

const styles = StyleSheet.create({
    bottomSheetBackground: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    handleIndicator: {
        backgroundColor: '#D1D1D1',
        width: 40,
        height: 4,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 24,
    },
});

export default AirbnbBottomSheet;
