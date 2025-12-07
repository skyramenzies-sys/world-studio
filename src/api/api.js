// src/api/api.js - WORLD-STUDIO ULTIMATE EDITION 🌌
import axios from "axios";

// ---------------------------------------------
// BASE URL
// ---------------------------------------------
let baseURL =
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");

baseURL = baseURL.replace(/\/$/, "");

// Export for use in other files
export const API_BASE_URL = baseURL;
export const API_BASE = `${baseURL}/api`;

console.log("🌐 API baseURL =", API_BASE);

// ---------------------------------------------
// AXIOS INSTANCE
// ---------------------------------------------
const api = axios.create({
    baseURL: API_BASE,
    withCredentials: false,
});

// Inject JWT token automatically
api.interceptors.request.use(
    (config) => {
        try {
            const token =
                localStorage.getItem("token") ||
                sessionStorage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch { }
        return config;
    },
    (error) => Promise.reject(error)
);


export default api;

// ---------------------------------------------
// ADMIN API ENDPOINTS
// ---------------------------------------------
export const adminApi = {
    getStats: () => api.get("/admin/stats"),
    getRevenue: () => api.get("/admin/revenue"),
    getSystem: () => api.get("/admin/system"),

    getUsers: (params = {}) => api.get("/admin/users", { params }),
    getUser: (id) => api.get(`/admin/users/${id}`),

    getStreams: (params = {}) => api.get("/admin/streams", { params }),

    getWithdrawals: (params = {}) => api.get("/admin/withdrawals", { params }),

    getReports: (params = {}) => api.get("/admin/reports", { params }),

    // User actions
    banUser: (id, data) => api.post(`/admin/ban-user/${id}`, data),
    unbanUser: (id) => api.post(`/admin/unban-user/${id}`),
    verifyUser: (id, data) => api.post(`/admin/verify-user/${id}`, data),
    unverifyUser: (id) => api.post(`/admin/unverify-user/${id}`),
    makeAdmin: (id) => api.post(`/admin/make-admin/${id}`),
    removeAdmin: (id) => api.post(`/admin/remove-admin/${id}`),
    deleteUser: (id) => api.delete(`/admin/delete-user/${id}`),
    addCoins: (id, data) => api.post(`/admin/add-coins/${id}`, data),
    removeCoins: (id, data) => api.post(`/admin/remove-coins/${id}`, data),

    // Withdrawals
    approveWithdrawal: (id, data) => api.post(`/admin/withdrawals/${id}/approve`, data),
    rejectWithdrawal: (id, data) => api.post(`/admin/withdrawals/${id}/reject`, data),

    // Reports
    resolveReport: (id, data) => api.post(`/admin/reports/${id}/resolve`, data),
    dismissReport: (id) => api.delete(`/admin/reports/${id}`),

    // Streams
    stopStream: (id) => api.post(`/admin/stop-stream/${id}`),

    // Announcements
    sendAnnouncement: (data) => api.post("/admin/announcement", data),
    broadcast: (data) => api.post("/admin/broadcast", data),
};

// ---------------------------------------------
// LIVE API ENDPOINTS
// ---------------------------------------------
export const liveApi = {
    getStreams: () => api.get("/live"),
    getStream: (id) => api.get(`/live/${id}`),
    startStream: (data) => api.post("/live/start", data),
    stopStream: (id) => api.post(`/live/stop/${id}`),
    getUserStatus: (userId) => api.get(`/live/user/${userId}/status`),
    getUserHistory: (userId, params = {}) => api.get(`/live/user/${userId}/history`, { params }),
};

// ---------------------------------------------
// CRYPTO API ENDPOINTS (via backend proxy)
// ---------------------------------------------
export const cryptoApi = {
    getPrices: (ids) => api.get("/crypto/prices", { params: { ids } }),
    getCoin: (coinId) => api.get(`/crypto/coin/${coinId}`),
    getChart: (coinId, params = {}) => api.get(`/crypto/chart/${coinId}`, { params }),
    getMarkets: (params = {}) => api.get("/crypto/markets", { params }),
    getTrending: () => api.get("/crypto/trending"),
};