import React from 'react';
import { View, Text, StyleSheet, Modal, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { OrderItem } from '../types/firestore';
import AirbnbButton from './AirbnbButton';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

interface PrintReceiptModalProps {
    visible: boolean;
    onClose: () => void;
    tableId: string;
    sessionId: string;
    items: OrderItem[];
    total: number;
}

export default function PrintReceiptModal({
    visible,
    onClose,
    tableId,
    sessionId,
    items,
    total
}: PrintReceiptModalProps) {
    const paymentUrl = `https://kiitos.app/pay/${sessionId}`;

    const handlePrint = () => {
        if (Platform.OS === 'web') {
            // For web: use browser print
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Receipt - Table ${tableId}</title>
                            <style>
                                body {
                                    font-family: 'Courier New', monospace;
                                    max-width: 300px;
                                    margin: 20px auto;
                                    padding: 20px;
                                }
                                .header {
                                    text-align: center;
                                    margin-bottom: 20px;
                                    border-bottom: 2px dashed #000;
                                    padding-bottom: 10px;
                                }
                                .header h1 {
                                    margin: 0;
                                    font-size: 24px;
                                }
                                .table-info {
                                    text-align: center;
                                    font-size: 18px;
                                    font-weight: bold;
                                    margin: 10px 0;
                                }
                                .items {
                                    margin: 20px 0;
                                }
                                .item {
                                    display: flex;
                                    justify-content: space-between;
                                    margin: 8px 0;
                                }
                                .total {
                                    border-top: 2px solid #000;
                                    margin-top: 15px;
                                    padding-top: 10px;
                                    display: flex;
                                    justify-content: space-between;
                                    font-size: 20px;
                                    font-weight: bold;
                                }
                                .qr-section {
                                    text-align: center;
                                    margin-top: 30px;
                                    padding-top: 20px;
                                    border-top: 2px dashed #000;
                                }
                                .qr-section h3 {
                                    margin-bottom: 15px;
                                }
                                .url {
                                    margin-top: 10px;
                                    font-size: 12px;
                                    word-break: break-all;
                                }
                                @media print {
                                    body {
                                        margin: 0;
                                        padding: 10px;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h1>Kiitos Diner</h1>
                            </div>
                            <div class="table-info">Table ${tableId}</div>
                            <div class="items">
                                ${items.map(item => `
                                    <div class="item">
                                        <span>${item.quantity}x ${item.name}</span>
                                        <span>$${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="total">
                                <span>TOTAL</span>
                                <span>$${total.toFixed(2)}</span>
                            </div>
                            <div class="qr-section">
                                <h3>Scan to Pay</h3>
                                <div id="qr-container"></div>
                                <div class="url">${paymentUrl}</div>
                            </div>
                            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                            <script>
                                new QRCode(document.getElementById("qr-container"), {
                                    text: "${paymentUrl}",
                                    width: 200,
                                    height: 200
                                });
                                setTimeout(() => window.print(), 500);
                            </script>
                        </body>
                    </html>
                `);
                printWindow.document.close();
            }
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Kiitos Diner</Text>
                        <Text style={styles.tableText}>Table {tableId}</Text>
                    </View>

                    <View style={styles.itemsList}>
                        {items.map((item, index) => (
                            <View key={index} style={styles.item}>
                                <Text style={styles.itemText}>
                                    {item.quantity}x {item.name}
                                </Text>
                                <Text style={styles.itemPrice}>
                                    ${(item.price * item.quantity).toFixed(2)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>TOTAL</Text>
                        <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
                    </View>

                    <View style={styles.qrSection}>
                        <Text style={styles.qrTitle}>Scan to Pay</Text>
                        <View style={styles.qrContainer}>
                            <QRCode
                                value={paymentUrl}
                                size={200}
                            />
                        </View>
                        <Text style={styles.urlText}>{paymentUrl}</Text>
                    </View>

                    <View style={styles.buttonRow}>
                        <View style={styles.buttonContainer}>
                            <AirbnbButton
                                title={Platform.OS === 'web' ? 'Print' : 'Share'}
                                onPress={handlePrint}
                                variant="primary"
                            />
                        </View>
                        <View style={styles.buttonContainer}>
                            <AirbnbButton
                                title="Close"
                                onPress={onClose}
                                variant="secondary"
                            />
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: spacing.xxl,
        width: '90%',
        maxWidth: 400,
        maxHeight: '90%',
    },
    header: {
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: colors.castIron,
        borderStyle: 'dashed',
        paddingBottom: spacing.lg,
        marginBottom: spacing.lg,
    },
    headerTitle: {
        fontSize: typography.xxl,
        fontWeight: typography.bold,
        color: colors.castIron,
        marginBottom: spacing.xs,
    },
    tableText: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.gray,
    },
    itemsList: {
        marginVertical: 15,
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 5,
    },
    itemText: {
        fontSize: 16,
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '600',
    },
    totalSection: {
        borderTopWidth: 2,
        borderTopColor: '#000',
        paddingTop: 15,
        marginTop: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalLabel: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    qrSection: {
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 2,
        borderTopColor: '#000',
        borderStyle: 'dashed',
    },
    qrTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    qrContainer: {
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 8,
    },
    urlText: {
        fontSize: 12,
        color: '#666',
        marginTop: 10,
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.xl,
    },
    buttonContainer: {
        flex: 1,
    },
});
