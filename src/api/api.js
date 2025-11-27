// src/api/api.js
import axios from "axios";

/* -------------------------------------------------------
   API BASE URL CONFIGURATION
------------------------------------------------------- */

// Lees VITE_API_URL (Vercel frontend → backend)
let API_BASE = import.meta.env.VITE_API_URL;

// Wanneer env mist → fallback naar Railway base URL
if (!API_BASE) {
    console.warn("⚠️ VITE_API_URL missing! Using fallback Railway backend.");
    API_BASE = "https://world-studio-production.up.railway.app";
}

// Ruim op — verwijder dubbele slashes of /api
API_BASE = API_BASE.replace(/\/+$/, "").replace(/\/api$/, "");

console.log("🔗 Using API:", API_BASE);

/* -------------------------------------------------------
   AXIOS INSTANCE
------------------------------------------------------- */

const api = axios.create({
    baseURL: `${API_BASE}/api`,
    timeout: 30000,
    withCredentials: false,
    headers: {
        "Content-Type": "application/json",
    },
});

/* -------------------------------------------------------
   REQUEST INTERCEPTOR — AUTOMATISCH TOKEN MEEGEVEN
------------------------------------------------------- */

api.interceptors.request.use(
    (config) => {
        // Probeer token uit ws_currentUser
        const rawUser = localStorage.getItem("ws_currentUser");
        if (rawUser) {
            try {
                const user = JSON.parse(rawUser);
                if (user.token) {
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
            } catch (e) {
                console.warn("Failed to parse ws_currentUser:", e);
            }
        }

        // Fallback: probeer ook direct token
        if (!config.headers.Authorization) {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }

        return config;
    },
    (err) => Promise.reject(err)
);

/* -------------------------------------------------------
   RESPONSE INTERCEPTOR — ERROR HANDLING
------------------------------------------------------- */

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Log errors voor debugging
        console.error("API Error:", {
            url: error.config?.url,
            status: error.response?.status,
            message: error.response?.data?.message || error.message,
        });

        // Bij 401 Unauthorized → redirect naar login
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("ws_currentUser");
            // Alleen redirecten als we niet al op login pagina zijn
            if (!window.location.pathname.includes("/login")) {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    }
);

/* -------------------------------------------------------
   API ROUTES - AUTH
------------------------------------------------------- */

export const authAPI = {
    login: (email, password) =>
        api.post("/auth/login", { email, password }).then((r) => r.data),

    register: (payload) =>
        api.post("/auth/register", payload).then((r) => r.data),

    me: () =>
        api.get("/auth/me").then((r) => r.data),

    logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("ws_currentUser");
    },
};

/* -------------------------------------------------------
   API ROUTES - POSTS
------------------------------------------------------- */

export const postsAPI = {
    getAll: () =>
        api.get("/posts").then((r) => r.data),

    getById: (id) =>
        api.get(`/posts/${id}`).then((r) => r.data),

    create: (formData) =>
        api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        }).then((r) => r.data),

    like: (id) =>
        api.post(`/posts/${id}/like`).then((r) => r.data),

    comment: (id, text) =>
        api.post(`/posts/${id}/comment`, { text }).then((r) => r.data),

    view: (id) =>
        api.post(`/posts/${id}/view`).then((r) => r.data),

    delete: (id) =>
        api.delete(`/posts/${id}`).then((r) => r.data),
};

/* -------------------------------------------------------
   API ROUTES - USERS
------------------------------------------------------- */

export const usersAPI = {
    getById: (id) =>
        api.get(`/users/${id}`).then((r) => r.data),

    update: (id, data) =>
        api.put(`/users/${id}`, data).then((r) => r.data),

    follow: (id) =>
        api.post(`/users/${id}/follow`).then((r) => r.data),

    unfollow: (id) =>
        api.post(`/users/${id}/unfollow`).then((r) => r.data),
};

/* -------------------------------------------------------
   API ROUTES - LIVE STREAMS
------------------------------------------------------- */

export const liveAPI = {
    getAll: () =>
        api.get("/live").then((r) => r.data),

    getById: (id) =>
        api.get(`/live/${id}`).then((r) => r.data),

    create: (data) =>
        api.post("/live", data).then((r) => r.data),

    end: (id) =>
        api.post(`/live/${id}/end`).then((r) => r.data),

    join: (id) =>
        api.post(`/live/${id}/join`).then((r) => r.data),

    leave: (id) =>
        api.post(`/live/${id}/leave`).then((r) => r.data),
};

/* -------------------------------------------------------
   API ROUTES - GIFTS
------------------------------------------------------- */

export const giftsAPI = {
    getAll: () =>
        api.get("/gifts").then((r) => r.data),

    send: (data) =>
        api.post("/gifts", data).then((r) => r.data),

    getReceived: () =>
        api.get("/gifts/received").then((r) => r.data),

    getSent: () =>
        api.get("/gifts/sent").then((r) => r.data),
};

/* -------------------------------------------------------
   API ROUTES - WALLET
------------------------------------------------------- */

export const walletAPI = {
    getBalance: () =>
        api.get("/wallet").then((r) => r.data),

    deposit: (amount) =>
        api.post("/wallet/deposit", { amount }).then((r) => r.data),

    withdraw: (amount) =>
        api.post("/wallet/withdraw", { amount }).then((r) => r.data),

    getTransactions: () =>
        api.get("/wallet/transactions").then((r) => r.data),
};

/* -------------------------------------------------------
   API ROUTES - ADMIN
------------------------------------------------------- */

export const adminAPI = {
    stats: () =>
        api.get("/admin/stats").then((r) => r.data),

    getUsers: () =>
        api.get("/admin/users").then((r) => r.data),

    banUser: (id) =>
        api.post(`/admin/users/${id}/ban`).then((r) => r.data),

    unbanUser: (id) =>
        api.post(`/admin/users/${id}/unban`).then((r) => r.data),

    deletePost: (id) =>
        api.delete(`/admin/posts/${id}`).then((r) => r.data),
};

/* -------------------------------------------------------
   API ROUTES - STOCKS
------------------------------------------------------- */

export const stocksAPI = {
    getAll: () =>
        api.get("/stocks").then((r) => r.data),

    getById: (symbol) =>
        api.get(`/stocks/${symbol}`).then((r) => r.data),

    predict: (symbol) =>
        api.post(`/stocks/${symbol}/predict`).then((r) => r.data),
};

/* -------------------------------------------------------
   EXPORT DEFAULT
------------------------------------------------------- */

export default api;