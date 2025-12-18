/**
 * Utility functions for CSV generation and export
 */

/**
 * Generates a CSV string from an array of objects
 */
export const generateCSV = (data: any[], headers: { key: string; label: string }[]): string => {
    if (!data || data.length === 0) return '';

    const headerRow = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');

    const rows = data.map(item => {
        return headers.map(h => {
            const value = item[h.key];
            const stringValue = value === null || value === undefined ? '' : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headerRow, ...rows].join('\n');
};

/**
 * Formats a date for CSV display
 */
export const formatCSVDate = (date: Date | any): string => {
    if (!date) return '';
    const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
    return d.toLocaleString();
};

/**
 * Formats currency for CSV display
 */
export const formatCSVCurrency = (amount: number): string => {
    return amount.toFixed(2);
};
