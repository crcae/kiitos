import React, { useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Platform, Image, StyleSheet, Dimensions, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Table, RestaurantSettings } from '../types/firestore';
import { X, Printer, Copy } from 'lucide-react-native';

interface QRCodeModalProps {
    visible: boolean;
    onClose: () => void;
    table: Table | null;
    restaurantConfig: RestaurantSettings | null;
    restaurantId: string;
}

export default function QRCodeModal({ visible, onClose, table, restaurantConfig, restaurantId }: QRCodeModalProps) {
    const [copied, setCopied] = useState(false);

    if (!table || !visible) return null;

    const qrValue = Platform.OS === 'web'
        ? `${window.location.origin}/menu/${restaurantId}/${table.id}`
        : `https://kiitos.app/menu/${restaurantId}/${table.id}`;

    const branding = restaurantConfig?.branding;
    const primaryColor = branding?.primary_color || '#F97316';
    const logoUrl = branding?.logo_url;

    const handleCopyUrl = async () => {
        try {
            if (Platform.OS === 'web') {
                await navigator.clipboard.writeText(qrValue);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                // For React Native, you'd use @react-native-clipboard/clipboard
                // For now, show an alert with the URL
                Alert.alert('URL del menú', qrValue, [
                    { text: 'Cerrar', style: 'cancel' }
                ]);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo copiar la URL');
        }
    };

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

                    {/* QR Code - Clickable */}
                    <TouchableOpacity
                        onPress={handleCopyUrl}
                        style={[styles.qrContainer, { borderColor: primaryColor }]}
                        activeOpacity={0.7}
                    >
                        <QRCode value={qrValue} size={200} />
                        {copied && (
                            <View style={styles.copiedOverlay}>
                                <View style={[styles.copiedBadge, { backgroundColor: primaryColor }]}>
                                    <Copy size={16} color="white" />
                                    <Text style={styles.copiedText}>¡Copiado!</Text>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>

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
        position: 'relative',
    },
    copiedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    copiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    copiedText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    helperContainer: {
        alignItems: 'center',
        marginBottom: 24,
        gap: 8,
    },
    helperText: {
        fontSize: 16,
        color: '#64748b',
        fontWeight: '500',
    },
    copyHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    copyHintText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '400',
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
