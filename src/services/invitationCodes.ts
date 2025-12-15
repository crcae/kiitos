import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    Timestamp,
    query,
    where,
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { OperationalRole, TenantRole } from '../types/firestore';

export interface InvitationCode {
    id: string;
    code: string;
    restaurantId: string;
    role: OperationalRole | TenantRole;
    createdBy: string; // UID del owner que lo creó
    createdAt: Timestamp;
    expiresAt: Timestamp;
    status: 'active' | 'used' | 'revoked';
    usedBy?: string; // UID del usuario que lo usó
    usedAt?: Timestamp;
    description?: string; // Ej: "Turno Mañana"
}

/**
 * Genera un código único de 8 caracteres
 */
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin caracteres confusos (0, O, 1, I)
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Crea un nuevo código de invitación
 */
export async function createInvitationCode(
    restaurantId: string,
    role: OperationalRole | TenantRole,
    createdBy: string,
    description?: string,
    daysValid: number = 7
): Promise<InvitationCode> {
    try {
        const code = generateCode();
        const codeRef = doc(collection(db, 'invitationCodes'));
        const codeId = codeRef.id;

        const now = Timestamp.now();
        const expiresAt = new Timestamp(
            now.seconds + (daysValid * 24 * 60 * 60), // dias a segundos
            now.nanoseconds
        );

        const invitationCode: InvitationCode = {
            id: codeId,
            code,
            restaurantId,
            role,
            createdBy,
            createdAt: now,
            expiresAt,
            status: 'active',
            description,
        };

        await setDoc(codeRef, invitationCode);
        console.log(`✅ Invitation code created: ${code}`);

        return invitationCode;
    } catch (error) {
        console.error('Error creating invitation code:', error);
        throw new Error('Failed to create invitation code');
    }
}

/**
 * Valida un código de invitación
 * Retorna los datos del código si es válido, null si no
 */
export async function validateInvitationCode(code: string): Promise<InvitationCode | null> {
    try {
        const codesRef = collection(db, 'invitationCodes');
        const q = query(codesRef, where('code', '==', code.toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null; // Código no existe
        }

        const codeData = querySnapshot.docs[0].data() as InvitationCode;

        // Verificar que esté activo
        if (codeData.status !== 'active') {
            return null; // Código ya usado o revocado
        }

        // Verificar que no haya expirado
        const now = Timestamp.now();
        if (codeData.expiresAt.seconds < now.seconds) {
            return null; // Código expirado
        }

        return codeData;
    } catch (error) {
        console.error('Error validating invitation code:', error);
        return null;
    }
}

/**
 * Marca un código como usado
 */
export async function markCodeAsUsed(codeId: string, usedBy: string): Promise<void> {
    try {
        const codeRef = doc(db, 'invitationCodes', codeId);
        await updateDoc(codeRef, {
            status: 'used',
            usedBy,
            usedAt: Timestamp.now(),
        });
        console.log(`✅ Code ${codeId} marked as used`);
    } catch (error) {
        console.error('Error marking code as used:', error);
        throw new Error('Failed to mark code as used');
    }
}

/**
 * Revoca (cancela) un código de invitación
 */
export async function revokeInvitationCode(codeId: string): Promise<void> {
    try {
        const codeRef = doc(db, 'invitationCodes', codeId);
        await updateDoc(codeRef, {
            status: 'revoked',
        });
        console.log(`✅ Code ${codeId} revoked`);
    } catch (error) {
        console.error('Error revoking code:', error);
        throw new Error('Failed to revoke code');
    }
}

/**
 * Elimina un código de invitación
 */
export async function deleteInvitationCode(codeId: string): Promise<void> {
    try {
        const codeRef = doc(db, 'invitationCodes', codeId);
        await deleteDoc(codeRef);
        console.log(`✅ Code ${codeId} deleted`);
    } catch (error) {
        console.error('Error deleting code:', error);
        throw new Error('Failed to delete code');
    }
}

/**
 * Obtiene todos los códigos de un restaurante
 */
export async function getRestaurantInvitationCodes(
    restaurantId: string,
    includeInactive: boolean = false
): Promise<InvitationCode[]> {
    try {
        const codesRef = collection(db, 'invitationCodes');
        let q = query(codesRef, where('restaurantId', '==', restaurantId));

        if (!includeInactive) {
            q = query(q, where('status', '==', 'active'));
        }

        const querySnapshot = await getDocs(q);
        const codes: InvitationCode[] = [];

        querySnapshot.forEach((doc) => {
            codes.push(doc.data() as InvitationCode);
        });

        return codes;
    } catch (error) {
        console.error('Error getting restaurant invitation codes:', error);
        return [];
    }
}

/**
 * Limpia códigos expirados (puede ejecutarse periódicamente)
 */
export async function cleanExpiredCodes(restaurantId: string): Promise<number> {
    try {
        const codesRef = collection(db, 'invitationCodes');
        const q = query(
            codesRef,
            where('restaurantId', '==', restaurantId),
            where('status', '==', 'active')
        );

        const querySnapshot = await getDocs(q);
        const now = Timestamp.now();
        let deletedCount = 0;

        for (const docSnapshot of querySnapshot.docs) {
            const code = docSnapshot.data() as InvitationCode;
            if (code.expiresAt.seconds < now.seconds) {
                await deleteDoc(docSnapshot.ref);
                deletedCount++;
            }
        }

        console.log(`✅ Cleaned ${deletedCount} expired codes`);
        return deletedCount;
    } catch (error) {
        console.error('Error cleaning expired codes:', error);
        return 0;
    }
}
