// backend/models/Post.js
// World-Studio.live - Post Model
// Handles all user-generated content: images, videos, audio, and sellable content

const mongoose = require("mongoose");

// ===========================================
// SUB-SCHEMAS
// ===========================================

/**
 * Comment Schema - Comments on posts
 */
const CommentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    username: {
        type: String,
        required: true
    },
    avatar: String,
    text: {
        type: String,
        required: true,
        maxLength: 1000,
        trim: true
    },

    // Reply to another comment
    replyTo: {
        commentId: { type: mongoose.Schema.Types.ObjectId },
        username: String
    },

    // Likes on comment
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    // Moderation
    isHidden: {
        type: Boolean,
        default: false
    },
    hiddenReason: String,

    // Pinned by post owner
    isPinned: {
        type: Boolean,
        default: false
    },

    // Heart/like from creator
    isHearted: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    editedAt: Date
}, { _id: true });

/**
 * Purchase Record Schema - Track who bought the content
 */
const PurchaseRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    username: String,
    purchasedAt: {
        type: Date,
        default: Date.now
    },
    price: Number,
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction"
    }
}, { _id: false });

/**
 * Tag Schema - For content discovery
 */
const TagSchema = new mongoose.Schema({
    name: {
        type: String,
        lowercase: true,
        trim: true
    },
    count: {
        type: Number,
        default: 1
    }
}, { _id: false });

// ===========================================
// MAIN POST SCHEMA
// ===========================================
const PostSchema = new mongoose.Schema({
    // Author Information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    username: {
        type: String,
        required: true
    },
    avatar: String,
    isVerifiedCreator: {
        type: Boolean,
        default: false
    },

    // Content Details
    title: {
        type: String,
        default: "Untitled",
        maxLength: 100,
        trim: true
    },
    description: {
        type: String,
        default: "",
        maxLength: 2000,
        trim: true
    },

    // Content Type
    type: {
        type: String,
        enum: ["image", "video", "audio", "gallery"],
        default: "image",
        index: true
    },

    // Category & Tags
    category: {
        type: String,
        default: "general",
        lowercase: true,
        index: true
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],

    // Primary File
    fileUrl: {
        type: String,
        required: true
    },
    fileName: String,
    fileSize: {
        type: Number,
        default: 0
    },
    filePublicId: String, // Cloudinary public ID
    fileMimeType: String,

    // Media-specific metadata
    duration: Number, // For video/audio (seconds)
    width: Number,    // For images/videos
    height: Number,   // For images/videos
    aspectRatio: String,

    // Thumbnail/Preview
    thumbnail: String,
    thumbnailPublicId: String,
    previewUrl: String, // Low-quality preview for paid content
    previewGif: String, // For videos

    // Gallery (multiple files)
    gallery: [{
        url: String,
        publicId: String,
        type: { type: String, enum: ["image", "video"] },
        thumbnail: String,
        order: Number
    }],

    // Engagement Stats
    likes: {
        type: Number,
        default: 0,
        min: 0
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    views: {
        type: Number,
        default: 0,
        min: 0
    },
    uniqueViews: {
        type: Number,
        default: 0
    },
    viewedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    shares: {
        type: Number,
        default: 0
    },
    saves: {
        type: Number,
        default: 0
    },
    savedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    // Comments
    comments: [CommentSchema],
    commentCount: {
        type: Number,
        default: 0
    },
    commentsEnabled: {
        type: Boolean,
        default: true
    },

    // Monetization
    isFree: {
        type: Boolean,
        default: true,
        index: true
    },
    price: {
        type: Number,
        default: 0,
        min: 0,
        max: 999900 // Max $9999
    },
    currency: {
        type: String,
        default: "USD"
    },

    // License Type (for sellable content)
    licenseType: {
        type: String,
        enum: ["personal", "commercial", "exclusive", "free"],
        default: "free"
    },
    allowCommercialUse: {
        type: Boolean,
        default: false
    },

    // Purchase tracking
    purchasedBy: [PurchaseRecordSchema],
    purchaseCount: {
        type: Number,
        default: 0
    },
    totalEarnings: {
        type: Number,
        default: 0
    },

    // Premium/Subscription Content
    isPremium: {
        type: Boolean,
        default: false,
        index: true
    },
    premiumTier: {
        type: String,
        enum: ["free", "basic", "pro", "vip"],
        default: "free"
    },
    subscribersOnly: {
        type: Boolean,
        default: false
    },

    // Visibility & Status
    status: {
        type: String,
        enum: ["draft", "published", "scheduled", "archived", "deleted", "flagged"],
        default: "published",
        index: true
    },
    visibility: {
        type: String,
        enum: ["public", "followers", "subscribers", "private", "unlisted"],
        default: "public"
    },
    scheduledFor: Date,
    publishedAt: {
        type: Date,
        default: Date.now
    },

    // Age Restriction
    isNSFW: {
        type: Boolean,
        default: false
    },
    ageRestricted: {
        type: Boolean,
        default: false
    },
    contentWarning: String,

    // Featured/Promoted
    isFeatured: {
        type: Boolean,
        default: false,
        index: true
    },
    featuredUntil: Date,
    isPromoted: {
        type: Boolean,
        default: false
    },
    promotedUntil: Date,

    // Location (optional)
    location: {
        name: String,
        lat: Number,
        lng: Number
    },

    // Moderation
    isReported: {
        type: Boolean,
        default: false
    },
    reportCount: {
        type: Number,
        default: 0
    },
    reports: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
        details: String,
        createdAt: { type: Date, default: Date.now }
    }],
    moderationStatus: {
        type: String,
        enum: ["pending", "approved", "rejected", "under_review"],
        default: "approved"
    },
    moderationNotes: String,

    // AI-generated content flag
    isAIGenerated: {
        type: Boolean,
        default: false
    },

    // SEO
    slug: {
        type: String,
        unique: true,
        sparse: true
    },
    metaDescription: String,

    // Analytics
    engagementRate: {
        type: Number,
        default: 0
    },
    lastEngagement: Date,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===========================================
