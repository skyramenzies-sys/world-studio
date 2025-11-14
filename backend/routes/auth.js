// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authmiddleware');

// Register
router.post('/register', authMiddleware, async (req, res) => {
    try {
        const { email, username, password, avatar, bio } = req.body;
        if (!email || !username || !password) return res.status(400).json({ error: 'Missing fields' });

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already registered' });

        const user = new User({ email, username, password, avatar, bio });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            userId: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            token
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const match = await user.comparePassword(password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            userId: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            followers: user.followers || [],
            following: user.following || [],
            totalViews: user.totalViews || 0,
            totalLikes: user.totalLikes || 0,
            earnings: user.earnings || 0,
            notifications: user.notifications || [],
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get current user (requires token but middleware is forgiving)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
