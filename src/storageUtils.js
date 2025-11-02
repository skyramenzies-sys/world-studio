// storageUtils.js - Utilities voor localStorage management en afbeelding compressie

/**
 * Compress een afbeelding naar een kleinere grootte
 * @param {string} base64 - Base64 string van de afbeelding
 * @param {number} maxWidth - Maximum breedte (default: 1200px)
 * @param {number} quality - JPEG kwaliteit 0-1 (default: 0.7)
 * @returns {Promise<string>} - Gecomprimeerde base64 string
 */
export const compressImage = (base64, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Behoud aspect ratio
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Converteer naar JPEG voor betere compressie
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = base64;
    });
};

/**
 * Compress een video door alleen de eerste frame als thumbnail op te slaan
 * @param {string} videoBase64 - Base64 string van de video
 * @returns {Promise<object>} - Object met thumbnail en indicatie dat het een video is
 */
export const compressVideo = (videoBase64) => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.onloadeddata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = (video.videoHeight / video.videoWidth) * 640;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
            resolve({
                thumbnail,
                isVideo: true,
                originalSize: videoBase64.length
            });
        };
        video.src = videoBase64;
    });
};

/**
 * Check localStorage beschikbare ruimte
 * @returns {object} - Object met used, available, en total space in MB
 */
export const getStorageInfo = () => {
    let used = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            used += localStorage[key].length + key.length;
        }
    }

    const usedMB = (used / 1024 / 1024).toFixed(2);
    const totalMB = 10; // localStorage is ongeveer 5-10MB
    const availableMB = (totalMB - usedMB).toFixed(2);

    return {
        used: usedMB,
        available: availableMB,
        total: totalMB,
        percentage: ((usedMB / totalMB) * 100).toFixed(1)
    };
};

/**
 * Check of er genoeg ruimte is voor nieuwe data
 * @param {number} requiredMB - Benodigde ruimte in MB
 * @returns {boolean}
 */
export const hasEnoughSpace = (requiredMB) => {
    const info = getStorageInfo();
    return parseFloat(info.available) >= requiredMB;
};

/**
 * Clear oude posts om ruimte te maken
 * @param {array} posts - Array van posts
 * @param {number} keepCount - Aantal posts om te behouden (default: 10)
 * @returns {array} - Gefilterde array van posts
 */
export const clearOldPosts = (posts, keepCount = 10) => {
    // Sorteer op timestamp (nieuwste eerst)
    const sortedPosts = [...posts].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Behoud alleen de nieuwste posts
    return sortedPosts.slice(0, keepCount);
};

/**
 * Veilig opslaan in localStorage met error handling
 * @param {string} key - localStorage key
 * @param {any} value - Waarde om op te slaan
 * @returns {boolean} - true als succesvol, false als mislukt
 */
export const safeLocalStorageSet = (key, value) => {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.error('❌ LocalStorage quota exceeded!');
            return false;
        }
        console.error('❌ Error saving to localStorage:', error);
        return false;
    }
};

/**
 * Format file size naar leesbaar format
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Estimate base64 string size in MB
 * @param {string} base64String
 * @returns {number} Size in MB
 */
export const estimateBase64Size = (base64String) => {
    const sizeInBytes = base64String.length * 0.75; // Base64 is ~75% van origineel
    return sizeInBytes / 1024 / 1024;
};

/**
 * Check of file te groot is voor localStorage
 * @param {string} base64String
 * @param {number} maxMB - Maximum grootte in MB (default: 2MB)
 * @returns {boolean}
 */
export const isFileTooLarge = (base64String, maxMB = 2) => {
    const sizeMB = estimateBase64Size(base64String);
    return sizeMB > maxMB;
};

export default {
    compressImage,
    compressVideo,
    getStorageInfo,
    hasEnoughSpace,
    clearOldPosts,
    safeLocalStorageSet,
    formatFileSize,
    estimateBase64Size,
    isFileTooLarge
};