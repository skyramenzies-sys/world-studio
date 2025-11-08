// backend/routes/upload.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const Post = require("../models/Post");
const auth = require("../middleware/auth");

// ✅ Configureer Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Configureer Multer Storage
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        let folder = "world-studio/uploads";
        let resource_type = "image";

        if (file.mimetype.startsWith("video")) resource_type = "video";
        if (file.mimetype.startsWith("audio")) resource_type = "auto";

        return {
            folder,
            resource_type,
            public_id: `${Date.now()}-${file.originalname}`,
        };
    },
});

const upload = multer({ storage });

// ✅ Upload route
router.post("/", auth, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const { title, description, type } = req.body;

        // Maak de nieuwe post
        const newPost = new Post({
            authorId: req.userId,
            author: req.user?.username || "Unknown",
            authorPhoto: req.user?.avatar || "",
            content: description || "",
            mediaUrl: req.file.path,
            mediaType: type || "image",
            likes: [],
            comments: [],
        });

        const savedPost = await newPost.save();

        // ✅ Socket.IO broadcast (via global io instance)
        if (req.app.get("io")) {
            req.app.get("io").emit("post_created", savedPost);
        }

        res.status(201).json({
            message: "Upload successful",
            post: savedPost,
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Upload failed", details: err.message });
    }
});

module.exports = router;
