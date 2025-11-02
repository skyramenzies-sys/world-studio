const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const auth = require('../middleware/auth');
const Post = require('../models/Post');

// Upload file and create post
router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, description, type } = req.body;

        // Determine thumbnail based on type
        const thumbnails = {
            image: '🖼️',
            video: '🎬',
            audio: '🎵'
        };

        // Create post
        const post = new Post({
            userId: req.userId,
            username: req.user.username,
            avatar: req.user.avatar,
            title,
            description,
            type,
            fileUrl: req.file.path,
            filePublicId: req.file.filename,
            thumbnail: thumbnails[type] || '🖼️'
        });

        await post.save();

        res.status(201).json({
            message: 'File uploaded successfully',
            post: {
                id: post._id,
                userId: post.userId,
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
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get file URL (for displaying in gallery)
router.get('/file/:postId', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({
            fileUrl: post.fileUrl,
            type: post.type
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;