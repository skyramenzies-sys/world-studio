// backend/cloudinary.js
// World-Studio.live - Cloudinary Configuration for Media Uploads (UNIVERSE EDITION 🚀)
// Handles images, videos, and audio uploads with automatic optimization

"use strict";

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const isProduction = process.env.NODE_ENV === "production";

// ===========================================
// ENVIRONMENT VALIDATION
// ===========================================
const requiredEnvVars = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
const isCloudinaryConfigured = missingVars.length === 0;

if (!isCloudinaryConfigured) {
    console.error(
        "❌ Cloudinary not fully configured. Missing environment variables:",
        missingVars.join(", ")
    );

    // In productie: hard fail zodat je het meteen merkt
    if (isProduction) {
        throw new Error(
            `Cloudinary environment variables missing: ${missingVars.join(", ")}`
        );
    } else {
        console.warn(
            "⚠️ Cloudinary will be disabled in this environment (non-production). Uploads may fail."
        );
    }
}

// ===========================================
// CLOUDINARY CONFIGURATION
// ===========================================
if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true, // Always use HTTPS
    });

    if (!isProduction) {
        console.log("✅ Cloudinary configured for World-Studio.live");
        console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    }
}

// ===========================================
// UPLOAD LIMITS & ALLOWED TYPES
// ===========================================
const UPLOAD_LIMITS = {
    image: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"],
        folder: "world-studio/images",
    },
    video: {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedTypes: ["video/mp4", "video/webm", "video/quicktime", "video/mov"],
        folder: "world-studio/videos",
    },
    audio: {
        maxSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/ogg",
            "audio/m4a",
            "audio/aac",
        ],
        folder: "world-studio/audio",
    },
    avatar: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
        folder: "world-studio/avatars",
    },
    thumbnail: {
        maxSize: 2 * 1024 * 1024, // 2MB
        allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/jpg"],
        folder: "world-studio/thumbnails",
    },
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Sanitize filename for Cloudinary
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (filename) => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    return sanitized.substring(0, 50);
};

/**
 * Determine resource type from mimetype
 * @param {string} mimetype - File mimetype
 * @returns {string} - Cloudinary resource type
 */
const getResourceType = (mimetype) => {
    if (mimetype.startsWith("image/")) return "image";
    if (mimetype.startsWith("video/")) return "video";
    if (mimetype.startsWith("audio/")) return "video"; // Cloudinary treats audio as video
    return "auto";
};

/**
 * Get folder based on file type
 * @param {string} mimetype - File mimetype
 * @param {string} customFolder - Optional custom folder
 * @returns {string} - Cloudinary folder path
 */
const getFolder = (mimetype, customFolder = null) => {
    if (customFolder) return `world-studio/${customFolder}`;

    if (mimetype.startsWith("image/")) return UPLOAD_LIMITS.image.folder;
    if (mimetype.startsWith("video/")) return UPLOAD_LIMITS.video.folder;
    if (mimetype.startsWith("audio/")) return UPLOAD_LIMITS.audio.folder;
    return "world-studio/uploads";
};

// ===========================================
// CLOUDINARY STORAGE CONFIGURATIONS
// (alleen als Cloudinary geconfigureerd is)
// ===========================================

let generalStorage;
let avatarStorage;
let thumbnailStorage;
let videoStorage;
let audioStorage;

