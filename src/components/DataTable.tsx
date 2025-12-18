import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, Download } from 'lucide-react-native';

export interface Column<T> {
    key: keyof T | string;
    label: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    flex?: number;
    width?: number;
    exportValue?: (item: T) => string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    pageSize?: number;
    onRowPress?: (item: T) => void;
    isLoading?: boolean;
    searchPlaceholder?: string;
    searchKey?: keyof T | string;
    emptyMessage?: string;
    showExport?: boolean;
    title?: string;
}

const getAlignmentClass = (align: string = 'left'): any => {
    if (align === 'center') return { textAlign: 'center' };
    if (align === 'right') return { textAlign: 'right' };
    return { textAlign: 'left' };
};

const getAlignmentContainerClass = (align: string = 'left'): any => {
    if (align === 'center') return { justifyContent: 'center' };
    if (align === 'right') return { justifyContent: 'flex-end' };
    return { justifyContent: 'flex-start' };
};

// Shared row wrapper to ensure identical vertical boundaries
const TableRow = ({ children, isHeader = false, onPress, className = "" }: { children: React.ReactNode, isHeader?: boolean, onPress?: () => void, className?: string }) => (
    <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
        className={`flex-row items-center px-6 ${isHeader ? 'bg-slate-900/80 border-b border-slate-700 py-3' : 'border-b border-slate-800/40 py-4 hover:bg-slate-800/30'} ${className}`}
    >
        {children}
    </TouchableOpacity>
);

