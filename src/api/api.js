// src/api/api.js
import axios from "axios";

/* -------------------------------------------------------
   FIXED + SAFE API BASE URL
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

// Maak axios instance
const api = axios.create({
    baseURL: `${API_BASE}/api`,
    timeout: 30000,
    withCredentials: false,
});

/* -------------------------------------------------------
   INTERCEPTOR — AUTOMATISCH TOKEN MEEGEVEN
------------------------------------------------------- */
api.interceptors.request.use(
    (config) => {
        const rawUser = localStorage.getItem("ws_currentUser");
        if (rawUser) {
            try {
                const user = JSON.parse(rawUser);
                if (user.token) {
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
            } catch (_) { }
        }
        return config;
    },
    (err) => Promise.reject(err)
);

/* -------------------------------------------------------
   API ROUTES
------------------------------------------------------- */

// Auth
export const authAPI = {
    login: (email, password) => api.post("/auth/login", { email, password }).then(r => r.data),
    register: (payload) => api.post("/auth/register", payload).then(r => r.data),
};

// Posts
export const postsAPI = {
    getAll: () => api.get("/posts").then(r => r.data),

    create: (formData) =>
        api.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        }).then(r => r.data),

    like: (id) => api.post(`/posts/${id}/like`).then(r => r.data),
    comment: (id, text) => api.post(`/posts/${id}/comment`, { text }).then(r => r.data),
    view: (id) => api.post(`/posts/${id}/view`).then(r => r.data),
};

// Admin
export const adminAPI = {
    stats: () => api.get("/admin/stats").then(r => r.data),
};

export default api;