if (isCloudinaryConfigured) {
    /**
     * General purpose storage (images, videos, audio)
     */
    generalStorage = new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => {
            const cleanName = sanitizeFilename(file.originalname);
            const resourceType = getResourceType(file.mimetype);
            const folder = getFolder(file.mimetype, req.body?.folder);

            const params = {
                folder,
                resource_type: resourceType,
                public_id: `${Date.now()}-${cleanName}`,
                allowed_formats: [
                    "jpg",
                    "jpeg",
                    "png",
                    "gif",
                    "webp",
                    "mp4",
                    "webm",
                    "mov",
                    "mp3",
                    "wav",
                    "ogg",
                    "m4a",
                ],
            };

            if (resourceType === "image") {
                params.transformation = [
                    { quality: "auto:good" },
                    { fetch_format: "auto" },
                ];
            }

            if (resourceType === "video") {
                params.eager = [
                    { width: 300, height: 200, crop: "fill", format: "jpg" },
                ];
                params.eager_async = true;
            }

            return params;
        },
    });

    /**
     * Avatar-specific storage (optimized for profile pictures)
     */
    avatarStorage = new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => {
            const userId = req.user?.id || req.user?._id || "unknown";

            return {
                folder: UPLOAD_LIMITS.avatar.folder,
                resource_type: "image",
                public_id: `avatar-${userId}-${Date.now()}`,
                allowed_formats: ["jpg", "jpeg", "png", "webp"],
                transformation: [
                    { width: 400, height: 400, crop: "fill", gravity: "face" },
                    { quality: "auto:good" },
                    { fetch_format: "auto" },
                ],
            };
        },
    });

    /**
     * Thumbnail storage (for live streams, posts)
     */
    thumbnailStorage = new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => {
            const cleanName = sanitizeFilename(file.originalname);

            return {
                folder: UPLOAD_LIMITS.thumbnail.folder,
                resource_type: "image",
                public_id: `thumb-${Date.now()}-${cleanName}`,
                allowed_formats: ["jpg", "jpeg", "png", "webp"],
                transformation: [
                    { width: 640, height: 360, crop: "fill" },
                    { quality: "auto:good" },
                    { fetch_format: "auto" },
                ],
            };
        },
    });

    /**
     * Video storage with optimizations
     */
    videoStorage = new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => {
            const cleanName = sanitizeFilename(file.originalname);

            return {
                folder: UPLOAD_LIMITS.video.folder,
                resource_type: "video",
                public_id: `video-${Date.now()}-${cleanName}`,
                allowed_formats: ["mp4", "webm", "mov"],
                eager: [
                    { width: 640, height: 360, crop: "fill", format: "jpg" },
                    {
                        width: 320,
                        height: 180,
                        crop: "fill",
                        format: "gif",
                        video_sampling: 6,
                    },
                ],
                eager_async: true,
            };
        },
    });

    /**
     * Audio storage
     */
    audioStorage = new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => {
            const cleanName = sanitizeFilename(file.originalname);

            return {
                folder: UPLOAD_LIMITS.audio.folder,
                resource_type: "video", // Cloudinary uses 'video' for audio
                public_id: `audio-${Date.now()}-${cleanName}`,
                allowed_formats: ["mp3", "wav", "ogg", "m4a", "aac"],
            };
        },
    });
} else {
    // Fallback: eenvoudige memory storage zodat backend niet crasht
    // maar uploads zullen server-side verder moeten worden afgehandeld.
    const fallbackStorage = multer.memoryStorage();
    generalStorage = fallbackStorage;
    avatarStorage = fallbackStorage;
    thumbnailStorage = fallbackStorage;
    videoStorage = fallbackStorage;
    audioStorage = fallbackStorage;
}

// ===========================================
// MULTER UPLOAD CONFIGURATIONS
// ===========================================

/**
 * File filter factory
 * @param {string[]} allowedTypes - Array of allowed mimetypes
 * @returns {function} - Multer file filter function
 */
