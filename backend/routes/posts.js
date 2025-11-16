// backend/routes/posts.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const User = require("../models/User");

// All posts (public)
router.get("/", async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate("userId", "username avatar");

        const formatted = posts.map((p) => ({
            id: p._id,
            userId: p.userId?._id || p.userId,
            username: p.username || (p.userId ? p.userId.username : "Unknown"),
            avatar: p.avatar || (p.userId ? p.userId.avatar : "/defaults/default-avatar.png"),
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
            timestamp: p.createdAt,
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Fetch posts error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Like / unlike
router.post("/:id/like", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: "Post not found" });

        const already = post.likedBy.some((u) => u.toString() === req.userId.toString());

        if (already) {
            post.likedBy = post.likedBy.filter((u) => u.toString() !== req.userId.toString());
            post.likes = Math.max(0, (post.likes || 0) - 1);
        } else {
            post.likedBy.push(req.userId);
            post.likes = (post.likes || 0) + 1;

            if (post.userId && post.userId.toString() !== req.userId.toString()) {
                const owner = await User.findById(post.userId);
                if (owner && typeof owner.addNotification === "function") {
                    await owner.addNotification({
                        message: `${req.user.username} liked your post "${post.title}"`,
                        type: "like",
                        fromUser: req.userId,
                    });
                }
            }
        }

        await post.save();
        res.json({ likes: post.likes, likedBy: post.likedBy });
    } catch (err) {
        console.error("Like error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Comment
router.post("/:id/comment", authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: "Text required" });

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: "Post not found" });

        const comment = {
            userId: req.userId,
            username: req.user.username,
            avatar: req.user.avatar || "",
            text,
        };

        post.comments.push(comment);
        await post.save();

        res.status(201).json(post.comments[post.comments.length - 1]);
    } catch (err) {
        console.error("Comment error:", err);
        res.status(500).json({ error: err.message });
    }
});

// View counter
router.post("/:id/view", async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!post) return res.status(404).json({ error: "Post not found" });
        res.json({ views: post.views });
    } catch (err) {
        console.error("View error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