export default function DataTable<T extends { id?: string | number }>({
    data,
    columns,
    pageSize = 10,
    onRowPress,
    isLoading = false,
    searchPlaceholder = 'Buscar...',
    searchKey,
    emptyMessage = 'No se encontraron registros',
    showExport = true,
    title = 'reporte'
}: DataTableProps<T>) {
    const [page, setPage] = useState(0);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredData = useMemo(() => {
        let result = Array.isArray(data) ? [...data] : [];

        // Search
        if (searchQuery && searchKey) {
            result = result.filter(item => {
                const val = (item as any)[searchKey];
                return val?.toString().toLowerCase().includes(searchQuery.toLowerCase());
            });
        }

        // Sort
        if (sortConfig) {
            result.sort((a, b) => {
                const valA = (a as any)[sortConfig.key];
                const valB = (b as any)[sortConfig.key];

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, searchQuery, searchKey, sortConfig]);

    const totalPages = Math.ceil(sortedAndFilteredData.length / pageSize);
    const paginatedData = sortedAndFilteredData.slice(page * pageSize, (page + 1) * pageSize);

    const handleExport = () => {
        if (Platform.OS === 'web') {
            const separator = ';';
            const header = columns.map(col => `"${col.label}"`).join(separator);
            const rows = sortedAndFilteredData.map((item) => {
                return columns.map(col => {
                    let val = '';
                    if (col.exportValue) {
                        val = col.exportValue(item);
                    } else {
                        const raw = (item as any)[col.key];
                        if (raw !== undefined && raw !== null) {
                            if (typeof (raw as any).toDate === 'function') {
                                val = (raw as any).toDate().toLocaleString();
                            } else if (typeof raw === 'number') {
                                val = raw.toFixed(2);
                            } else {
                                val = raw.toString();
                            }
                        }
                    }
                    const sanitized = val.toString().replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
                    return `"${sanitized}"`;
                }).join(separator);
            });

            const csvString = [header, ...rows].join('\n');
            const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${title}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            alert('Exportación CSV disponible en versión web');
        }
    };

    if (isLoading) {
        return (
            <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={{ color: '#94a3b8', marginTop: 16, fontWeight: '500' }}>Cargando datos...</Text>
            </View>
        );
    }

    return (
        <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.3)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(30, 41, 59, 0.6)', overflow: 'hidden', flex: 1 }}>
            {/* Header / Actions Bar */}
            <View style={{ paddingHorizontal: 24, paddingVertical: 20, backgroundColor: 'rgba(15, 23, 42, 0.4)', borderBottomWidth: 1, borderBottomColor: 'rgba(30, 41, 59, 0.6)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(2, 6, 23, 0.5)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b' }}>
                    <Search size={20} color="#475569" style={{ marginRight: 12 }} />
                    <TextInput
                        style={{ flex: 1, color: 'white', fontSize: 14, fontWeight: '500' }}
                        placeholder={searchPlaceholder}
                        placeholderTextColor="#475569"
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            setPage(0);
                        }}
                    />
                </View>

                {showExport && Platform.OS === 'web' && (
                    <TouchableOpacity
                        onPress={handleExport}
                        style={{ backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center' }}
                    >
                        <Download size={18} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>Exportar</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={Platform.OS === 'web'}
                contentContainerStyle={{ flexGrow: 1 }}
                style={{ backgroundColor: 'rgba(15, 23, 42, 0.2)' }}
            >
                <View style={{ flex: 1, minWidth: 1000 }}>
                    {/* Table Header */}
                    <TableRow isHeader>
                        {columns.map((col) => (
                            <View
                                key={col.key as string}
                                style={{
                                    flex: col.flex || (col.width ? undefined : 1),
                                    width: col.width || undefined,
                                    marginRight: 24,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    ...getAlignmentContainerClass(col.align) as any
                                }}
                            >
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                    disabled={!col.sortable}
                                    onPress={() => handleSort(col.key as string)}
                                >
                                    <Text style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: '900', letterSpacing: 1.5, ...getAlignmentClass(col.align) }}>
                                        {col.label}
                                    </Text>
                                    {col.sortable && (
                                        <View style={{ marginLeft: 8, width: 16, alignItems: 'center' }}>
                                            {sortConfig?.key === col.key ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} color="#6366f1" /> : <ChevronDown size={14} color="#6366f1" />
                                            ) : (
                                                <ChevronDown size={14} color="#334155" />
                                            )}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))}
                    </TableRow>

                    {/* Table Body */}
                    {paginatedData.length > 0 ? (
                        paginatedData.map((item, index) => (
                            <TableRow
                                key={item.id || index}
                                onPress={() => (onRowPress as any)?.(item)}
                            >
                                {columns.map((col) => (
                                    <View
                                        key={col.key as string}
                                        style={{
                                            flex: col.flex || (col.width ? undefined : 1),
                                            width: col.width || undefined,
                                            marginRight: 24,
                                            ...getAlignmentContainerClass(col.align) as any
                                        }}
                                    >
                                        {col.render ? (
                                            (col.render as any)(item)
                                        ) : (
                                            <Text
                                                numberOfLines={1}
                                                style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '600', ...getAlignmentClass(col.align) }}
                                            >
                                                {typeof (item as any)[col.key] === 'object'
                                                    ? JSON.stringify((item as any)[col.key])
                                                    : ((item as any)[col.key]?.toString() || '-')}
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <View style={{ paddingVertical: 160, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{ backgroundColor: '#020617', padding: 24, borderRadius: 999, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 }}>
                                <Search size={32} color="#1e293b" />
                            </View>
                            <Text style={{ color: '#475569', fontSize: 18, fontWeight: 'bold' }}>{emptyMessage}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <View style={{ paddingHorizontal: 32, paddingVertical: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: 'rgba(2, 6, 23, 0.3)' }}>
                    <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        Página {page + 1} de {totalPages}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <TouchableOpacity
                            onPress={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            style={{ width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: page === 0 ? '#0f172a' : '#1e293b', backgroundColor: page === 0 ? '#020617' : '#0f172a', opacity: page === 0 ? 0.2 : 1, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ChevronLeft size={20} color={page === 0 ? '#0f172a' : '#94a3b8'} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            style={{ width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: page === totalPages - 1 ? '#0f172a' : '#1e293b', backgroundColor: page === totalPages - 1 ? '#020617' : '#0f172a', opacity: page === totalPages - 1 ? 0.2 : 1, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ChevronRight size={20} color={page === totalPages - 1 ? '#0f172a' : '#94a3b8'} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}
