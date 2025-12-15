import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebaseConfig';

import { Platform } from 'react-native';

/**
 * Converts a URI to a Blob.
 * Web: uses fetch (standard)
 * Native: uses XMLHttpRequest (more reliable for local files in some Expo versions)
 */
const uriToBlob = async (uri: string): Promise<Blob> => {
    if (Platform.OS === 'web') {
        const response = await fetch(uri);
        return await response.blob();
    } else {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
                resolve(xhr.response);
            };
            xhr.onerror = function (e) {
                console.error("XHR Blob Error:", e);
                reject(new TypeError('Network request failed'));
            };
            xhr.responseType = 'blob'; // force blob
            xhr.open('GET', uri, true);
            xhr.send(null);
        });
    }
};

/**
 * Uploads an image to Firebase Storage and returns the download URL.
 * @param uri Local URI of the image (from ImagePicker)
 * @param path Storage path (e.g. 'restaurants/id/products/image.jpg')
 * @returns Promise<string> Download URL
 */
export const uploadImage = async (uri: string, path: string): Promise<string> => {
    let blob: Blob | null = null;
    try {
        blob = await uriToBlob(uri);

        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, blob);

        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error("Error uploading image details:", error);
        throw error;
    } finally {
        // Clean up blob to free memory
        if (blob) {
            // safely close if the method exists (some polyfills might differ)
            (blob as any).close && (blob as any).close();
        }
    }
};
