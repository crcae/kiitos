import { Timestamp } from 'firebase/firestore';

export interface OpeningHours {
    mon?: { open: string; close: string };
    tue?: { open: string; close: string };
    wed?: { open: string; close: string };
    thu?: { open: string; close: string };
    fri?: { open: string; close: string };
    sat?: { open: string; close: string };
    sun?: { open: string; close: string };
}

export interface SchedulingValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates that the scheduled time is at least [prepTimeMinutes] from now
 */
export const validateMinimumPrepTime = (
    scheduledTime: Date,
    prepTimeMinutes: number = 30
): SchedulingValidationResult => {
    const now = new Date();
    const minTime = new Date(now.getTime() + prepTimeMinutes * 60 * 1000);

    if (scheduledTime < minTime) {
        return {
            valid: false,
            error: `Tiempo insuficiente para preparación (mínimo ${prepTimeMinutes} minutos)`
        };
    }

    return { valid: true };
};

/**
 * Validates that the scheduled time falls within the restaurant's opening hours
 */
export const validateOpeningHours = (
    scheduledTime: Date,
    openingHours?: OpeningHours
): SchedulingValidationResult => {
    if (!openingHours) {
        // If no opening hours are defined, assume always open
        return { valid: true };
    }

    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
    const dayOfWeek = dayNames[scheduledTime.getDay()];
    const dayHours = openingHours[dayOfWeek];

    if (!dayHours) {
        return {
            valid: false,
            error: `El restaurante está cerrado este día`
        };
    }

    // Extract time from scheduled date
    const scheduledHours = scheduledTime.getHours();
    const scheduledMinutes = scheduledTime.getMinutes();
    const scheduledTimeStr = `${scheduledHours.toString().padStart(2, '0')}:${scheduledMinutes.toString().padStart(2, '0')}`;

    // Parse opening hours
    const [openHour, openMin] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = dayHours.close.split(':').map(Number);

    const scheduledTotalMinutes = scheduledHours * 60 + scheduledMinutes;
    const openTotalMinutes = openHour * 60 + openMin;
    const closeTotalMinutes = closeHour * 60 + closeMin;

    if (scheduledTotalMinutes < openTotalMinutes || scheduledTotalMinutes > closeTotalMinutes) {
        return {
            valid: false,
            error: `Fuera del horario de apertura (${dayHours.open} - ${dayHours.close})`
        };
    }

    return { valid: true };
};

/**
 * Calculate the next available slot for ASAP orders
 */
export const getNextAvailableSlot = (prepTimeMinutes: number = 30): Date => {
    const now = new Date();
    return new Date(now.getTime() + prepTimeMinutes * 60 * 1000);
};

/**
 * Combined validation for scheduled pickup times
 */
export const validateScheduledTime = (
    scheduledTime: Date,
    prepTimeMinutes: number = 30,
    openingHours?: OpeningHours
): SchedulingValidationResult => {
    // Check prep time first
    const prepTimeValidation = validateMinimumPrepTime(scheduledTime, prepTimeMinutes);
    if (!prepTimeValidation.valid) {
        return prepTimeValidation;
    }

    // Check opening hours
    const hoursValidation = validateOpeningHours(scheduledTime, openingHours);
    if (!hoursValidation.valid) {
        return hoursValidation;
    }

    return { valid: true };
};
