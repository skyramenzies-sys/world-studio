import axios from "axios";
const BASE = "https://world-studio-production.up.railway.app/api";

export const authAPI = {
    login: async (email, password) =>
        (await axios.post(`${BASE}/auth/login`, { email, password })).data,
    register: async (data) =>
        (await axios.post(`${BASE}/auth/register`, data)).data,
};

export const postsAPI = {
    getAll: async () => (await axios.get(`${BASE}/posts`)).data,
    create: async (data) => (await axios.post(`${BASE}/posts`, data)).data,
};
