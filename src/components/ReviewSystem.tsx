import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Linking, ActivityIndicator } from 'react-native';
import { Star } from 'lucide-react-native';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { colors, spacing } from '../styles/theme';
import AirbnbButton from './AirbnbButton';
import AirbnbCard from './AirbnbCard';

interface ReviewSystemProps {
    restaurantId: string;
    orderId?: string;
    customerName?: string;
    onFinish?: () => void;
}

export default function ReviewSystem({
    restaurantId,
    orderId,
    customerName,
    onFinish
}: ReviewSystemProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);

    useEffect(() => {
        if (restaurantId) {
            loadRestaurantConfig();
        }
    }, [restaurantId]);

    const loadRestaurantConfig = async () => {
        try {
            const docRef = doc(db, 'restaurants', restaurantId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setGooglePlaceId(data.settings?.google_place_id || null);
            }
        } catch (error) {
            console.error('Error loading restaurant config:', error);
        }
    };

    const handleStarPress = async (selectedRating: number) => {
        setRating(selectedRating);

        if (selectedRating === 5) {
            await handleGoogleRedirection();
        }
    };

    const handleGoogleRedirection = async () => {
        if (!googlePlaceId) {
            console.warn('⚠️ No google_place_id configured for this restaurant.');
            Alert.alert('¡Gracias!', 'Nos alegra que te haya gustado tu visita.');
            setSubmitted(true);
            return;
        }

        const googleLink = `https://search.google.com/local/writereview?placeid=${googlePlaceId}`;
        console.log('⭐ 5-star rating detected. Auto-redirecting to Google:', googleLink);

        try {
            // Save initial internal record of the 5-star intent
            const reviewData = {
                rating: 5,
                comment: 'Redirigido a Google',
                customer_name: customerName || 'Anónimo',
                order_id: orderId || null,
                status: 'redirected_to_google',
                createdAt: Timestamp.now(),
            };
            await addDoc(collection(db, 'restaurants', restaurantId, 'reviews'), reviewData);
            console.log('✅ 5-star intent recorded in Firestore.');

            const supported = await Linking.canOpenURL(googleLink);
            if (supported) {
                await Linking.openURL(googleLink);
                setSubmitted(true);
            } else {
                console.error('❌ Cannot open Google Reviews URL:', googleLink);
                setSubmitted(true);
            }
        } catch (error) {
            console.error('❌ Error in Google redirection flow:', error);
            setSubmitted(true);
        }
    };

    const handleInternalSubmit = async () => {
        if (rating === 0 || rating === 5) return;

        setLoading(true);
        console.log('🚀 Submitting internal feedback...', { rating, comment });

        try {
            const reviewData = {
                rating,
                comment,
                customer_name: customerName || 'Anónimo',
                order_id: orderId || null,
                status: 'internal',
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(db, 'restaurants', restaurantId, 'reviews'), reviewData);
            console.log('✅ Internal feedback saved in Firestore.');
            setSubmitted(true);
        } catch (error) {
            console.error('❌ Error saving internal feedback:', error);
            Alert.alert('Error', 'No se pudo guardar tu comentario.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <AirbnbCard shadow="sm" style={styles.successCard}>
                <Text style={styles.thankYouTitle}>¡Gracias por tu apoyo! ❤️</Text>
                <Text style={styles.thankYouSubtitle}>
                    {rating === 5
                        ? 'Tu reseña en Google nos ayuda muchísimo a crecer.'
                        : 'Valoramos mucho tu feedback para seguir mejorando.'}
                </Text>
                {onFinish && (
                    <TouchableOpacity onPress={onFinish} style={styles.finishButton}>
                        <Text style={styles.finishButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                )}
            </AirbnbCard>
        );
    }

    return (
        <AirbnbCard shadow="sm" style={styles.container}>
            <Text style={styles.title}>¿Cómo estuvo tu experiencia?</Text>

            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => handleStarPress(star)}
                        activeOpacity={0.7}
                        style={styles.starButton}
                    >
                        <Star
                            size={32}
                            color={star <= rating ? colors.roastedSaffron : '#CBD5E1'}
                            fill={star <= rating ? colors.roastedSaffron : 'transparent'}
                        />
                    </TouchableOpacity>
                ))}
            </View>

            {rating > 0 && rating < 5 && (
                <>
                    <Text style={styles.ratingLabel}>
                        {rating === 4 ? 'Muy Bueno 🙂' :
                            rating === 3 ? 'Bueno 😐' :
                                rating === 2 ? 'Regular 😕' : 'Mal 😞'}
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>¿Cómo podemos mejorar?</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Cuéntanos tu experiencia de forma privada..."
                            multiline
                            numberOfLines={3}
                            value={comment}
                            onChangeText={setComment}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>

                    <AirbnbButton
                        title={loading ? "Enviando..." : "Enviar Feedback al Restaurante"}
                        onPress={handleInternalSubmit}
                        variant="primary"
                        disabled={loading}
                        loading={loading}
                    />
                </>
            )}

            {rating === 5 && (
                <View style={styles.googleContainer}>
                    <Text style={styles.googleMessage}>
                        ¡Nos alegra que te haya gustado! Ayúdanos publicándolo en Google.
                    </Text>
                    <AirbnbButton
                        title="Publicar en Google"
                        onPress={handleGoogleRedirection}
                        variant="primary"
                    />
                </View>
            )}
        </AirbnbCard>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: spacing.lg,
        borderRadius: 20,
        marginTop: spacing.md,
    },
    successCard: {
        padding: spacing.xl,
        borderRadius: 20,
        marginTop: spacing.md,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.castIron,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    starButton: {
        padding: spacing.xs,
    },
    ratingLabel: {
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.roastedSaffron,
        marginBottom: spacing.md,
    },
    inputContainer: {
        marginBottom: spacing.lg,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.castIron,
        marginBottom: 4,
    },
    textInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: spacing.md,
        height: 80,
        textAlignVertical: 'top',
        color: colors.castIron,
        fontSize: 14,
    },
    googleContainer: {
        marginTop: spacing.md,
        alignItems: 'center',
    },
    googleMessage: {
        fontSize: 14,
        color: colors.castIron,
        textAlign: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
    },
    thankYouTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.castIron,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    thankYouSubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    finishButton: {
        marginTop: spacing.sm,
    },
    finishButtonText: {
        color: colors.roastedSaffron,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    }
});
