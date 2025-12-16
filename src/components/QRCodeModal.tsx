import React, { useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform, Image, StyleSheet, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Table, RestaurantSettings } from '../types/firestore';
import { X, Printer } from 'lucide-react-native';

interface QRCodeModalProps {
    visible: boolean;
    onClose: () => void;
    table: Table | null;
    restaurantConfig: RestaurantSettings | null;
    restaurantId: string;
}

export default function QRCodeModal({ visible, onClose, table, restaurantConfig, restaurantId }: QRCodeModalProps) {
    if (!table || !visible) return null;

    const qrValue = Platform.OS === 'web'
        ? `${window.location.origin}/menu/${restaurantId}/${table.id}`
        : `https://kiitos.app/menu/${restaurantId}/${table.id}`;

    const branding = restaurantConfig?.branding;
    const primaryColor = branding?.primary_color || '#F97316';
    const logoUrl = branding?.logo_url;

    const handlePrint = () => {
        if (Platform.OS === 'web') {
            const printStyles = `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #qr-print-container, #qr-print-container * {
                        visibility: visible;
                    }
                    #qr-print-container {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                        width: 100%;
                        max-width: 400px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                        border: 2px solid ${primaryColor};
                        padding: 40px;
                        border-radius: 20px;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `;

            const styleSheet = document.createElement("style");
            styleSheet.innerText = printStyles;
            document.head.appendChild(styleSheet);

            window.print();

            // Clean up after print dialog closes (or immediately, browser handles this)
            setTimeout(() => {
                document.head.removeChild(styleSheet);
            }, 1000);
        } else {
            alert("Impresión solo disponible en Web por ahora.");
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                {/* Modal Container */}
                <View style={styles.modalContainer} id="qr-print-container">

                    {/* Header: Logo or Name */}
                    <View style={styles.header}>
                        {logoUrl ? (
                            <Image
                                source={{ uri: logoUrl }}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={styles.restaurantName}>Kiitos App</Text>
                        )}
                    </View>

                    {/* Table Name */}
                    <Text style={[styles.tableName, { color: primaryColor }]}>{table.name}</Text>

                    {/* QR Code */}
                    <View style={[styles.qrContainer, { borderColor: primaryColor }]}>
                        <QRCode value={qrValue} size={200} />
                    </View>

                    <Text style={styles.helperText}>Escanea para ordenar</Text>

                    {/* Actions (Hidden on Print) */}
                    <View style={[styles.actions, { display: 'flex' }]} className="no-print">
                        {Platform.OS === 'web' && (
                            <TouchableOpacity
                                onPress={handlePrint}
                                style={[styles.printButton, { backgroundColor: primaryColor }]}
                            >
                                <Printer size={20} color="white" />
                                <Text style={styles.printButtonText}>Imprimir QR</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Absolute Close Icon (Hidden on Print) */}
                    <TouchableOpacity onPress={onClose} style={styles.closeIcon} className="no-print">
                        <X size={24} color="#94a3b8" />
                    </TouchableOpacity>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        maxWidth: 360,
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    header: {
        marginBottom: 10,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 180,
        height: 50,
    },
    restaurantName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    tableName: {
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 24,
        textAlign: 'center',
    },
    qrContainer: {
        padding: 16,
        borderWidth: 4,
        borderRadius: 20,
        backgroundColor: 'white',
        marginBottom: 20,
    },
    helperText: {
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 24,
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    printButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    printButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    closeButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#64748b',
        fontWeight: '600',
        fontSize: 14,
    },
    closeIcon: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
    }
});
