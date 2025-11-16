// src/api/api.js
import axios from "axios";

// --------------------------
//  CONFIGURE API BASE URL
// --------------------------
const API_BASE =
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

console.log("🔗 API_BASE:", API_BASE);

// Axios instance
const api = axios.create({
    baseURL: `${API_BASE}/api`,
    withCredentials: false,
    timeout: 30000,
});

// --------------------------
//  AUTH TOKEN INTERCEPTOR
// --------------------------
api.interceptors.request.use(
    (config) => {
        const raw = localStorage.getItem("ws_currentUser");
        if (raw) {
            try {
                const user = JSON.parse(raw);
                if (user?.token) {
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
            } catch (_) { }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// --------------------------
//  AUTH API
// --------------------------
export const authAPI = {
    login: (email, password) => api.post("/auth/login", { email, password }).then(r => r.data),
    register: (payload) => api.post("/auth/register", payload).then(r => r.data),
};

// --------------------------
//  POSTS API
// --------------------------
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

// --------------------------
//  ADMIN API
// --------------------------
export const adminAPI = {
    stats: () => api.get("/admin/stats").then(r => r.data),
};

export default api;