// INDEXES
// ===========================================
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ category: 1, status: 1, createdAt: -1 });
PostSchema.index({ type: 1, status: 1 });
PostSchema.index({ isFree: 1, status: 1 });
PostSchema.index({ isPremium: 1, status: 1 });
PostSchema.index({ isFeatured: 1, status: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ likes: -1 });
PostSchema.index({ views: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ publishedAt: -1 });

// Text search index
PostSchema.index({
    title: "text",
    description: "text",
    tags: "text",
    username: "text"
});

// Compound indexes for feed queries
PostSchema.index({ status: 1, visibility: 1, publishedAt: -1 });
PostSchema.index({ userId: 1, status: 1, publishedAt: -1 });

// ===========================================
// VIRTUALS
// ===========================================

// Post URL
PostSchema.virtual("postUrl").get(function () {
    return `https://world-studio.live/post/${this._id}`;
});

// Is post paid content
PostSchema.virtual("isPaid").get(function () {
    return !this.isFree && this.price > 0;
});

// Format price
PostSchema.virtual("formattedPrice").get(function () {
    if (this.isFree) return "Free";
    return `$${(this.price / 100).toFixed(2)}`;
});

// Engagement score (for ranking)
PostSchema.virtual("engagementScore").get(function () {
    return (this.likes * 2) + (this.comments?.length || 0) + (this.shares * 3) + (this.saves * 2);
});

// Is recently posted
PostSchema.virtual("isRecent").get(function () {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.createdAt > dayAgo;
});

