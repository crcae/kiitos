import React, { useState, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { startOfDay, endOfDay, subDays, startOfMonth, format } from 'date-fns';

export type DateRange = 'today' | 'yesterday' | '7days' | 'month' | 'custom';

interface DateRangeSelectorProps {
    activeRange: DateRange;
    onRangeChange: (range: DateRange, start: Date, end: Date) => void;
    startDate: Date;
    endDate: Date;
}

const DateRangeSelector = memo(({ activeRange, onRangeChange, startDate, endDate }: DateRangeSelectorProps) => {
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const ranges: { label: string, value: DateRange }[] = [
        { label: 'Hoy', value: 'today' },
        { label: 'Ayer', value: 'yesterday' },
        { label: '7 días', value: '7days' },
        { label: 'Mes', value: 'month' },
        { label: '📅', value: 'custom' },
    ];

    const handleRangeSelect = useCallback((range: DateRange) => {
        const now = new Date();
        let start = startOfDay(now);
        let end = endOfDay(now);

        switch (range) {
            case 'today':
                break;
            case 'yesterday':
                start = startOfDay(subDays(now, 1));
                end = endOfDay(subDays(now, 1));
                break;
            case '7days':
                start = startOfDay(subDays(now, 6));
                break;
            case 'month':
                start = startOfMonth(now);
                break;
            case 'custom':
                break;
        }

        if (range !== 'custom') {
            onRangeChange(range, start, end);
        } else {
            onRangeChange(range, startDate, endDate);
        }
    }, [onRangeChange, startDate, endDate]);

    const handleDateChange = useCallback((type: 'start' | 'end', event: any, selectedDate?: Date) => {
        if (Platform.OS === 'ios') {
            // Keep picker open
        } else {
            type === 'start' ? setShowStartPicker(false) : setShowEndPicker(false);
        }

        if (selectedDate) {
            if (type === 'start') {
                onRangeChange('custom', startOfDay(selectedDate), endDate);
            } else {
                onRangeChange('custom', startDate, endOfDay(selectedDate));
            }
        }
    }, [onRangeChange, startDate, endDate]);

    const handleWebDateChange = useCallback((type: 'start' | 'end', e: any) => {
        const dateStr = e.target.value;
        if (!dateStr) return;
        const selectedDate = new Date(dateStr + 'T00:00:00');
        if (type === 'start') {
            onRangeChange('custom', startOfDay(selectedDate), endDate);
        } else {
            onRangeChange('custom', startDate, endOfDay(selectedDate));
        }
    }, [onRangeChange, startDate, endDate]);

    return (
        <View style={styles.container}>
            <View style={styles.buttonGroup}>
                {ranges.map((r) => (
                    <TouchableOpacity
                        key={r.value}
                        onPress={() => handleRangeSelect(r.value)}
                        style={[
                            styles.button,
                            activeRange === r.value && styles.activeButton
                        ]}
                    >
                        <Text style={[
                            styles.buttonText,
                            activeRange === r.value && styles.activeButtonText
                        ]}>
                            {r.label}
                        </Text>
                    </TouchableOpacity>
                ))}

                <View style={styles.divider} />

                <View style={styles.dateInfo}>
                    <Text style={styles.dateText}>
                        {format(startDate, 'dd/MM')} - {format(endDate, 'dd/MM')}
                    </Text>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    activeButton: {
        backgroundColor: '#4f46e5',
    },
    buttonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#94a3b8',
    },
    activeButtonText: {
        color: '#ffffff',
    },
    divider: {
        marginHorizontal: 8,
        height: 16,
        width: 1,
        backgroundColor: '#1e293b',
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    dateText: {
        color: '#cbd5e1',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    }
});

export default DateRangeSelector;
