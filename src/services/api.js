import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('ws_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

const apiService = {
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        if (response.data.token) {
            localStorage.setItem('ws_token', response.data.token);
            localStorage.setItem('ws_user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        if (response.data.token) {
            localStorage.setItem('ws_token', response.data.token);
            localStorage.setItem('ws_user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('ws_token');
        localStorage.removeItem('ws_user');
    },

    getPosts: async () => {
        const response = await api.get('/posts');
        return response.data;
    },

    uploadFile: async (formData, onUploadProgress) => {
        const response = await api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress
        });
        return response.data;
    },

    likePost: async (postId) => {
        const response = await api.post(`/posts/${postId}/like`);
        return response.data;
    },

    commentOnPost: async (postId, text) => {
        const response = await api.post(`/posts/${postId}/comment`, { text });
        return response.data;
    },

    incrementView: async (postId) => {
        const response = await api.post(`/posts/${postId}/view`);
        return response.data;
    },

    getUsers: async () => {
        const response = await api.get('/users');
        return response.data;
    },

    supportCreator: async (creatorId, amount) => {
        const response = await api.post(`/users/${creatorId}/support`, { amount });
        return response.data;
    }
};

export default apiService;