// backend/routes/upload.js
// World-Studio.live - File Upload Routes (UNIVERSE EDITION 🚀)
// Handles file uploads via Cloudinary with media processing

const express = require("express");
const router = express.Router();

// ✅ FIX: Renamed to authMiddleware for consistency
const authMiddleware = require("../middleware/auth");

const Post = require("../models/Post");
const User = require("../models/User");

// Cloudinary config (Universe Edition)
const {
    upload,             // general (images / videos / audio)
    uploadAvatar,       // optimized for avatars
    uploadThumbnail,    // optimized for thumbnails / covers
    cloudinary,
    isCloudinaryConfigured,
} = require("../config/cloudinary");

// ===========================================
// CONFIGURATION
// ===========================================

const MAX_FILES = 10;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/jpg",
];

const ALLOWED_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/mov",
    "video/x-msvideo",
];

const ALLOWED_AUDIO_TYPES = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/m4a",
    "audio/aac",
];

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
    if (!mimetype) return "file";
    if (mimetype.startsWith("video")) return "video";
    if (mimetype.startsWith("audio")) return "audio";
    if (mimetype.startsWith("image")) return "image";
    return "file";
};

/**
 * Generate thumbnail URL for video
 */
const generateVideoThumbnail = (publicId) => {
    if (!cloudinary || !publicId || !isCloudinaryConfigured) return null;
    try {
        return cloudinary.url(publicId, {
            resource_type: "video",
            format: "jpg",
            transformation: [
                { width: 480, height: 270, crop: "fill" },
                { start_offset: "auto" },
            ],
        });
    } catch (e) {
        console.log("Video thumbnail generation error:", e.message);
        return null;
    }
};

/**
 * Generate blurred thumbnail for premium/paid content
 */
const generateBlurredThumbnail = (publicId, resourceType = "image") => {
    if (!cloudinary || !publicId || !isCloudinaryConfigured) return null;
    try {
        return cloudinary.url(publicId, {
            resource_type: resourceType,
            transformation: [
                { width: 480, height: 270, crop: "fill" },
                { effect: "blur:1000" },
                { quality: 30 },
            ],
        });
    } catch (e) {
        console.log("Blurred thumbnail generation error:", e.message);
        return null;
    }
};

/**
 * Get video duration from Cloudinary
 */
const getVideoDuration = async (publicId) => {
    if (!cloudinary || !publicId || !isCloudinaryConfigured) return null;
    try {
        const result = await cloudinary.api.resource(publicId, {
            resource_type: "video",
            image_metadata: true,
        });
        return result.duration || null;
    } catch (e) {
        console.log("Get video duration error:", e.message);
        return null;
    }
};

/**
 * Validate file
 */
