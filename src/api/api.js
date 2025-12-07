// src/api/api.js - WORLD-STUDIO ULTIMATE EDITION 🌌
import axios from "axios";

// ---------------------------------------------
// BASE URL
// ---------------------------------------------
let baseURL =
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");

baseURL = baseURL.replace(/\/$/, "");

const API_BASE = `${baseURL}/api`;

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
};
