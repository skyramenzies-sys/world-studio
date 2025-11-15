const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// --- 1. Search users by username (with pagination) ---
router.get('/', async (req, res) => {
    try {
        const { q = '', page = 1, limit = 10 } = req.query;
        const regex = new RegExp(q, 'i');

        const users = await User.find({ username: regex })
            .select('-password')
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await User.countDocuments({ username: regex });

        res.json({
            users,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 2. Suggested users to follow (paginated) ---
router.get('/suggested', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const me = await User.findById(req.userId);

        if (!me) return res.status(404).json({ error: "Current user not found" });

        const excludeIds = [me._id, ...me.following];

        const suggestions = await User.find({ _id: { $nin: excludeIds } })
            .select('-password')
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments({ _id: { $nin: excludeIds } });

        res.json({
            suggestions,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 3. Get public profile by id ---
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 4. Update basic profile fields ---
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (
            req.userId.toString() !== req.params.id &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { username, bio } = req.body;
        const updates = {};
        if (username) updates.username = username;
        if (bio) updates.bio = bio;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 5. Follow / unfollow (toggle) ---
router.post('/:id/follow', authMiddleware, async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        const targetId = req.params.id;
        if (targetId === req.userId.toString()) {
            return res.status(400).json({ error: "Cannot follow yourself" });
        }

        const me = await User.findById(req.userId);
        if (!me) return res.status(404).json({ error: 'Current user not found' });

        const target = await User.findById(targetId);
        if (!target) return res.status(404).json({ error: 'User not found' });

        const isFollowing = me.following.some(id => id.toString() === targetId);
        if (isFollowing) {
            me.following = me.following.filter(id => id.toString() !== targetId);
            target.followers = target.followers.filter(id => id.toString() !== req.userId.toString());
        } else {
            me.following.push(targetId);
            target.followers.push(req.userId);
            // notify
            if (typeof target.addNotification === 'function') {
                await target.addNotification({
                    message: `${me.username} started following you`,
                    type: 'follow',
                    fromUser: me._id
                });
            }
        }

        await me.save();
        await target.save();

        res.json({ following: me.following, followers: target.followers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
