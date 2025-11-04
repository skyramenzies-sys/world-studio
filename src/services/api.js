const API_URL = 'https://world-studio-production.up.railway.app/api';

// Helper function to get auth token
const getAuthToken = () => {
    const currentUser = JSON.parse(localStorage.getItem('ws_currentUser'));
    return currentUser?.token;
};

// Auth API
export const authAPI = {
    // Register
    async register(userData) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }
        return await response.json();
    },

    // Login
    async login(email, password) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }
        return await response.json();
    }
};

// Posts API
export const postsAPI = {
    // Get all posts
    async getAll() {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/posts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch posts');
        return await response.json();
    },

    // Create post
    async create(postData) {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(postData)
        });
        if (!response.ok) throw new Error('Failed to create post');
        return await response.json();
    },

    // Like post
    async like(postId) {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to like post');
        return await response.json();
    },

    // Add comment
    async comment(postId, text) {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });
        if (!response.ok) throw new Error('Failed to add comment');
        return await response.json();
    },

    // Increment views
    async incrementView(postId) {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/posts/${postId}/view`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to increment view');
        return await response.json();
    },

    // Delete post
    async delete(postId) {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to delete post');
        return await response.json();
    }
};

// Users API
export const usersAPI = {
    // Get all users
    async getAll() {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return await response.json();
    }
};