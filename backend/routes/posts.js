// backend/routes/posts.js
// World-Studio.live - Posts API (UNIVERSE EDITION 🌌)

const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { optionalAuth } = require("../middleware/authMiddleware");
const Post = require("../models/Post");


// ===========================================
// HELPER: MAP MONGOOSE → FRONTEND DTO
// ===========================================
function mapPostToDTO(doc, currentUserId = null) {
    if (!doc) return null;

    const likesCount =
        typeof doc.likes === "number"
            ? doc.likes
            : (doc.likedBy?.length || 0);

    const commentsCount =
        doc.commentCount ?? (doc.comments?.length || 0);

    const viewsCount = doc.views ?? 0;

    const savesCount =
        typeof doc.saves === "number"
            ? doc.saves
            : (doc.savedBy?.length || 0);

    const hasLiked = currentUserId
        ? (doc.likedBy || []).some(
            (id) => id.toString() === currentUserId.toString()
        )
        : false;

    const hasSaved = currentUserId
        ? (doc.savedBy || []).some(
            (id) => id.toString() === currentUserId.toString()
        )
        : false;

    const isOwner =
        currentUserId &&
        doc.userId &&
        doc.userId.toString() === currentUserId.toString();

    return {
        // IDs
        _id: doc._id,
        id: doc._id,

        // Basic content
        title: doc.title,
        caption: doc.description, // ✅ PostDetail kan caption gebruiken
        description: doc.description,
        type: doc.type,
        category: doc.category,
        tags: doc.tags || [],

        // Media
        fileUrl: doc.fileUrl,
        mediaUrl: doc.fileUrl, // alias
        thumbnail: doc.thumbnail,
        previewUrl: doc.previewUrl,
        duration: doc.duration,
        aspectRatio: doc.aspectRatio,
        gallery: doc.gallery || [],

        // Author
        userId: doc.userId,
        username: doc.username,
        avatar: doc.avatar,
        author: {
            _id: doc.userId,
            id: doc.userId,
            username: doc.username,
            avatar: doc.avatar,
            isVerified: doc.isVerifiedCreator,
        },

        // Engagement
        likes: doc.likes ?? likesCount,
        likesCount,
        commentsCount,
        views: viewsCount,
        viewsCount,
        shares: doc.shares ?? 0,
        saves: savesCount,
        savesCount,
        uniqueViews: doc.uniqueViews ?? 0,

        hasLiked,
        hasSaved,
        canComment: doc.commentsEnabled !== false,

        // Monetization
        isFree: doc.isFree,
        price: doc.price,
        currency: doc.currency,
        isPremium: doc.isPremium,
        premiumTier: doc.premiumTier,
        isPaid: !doc.isFree && (doc.price || 0) > 0,

        // Status / meta
        status: doc.status,
        visibility: doc.visibility,
        isNSFW: doc.isNSFW,
        ageRestricted: doc.ageRestricted,
        isFeatured: doc.isFeatured,
        isPromoted: doc.isPromoted,
        isAIGenerated: doc.isAIGenerated,

        // Times
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        publishedAt: doc.publishedAt,

        // Ownership
        isOwner,
    };
}

// ===========================================
// GET /api/posts/:id  → Post detail
// ===========================================
router.get("/:id", optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const post = await Post.findById(id);
        if (!post || post.status === "deleted") {
            return res.status(404).json({ error: "Post not found" });
        }

        const dto = mapPostToDTO(post, req.userId || null);
        return res.json(dto);
    } catch (err) {
        console.error("❌ GET /api/posts/:id error:", err);
        return res.status(500).json({
            error: "Failed to load post",
        });

    }
});

// ===========================================
// POST /api/posts/:id/view  → view tracking
// ===========================================
router.post("/:id/view", optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId || null;

        const updated = await Post.incrementViews(id, userId);
        if (!updated) {
            return res.status(404).json({ error: "Post not found" });
        }

        return res.json({
            success: true,
            postId: id,
            views: updated.views,
            uniqueViews: updated.uniqueViews,
        });
    } catch (err) {
        console.error("❌ POST /api/posts/:id/view error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to record view",
        });
    }
});

// ===========================================
// POST /api/posts/:id/like  → toggle like
// ===========================================
router.post("/:id/like", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const result = await Post.toggleLike(id, userId);
        if (!result) {
            return res.status(404).json({ error: "Post not found" });
        }

        return res.json({
            success: true,
            liked: result.liked,
            likes: result.likes,
        });
    } catch (err) {
        console.error("❌ POST /api/posts/:id/like error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to toggle like",
        });
    }
});

module.exports = router;
