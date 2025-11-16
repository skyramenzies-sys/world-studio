// backend/routes/upload.js
"use strict";

const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const Post = require("../models/Post");
const authMiddleware = require("../middleware/authMiddleware");

// ---------------------------------------------------
// 1. Validate Cloudinary env
// ---------------------------------------------------
if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    console.error("❌ Missing Cloudinary environment variables");
    throw new Error("Cloudinary configuration missing");
}

// ---------------------------------------------------
// 2. Configure Cloudinary
// ---------------------------------------------------
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------------------------------------------
// 3. Multer + Cloudinary Storage
// ---------------------------------------------------
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const cleanName = file.originalname
            .replace(/[^a-zA-Z0-9.\-_]/g, "_")
            .toLowerCase();

        return {
            folder: "world-studio/uploads",
            resource_type: "auto",
            public_id: `${Date.now()}-${cleanName}`,
        };
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB safety limit
});

// ---------------------------------------------------
// 4. Multi-file Upload Route (max 10 files)
// ---------------------------------------------------
router.post("/", authMiddleware, upload.array("files", 10), async (req, res) => {
    try {
        // Validation
        if (!req.files || req.files.length === 0)
            return res.status(400).json({ error: "No files uploaded" });

        const { title = "Untitled", description = "" } = req.body;

        const posts = [];

        for (const file of req.files) {
            // Determine media type
            let mediaType = "image";
            if (file.mimetype.startsWith("video")) mediaType = "video";
            if (file.mimetype.startsWith("audio")) mediaType = "audio";

            // Create post
            const newPost = new Post({
                userId: req.userId,
                username: req.user?.username || "Unknown",
                avatar: req.user?.avatar || "",
                title,
                description,
                type: mediaType,
                fileUrl: file.path,
                thumbnail: file.path, // you can replace with real thumbnail generator
                likes: 0,
                likedBy: [],
                views: 0,
                comments: [],
            });

            const savedPost = await newPost.save();
            posts.push(savedPost);

            // Socket.io broadcast
            const io = req.app.get("io");
            if (io) io.emit("new_post", savedPost);
        }

        return res.status(201).json({
            message: "Upload successful",
            count: posts.length,
            posts,
        });

    } catch (err) {
        console.error("❌ Upload error:", err);
        return res.status(500).json({
            error: "Upload failed",
            details: err.message,
        });
    }
});

module.exports = router;
