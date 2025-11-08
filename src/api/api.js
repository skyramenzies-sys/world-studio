// src/api/api.js
import axios from "axios";

const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    "https://world-studio-production.up.railway.app";

const api = axios.create({
    baseURL: `${API_BASE}/api`,
    withCredentials: false,
    timeout: 30000,
});

// Token uit localStorage meesturen
api.interceptors.request.use((config) => {
    try {
        const raw = localStorage.getItem("ws_currentUser");
        if (raw) {
            const user = JSON.parse(raw);
            if (user?.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
        }
    } catch { }
    return config;
});

// Handige helpers
export const authAPI = {
    login: (email, password) => api.post("/auth/login", { email, password }).then(r => r.data),
    register: (payload) => api.post("/auth/register", payload).then(r => r.data),
};

export const postsAPI = {
    getAll: () => api.get("/posts").then(r => r.data),
    create: (formData) =>
        api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
            .then(r => r.data.post),
    like: (id) => api.post(`/posts/${id}/like`).then(r => r.data),
    comment: (id, text) => api.post(`/posts/${id}/comment`, { text }).then(r => r.data),
    view: (id) => api.post(`/posts/${id}/view`).then(r => r.data),
};

export const adminAPI = {
    stats: () => api.get("/admin/stats").then(r => r.data),
};

export default api;
