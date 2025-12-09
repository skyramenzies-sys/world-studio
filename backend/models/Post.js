// backend/models/Post.js
// World-Studio.live - Post Model (UNIVERSE EDITION 🌌)

const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
    {
        // Content
        title: { type: String, trim: true, maxLength: 200 },
        description: { type: String, trim: true, maxLength: 2000 },
        type: {
            type: String,
            enum: ["image", "video", "text", "audio", "gallery", "other"],
            default: "video",
        },
        category: { type: String, default: "general", index: true },
        tags: [{ type: String, lowercase: true, trim: true }],

        // Media
        fileUrl: { type: String },
        thumbnail: { type: String },
        previewUrl: { type: String },
        duration: { type: Number, default: 0 }, // seconden
        aspectRatio: { type: String, default: "9:16" },
        gallery: [
            {
                url: String,
                thumbnail: String,
                type: {
                    type: String,
                    enum: ["image", "video"],
                    default: "image",
                },
            },
        ],

        // Author
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        username: { type: String },
        avatar: { type: String },
        isVerifiedCreator: { type: Boolean, default: false },

        // Engagement
        likes: { type: Number, default: 0 },
        likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        views: { type: Number, default: 0 },
        uniqueViews: { type: Number, default: 0 },
        viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        commentCount: { type: Number, default: 0 },
        comments: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                username: String,
                avatar: String,
                text: String,
                createdAt: { type: Date, default: Date.now },
            },
        ],

        shares: { type: Number, default: 0 },

        saves: { type: Number, default: 0 },
        savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        commentsEnabled: { type: Boolean, default: true },

        // Monetization
        isFree: { type: Boolean, default: true },
        price: { type: Number, default: 0 }, // in coins
        currency: { type: String, default: "coins" },
        isPremium: { type: Boolean, default: false },
        premiumTier: { type: String, default: null },

        // Status / visibility
        status: {
            type: String,
            enum: ["draft", "published", "deleted"],
            default: "published",
            index: true,
        },
        visibility: {
            type: String,
            enum: ["public", "followers", "private", "unlisted"],
            default: "public",
        },
        isNSFW: { type: Boolean, default: false },
        ageRestricted: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        isPromoted: { type: Boolean, default: false },
        isAIGenerated: { type: Boolean, default: false },

        // Timing
        publishedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

// Indexen
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ category: 1, createdAt: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ status: 1, visibility: 1 });

// ===========================================
// STATIC: Views bijhouden
// ===========================================


PostSchema.statics.incrementViews = async function (postId, userId = null) {
    if (!mongoose.Types.ObjectId.isValid(postId)) return null;

    const post = await this.findById(postId);
    if (!post) return null;

    post.views = (post.views || 0) + 1;

    if (userId) {
        const alreadyViewed = (post.viewedBy || []).some(
            (id) => id.toString() === userId.toString()
        );
        if (!alreadyViewed) {
            post.uniqueViews = (post.uniqueViews || 0) + 1;
            post.viewedBy = post.viewedBy || [];
            post.viewedBy.unshift(userId);

            // limiter op bv. 1000 unieke viewers
            if (post.viewedBy.length > 1000) {
                post.viewedBy = post.viewedBy.slice(0, 1000);
            }
        }
    }

    await post.save();
    return post;
};

// ===========================================
// STATIC: Like toggelen
// ===========================================
PostSchema.statics.toggleLike = async function (postId, userId) {
    if (!mongoose.Types.ObjectId.isValid(postId) || !userId) return null;

    const post = await this.findById(postId);
    if (!post) return null;

    post.likedBy = post.likedBy || [];

    const idx = post.likedBy.findIndex(
        (id) => id.toString() === userId.toString()
    );

    let liked = false;

    if (idx === -1) {
        // nog niet geliked → like
        post.likedBy.push(userId);
        post.likes = (post.likes || 0) + 1;
        liked = true;
    } else {
        // al geliked → unlike
        post.likedBy.splice(idx, 1);
        post.likes = Math.max(0, (post.likes || 0) - 1);
        liked = false;
    }

    await post.save();

    return {
        liked,
        likes: post.likes,
    };
};

const Post = mongoose.model("Post", PostSchema);

module.exports = Post;
module.exports.Post = Post;
module.exports.PostSchema = PostSchema;