// Duration formatted (for video/audio)
PostSchema.virtual("durationFormatted").get(function () {
    if (!this.duration) return null;
    const minutes = Math.floor(this.duration / 60);
    const seconds = Math.floor(this.duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// ===========================================
// PRE-SAVE MIDDLEWARE
// ===========================================
PostSchema.pre("save", function (next) {
    // Update comment count
    this.commentCount = this.comments?.filter(c => !c.isHidden).length || 0;

    // Update purchase count
    this.purchaseCount = this.purchasedBy?.length || 0;

    // Update unique views
    this.uniqueViews = this.viewedBy?.length || 0;

    // Generate slug if not set
    if (!this.slug && this.title) {
        const baseSlug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .substring(0, 50);
        this.slug = `${baseSlug}-${this._id}`;
    }

    // Calculate engagement rate
    if (this.views > 0) {
        const engagements = this.likes + this.commentCount + this.shares + this.saves;
        this.engagementRate = Math.round((engagements / this.views) * 100);
    }

    this.updatedAt = new Date();
    next();
});

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Get feed posts with pagination
 */
PostSchema.statics.getFeed = async function (options = {}) {
    const {
        userId,
        category,
        type,
        isFree,
        isPremium,
        sortBy = "recent",
        limit = 20,
        skip = 0,
        followingIds = []
    } = options;

    const query = {
        status: "published",
        visibility: "public"
    };

    if (userId) query.userId = userId;
    if (category && category !== "all") query.category = category;
    if (type && type !== "all") query.type = type;
    if (isFree !== undefined) query.isFree = isFree;
    if (isPremium !== undefined) query.isPremium = isPremium;
    if (followingIds?.length > 0) query.userId = { $in: followingIds };

    const sortOptions = {
        recent: { publishedAt: -1 },
        popular: { likes: -1, views: -1 },
        trending: { engagementRate: -1, publishedAt: -1 },
        views: { views: -1 }
    };

    return this.find(query)
        .sort(sortOptions[sortBy] || { publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username avatar isVerified")
        .select("-comments -purchasedBy -viewedBy -reports")
        .lean();
};

/**
 * Get trending posts
 */
PostSchema.statics.getTrending = async function (limit = 20, timeframe = "week") {
    const timeFilters = {
        day: new Date(Date.now() - 24 * 60 * 60 * 1000),
        week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };

    return this.find({
        status: "published",
        visibility: "public",
        publishedAt: { $gte: timeFilters[timeframe] || timeFilters.week }
    })
        .sort({ engagementRate: -1, likes: -1, views: -1 })
        .limit(limit)
        .populate("userId", "username avatar isVerified")
        .select("-comments -purchasedBy -viewedBy -reports")
        .lean();
};

/**
 * Get shop items (paid content)
 */
PostSchema.statics.getShopItems = async function (options = {}) {
    const { category, type, minPrice, maxPrice, sortBy = "recent", limit = 20, skip = 0 } = options;

    const query = {
        status: "published",
        visibility: "public",
        isFree: false,
        price: { $gt: 0 }
    };

    if (category && category !== "all") query.category = category;
    if (type && type !== "all") query.type = type;
    if (minPrice) query.price = { ...query.price, $gte: minPrice };
    if (maxPrice) query.price = { ...query.price, $lte: maxPrice };

    const sortOptions = {
        recent: { publishedAt: -1 },
        popular: { purchaseCount: -1 },
        priceAsc: { price: 1 },
        priceDesc: { price: -1 }
    };

    return this.find(query)
        .sort(sortOptions[sortBy] || { publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username avatar isVerified")
        .select("-comments -purchasedBy -viewedBy -reports")
        .lean();
};

/**
 * Search posts
 */
PostSchema.statics.searchPosts = async function (searchQuery, options = {}) {
    const { limit = 20, skip = 0 } = options;

    return this.find({
        $text: { $search: searchQuery },
        status: "published",
        visibility: "public"
    })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username avatar isVerified")
        .select("-comments -purchasedBy -viewedBy -reports")
        .lean();
};

/**
 * Increment view count
 */
PostSchema.statics.incrementViews = async function (postId, userId = null) {
    const update = { $inc: { views: 1 } };

    if (userId) {
        update.$addToSet = { viewedBy: userId };
    }

    return this.findByIdAndUpdate(postId, update, { new: true });
};

/**
 * Toggle like
 */
PostSchema.statics.toggleLike = async function (postId, userId) {
    const post = await this.findById(postId);
    if (!post) return null;

    const isLiked = post.likedBy.includes(userId);

    if (isLiked) {
        post.likedBy.pull(userId);
        post.likes = Math.max(0, post.likes - 1);
    } else {
        post.likedBy.push(userId);
        post.likes += 1;
        post.lastEngagement = new Date();
    }

    await post.save();
    return { liked: !isLiked, likes: post.likes };
};

/**
 * Add comment
 */
PostSchema.statics.addComment = async function (postId, commentData) {
    const post = await this.findById(postId);
    if (!post) return null;
    if (!post.commentsEnabled) throw new Error("Comments are disabled");

    post.comments.push(commentData);
    post.lastEngagement = new Date();
    await post.save();

    return post.comments[post.comments.length - 1];
};

/**
 * Record purchase
 */
PostSchema.statics.recordPurchase = async function (postId, purchaseData) {
    const { userId, username, price, transactionId } = purchaseData;

    return this.findByIdAndUpdate(
        postId,
        {
            $push: {
                purchasedBy: { userId, username, price, transactionId, purchasedAt: new Date() }
            },
            $inc: {
                purchaseCount: 1,
                totalEarnings: price
            }
        },
        { new: true }
    );
};

/**
 * Check if user has purchased
 */
PostSchema.statics.hasPurchased = async function (postId, userId) {
    const post = await this.findById(postId).select("purchasedBy isFree userId");
    if (!post) return false;
    if (post.isFree) return true;
    if (post.userId.toString() === userId.toString()) return true; // Owner
    return post.purchasedBy.some(p => p.userId.toString() === userId.toString());
};

/**
 * Get user's purchased content
 */
PostSchema.statics.getUserPurchases = async function (userId, options = {}) {
    const { limit = 20, skip = 0 } = options;

    return this.find({
        "purchasedBy.userId": userId,
        status: "published"
    })
        .sort({ "purchasedBy.purchasedAt": -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username avatar")
        .select("-comments -purchasedBy -viewedBy -reports")
        .lean();
};

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Check if user can view full content
 */
PostSchema.methods.canView = function (userId) {
    // Free content
    if (this.isFree) return true;

    // Owner
    if (this.userId.toString() === userId?.toString()) return true;

    // Has purchased
    return this.purchasedBy.some(p => p.userId.toString() === userId?.toString());
};

/**
 * Get content for display (with/without full access)
 */
PostSchema.methods.getDisplayContent = function (userId) {
    const canView = this.canView(userId);

    const base = {
        _id: this._id,
        title: this.title,
        description: this.description,
        type: this.type,
        category: this.category,
        tags: this.tags,
        thumbnail: this.thumbnail,
        likes: this.likes,
        views: this.views,
        commentCount: this.commentCount,
        isFree: this.isFree,
        price: this.price,
        formattedPrice: this.formattedPrice,
        userId: this.userId,
        username: this.username,
        avatar: this.avatar,
        createdAt: this.createdAt,
        canView
    };

    if (canView) {
        return {
            ...base,
            fileUrl: this.fileUrl,
            gallery: this.gallery,
            duration: this.duration
        };
    }

    // Return preview only
    return {
        ...base,
        fileUrl: this.previewUrl || this.thumbnail,
        isLocked: true
    };
};

/**
 * Soft delete
 */
PostSchema.methods.softDelete = async function () {
    this.status = "deleted";
    this.deletedAt = new Date();
    return this.save();
};

/**
 * Restore deleted post
 */
PostSchema.methods.restore = async function () {
    this.status = "published";
    this.deletedAt = null;
    return this.save();
};

/**
 * Report post
 */
PostSchema.methods.report = async function (userId, reason, details) {
    this.reports.push({ userId, reason, details });
    this.reportCount += 1;
    this.isReported = true;

    if (this.reportCount >= 5) {
        this.moderationStatus = "under_review";
    }

    return this.save();
};

// ===========================================
// EXPORT
// ===========================================
const Post = mongoose.model("Post", PostSchema);

module.exports = Post;
module.exports.Post = Post;
module.exports.PostSchema = PostSchema;
module.exports.CommentSchema = CommentSchema;
module.exports.PurchaseRecordSchema = PurchaseRecordSchema;