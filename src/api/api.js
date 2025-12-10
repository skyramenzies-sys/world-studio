// src/api/api.js - WORLD-STUDIO ULTIMATE EDITION 🌌
import axios from "axios";

// ---------------------------------------------
// BASE URL RESOLUTION
// ---------------------------------------------
let origin =
    (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_URL) ||
    (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:8080");

// Strip trailing slash
origin = origin.replace(/\/$/, "");

// ⚙️ ORIGIN = backend root (zonder /api)
export const API_ORIGIN = origin;

// ⚙️ BASE URL = backend API root (MET /api)
export const API_BASE_URL = `${origin}/api`;

// Backwards compatible alias
export const API_BASE = API_BASE_URL;

console.log("🌐 API_ORIGIN   =", API_ORIGIN);
console.log("🌐 API_BASE_URL =", API_BASE_URL);

// ---------------------------------------------
// TOKEN HELPER
// ---------------------------------------------
const getToken = () => {
    try {
        if (typeof window === "undefined") return null;

        // Universe Edition: nieuwe keys eerst, dan legacy
        return (
            window.localStorage.getItem("ws_token") ||
            window.localStorage.getItem("token") ||
            window.sessionStorage.getItem("ws_token") ||
            window.sessionStorage.getItem("token")
        );
    } catch {
        return null;
    }
};

// ---------------------------------------------
// AXIOS INSTANCE
// ---------------------------------------------
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: false,
});

// Inject JWT token automatically
api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);


export default api;

// ---------------------------------------------
// ADMIN API ENDPOINTS
// ---------------------------------------------
export const adminApi = {
    // STATS / SYSTEM / REVENUE (admin router)
    getStats: () => api.get("/admin/stats"),
    getRevenue: () => api.get("/admin/revenue"),
    getAnalytics: (range = "7d", groupBy = "day") => api.get(`/admin/analytics?range=${range}&groupBy=${groupBy}`),
    getSystem: () => api.get("/admin/system"),

    // USERS (admin router)
    getUsers: (params = {}) => api.get("/admin/users", { params }),
    getUser: (id) => api.get(`/admin/users/${id}`),

    // STREAMS (admin router)
    getStreams: (params = {}) => api.get("/admin/streams", { params }),

    // 🆕 WITHDRAWALS via WALLET ADMIN ROUTES
    // backend: GET /api/wallet/admin/pending-withdrawals
    getWithdrawals: (params = {}) =>
        api.get("/wallet/admin/pending-withdrawals", { params }),

    // backend: POST /api/wallet/admin/process-withdrawal
    // data: { userId, transactionId, note? }
    approveWithdrawal: (data) =>
        api.post("/wallet/admin/process-withdrawal", {
            ...data,
            status: "completed",
        }),

    rejectWithdrawal: (data) =>
        api.post("/wallet/admin/process-withdrawal", {
            ...data,
            status: "rejected",
        }),

    // REPORTS (admin router)
    getReports: (params = {}) => api.get("/admin/reports", { params }),
    resolveReport: (id, data) => api.post(`/admin/reports/${id}/resolve`, data),
    dismissReport: (id) => api.delete(`/admin/reports/${id}`),

    // USER ACTIONS (admin router)
    banUser: (id, data) => api.post(`/admin/ban-user/${id}`, data),
    unbanUser: (id) => api.post(`/admin/unban-user/${id}`),
    verifyUser: (id, data) => api.post(`/admin/verify-user/${id}`, data),
    unverifyUser: (id) => api.post(`/admin/unverify-user/${id}`),
    makeAdmin: (id) => api.post(`/admin/make-admin/${id}`),
    removeAdmin: (id) => api.post(`/admin/remove-admin/${id}`),
    deleteUser: (id) => api.delete(`/admin/delete-user/${id}`),

    // 🆕 COINS via WALLET ADMIN ROUTES
    // backend: POST /api/wallet/admin/add-coins
    // body: { targetUserId?, targetUsername?, amount, reason? }
    addCoins: (data) => api.post("/wallet/admin/add-coins", data),

    // backend: POST /api/wallet/admin/deduct-coins
    removeCoins: (data) => api.post("/wallet/admin/deduct-coins", data),

    // STREAM CONTROL (admin router)
    stopStream: (id) => api.post(`/admin/stop-stream/${id}`),

    // ANNOUNCEMENTS (admin router)
    sendAnnouncement: (data) => api.post("/admin/announcement", data),
    broadcast: (data) => api.post("/admin/broadcast", data),
};

// ---------------------------------------------
// LIVE API ENDPOINTS
// ---------------------------------------------
export const liveApi = {
    getStreams: (params = {}) => api.get("/live", { params }),
    getStream: (id) => api.get(`/live/${id}`),
    startStream: (data) => api.post("/live/start", data),
    stopStream: (id) => api.post(`/live/stop/${id}`),
    getUserStatus: (userId) => api.get(`/live/user/${userId}/status`),
    getUserHistory: (userId, params = {}) =>
        api.get(`/live/user/${userId}/history`, { params }),
};

// ---------------------------------------------
// CRYPTO API ENDPOINTS (via backend proxy)
// ---------------------------------------------
export const cryptoApi = {
    getPrices: (ids) => api.get("/crypto/prices", { params: { ids } }),
    getCoin: (coinId) => api.get(`/crypto/coin/${coinId}`),
    getChart: (coinId, params = {}) =>
        api.get(`/crypto/chart/${coinId}`, { params }),
    getMarkets: (params = {}) => api.get("/crypto/markets", { params }),
    getTrending: () => api.get("/crypto/trending"),
};
