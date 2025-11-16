const express = require("express");
const router = express.Router();
const { upload } = require("../cloudinary");
const Post = require("../models/Post");
const authMiddleware = require("../middleware/authMiddleware");

// Multi-file upload (max 10)
router.post("/", authMiddleware, upload.array("files", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        const { title, description, category, isFree, price, isPremium } = req.body;
        const posts = [];

        for (const file of req.files) {
            let type = "image";
            if (file.mimetype.startsWith("video")) type = "video";
            else if (file.mimetype.startsWith("audio")) type = "audio";

            const post = new Post({
                userId: req.userId,
                username: req.user.username,
                avatar: req.user.avatar || "",
                title: title || "Untitled",
                description: description || "",
                type,
                category: category || "general",
                fileUrl: file.path,
                fileName: file.filename,
                fileSize: file.size,
                filePublicId: file.filename,
                thumbnail: "",
                isFree: isFree !== undefined ? isFree : true,
                price: price || 0,
                isPremium: isPremium || false,
            });

            const saved = await post.save();
            posts.push(saved);

            const io = req.app.get("io");
            if (io) io.emit("new_post", { postId: saved._id });
        }

        res.status(201).json({
            message: "Upload successful",
            posts,
            post: posts[0] || null, // zodat frontend .post kan lezen
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Upload failed", details: err.message });
    }
});

module.exports = router;
