import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, createElement } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { OpeningHours, validateScheduledTime, getNextAvailableSlot } from '../services/scheduling';

interface TimeSelectorProps {
    restaurantId: string;
    openingHours?: OpeningHours;
    prepTimeMinutes?: number;
    onTimeSelected: (time: Date, option: 'asap' | 'scheduled') => void;
}

export default function TimeSelector({
    restaurantId,
    openingHours,
    prepTimeMinutes = 30,
    onTimeSelected
}: TimeSelectorProps) {
    const [selectedOption, setSelectedOption] = useState<'asap' | 'scheduled'>('asap');
    const [scheduledDate, setScheduledDate] = useState<Date>(getNextAvailableSlot(prepTimeMinutes));
    const [validationError, setValidationError] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (selectedOption === 'asap') {
            const asapTime = getNextAvailableSlot(prepTimeMinutes);
            onTimeSelected(asapTime, 'asap');
            setValidationError(null);
        }
    }, [selectedOption, prepTimeMinutes]);

    // Helper to format date for datetime-local input (YYYY-MM-DDThh:mm)
    const toLocalISOString = (date: Date) => {
        const pad = (num: number) => (num < 10 ? '0' : '') + num;
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const handleWebTimeChange = (e: any) => {
        const dateStr = e.target.value;
        if (!dateStr) return;

        const selectedTime = new Date(dateStr);
        setScheduledDate(selectedTime);

        const validation = validateScheduledTime(selectedTime, prepTimeMinutes, openingHours);

        if (validation.valid) {
            setValidationError(null);
            onTimeSelected(selectedTime, 'scheduled');
        } else {
            setValidationError(validation.error || 'Horario no válido');
        }
    };

    const handleScheduledTimeChange = (event: any, selectedTime?: Date) => {
        setShowPicker(Platform.OS === 'ios'); // Keep picker open on iOS

        if (selectedTime) {
            setScheduledDate(selectedTime);

            // Validate the selected time
            const validation = validateScheduledTime(selectedTime, prepTimeMinutes, openingHours);

            if (validation.valid) {
                setValidationError(null);
                onTimeSelected(selectedTime, 'scheduled');
            } else {
                setValidationError(validation.error || 'Horario no válido');
            }
        }
    };

    return (
        <View className="space-y-4">
            <Text className="text-lg font-semibold text-stone-900">¿Cuando quieres recoger?</Text>

            {/* ASAP Option */}
            <TouchableOpacity
                onPress={() => setSelectedOption('asap')}
                className={`p-4 rounded-xl border-2 ${selectedOption === 'asap'
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-stone-200 bg-white'
                    }`}
            >
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-base font-semibold text-stone-900">
                            Lo antes posible (ASAP)
                        </Text>
                        <Text className="text-sm text-stone-600 mt-1">
                            Listo en ~{prepTimeMinutes} minutos
                        </Text>
                    </View>
                    <View className={`w-5 h-5 rounded-full border-2 ${selectedOption === 'asap'
                        ? 'border-orange-600 bg-orange-600'
                        : 'border-stone-300'
                        }`} />
                </View>
            </TouchableOpacity>

            {/* Scheduled Option */}
            <TouchableOpacity
                onPress={() => setSelectedOption('scheduled')}
                className={`p-4 rounded-xl border-2 ${selectedOption === 'scheduled'
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-stone-200 bg-white'
                    }`}
            >
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-base font-semibold text-stone-900">
                            Programar
                        </Text>
                        <Text className="text-sm text-stone-600 mt-1">
                            Elige fecha y hora específica
                        </Text>
                    </View>
                    <View className={`w-5 h-5 rounded-full border-2 ${selectedOption === 'scheduled'
                        ? 'border-orange-600 bg-orange-600'
                        : 'border-stone-300'
                        }`} />
                </View>
            </TouchableOpacity>

            {/* Date/Time Picker for Scheduled */}
            {selectedOption === 'scheduled' && (
                <View className="mt-4">
                    {/* Web Implementation */}
                    {Platform.OS === 'web' ? (
                        <View className="p-4 bg-white border border-stone-200 rounded-xl">
                            <Text className="text-sm text-stone-600 mb-2">Selecciona fecha y hora:</Text>
                            {createElement('input', {
                                type: 'datetime-local',
                                className: "p-3 border border-gray-300 rounded-lg w-full text-base",
                                value: toLocalISOString(scheduledDate),
                                min: toLocalISOString(new Date()),
                                onChange: handleWebTimeChange,
                                style: {
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    width: '100%',
                                    fontSize: '16px',
                                    fontFamily: 'system-ui'
                                }
                            })}
                        </View>
                    ) : (
                        /* Mobile Implementation */
                        <>
                            <TouchableOpacity
                                onPress={() => setShowPicker(true)}
                                className="p-4 bg-white border border-stone-200 rounded-xl"
                            >
                                <Text className="text-sm text-stone-600 mb-1">Fecha y hora de recogida</Text>
                                <Text className="text-base font-semibold text-stone-900">
                                    {scheduledDate.toLocaleString('es-MX', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            </TouchableOpacity>

                            {(showPicker || Platform.OS === 'ios') && (
                                <DateTimePicker
                                    value={scheduledDate}
                                    mode="datetime"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleScheduledTimeChange}
                                    minimumDate={new Date()}
                                    minuteInterval={15}
                                />
                            )}
                        </>
                    )}

                    {validationError && (
                        <View className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <Text className="text-sm text-red-700">{validationError}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}
