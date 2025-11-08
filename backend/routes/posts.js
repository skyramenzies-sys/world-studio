// routes/posts.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');

// Get all posts (public)
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

// Create new post
router.post('/', auth, async (req, res) => {
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

// Like/unlike
router.put('/:id/like', auth, async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const userId = req.userId.toString();
        const likedIndex = post.likedBy.findIndex(id => id.toString() === userId);

        if (likedIndex >= 0) {
            // unlike
            post.likedBy.splice(likedIndex, 1);
            post.likes = Math.max(0, post.likes - 1);
        } else {
            // like
            post.likedBy.push(req.userId);
            post.likes = (post.likes || 0) + 1;

            // notify owner
            if (post.userId.toString() !== req.userId.toString()) {
                const owner = await User.findById(post.userId);
                if (owner) {
                    await owner.addNotification({
                        message: `${req.user.username} liked your post.`,
                        type: 'like',
                        fromUser: req.userId,
                        postId: post._id
                    });
                }
            }
        }

        await post.save();

        // socket emit
        const io = req.app.get('io');
        if (io) io.emit('post_liked', { postId: post._id, likes: post.likes });

        res.json({ likes: post.likes, likedBy: post.likedBy });
    } catch (err) {
        console.error('Like error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Comment
router.post('/:id/comment', auth, async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ error: 'Empty comment' });

        const comment = {
            userId: req.userId,
            username: req.user.username,
            avatar: req.user.avatar,
            text
        };
        post.comments.push(comment);
        await post.save();

        // notify owner
        if (post.userId.toString() !== req.userId.toString()) {
            const owner = await User.findById(post.userId);
            if (owner) {
                await owner.addNotification({
                    message: `${req.user.username} commented: "${text}"`,
                    type: 'comment',
                    fromUser: req.userId,
                    postId: post._id
                });
            }
        }

        // socket emit
        const io = req.app.get('io');
        if (io) io.emit('post_commented', { postId: post._id, comment });

        res.json({ comments: post.comments });
    } catch (err) {
        console.error('Comment error:', err);
        res.status(500).json({ error: err.message });
    }
});

// View increment
router.post('/:id/view', async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // socket emit
        const io = req.app.get('io');
        if (io) io.emit('post_viewed', { postId: post._id, views: post.views });

        res.json({ views: post.views });
    } catch (err) {
        console.error('View increment error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        if (post.userId.toString() !== req.userId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // delete cloudinary if present
        const { cloudinary } = require('../config/cloudinary');
        if (post.filePublicId) {
            try { await cloudinary.uploader.destroy(post.filePublicId, { resource_type: 'auto' }); } catch (e) { console.warn('Cloud destroy failed', e.message); }
        }

        await post.deleteOne();

        // socket emit
        const io = req.app.get('io');
        if (io) io.emit('post_deleted', { postId: post._id });

        res.json({ message: 'Post deleted' });
    } catch (err) {
        console.error('Delete post error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
