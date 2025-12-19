import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MessageSquare, Calendar, User, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../src/services/firebaseConfig';
import { colors, spacing } from '../../../src/styles/theme';
import { useAuth } from '../../../src/context/AuthContext';
import AirbnbCard from '../../../src/components/AirbnbCard';
import { Review } from '../../../src/types/firestore';

export default function AdminReviewsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const restaurantId = user?.restaurantId;

    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!restaurantId) return;

        const q = query(
            collection(db, 'restaurants', restaurantId, 'reviews'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reviewsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as any)
            } as Review));
            setReviews(reviewsData);
            setLoading(false);
        }, (error) => {
            console.error("Error subscribing to reviews:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [restaurantId]);

    const renderReviewItem = ({ item }: { item: Review }) => {
        const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();
        const dateString = date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        return (
            <AirbnbCard shadow="sm" style={styles.reviewCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.customerInfo}>
                        <View style={styles.iconContainer}>
                            <User size={16} color="#64748B" />
                        </View>
                        <View>
                            <Text style={styles.customerName}>{item.customer_name || 'Anónimo'}</Text>
                            {item.customer_phone && (
                                <View style={styles.phoneRow}>
                                    <Phone size={12} color="#94A3B8" />
                                    <Text style={styles.customerPhone}>{item.customer_phone}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <View style={styles.dateInfo}>
                        <Calendar size={14} color="#94A3B8" />
                        <Text style={styles.dateText}>{dateString}</Text>
                    </View>
                </View>

                <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                            key={s}
                            size={16}
                            color={s <= item.rating ? colors.roastedSaffron : colors.lightGray}
                            fill={s <= item.rating ? colors.roastedSaffron : 'transparent'}
                        />
                    ))}
                    {item.status === 'redirected_to_google' && (
                        <View style={styles.googleBadge}>
                            <Text style={styles.googleBadgeText}>G</Text>
                        </View>
                    )}
                </View>

                {item.comment ? (
                    <View style={styles.commentContainer}>
                        <MessageSquare size={14} color="#94A3B8" style={styles.commentIcon} />
                        <Text style={styles.commentText}>{item.comment}</Text>
                    </View>
                ) : (
                    <Text style={styles.noCommentText}>Sin comentarios</Text>
                )}
            </AirbnbCard>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.castIron} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Reseñas e Insights</Text>
                    <Text style={styles.subtitle}>Lo que tus clientes opinan</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.roastedSaffron} />
                </View>
            ) : reviews.length === 0 ? (
                <View style={styles.center}>
                    <MessageSquare size={48} color="#CBD5E1" />
                    <Text style={styles.emptyText}>Aún no hay reseñas registradas.</Text>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    renderItem={renderReviewItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.oatCream,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
        backgroundColor: colors.white,
    },
    backButton: {
        marginRight: spacing.lg,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.castIron,
    },
    subtitle: {
        fontSize: 14,
        color: colors.gray,
    },
    listContent: {
        padding: spacing.xl,
        paddingBottom: spacing.xxxl,
    },
    reviewCard: {
        marginBottom: spacing.lg,
        padding: spacing.lg,
        borderRadius: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.stoneGrey,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.sm,
    },
    customerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.castIron,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    customerPhone: {
        fontSize: 12,
        color: colors.gray,
        marginLeft: 4,
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 12,
        color: colors.gray,
        marginLeft: 4,
    },
    starsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
        gap: 2,
    },
    googleBadge: {
        backgroundColor: '#4285F4',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
    },
    googleBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    commentContainer: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        padding: spacing.md,
        borderRadius: 12,
        marginTop: spacing.xs,
    },
    commentIcon: {
        marginTop: 2,
        marginRight: spacing.sm,
    },
    commentText: {
        fontSize: 14,
        color: colors.castIron,
        flex: 1,
        lineHeight: 20,
    },
    noCommentText: {
        fontSize: 14,
        color: '#94A3B8',
        fontStyle: 'italic',
        marginTop: spacing.xs,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxxl,
    },
    emptyText: {
        fontSize: 16,
        color: colors.gray,
        marginTop: spacing.md,
        textAlign: 'center',
    },
});
