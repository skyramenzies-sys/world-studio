// backend/routes/posts.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const User = require("../models/User");

// Helper: format output
const formatPost = (p) => ({
    id: p._id,
    userId: p.userId,
    username: p.username,
    avatar: p.avatar,
    title: p.title,
    description: p.description,
    type: p.type,
    category: p.category,
    fileUrl: p.fileUrl,
    thumbnail: p.thumbnail,
    likes: p.likes,
    views: p.views,
    comments: p.comments,
    timestamp: p.createdAt,
});

// =========================
// GET: All posts public
// /api/posts
// =========================
router.get("/", async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate("userId", "username avatar")
            .lean();

        const formatted = posts.map((p) =>
            formatPost({
                ...p,
                username: p.username || p.userId?.username || "Unknown",
                avatar: p.avatar || p.userId?.avatar || "/defaults/default-avatar.png",
            })
        );

        res.json(formatted);

    } catch (err) {
        console.error("Fetch posts error:", err);
        res.status(500).json({ error: "Failed to fetch posts." });
    }
});

// =========================
// POST: Create new post
// /api/posts
// =========================
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            title,
            description,
            type,
            category,
            fileUrl,
            fileName,
            fileSize,
            filePublicId,
            isFree,
            price,
            isPremium,
            thumbnail,
        } = req.body;

        if (!fileUrl)
            return res.status(400).json({ error: "fileUrl is required" });

        const newPost = new Post({
            userId: req.userId,
            username: req.user.username,
            avatar: req.user.avatar,
            title: title || "Untitled",
            description: description || "",
            type: type || "image",
            category: category || "general",
            fileUrl,
            fileName: fileName || "",
            fileSize: fileSize || 0,
            filePublicId: filePublicId || "",
            thumbnail: thumbnail || "",
            isFree: isFree !== undefined ? isFree : true,
            price: price || 0,
            isPremium: isPremium || false,
        });

        await newPost.save();

        // Realtime event
        const io = req.app.get("io");
        if (io) io.emit("new_post", { postId: newPost._id });

        res.status(201).json(formatPost(newPost.toObject()));

    } catch (err) {
        console.error("Create post error:", err);
        res.status(500).json({ error: "Failed to create post." });
    }
});

module.exports = router;
