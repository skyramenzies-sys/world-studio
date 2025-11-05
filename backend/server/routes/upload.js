// routes/upload.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const { cloudinary } = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 🔧 Cloudinary opslag configuratie
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        let folder = 'world-studio/uploads';
        let resource_type = 'auto'; // werkt voor images, videos, pdf, enz.

        return {
            folder,
            resource_type,
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
        };
    },
});

const upload = multer({ storage });

// 📤 Upload + maak nieuwe post
router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, description, type, category, isFree, price } = req.body;

        // Automatische thumbnail emoji op basis van type
        const thumbnails = {
            image: '🖼️',
            video: '🎬',
            audio: '🎵',
            document: '📄',
            other: '📁'
        };

        // Maak nieuwe post aan
        const post = new Post({
            userId: req.userId,
            username: req.user.username,
            avatar: req.user.avatar,
            title: title || 'Untitled Post',
            description: description || '',
            type: type || 'image',
            category: category || 'general',
            fileUrl: req.file.path,
            filePublicId: req.file.filename,
            thumbnail: thumbnails[type] || '🖼️',
            isFree: isFree !== undefined ? isFree : true,
            price: price || 0
        });

        await post.save();

        res.status(201).json({
            message: '✅ File uploaded & post created successfully!',
            post: {
                id: post._id,
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
                timestamp: post.createdAt
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// 📄 Haal een bestand op bij ID
router.get('/file/:postId', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({
            fileUrl: post.fileUrl,
            type: post.type,
            title: post.title
        });
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

module.exports = router;
