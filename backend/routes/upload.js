// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage, cloudinary } = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');

const multerStorage = storage; // from config
const upload = multer({ storage: multerStorage });

// Upload a file and create a post
router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file || !req.file.path) return res.status(400).json({ error: 'No file uploaded' });

        const { title, description, type, category, isFree, price, isPremium } = req.body;

        const post = new Post({
            userId: req.userId,
            username: req.user.username,
            avatar: req.user.avatar,
            title: title || 'Untitled',
            description: description || '',
            type: type || req.file.mimetype?.startsWith('video') ? 'video' : 'image',
            category: category || 'general',
            fileUrl: req.file.path,
            filePublicId: req.file.filename,
            fileName: req.file.originalname || '',
            fileSize: req.file.size || 0,
            thumbnail: (type === 'video') ? '🎬' : '🖼️',
            isFree: isFree !== undefined ? isFree : true,
            price: price || 0,
            isPremium: isPremium === 'true' || isPremium === true
        });

        await post.save();

        // emit new post
        const io = req.app.get('io');
        if (io) io.emit('new_post', { postId: post._id });

        res.status(201).json({ message: 'Uploaded & post created', post });
    } catch (err) {
        console.error('Upload route error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Upload avatar and update user profile
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file || !req.file.path) return res.status(400).json({ error: 'No file uploaded' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // delete previous avatar if it's a cloudinary public id? we stored URL only; optional.

        user.avatar = req.file.path;
        await user.save();

        res.json({ message: 'Avatar updated', avatar: user.avatar });
    } catch (err) {
        console.error('Avatar upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
