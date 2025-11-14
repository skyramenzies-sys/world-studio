const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const Post = require("../models/Post");
const authMiddleware = require("../middleware/authmiddleware");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        return {
            folder: "world-studio/uploads",
            resource_type: "auto",
            public_id: `${Date.now()}-${cleanName}`,
        };
    },
});

const upload = multer({ storage });

// Multi-file upload route (max 10 files per request, adjust as needed)
router.post("/", authMiddleware, upload.array("files", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: "No files uploaded" });

        const { title, description } = req.body;
        const posts = [];

        for (const file of req.files) {
            let mediaType = "image";
            if (file.mimetype.startsWith("video")) mediaType = "video";
            else if (file.mimetype.startsWith("audio")) mediaType = "audio";

            const newPost = new Post({
                authorId: req.userId,
                author: req.user?.username || "Unknown",
                authorPhoto: req.user?.avatar || "",
                content: description || "",
                mediaUrl: file.path,
                mediaType,
                likes: [],
                comments: [],
            });

            const savedPost = await newPost.save();
            posts.push(savedPost);

            // Broadcast each new post over Socket.IO
            if (req.app.get("io")) {
                req.app.get("io").emit("post_created", savedPost);
            }
        }

        res.status(201).json({
            message: "Upload successful",
            posts,
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Upload failed", details: err.message });
    }
});

module.exports = router;