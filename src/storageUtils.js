// cosmic-storageUtils.js
// 🚀 Universal, async, encrypted, cross-tab, cloud-ready storage utilities 🚀

import { set as idbSet, get as idbGet, del as idbDel, clear as idbClear } from 'idb-keyval';

/* ---------------------- ENCRYPTION HELPERS ---------------------- */
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

/* ---------------------- CLOUD STORAGE ---------------------- */
const CLOUD_ENDPOINT = "https://your-cloud-storage-api.com/data";

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

/* ---------------------- SMART STORAGE ---------------------- */
export const smartSet = async (key, value, options = {}) => {
    let asString;

    try {
        asString = typeof value === "string" ? value : JSON.stringify(value);
    } catch {
        asString = String(value);
    }

    const sizeMB = asString.length * 0.75 / 1024 / 1024;

    if (options.encrypt && options.passphrase) {
        asString = await encrypt(asString, options.passphrase);
    }

    if (sizeMB > (options.maxLocalMB || 2)) {
        await idbSet(key, asString);
        localStorage.setItem(`__idb__${key}`, '1');
    } else {
        localStorage.setItem(key, asString);
        localStorage.removeItem(`__idb__${key}`);
    }

    if (options.cloud) {
        await cloudSet(key, asString);
    }

    fireEvent('set', key, value);
};

export const smartGet = async (key, options = {}) => {
    let value;

    if (localStorage.getItem(`__idb__${key}`)) {
        value = await idbGet(key);
    } else {
        value = localStorage.getItem(key);
    }

    try { value = JSON.parse(value); } catch { }

    if (options.decrypt && options.passphrase && typeof value === "string") {
        try { value = await decrypt(value, options.passphrase); } catch { }
        try { value = JSON.parse(value); } catch { }
    }

    if (value === null && options.cloud) {
        value = await cloudGet(key);
        try { value = JSON.parse(value); } catch { }
    }

    fireEvent('get', key, value);
    return value;
};

/* ---------------------- IMAGE / VIDEO COMPRESSION ---------------------- */
export const compressImage = (base64, maxWidth = 1200, quality = 0.7) =>
    new Promise((resolve, reject) => {
        const img = new Image();
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

            resolve(canvas.toDataURL('image/jpeg', quality));
        };

        img.onerror = () => reject(new Error("Could not compress image"));
        img.src = base64;
    });

export const compressVideo = (base64) =>
    new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";

        video.onloadeddata = () => {
            const canvas = document.createElement("canvas");
            const width = 640;
            const height = (video.videoHeight / video.videoWidth) * 640;

            canvas.width = width;
            canvas.height = height;

            canvas.getContext("2d").drawImage(video, 0, 0, width, height);
            const thumbnail = canvas.toDataURL("image/jpeg", 0.6);

            resolve({ thumbnail, isVideo: true });
        };

        video.onerror = () => reject(new Error("Could not process video"));
        video.src = base64;
    });

/* ---------------------- EVENT LISTENERS ---------------------- */
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
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
};

/* ---------------------- SAFE STORAGE HELPERS ---------------------- */
export const getStorageInfo = () => {
    let used = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        used += (key?.length || 0) + (localStorage.getItem(key)?.length || 0);
    }

    const usedMB = used / 1024 / 1024;
    return {
        used: usedMB.toFixed(2),
        available: (10 - usedMB).toFixed(2),
        total: 10,
        percentage: ((usedMB / 10) * 100).toFixed(1),
    };
};

export const safeLocalStorageSet = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
};
export const safeLocalStorageGet = (key, fallback = null) => {
    try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch {
        return fallback;
    }
};
export const safeLocalStorageRemove = (key) => {
    try { localStorage.removeItem(key); return true; } catch { return false; }
};

export const generateUniqueKey = (prefix = "key") =>
    `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

export default {
    encrypt,
    decrypt,
    smartSet,
    smartGet,
    cloudSet,
    cloudGet,
    compressImage,
    compressVideo,
    addStorageListener,
    removeStorageListener,
    onStorageChange,
    getStorageInfo,
    safeLocalStorageSet,
    safeLocalStorageGet,
    safeLocalStorageRemove,
    generateUniqueKey
};
