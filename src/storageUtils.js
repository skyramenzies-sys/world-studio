// cosmic-storageUtils.js
// 🚀 Universal, async, encrypted, cross-tab, cloud-ready storage utilities 🚀

/* ========== SECTION 1: IMPORTS (IDB, WORKER SETUP) ========== */
import { set as idbSet, get as idbGet, del as idbDel, clear as idbClear } from 'idb-keyval';

// Optionally, you can use a web worker for async compression (see docs or implement as needed).

/* ========== SECTION 2: ENCRYPTION HELPERS ========== */

/**
 * @private
 * Generate a CryptoKey from a passphrase.
 * @param {string} passphrase
 * @returns {Promise<CryptoKey>}
 */
async function getKey(passphrase) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("cosmic-storage-salt"),
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypt a string using AES-GCM and a passphrase.
 * @param {string} text
 * @param {string} passphrase
 * @returns {Promise<string>} base64-encoded ciphertext
 */
export const encrypt = async (text, passphrase) => {
    const key = await getKey(passphrase);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        enc.encode(text)
    );
    const buff = new Uint8Array(iv.length + ciphertext.byteLength);
    buff.set(iv, 0);
    buff.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...buff));
};

/**
 * Decrypt a string using AES-GCM and a passphrase.
 * @param {string} base64
 * @param {string} passphrase
 * @returns {Promise<string>}
 */
export const decrypt = async (base64, passphrase) => {
    const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const key = await getKey(passphrase);
    const dec = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data
    );
    return new TextDecoder().decode(dec);
};

/* ========== SECTION 3: SMART STORAGE (LOCAL/IDB/CLOUD) ========== */

// --- Cloud config ---
// Replace with your actual REST API endpoints
const CLOUD_ENDPOINT = "https://your-cloud-storage-api.com/data";

/**
 * Save data to your cloud via POST.
 * @param {string} key
 * @param {any} value
 * @returns {Promise<boolean>}
 */
export const cloudSet = async (key, value) => {
    try {
        await fetch(`${CLOUD_ENDPOINT}/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value }),
        });
        return true;
    } catch (err) {
        console.error('[Storage] Cloud set error', err);
        return false;
    }
};

/**
 * Get data from your cloud via GET.
 * @param {string} key
 * @returns {Promise<any>}
 */
export const cloudGet = async (key) => {
    try {
        const res = await fetch(`${CLOUD_ENDPOINT}/${encodeURIComponent(key)}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.value;
    } catch (err) {
        console.error('[Storage] Cloud get error', err);
        return null;
    }
};

// --- Smart storage ---
export const smartSet = async (key, value, options = {}) => {
    let asString;
    try {
        asString = typeof value === "string" ? value : JSON.stringify(value);
    } catch {
        asString = String(value);
    }
    // Estimate size
    const sizeMB = asString.length * 0.75 / 1024 / 1024;
    if (options.encrypt && options.passphrase) {
        asString = await encrypt(asString, options.passphrase);
    }
    // Use IndexedDB for large files, else localStorage
    if (sizeMB > (options.maxLocalMB || 2)) {
        await idbSet(key, asString);
        localStorage.setItem(`__idb__${key}`, '1');
    } else {
        localStorage.setItem(key, asString);
        localStorage.removeItem(`__idb__${key}`);
    }
    // Optionally save to cloud
    if (options.cloud) {
        await cloudSet(key, asString);
    }
    fireEvent('set', key, value);
};

/**
 * Smart get: automatically reads from localStorage, IndexedDB, or cloud in fallback order.
 */
export const smartGet = async (key, options = {}) => {
    let value;
    // Prefer IndexedDB if flagged
    if (localStorage.getItem(`__idb__${key}`)) {
        value = await idbGet(key);
    } else {
        value = localStorage.getItem(key);
    }
    // Try to parse JSON
    try { value = JSON.parse(value); } catch { }
    // Try to decrypt
    if (options.decrypt && options.passphrase && typeof value === "string") {
        try { value = await decrypt(value, options.passphrase); } catch { }
        try { value = JSON.parse(value); } catch { }
    }
    // Cloud fallback
    if (value === null && options.cloud) {
        value = await cloudGet(key);
        try { value = JSON.parse(value); } catch { }
    }
    fireEvent('get', key, value);
    return value;
};

/* ========== SECTION 4: IMAGE/VIDEO ASYNC COMPRESSION ========== */

// You can implement web worker based compression here for cosmic-level performance.
// For now, here is sync version (for demo):
export const compressImage = (base64, maxWidth = 1200, quality = 0.7) =>
    new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Could not load image for compression'));
        img.src = base64;
    });