const validateFile = (file) => {
    const errors = [];

    if (!file) {
        errors.push("No file received");
        return errors;
    }

    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File ${file.originalname} exceeds maximum size of 100MB`);
    }

    const allAllowed = [
        ...ALLOWED_IMAGE_TYPES,
        ...ALLOWED_VIDEO_TYPES,
        ...ALLOWED_AUDIO_TYPES,
    ];

    if (!allAllowed.includes(file.mimetype)) {
        errors.push(`File type ${file.mimetype} is not supported`);
    }

    return errors;
};

/**
 * Normalize price & isFree so it matches posts.js logic
 */
const normalizePricing = (isFreeRaw, priceRaw) => {
    const numericPrice = Math.max(0, parseInt(priceRaw, 10) || 0);
    const requestedFree = isFreeRaw === true || isFreeRaw === "true";

    // Betaald content wint altijd als er een prijs > 0 is
    const isFree = numericPrice > 0 ? false : requestedFree;

    return { price: numericPrice, isFree };
};

/**
 * Parse tags from string/array
 */
const parseTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.filter(Boolean);
    if (typeof tags === "string") {
        return tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
    }
    return [];
};

// ===========================================
// UPLOAD ROUTES
// ===========================================

/**
 * POST /api/upload
 * Upload multiple files and create posts
 */
router.post(
    "/",
    authMiddleware,
    upload.array("files", MAX_FILES),
    async (req, res) => {
        try {
            // Check if files were uploaded
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "No files uploaded",
                });
            }

            if (req.files.length > MAX_FILES) {
                return res.status(400).json({
                    success: false,
                    error: `Maximum ${MAX_FILES} files allowed per upload`,
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
                allowDownload = false,
            } = req.body;

            // Normalize pricing
            const { price: normalizedPrice, isFree: normalizedIsFree } =
                normalizePricing(isFree, price);

            // Get user info
            const user = await User.findById(req.userId).select(
                "username avatar isVerified followers stats"
            );
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }

            const parsedTags = parseTags(tags).slice(0, 10);
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

                    // Generate thumbnails & duration
                    let thumbnail = "";
                    let blurredThumbnail = "";
                    let duration = null;

                    const isPaid =
                        normalizedPrice > 0 && normalizedIsFree === false;

                    // In CloudinaryStorage zit:
                    // - file.path = secure_url
                    // - file.filename = public_id
                    const publicId = file.filename;

                    if (type === "video" && publicId) {
                        thumbnail = generateVideoThumbnail(publicId);
                        if (isPaid) {
                            blurredThumbnail = generateBlurredThumbnail(
                                publicId,
                                "video"
                            );
                        }
                        duration = await getVideoDuration(publicId);
                    }

                    if (type === "image" && publicId && isPaid) {
                        blurredThumbnail = generateBlurredThumbnail(
                            publicId,
                            "image"
                        );
                    }

                    // Create post
                    const post = new Post({
                        userId: req.userId,
                        username: user.username,
                        avatar: user.avatar || "",
                        isVerified: user.isVerified || false,

                        title:
                            title?.trim()?.substring(0, 200) || "Untitled",
                        description:
                            description
                                ?.trim()
                                ?.substring(0, 2000) || "",
                        type,
                        category: CATEGORIES.includes(category)
                            ? category
                            : "General",
                        tags: parsedTags,

                        fileUrl: file.path, // secure_url from Cloudinary
                        fileName: file.originalname || "",
                        fileSize: file.size,
                        filePublicId: publicId,

                        thumbnail,
                        blurredThumbnail,
                        duration,

                        isFree: !isPaid,
                        price: normalizedPrice,
                        isPremium:
                            isPremium === true || isPremium === "true",
                        isExclusive:
                            isExclusive === true ||
                            isExclusive === "true",

                        visibility,
                        allowComments:
                            allowComments !== false &&
                            allowComments !== "false",
                        allowDownload:
                            allowDownload === true ||
                            allowDownload === "true",

                        status: "published",
                        likes: 0,
                        likedBy: [],
                        views: 0,
                        comments: [],
                        shares: 0,
                        saves: 0,
                        purchasedBy: [],
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
                            thumbnail: saved.thumbnail,
                        });

                        // Notify followers
                        if (user.followers && user.followers.length > 0) {
                            user.followers
                                .slice(0, 1000)
                                .forEach((followerId) => {
                                    io.to(`user_${followerId}`).emit(
                                        "following_posted",
                                        {
                                            userId: req.userId,
                                            username: user.username,
                                            postId: saved._id,
                                            title: saved.title,
                                            type: saved.type,
                                        }
                                    );
                                });
                        }
                    }

                    console.log(
                        `📤 Upload: ${type} "${saved.title}" by ${user.username}`
                    );
                } catch (fileError) {
                    console.error(
                        `Error processing file ${file.originalname}:`,
                        fileError
                    );
                    errors.push(
                        `Failed to process ${file.originalname}: ${fileError.message}`
                    );
                }
            }

            // Update user stats
            if (posts.length > 0) {
                await User.findByIdAndUpdate(req.userId, {
                    $inc: { "stats.totalPosts": posts.length },
                });
            }

            // Prepare response
            const response = {
                success: true,
                message: `${posts.length} file(s) uploaded successfully`,
                posts,
                post: posts[0] || null,
                uploaded: posts.length,
                failed: req.files.length - posts.length,
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
                details: err.message,
            });
        }
    }
);

/**
 * POST /api/upload/single
 * Upload a single file and create post
 */
router.post(
    "/single",
    authMiddleware,
    upload.single("file"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "No file uploaded",
                });
            }

            // Validate file
            const validationErrors = validateFile(req.file);
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid file",
                    errors: validationErrors,
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
                visibility = "public",
            } = req.body;

            const { price: normalizedPrice, isFree: normalizedIsFree } =
                normalizePricing(isFree, price);
            const isPaid =
                normalizedPrice > 0 && normalizedIsFree === false;

            const user = await User.findById(req.userId).select(
                "username avatar isVerified followers stats"
            );
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }

            const file = req.file;
            const type = getFileType(file.mimetype);

            let thumbnail = "";
            let blurredThumbnail = "";
            let duration = null;

            const publicId = file.filename;

            if (type === "video" && publicId) {
                thumbnail = generateVideoThumbnail(publicId);
                if (isPaid) {
                    blurredThumbnail = generateBlurredThumbnail(
                        publicId,
                        "video"
                    );
                }
                duration = await getVideoDuration(publicId);
            }

            if (type === "image" && publicId && isPaid) {
                blurredThumbnail = generateBlurredThumbnail(
                    publicId,
                    "image"
                );
            }

            const parsedTags = parseTags(tags).slice(0, 10);

            const post = new Post({
                userId: req.userId,
                username: user.username,
                avatar: user.avatar || "",
                isVerified: user.isVerified || false,

                title: title?.trim()?.substring(0, 200) || "Untitled",
                description:
                    description?.trim()?.substring(0, 2000) || "",
                type,
                category: CATEGORIES.includes(category)
                    ? category
                    : "General",
                tags: parsedTags,

                fileUrl: file.path,
                fileName: file.originalname || "",
                fileSize: file.size,
                filePublicId: publicId,

                thumbnail,
                blurredThumbnail,
                duration,

                isFree: !isPaid,
                price: normalizedPrice,
                isPremium:
                    isPremium === true || isPremium === "true",

                visibility,
                status: "published",
                likes: 0,
                likedBy: [],
                views: 0,
                comments: [],
                shares: 0,
                saves: 0,
                purchasedBy: [],
            });

            const saved = await post.save();

            await User.findByIdAndUpdate(req.userId, {
                $inc: { "stats.totalPosts": 1 },
            });

            const io = req.app.get("io");
            if (io) {
                io.emit("new_post", {
                    postId: saved._id,
                    userId: req.userId,
                    username: user.username,
                    title: saved.title,
                    type: saved.type,
                    thumbnail: saved.thumbnail,
                });

                if (user.followers && user.followers.length > 0) {
                    user.followers.slice(0, 1000).forEach((followerId) => {
                        io.to(`user_${followerId}`).emit(
                            "following_posted",
                            {
                                userId: req.userId,
                                username: user.username,
                                postId: saved._id,
                                title: saved.title,
                                type: saved.type,
                            }
                        );
                    });
                }
            }

            console.log(
                `📤 Single upload: ${type} "${saved.title}" by ${user.username}`
            );

            res.status(201).json({
                success: true,
                message: "File uploaded successfully",
                post: saved,
            });
        } catch (err) {
            console.error("❌ Single upload error:", err);
            res.status(500).json({
                success: false,
                error: "Upload failed",
                details: err.message,
            });
        }
    }
);

/**
 * POST /api/upload/avatar
 * Upload user avatar (optimized storage)
 */
router.post(
    "/avatar",
    authMiddleware,
    uploadAvatar.single("avatar"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "No file uploaded",
                });
            }

            if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    error: "Only image files are allowed for avatars",
                });
            }

            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }

            // Delete old avatar from Cloudinary if exists
            if (user.avatarPublicId && isCloudinaryConfigured) {
                try {
                    await cloudinary.uploader.destroy(user.avatarPublicId);
                } catch (e) {
                    console.log("Old avatar cleanup skipped:", e.message);
                }
            }

            // CloudinaryStorage => file.path (secure_url), file.filename (public_id)
            user.avatar = req.file.path;
            user.avatarPublicId = req.file.filename;
            await user.save();

            console.log(`🖼️ Avatar updated: ${user.username}`);

            res.json({
                success: true,
                message: "Avatar updated successfully",
                avatar: user.avatar,
                avatarPublicId: user.avatarPublicId,
            });
        } catch (err) {
            console.error("❌ Avatar upload error:", err);
            res.status(500).json({
                success: false,
                error: "Avatar upload failed",
                details: err.message,
            });
        }
    }
);

/**
 * POST /api/upload/cover
 * Upload user cover/banner image
 */
router.post(
    "/cover",
    authMiddleware,
    uploadThumbnail.single("cover"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "No file uploaded",
                });
            }

            if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    error: "Only image files are allowed for cover images",
                });
            }

            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: "User not found",
                });
            }

            // Delete old cover from Cloudinary if exists
            if (user.coverPublicId && isCloudinaryConfigured) {
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
                coverPublicId: user.coverPublicId,
            });
        } catch (err) {
            console.error("❌ Cover upload error:", err);
            res.status(500).json({
                success: false,
                error: "Cover upload failed",
                details: err.message,
            });
        }
    }
);

/**
 * POST /api/upload/stream-thumbnail
 * Upload stream thumbnail/cover
 */
router.post(
    "/stream-thumbnail",
    authMiddleware,
    uploadThumbnail.single("thumbnail"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "No file uploaded",
                });
            }

            if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    error: "Only image files are allowed",
                });
            }

            res.json({
                success: true,
                message: "Thumbnail uploaded successfully",
                url: req.file.path,
                publicId: req.file.filename,
            });
        } catch (err) {
            console.error("❌ Stream thumbnail upload error:", err);
            res.status(500).json({
                success: false,
                error: "Upload failed",
                details: err.message,
            });
        }
    }
);

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
                error: "Public ID required",
            });
        }

        if (!cloudinary || !isCloudinaryConfigured) {
            return res.status(500).json({
                success: false,
                error: "Cloudinary not configured",
            });
        }


        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });

        if (result.result === "ok" || result.result === "not found") {
            res.json({
                success: true,
                message: "File deleted successfully",
                publicId,
            });
        } else {
            res.status(400).json({
                success: false,
                error: "Failed to delete file",
                result,
            });
        }

    } catch (err) {
        console.error("❌ Delete file error:", err);
        res.status(500).json({
            success: false,
            error: "Delete failed",
            details: err.message,
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
        categories: CATEGORIES,
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
            categories: CATEGORIES,
            cloudinaryConfigured: isCloudinaryConfigured,
        },
    });
});

module.exports = router;
