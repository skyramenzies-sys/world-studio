// src/api/api.js - API Configuration for World Studio (Universum Edition)
import axios from "axios";

// ============================================
// ENV & BASE URL CONFIGURATION
// ============================================

/**
 * We ondersteunen:
 * - Vite: import.meta.env.VITE_API_URL
 * - Next/CRA: process.env.NEXT_PUBLIC_API_URL / REACT_APP_API_URL
 * - Fallback: Railway URL
 *
 * Let op:
 *  - BACKEND ROOT = https://... (zonder /api)
 *  - API_BASE_URL = `${ROOT}/api`
 *  - Gebruik in je code: api.get("/admin/stats") → gaat naar /api/admin/stats
 */

let rawBase =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL)) ||
    (typeof process !== "undefined" &&
        process.env &&
        (process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL)) ||
    "https://world-studio-production.up.railway.app";

// Strip eventuele /api en trailing slash
let backendRoot = rawBase.replace(/\/api\/?$/, "").replace(/\/+$/, "");

// Definitieve API base (met /api prefix)
const API_BASE_URL = `${backendRoot}/api`;

// Dev check voor logging
const isDev =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.MODE !== "production") ||
    (typeof process !== "undefined" &&
        process.env &&
        process.env.NODE_ENV === "development");

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Kleine helper om veilig te checken of we in de browser draaien
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

// ============================================
// REQUEST INTERCEPTOR - Add Auth Token
// ============================================
api.interceptors.request.use(
    (config) => {
        let token = null;

        if (isBrowser) {
            try {
                token =
                    window.localStorage.getItem("ws_token") ||
                    window.localStorage.getItem("token");
            } catch {
                // localStorage niet beschikbaar (bv. private mode/SSR) → ignore
            }
        }

        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (isDev) {
            const method = (config.method || "GET").toUpperCase();
            console.log(`🚀 API Request: ${method} ${config.baseURL || ""}${config.url}`);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR - Handle Errors
// ============================================
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;


        if (response) {
            const status = response.status;

            switch (status) {
                case 401:
                    // Unauthorized - clear token and (optioneel) redirect
                    console.warn("⚠️ Unauthorized - clearing session");
                    if (isBrowser) {
                        try {
                            window.localStorage.removeItem("ws_token");
                            window.localStorage.removeItem("ws_currentUser");
                        } catch {
                            // ignore
                        }
                        // Optioneel:
                        // window.location.href = "/login";
                    }
                    break;

                case 403:
                    console.warn("⚠️ Forbidden - insufficient permissions");
                    break;

                case 404:
                    console.warn("⚠️ Resource not found");
                    break;

                case 429:
                    console.warn("⚠️ Rate limited - too many requests");
                    break;

                case 500:
                    console.error("❌ Server error");
                    break;

                default:
                    console.error(`❌ API Error: ${status}`);
            }
        } else if (error.code === "ECONNABORTED") {
            console.error("❌ Request timeout");
        } else if (isBrowser && typeof navigator !== "undefined" && !navigator.onLine) {
            console.error("❌ No internet connection");
        } else {
            console.error("❌ Unknown API error", error);
        }

        return Promise.reject(error);
    }
);

// ============================================
// HELPER METHODS
// ============================================

/**
 * Upload één file met progress callback
 * @param {string} endpoint - bv "/upload" (zonder /api)
 * @param {File} file
 * @param {(percent: number) => void} onProgress
 */
api.uploadFile = async (endpoint, file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post(endpoint, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percent = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                onProgress(percent);
            }
        },
    });
};

/**
 * Upload meerdere files met progress callback
 * @param {string} endpoint - bv "/upload/multi"
 * @param {File[]} files
 * @param {string} fieldName - standaard "files"
 * @param {(percent: number) => void} onProgress
 */
api.uploadFiles = async (endpoint, files, fieldName = "files", onProgress) => {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append(fieldName, file);
    });

    return api.post(endpoint, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percent = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                onProgress(percent);
            }
        },
    });
};

/**
 * GET met simpele retry logic (exponentiële delay light)
 * @param {string} url
 * @param {object} options - axios config
 * @param {number} maxRetries
 */
api.getWithRetry = async (url, options = {}, maxRetries = 3) => {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await api.get(url, options);
        } catch (error) {
            lastError = error;

            // Laatste poging → gooi error terug
            if (i >= maxRetries - 1) break;

            const delayMs = 1000 * (i + 1); // 1s, 2s, 3s ...
            if (isDev) {
                console.warn(`⏱ Retry GET ${url} in ${delayMs}ms (attempt ${i + 2}/${maxRetries})`);
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    throw lastError;
};

// ============================================
// EXPORT
// ============================================
export default api;
export { API_BASE_URL };