const createFileFilter = (allowedTypes) => {
    return (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`),
                false
            );
        }
    };
};

// General upload (any media type)
const upload = multer({
    storage: generalStorage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
        files: 10, // Max 10 files per request
    },
    fileFilter: (req, file, cb) => {
        const allAllowedTypes = [
            ...UPLOAD_LIMITS.image.allowedTypes,
            ...UPLOAD_LIMITS.video.allowedTypes,
            ...UPLOAD_LIMITS.audio.allowedTypes,
        ];

        if (allAllowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
    },
});

// Avatar upload
const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: UPLOAD_LIMITS.avatar.maxSize,
        files: 1,
    },
    fileFilter: createFileFilter(UPLOAD_LIMITS.avatar.allowedTypes),
});

// Thumbnail upload
const uploadThumbnail = multer({
    storage: thumbnailStorage,
    limits: {
        fileSize: UPLOAD_LIMITS.thumbnail.maxSize,
        files: 1,
    },
    fileFilter: createFileFilter(UPLOAD_LIMITS.thumbnail.allowedTypes),
});

// Video upload
const uploadVideo = multer({
    storage: videoStorage,
    limits: {
        fileSize: UPLOAD_LIMITS.video.maxSize,
        files: 5,
    },
    fileFilter: createFileFilter(UPLOAD_LIMITS.video.allowedTypes),
});

// Audio upload
const uploadAudio = multer({
    storage: audioStorage,
    limits: {
        fileSize: UPLOAD_LIMITS.audio.maxSize,
        files: 5,
    },
    fileFilter: createFileFilter(UPLOAD_LIMITS.audio.allowedTypes),
});

// Image-only upload
const uploadImage = multer({
    storage: generalStorage,
    limits: {
        fileSize: UPLOAD_LIMITS.image.maxSize,
        files: 10,
    },
    fileFilter: createFileFilter(UPLOAD_LIMITS.image.allowedTypes),
});

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw)
 * @returns {Promise<object>} - Deletion result
 */
const deleteFile = async (publicId, resourceType = "image") => {
    if (!isCloudinaryConfigured) {
        throw new Error("Cloudinary is not configured");
    }
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
        return result;
    } catch (error) {
        console.error(`❌ Error deleting from Cloudinary: ${publicId}`, error);
        throw error;
    }
};

/**
 * Delete multiple files from Cloudinary
 * @param {string[]} publicIds - Array of public IDs
 * @param {string} resourceType - Resource type
 * @returns {Promise<object>} - Deletion result
 */
const deleteFiles = async (publicIds, resourceType = "image") => {
    if (!isCloudinaryConfigured) {
        throw new Error("Cloudinary is not configured");
    }
    try {
        const result = await cloudinary.api.delete_resources(publicIds, {
            resource_type: resourceType,
        });
        console.log(`🗑️ Deleted ${publicIds.length} files from Cloudinary`);
        return result;
    } catch (error) {
        console.error("❌ Error deleting files from Cloudinary:", error);
        throw error;
    }
};

/**
 * Get optimized URL for an image
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Transformation options
 * @returns {string} - Optimized URL
 */
const getOptimizedUrl = (publicId, options = {}) => {
    if (!isCloudinaryConfigured) return "";
    const defaultOptions = {
        quality: "auto",
        fetch_format: "auto",
        ...options,
    };

    return cloudinary.url(publicId, defaultOptions);
};

/**
 * Get thumbnail URL for a video
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Transformation options
 * @returns {string} - Thumbnail URL
 */
const getVideoThumbnail = (publicId, options = {}) => {
    if (!isCloudinaryConfigured) return "";
    const defaultOptions = {
        resource_type: "video",
        format: "jpg",
        width: 640,
        height: 360,
        crop: "fill",
        ...options,
    };

    return cloudinary.url(publicId, defaultOptions);
};

/**
 * Upload file directly from URL
 * @param {string} url - Source URL
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
const uploadFromUrl = async (url, options = {}) => {
    if (!isCloudinaryConfigured) {
        throw new Error("Cloudinary is not configured");
    }
    try {
        const result = await cloudinary.uploader.upload(url, {
            folder: options.folder || "world-studio/uploads",
            resource_type: options.resourceType || "auto",
            ...options,
        });
        console.log(`✅ Uploaded from URL: ${result.public_id}`);
        return result;
    } catch (error) {
        console.error("❌ Error uploading from URL:", error);
        throw error;
    }
};

/**
 * Upload file directly from buffer
 * @param {Buffer} buffer - File buffer
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result
 */
const uploadFromBuffer = async (buffer, options = {}) => {
    if (!isCloudinaryConfigured) {
        throw new Error("Cloudinary is not configured");
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder || "world-studio/uploads",
                resource_type: options.resourceType || "auto",
                ...options,
            },
            (error, result) => {
                if (error) {
                    console.error("❌ Error uploading buffer:", error);
                    reject(error);
                } else {
                    console.log(`✅ Uploaded buffer: ${result.public_id}`);
                    resolve(result);
                }
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Get usage statistics
 * @returns {Promise<object>} - Usage stats
 */
const getUsageStats = async () => {
    if (!isCloudinaryConfigured) {
        throw new Error("Cloudinary is not configured");
    }
    try {
        const result = await cloudinary.api.usage();
        return {
            used: result.credits?.used_percent,
            bandwidth: result.bandwidth,
            storage: result.storage,
            transformations: result.transformations,
        };
    } catch (error) {
        console.error("❌ Error getting Cloudinary usage:", error);
        throw error;
    }
};

// ===========================================
// EXPORTS
// ===========================================
module.exports = {
    // Cloudinary instance
    cloudinary,

    // Flag
    isCloudinaryConfigured,

    // Storages
    storage: generalStorage,
    avatarStorage,
    thumbnailStorage,
    videoStorage,
    audioStorage,

    // Multer upload handlers
    upload,
    uploadAvatar,
    uploadThumbnail,
    uploadVideo,
    uploadAudio,
    uploadImage,

    // Utility functions
    deleteFile,
    deleteFiles,
    getOptimizedUrl,
    getVideoThumbnail,
    uploadFromUrl,
    uploadFromBuffer,
    getUsageStats,

    // Constants
    UPLOAD_LIMITS,

    // Helper functions
    sanitizeFilename,
    getResourceType,
    getFolder,
};
