// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get public profile by id
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update basic profile fields
router.put('/:id', auth, async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        if (req.userId.toString() !== req.params.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const updates = (({ username, bio }) => ({ username, bio }))(req.body);
        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Follow / unfollow (toggle)
router.post('/:id/follow', auth, async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        const targetId = req.params.id;
        if (targetId === req.userId.toString()) return res.status(400).json({ error: "Cannot follow yourself" });

        const me = await User.findById(req.userId);
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
            await target.addNotification({
                message: `${me.username} started following you`,
                type: 'follow',
                fromUser: me._id
            });
        }

        await me.save();
        await target.save();

        res.json({ following: me.following, followers: target.followers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
