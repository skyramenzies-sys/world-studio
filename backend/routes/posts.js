// routes/posts.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authmiddleware');
const Post = require('../models/Post');
const User = require('../models/User');

// Get all posts (public, visible to all)
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'username avatar');

        const formatted = posts.map(p => ({
            id: p._id,
            userId: p.userId?._id || p.userId,
            username: p.username || (p.userId ? p.userId.username : 'Unknown'),
            avatar: p.avatar || (p.userId ? p.userId.avatar : '/defaults/default-avatar.png'),
            title: p.title,
            description: p.description,
            type: p.type,
            category: p.category,
            fileUrl: p.fileUrl,
            fileName: p.fileName,
            filePublicId: p.filePublicId,
            fileSize: p.fileSize,
            thumbnail: p.thumbnail,
            likes: p.likes,
            likedBy: p.likedBy,
            views: p.views,
            comments: p.comments,
            isFree: p.isFree,
            price: p.price,
            isPremium: p.isPremium,
            timestamp: p.createdAt
        }));

        res.json(formatted);
    } catch (err) {
        console.error('Fetch posts error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create new post (single upload; for multi-file, see upload.js)
router.post('/', authMiddleware, async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        const { title, description, type, category, fileUrl, fileName, fileSize, filePublicId, isFree, price, isPremium, thumbnail } = req.body;

        if (!fileUrl) return res.status(400).json({ error: 'fileUrl required' });

        const newPost = new Post({
            userId: req.userId,
            username: req.user.username,
            avatar: req.user.avatar,
            title: title || 'Untitled',
            description: description || '',
            type: type || 'image',
            category: category || 'general',
            fileUrl,
            fileName: fileName || '',
            fileSize: fileSize || 0,
            filePublicId: filePublicId || '',
            thumbnail: thumbnail || '',
            isFree: isFree !== undefined ? isFree : true,
            price: price || 0,
            isPremium: isPremium || false
        });

        await newPost.save();

        // emit via socket
        const io = req.app.get('io');
        if (io) io.emit('new_post', { postId: newPost._id });

        res.status(201).json({
            id: newPost._id,
            userId: newPost.userId,
            username: newPost.username,
            avatar: newPost.avatar,
            title: newPost.title,
            description: newPost.description,
            type: newPost.type,
            fileUrl: newPost.fileUrl,
            thumbnail: newPost.thumbnail,
            likes: newPost.likes,
            views: newPost.views,
            comments: newPost.comments,
            timestamp: newPost.createdAt
        });

    } catch (err) {
        console.error('Create post error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ... (other endpoints unchanged and already robust!)

module.exports = router;