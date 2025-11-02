const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');

// Get all posts
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'username avatar');

        const formattedPosts = posts.map(post => ({
            id: post._id,
            userId: post.userId._id,
            username: post.username,
            avatar: post.avatar,
            title: post.title,
            description: post.description,
            type: post.type,
            fileUrl: post.fileUrl,
            thumbnail: post.thumbnail,
            likes: post.likes,
            views: post.views,
            comments: post.comments,
            likedBy: post.likedBy,
            timestamp: post.createdAt
        }));

        res.json(formattedPosts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Like post
router.post('/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const alreadyLiked = post.likedBy.includes(req.userId);

        if (alreadyLiked) {
            post.likes -= 1;
            post.likedBy = post.likedBy.filter(id => !id.equals(req.userId));
        } else {
            post.likes += 1;
            post.likedBy.push(req.userId);
        }

        await post.save();

        res.json({
            likes: post.likes,
            likedBy: post.likedBy
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add comment
router.post('/:id/comment', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const comment = {
            userId: req.userId,
            username: req.user.username,
            avatar: req.user.avatar,
            text: req.body.text
        };

        post.comments.push(comment);
        await post.save();

        res.json({
            comments: post.comments
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Increment views
router.post('/:id/view', auth, async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({ views: post.views });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if user owns the post or is admin
        if (!post.userId.equals(req.userId) && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Delete from Cloudinary
        const { cloudinary } = require('../config/cloudinary');
        await cloudinary.uploader.destroy(post.filePublicId);

        await post.deleteOne();

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;