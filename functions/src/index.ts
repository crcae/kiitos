import * as functionsV1 from "firebase-functions/v1";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated, FirestoreEvent, QueryDocumentSnapshot, Change } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options (adjust region if necessary)
setGlobalOptions({ region: "us-central1" });

// ============================================
// CUSTOM CLAIMS MANAGEMENT
// ============================================

/**
 * Trigger: Cuando un nuevo usuario se crea en Firebase Auth
 */
export const onUserCreate = functionsV1.auth.user().onCreate(async (user: admin.auth.UserRecord) => {
    const uid = user.uid;

    try {
        // Esperar 2 segundos para asegurar que el documento de Firestore existe
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Leer el documento del usuario desde Firestore
        const userDoc = await admin.firestore().collection("users").doc(uid).get();

        if (!userDoc.exists) {
            console.warn(`⚠️ User document not found for UID: ${uid}`);
            return;
        }

        const userData = userDoc.data();
        if (!userData) return;

        const { restaurantId, role } = userData;

        if (!restaurantId || !role) {
            console.warn(`⚠️ User ${uid} missing restaurantId or role`);
            return;
        }

        // Setear los custom claims
        await admin.auth().setCustomUserClaims(uid, {
            restaurantId,
            role,
        });

        console.log(`✅ Custom claims set for user ${uid}: { restaurantId: ${restaurantId}, role: ${role} }`);

        // Actualizar timestamp
        await admin.firestore().collection("users").doc(uid).update({
            customClaimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error(`❌ Error setting custom claims for user ${uid}:`, error);
    }
});

/**
 * Trigger: Cuando se actualiza el documento de un usuario en Firestore (v2)
 */
export const onUserUpdate = onDocumentUpdated("users/{userId}", async (event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined>) => {
    const userId = event.params.userId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    const roleChanged = beforeData.role !== afterData.role;
    const restaurantChanged = beforeData.restaurantId !== afterData.restaurantId;

    if (!roleChanged && !restaurantChanged) return;

    try {
        const { restaurantId, role } = afterData;

        await admin.auth().setCustomUserClaims(userId, {
            restaurantId,
            role,
        });

        await admin.firestore().collection("users").doc(userId).update({
            customClaimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Roles updated for user ${userId}`);
    } catch (error) {
        console.error(`❌ Error updating custom claims for user ${userId}:`, error);
    }
});

/**
 * Callable Function: Refrescar custom claims manualmente (v2)
 */
export const refreshCustomClaims = onCall({ cors: true }, async (request: CallableRequest<any>) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    }

    const userId = request.data.userId || request.auth.uid;

    // Solo permitir que usuarios refresquen sus propios claims o admins
    if (userId !== request.auth.uid && request.auth.token.role !== "saas_admin") {
        throw new HttpsError("permission-denied", "No tienes permiso.");
    }

    try {
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        if (!userDoc.exists) throw new HttpsError("not-found", "Usuario no encontrado");

        const data = userDoc.data();
        const { restaurantId, role } = data || {};
        if (!restaurantId || !role) throw new HttpsError("failed-precondition", "Documento incompleto");

        await admin.auth().setCustomUserClaims(userId, { restaurantId, role });

        await admin.firestore().collection("users").doc(userId).update({
            customClaimsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error: any) {
        throw new HttpsError("internal", error.message);
    }
});

// ============================================
// KUSHKI INTEGRATION
// ============================================

/**
 * Callable Function: Procesar cobro con Kushki (v2)
 */
export const processKushkiCharge = onCall(
    { secrets: ["KUSHKI_PRIVATE_ID"], cors: true },
    async (request: CallableRequest<any>) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Debes estar autenticado para procesar pagos.");
        }

        const {
            token,
            amount,
            contactDetails,
            orderDetails,
            productDetails,
            metadata = {},
            fullResponse = true,
        } = request.data;

        if (!token || !amount) {
            throw new HttpsError("invalid-argument", "Faltan datos obligatorios (token o monto).");
        }

        const PRIVATE_MERCHANT_ID = process.env.KUSHKI_PRIVATE_ID;

        if (!PRIVATE_MERCHANT_ID) {
            console.error("❌ Missing KUSHKI_PRIVATE_ID in Secret Manager");
            throw new HttpsError("failed-precondition", "Configuración incompleta.");
        }

        try {
            const response = await axios.post("https://api-uat.kushkipagos.com/card/v1/charges", {
                token,
                amount,
                metadata,
                contactDetails,
                orderDetails,
                productDetails,
                fullResponse,
            }, {
                headers: {
                    "Private-Merchant-Id": PRIVATE_MERCHANT_ID,
                    "Content-Type": "application/json",
                },
            });

            return { success: true, data: response.data };
        } catch (error: any) {
            const errorData = error.response?.data || error.message;
            throw new HttpsError("internal", errorData.message || "Error al procesar pago.", errorData);
        }
    }
);
