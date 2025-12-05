// backend/routes/upload.js
// World-Studio.live - File Upload Routes
// Handles file uploads via Cloudinary with media processing

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const { upload, cloudinary } = require("../config/cloudinary");
const Post = require("../models/Post");
const User = require("../models/User");

// ===========================================
// CONFIGURATION
// ===========================================

const MAX_FILES = 10;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm"];

const CATEGORIES = [
    "General", "Gaming", "Music", "Art", "Photography",
    "Comedy", "Education", "Sports", "News", "Technology",
    "Lifestyle", "Fashion", "Food", "Travel", "Fitness",
    "Entertainment", "Vlogs", "Tutorials", "Reviews", "Other"
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Determine file type from mimetype
 */
const getFileType = (mimetype) => {
    if (mimetype.startsWith("video")) return "video";
    if (mimetype.startsWith("audio")) return "audio";
    if (mimetype.startsWith("image")) return "image";
    return "file";
};

/**
 * Generate thumbnail URL for video
 */
const generateVideoThumbnail = (publicId) => {
    if (!cloudinary) return null;
    try {
        return cloudinary.url(publicId, {
            resource_type: "video",
            format: "jpg",
            transformation: [
                { width: 480, height: 270, crop: "fill" },
                { start_offset: "auto" }
            ]
        });
    } catch (e) {
        return null;
    }
};

/**
 * Generate blurred thumbnail for premium content
 */
const generateBlurredThumbnail = (publicId, resourceType = "image") => {
    if (!cloudinary) return null;
    try {
        return cloudinary.url(publicId, {
            resource_type: resourceType,
            transformation: [
                { width: 480, height: 270, crop: "fill" },
                { effect: "blur:1000" },
                { quality: 30 }
            ]
        });
    } catch (e) {
        return null;
    }
};

/**
 * Get video duration from Cloudinary
 */
const getVideoDuration = async (publicId) => {
    if (!cloudinary) return null;
    try {
        const result = await cloudinary.api.resource(publicId, {
            resource_type: "video",
            image_metadata: true
        });
        return result.duration || null;
    } catch (e) {
        return null;
    }
};

/**
 * Validate file
 */
const validateFile = (file) => {
    const errors = [];

    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File ${file.originalname} exceeds maximum size of 100MB`);
    }

    const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES];
    if (!allAllowed.includes(file.mimetype)) {
        errors.push(`File type ${file.mimetype} is not supported`);
    }

    return errors;
};

// ===========================================
// UPLOAD ROUTES
// ===========================================

/**
 * POST /api/upload
 * Upload files and create posts
 */
router.post("/", authMiddleware, upload.array("files", MAX_FILES), async (req, res) => {
    try {
        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No files uploaded"
            });
        }

        const {
            title,
            description,
            category = "General",
            tags,
            isFree = true,
            price = 0,
            isPremium = false,
            isExclusive = false,
            visibility = "public",
            allowComments = true,
            allowDownload = false
        } = req.body;

        // Get user info
        const user = await User.findById(req.userId)
            .select("username avatar isVerified");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        const posts = [];
        const errors = [];

        // Process each file
        for (const file of req.files) {
            try {
                // Validate file
                const validationErrors = validateFile(file);
                if (validationErrors.length > 0) {
                    errors.push(...validationErrors);
                    continue;
                }

                const type = getFileType(file.mimetype);

                // Generate thumbnail for videos
                let thumbnail = "";
                let blurredThumbnail = "";
                let duration = null;

                if (type === "video" && file.filename) {
                    thumbnail = generateVideoThumbnail(file.filename);
                    if (!isFree || price > 0) {
                        blurredThumbnail = generateBlurredThumbnail(file.filename, "video");
                    }
                    duration = await getVideoDuration(file.filename);
                }

                if (type === "image" && file.filename && (!isFree || price > 0)) {
                    blurredThumbnail = generateBlurredThumbnail(file.filename, "image");
                }

                // Parse tags
                let parsedTags = [];
                if (tags) {
                    if (typeof tags === "string") {
                        parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
                    } else if (Array.isArray(tags)) {
                        parsedTags = tags;
                    }
                }

                // Create post
                const post = new Post({
                    userId: req.userId,
                    username: user.username,
                    avatar: user.avatar || "",
                    isVerified: user.isVerified || false,
                    title: title?.trim() || "Untitled",
                    description: description?.trim() || "",
                    type,
                    category: CATEGORIES.includes(category) ? category : "General",
                    tags: parsedTags.slice(0, 10),
                    fileUrl: file.path,
                    fileName: file.filename,
                    fileSize: file.size,
                    filePublicId: file.filename,
                    thumbnail,
                    blurredThumbnail,
                    duration,
                    isFree: isFree === true || isFree === "true",
                    price: Math.max(0, parseInt(price) || 0),
                    isPremium: isPremium === true || isPremium === "true",
                    isExclusive: isExclusive === true || isExclusive === "true",
                    visibility,
                    allowComments: allowComments !== false && allowComments !== "false",
                    allowDownload: allowDownload === true || allowDownload === "true",
                    status: "published",
                    likes: 0,
                    likedBy: [],
                    views: 0,
                    comments: [],
                    shares: 0,
                    saves: 0,
                    purchasedBy: []
                });

                const saved = await post.save();
                posts.push(saved);

                // Emit socket event
                const io = req.app.get("io");
                if (io) {
                    io.emit("new_post", {
                        postId: saved._id,
                        userId: req.userId,
                        username: user.username,
                        title: saved.title,
                        type: saved.type,
                        thumbnail: saved.thumbnail
                    });

                    // Notify followers
                    const userDoc = await User.findById(req.userId).select("followers");
                    if (userDoc?.followers?.length > 0) {
                        userDoc.followers.slice(0, 1000).forEach(followerId => {
                            io.to(`user_${followerId}`).emit("following_posted", {
                                userId: req.userId,
                                username: user.username,
                                postId: saved._id,
                                title: saved.title,
                                type: saved.type
                            });
                        });
                    }
                }

                console.log(`📤 Upload: ${type} "${saved.title}" by ${user.username}`);

            } catch (fileError) {
                console.error(`Error processing file ${file.originalname}:`, fileError);
                errors.push(`Failed to process ${file.originalname}: ${fileError.message}`);
            }
        }

        // Update user stats
        if (posts.length > 0) {
            await User.findByIdAndUpdate(req.userId, {
                $inc: { "stats.totalPosts": posts.length }
            });
        }

        // Prepare response
        const response = {
            success: true,
            message: `${posts.length} file(s) uploaded successfully`,
            posts,
            post: posts[0] || null,
            uploaded: posts.length,
            failed: req.files.length - posts.length
        };

        if (errors.length > 0) {
            response.errors = errors;
        }

        res.status(201).json(response);

    } catch (err) {
        console.error("❌ Upload error:", err);
        res.status(500).json({
            success: false,
            error: "Upload failed",
            details: err.message
        });
    }
});

/**
 * POST /api/upload/single
 * Upload a single file
 */
router.post("/single", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No file uploaded"
            });
        }

        const {
            title,
            description,
            category = "General",
            tags,
            isFree = true,
            price = 0,
            isPremium = false,
            visibility = "public"
        } = req.body;

        const user = await User.findById(req.userId)
            .select("username avatar isVerified");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        const file = req.file;
        const type = getFileType(file.mimetype);

        let thumbnail = "";
        let blurredThumbnail = "";
        let duration = null;

        if (type === "video" && file.filename) {
            thumbnail = generateVideoThumbnail(file.filename);
            if (!isFree || price > 0) {
                blurredThumbnail = generateBlurredThumbnail(file.filename, "video");
            }
            duration = await getVideoDuration(file.filename);
        }

        if (type === "image" && file.filename && (!isFree || price > 0)) {
            blurredThumbnail = generateBlurredThumbnail(file.filename, "image");
        }

        let parsedTags = [];
        if (tags) {
            if (typeof tags === "string") {
                parsedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
            } else if (Array.isArray(tags)) {
                parsedTags = tags;
            }
        }

        const post = new Post({
            userId: req.userId,
            username: user.username,
            avatar: user.avatar || "",
            isVerified: user.isVerified || false,
            title: title?.trim() || "Untitled",
            description: description?.trim() || "",
            type,
            category: CATEGORIES.includes(category) ? category : "General",
            tags: parsedTags.slice(0, 10),
            fileUrl: file.path,
            fileName: file.filename,
            fileSize: file.size,
            filePublicId: file.filename,
            thumbnail,
            blurredThumbnail,
            duration,
            isFree: isFree === true || isFree === "true",
            price: Math.max(0, parseInt(price) || 0),
            isPremium: isPremium === true || isPremium === "true",
            visibility,
            status: "published"
        });

        const saved = await post.save();

        await User.findByIdAndUpdate(req.userId, {
            $inc: { "stats.totalPosts": 1 }
        });

        const io = req.app.get("io");
        if (io) {
            io.emit("new_post", {
                postId: saved._id,
                userId: req.userId,
                username: user.username,
                title: saved.title,
                type: saved.type
            });
        }

        console.log(`📤 Single upload: ${type} "${saved.title}" by ${user.username}`);

        res.status(201).json({
            success: true,
            message: "File uploaded successfully",
            post: saved
        });

    } catch (err) {
        console.error("❌ Single upload error:", err);
        res.status(500).json({
            success: false,
            error: "Upload failed",
            details: err.message
        });
    }
});

/**
 * POST /api/upload/avatar
 * Upload user avatar
 */
router.post("/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No file uploaded"
            });
        }

        // Validate image type
        if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: "Only image files are allowed for avatars"
            });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Delete old avatar from Cloudinary if exists
        if (user.avatarPublicId && cloudinary) {
            try {
                await cloudinary.uploader.destroy(user.avatarPublicId);
            } catch (e) {
                console.log("Old avatar cleanup skipped:", e.message);
            }
        }

        // Update user avatar
        user.avatar = req.file.path;
        user.avatarPublicId = req.file.filename;
        await user.save();

        console.log(`🖼️ Avatar updated: ${user.username}`);

        res.json({
            success: true,
            message: "Avatar updated successfully",
            avatar: user.avatar,
            avatarPublicId: user.avatarPublicId
        });

    } catch (err) {
        console.error("❌ Avatar upload error:", err);
        res.status(500).json({
            success: false,
            error: "Avatar upload failed",
            details: err.message
        });
    }
});

/**
 * POST /api/upload/cover
 * Upload user cover/banner image
 */
router.post("/cover", authMiddleware, upload.single("cover"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No file uploaded"
            });
        }

        if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: "Only image files are allowed for cover images"
            });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Delete old cover from Cloudinary if exists
        if (user.coverPublicId && cloudinary) {
            try {
                await cloudinary.uploader.destroy(user.coverPublicId);
            } catch (e) {
                console.log("Old cover cleanup skipped:", e.message);
            }
        }

        user.coverImage = req.file.path;
        user.coverPublicId = req.file.filename;
        await user.save();

        console.log(`🎨 Cover updated: ${user.username}`);

        res.json({
            success: true,
            message: "Cover image updated successfully",
            coverImage: user.coverImage,
            coverPublicId: user.coverPublicId
        });

    } catch (err) {
        console.error("❌ Cover upload error:", err);
        res.status(500).json({
            success: false,
            error: "Cover upload failed",
            details: err.message
        });
    }
});

/**
 * POST /api/upload/stream-thumbnail
 * Upload stream thumbnail/cover
 */
router.post("/stream-thumbnail", authMiddleware, upload.single("thumbnail"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No file uploaded"
            });
        }

        if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: "Only image files are allowed"
            });
        }

        res.json({
            success: true,
            message: "Thumbnail uploaded successfully",
            url: req.file.path,
            publicId: req.file.filename
        });

    } catch (err) {
        console.error("❌ Stream thumbnail upload error:", err);
        res.status(500).json({
            success: false,
            error: "Upload failed",
            details: err.message
        });
    }
});

/**
 * DELETE /api/upload/:publicId
 * Delete uploaded file from Cloudinary
 */
router.delete("/:publicId", authMiddleware, async (req, res) => {
    try {
        const { publicId } = req.params;
        const { resourceType = "image" } = req.query;

        if (!publicId) {
            return res.status(400).json({
                success: false,
                error: "Public ID required"
            });
        }

        if (!cloudinary) {
            return res.status(500).json({
                success: false,
                error: "Cloudinary not configured"
            });
        }

        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });

        if (result.result === "ok" || result.result === "not found") {
            res.json({
                success: true,
                message: "File deleted successfully",
                publicId
            });
        } else {
            res.status(400).json({
                success: false,
                error: "Failed to delete file",
                result
            });
        }

    } catch (err) {
        console.error("❌ Delete file error:", err);
        res.status(500).json({
            success: false,
            error: "Delete failed",
            details: err.message
        });
    }
});

/**
 * GET /api/upload/categories
 * Get available upload categories
 */
router.get("/categories", (req, res) => {
    res.json({
        success: true,
        categories: CATEGORIES
    });
});

/**
 * GET /api/upload/config
 * Get upload configuration
 */
router.get("/config", (req, res) => {
    res.json({
        success: true,
        config: {
            maxFiles: MAX_FILES,
            maxFileSize: MAX_FILE_SIZE,
            maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
            allowedImageTypes: ALLOWED_IMAGE_TYPES,
            allowedVideoTypes: ALLOWED_VIDEO_TYPES,
            allowedAudioTypes: ALLOWED_AUDIO_TYPES,
            categories: CATEGORIES
        }
    });
});

module.exports = router;