export const compressVideo = (videoBase64) =>
    new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadeddata = () => {
            const width = 640;
            const height = video.videoWidth ? (video.videoHeight / video.videoWidth) * width : 360;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, width, height);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.6);
            resolve({
                thumbnail,
                isVideo: true,
                originalSize: videoBase64.length,
            });
        };
        video.onerror = () => reject(new Error('Could not load video for compression'));
        video.src = videoBase64;
    });

/* ========== SECTION 5: CROSS-TAB REALTIME SYNC & EVENT HOOKS ========== */

const listeners = [];
export const addStorageListener = (fn) => listeners.push(fn);
export const removeStorageListener = (fn) => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
};
function fireEvent(type, key, value) {
    listeners.forEach(fn => fn({ type, key, value, time: Date.now() }));
}
export const onStorageChange = (callback) => {
    const handler = (e) => callback(e);
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
};

/* ========== SECTION 6: SAFE/ADVANCED LOCALSTORAGE OPS & UTILITIES ========== */

export const getStorageInfo = () => {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        used += (key?.length || 0) + (value?.length || 0);
    }
    const usedMB = (used / 1024 / 1024);
    const totalMB = 10;
    const availableMB = totalMB - usedMB;
    return {
        used: usedMB.toFixed(2),
        available: availableMB.toFixed(2),
        total: totalMB,
        percentage: ((usedMB / totalMB) * 100).toFixed(1)
    };
};

export const hasEnoughSpace = (requiredMB) => {
    const info = getStorageInfo();
    return parseFloat(info.available) >= requiredMB;
};

export const clearOldPosts = (posts, keepCount = 10) => {
    if (!Array.isArray(posts)) return [];
    return [...posts]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, keepCount);
};

export const safeLocalStorageSet = (key, value) => {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
        return true;
    } catch (error) {
        if (
            error.name === 'QuotaExceededError' ||
            error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        ) {
            console.error('❌ LocalStorage quota exceeded!');
        } else {
            console.error('❌ Error saving to localStorage:', error);
        }
        return false;
    }
};

export const safeLocalStorageGet = (key, fallback = null) => {
    try {
        const value = localStorage.getItem(key);
        if (value === null) return fallback;
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch (error) {
        console.error('❌ Error reading from localStorage:', error);
        return fallback;
    }
};

export const safeLocalStorageRemove = (key) => {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('❌ Error removing from localStorage:', error);
        return false;
    }
};

export const safeLocalStorageClear = () => {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('❌ Error clearing localStorage:', error);
        return false;
    }
};

export const getLocalStorageKeys = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
    }
    return keys;
};

export const localStorageKeyExists = (key) => {
    return localStorage.getItem(key) !== null;
};

export const generateUniqueKey = (prefix = 'key') => {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
};

export const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const estimateBase64Size = (base64String) => {
    if (!base64String) return 0;
    const sizeInBytes = base64String.length * 0.75;
    return sizeInBytes / 1024 / 1024;
};

export const isFileTooLarge = (base64String, maxMB = 2) => {
    const sizeMB = estimateBase64Size(base64String);
    return sizeMB > maxMB;
};

export const isPlainObject = (value) =>
    value !== null && typeof value === 'object' && value.constructor === Object;

export const isNonEmptyArray = (value) =>
    Array.isArray(value) && value.length > 0;

export default {
    // Encryption & Security
    encrypt,
    decrypt,
    // Smart/Fallback Storage
    smartSet,
    smartGet,
    cloudSet,
    cloudGet,
    // Async Compression
    compressImage,
    compressVideo,
    // Realtime/Cross-tab/Events
    addStorageListener,
    removeStorageListener,
    onStorageChange,
    // Info/Quota
    getStorageInfo,
    hasEnoughSpace,
    // Advanced Safe Storage
    setStorage,
    getStorage,
    nsKey,
    debouncedSetStorage,
    throttledSetStorage,
    clearOldPosts,
    safeLocalStorageSet,
    safeLocalStorageGet,
    safeLocalStorageRemove,
    safeLocalStorageClear,
    getLocalStorageKeys,
    localStorageKeyExists,
    generateUniqueKey,
    formatFileSize,
    estimateBase64Size,
    isFileTooLarge,
    isPlainObject,
    isNonEmptyArray
};

/*
🌌
Usage Example:
import storageUtils from './cosmic-storageUtils';

// Secure, async, real-time, cloud-synced storage for the universe!
await storageUtils.smartSet('photo', encryptedPhoto, { encrypt: true, passphrase: 'secret', cloud: true });

const photo = await storageUtils.smartGet('photo', { decrypt: true, passphrase: 'secret', cloud: true });

storageUtils.addStorageListener(ev => console.log('storage event:', ev));
storageUtils.onStorageChange(e => console.log('Another tab changed storage!', e));
*/

