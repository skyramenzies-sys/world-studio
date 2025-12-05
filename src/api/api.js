// src/api/api.js - API Configuration for World Studio
import axios from "axios";

// ============================================
// BASE URL CONFIGURATION
// ============================================
const API_BASE_URL =
    process.env.REACT_APP_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://world-studio-production.up.railway.app";

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// ============================================
// REQUEST INTERCEPTOR - Add Auth Token
// ============================================
api.interceptors.request.use(
    (config) => {
        // Get token from localStorage
        const token = localStorage.getItem("ws_token") || localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Log requests in development
        if (process.env.NODE_ENV === "development") {
            console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ============================================
// RESPONSE INTERCEPTOR - Handle Errors
// ============================================
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const { response } = error;

        // Handle specific error codes
        if (response) {
            switch (response.status) {
                case 401:
                    // Unauthorized - clear token and redirect
                    console.warn("⚠️ Unauthorized - clearing session");
                    localStorage.removeItem("ws_token");
                    localStorage.removeItem("ws_currentUser");
                    // Optionally redirect to login
                    // window.location.href = "/login";
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
                    console.error(`❌ API Error: ${response.status}`);
            }
        } else if (error.code === "ECONNABORTED") {
            console.error("❌ Request timeout");
        } else if (!navigator.onLine) {
            console.error("❌ No internet connection");
        }

        return Promise.reject(error);
    }
);

// ============================================
// HELPER METHODS
// ============================================

// Upload file with progress
api.uploadFile = async (endpoint, file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post(endpoint, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            }
        },
    });
};

// Upload multiple files
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
            if (onProgress) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            }
        },
    });
};

// Get with retry
api.getWithRetry = async (url, options = {}, maxRetries = 3) => {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await api.get(url, options);
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    throw lastError;
};

// ============================================
// EXPORT
// ============================================
export default api;
export { API_BASE_URL };