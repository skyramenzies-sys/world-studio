// backend/models/LiveStream.js
// World-Studio.live - LiveStream Model (UNIVERSE EDITION) 🎥
// Lightweight stream model for basic live functionality

const mongoose = require("mongoose");
const crypto = require("crypto");

// ===========================================
// LIVESTREAM SCHEMA
// ===========================================

const liveStreamSchema = new mongoose.Schema(
    {
        // ============================================
        // STREAMER INFO
        // ============================================
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // ============================================
        // ROOM / CONNECTION
        // ============================================
        roomId: {
            type: String,
            index: true,
            unique: true,
            sparse: true,
        },
        streamKey: {
            type: String,
            unique: true,
            sparse: true,
            select: false, // Don't include in queries by default
        },

        // ============================================
        // STREAM INFO
        // ============================================
        title: {
            type: String,
            default: "Live on World-Studio",
            maxLength: 100,
            trim: true,
        },
        description: {
            type: String,
            default: "",
            maxLength: 500,
        },
        category: {
            type: String,
            default: "General",
            index: true,
        },
        tags: [
            {
                type: String,
                lowercase: true,
                trim: true,
            },
        ],
        thumbnail: {
            type: String,
            default: "",
        },

        // ============================================
        // STREAM TYPE
        // ============================================
        kind: {
            type: String,
            enum: ["camera", "screen", "audio"],
            default: "camera",
        },
        type: {
            type: String,
            enum: ["solo", "multi", "multi-guest", "audio", "interview"],
            default: "solo",
        },

        // ============================================
        // STATUS
        // ============================================
        isLive: {
            type: Boolean,
            default: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["preparing", "live", "paused", "ended", "cancelled"],
            default: "live",
        },

        // ============================================
        // VIEWER STATS
        // ============================================
        viewerCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Alias for compatibility with other components
        viewers: {
            type: Number,
            default: 0,
            min: 0,
        },
        peakViewers: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalUniqueViewers: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Simple viewer tracking (lightweight)
        activeViewers: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                username: String,
                joinedAt: { type: Date, default: Date.now },
            },
        ],

        // ============================================
        // TIMING
        // ============================================
        startedAt: {
            type: Date,
            default: Date.now,
        },
        endedAt: {
            type: Date,
        },
        duration: {
            type: Number,
            default: 0, // seconds
        },

        // ============================================
        // MONETIZATION (Basic)
        // ============================================
        totalGifts: {
            type: Number,
            default: 0,
        },
        giftCount: {
            type: Number,
            default: 0,
        },

        // ============================================
        // CHAT SETTINGS
        // ============================================
        chatEnabled: {
            type: Boolean,
            default: true,
        },
        chatSlowMode: {
            type: Number,
            default: 0, // seconds, 0 = off
        },

        // ============================================
        // MODERATION (Basic)
        // ============================================
        moderators: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        bannedUsers: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                reason: String,
                bannedAt: { type: Date, default: Date.now },
            },
        ],

        // ============================================
        // LEGACY COMPATIBILITY
        // ============================================
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ===========================================
// INDEXES
// ===========================================
liveStreamSchema.index({ isLive: 1, viewerCount: -1 });
liveStreamSchema.index({ isLive: 1, viewers: -1 });
liveStreamSchema.index({ user: 1, isLive: 1 });
liveStreamSchema.index({ category: 1, isLive: 1 });
liveStreamSchema.index({ isLive: 1, startedAt: -1 });
liveStreamSchema.index({ tags: 1 });

// Text search
liveStreamSchema.index({ title: "text", tags: "text" });

// ===========================================
// VIRTUALS
// ===========================================

// Stream URL
liveStreamSchema.virtual("streamUrl").get(function () {
    return `/live/${this.roomId || this._id}`;
});

// Duration formatted
liveStreamSchema.virtual("durationFormatted").get(function () {
    const duration = this.duration || 0;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// Live duration (real-time calculation)
liveStreamSchema.virtual("liveDuration").get(function () {
    if (!this.startedAt) return 0;
    const end = this.endedAt || new Date();
    return Math.floor((end - this.startedAt) / 1000);
});

// Is currently streaming
liveStreamSchema.virtual("isStreaming").get(function () {
    return this.isLive && this.status === "live";
});

// ===========================================
// PRE-SAVE MIDDLEWARE
// ===========================================
liveStreamSchema.pre("save", function (next) {
    // ✅ Generate secure roomId if not set
    if (!this.roomId && this.isNew) {
        this.roomId = this._id.toString();
    }

    // ✅ Generate secure streamKey if not set
    if (!this.streamKey && this.isNew) {
        this.streamKey = `lsk_${this._id}_${crypto.randomBytes(12).toString("hex")}`;
    }

    // ✅ Keep viewers and viewerCount in sync
    if (this.isModified("viewerCount")) {
        this.viewers = this.viewerCount;
    } else if (this.isModified("viewers")) {
        this.viewerCount = this.viewers;
    }

    // ✅ Update peak viewers
    const currentViewers = Math.max(this.viewerCount, this.viewers);
    if (currentViewers > this.peakViewers) {
        this.peakViewers = currentViewers;
    }

    // ✅ Calculate duration on end
    if (this.endedAt && this.startedAt && !this.duration) {
        this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    }

    // ✅ Set status based on isLive
    if (this.isModified("isLive")) {
        if (this.isLive) {
            this.status = "live";
            if (!this.startedAt) this.startedAt = new Date();
        } else {
            this.status = "ended";
            if (!this.endedAt) this.endedAt = new Date();
        }
    }

    next();
});

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Get all live streams
 */
liveStreamSchema.statics.getLiveStreams = async function (options = {}) {
    const { category, limit = 20, skip = 0, sortBy = "viewers" } = options;

    const query = { isLive: true };
    if (category && category !== "all") query.category = category;

    const sortOptions = {
        viewers: { viewerCount: -1, viewers: -1 },
        recent: { startedAt: -1 },
        gifts: { totalGifts: -1 },
    };

    return this.find(query)
        .sort(sortOptions[sortBy] || sortOptions.viewers)
        .skip(skip)
        .limit(limit)
        .populate("user", "username avatar isVerified")
        .lean();
};

/**
 * Get stream by room ID or _id
 */
liveStreamSchema.statics.getByRoomId = async function (roomId) {
    // Try roomId first, then _id
    let stream = await this.findOne({ roomId }).populate(
        "user",
        "username avatar isVerified"
    );

    if (!stream && mongoose.Types.ObjectId.isValid(roomId)) {
        stream = await this.findById(roomId).populate(
            "user",
            "username avatar isVerified"
        );
    }

    return stream;
};

/**
 * Get user's active stream
 */
liveStreamSchema.statics.getUserActiveStream = async function (userId) {
    return this.findOne({
        user: userId,
        isLive: true,
    }).populate("user", "username avatar");
};

/**
 * Update viewer count
 */
liveStreamSchema.statics.updateViewers = async function (streamId, count) {
    return this.findByIdAndUpdate(
        streamId,
        {
            $set: {
                viewerCount: count,
                viewers: count,
            },
            $max: {
                peakViewers: count,
            },
        },
        { new: true }
    );
};

/**
 * Increment viewer count
 */
liveStreamSchema.statics.incrementViewers = async function (streamId, amount = 1) {
    const stream = await this.findById(streamId);
    if (!stream) return null;

    stream.viewerCount = Math.max(0, stream.viewerCount + amount);
    stream.viewers = stream.viewerCount;

    if (stream.viewerCount > stream.peakViewers) {
        stream.peakViewers = stream.viewerCount;
    }

    return stream.save();
};

/**
 * Add gift to stream
 */
liveStreamSchema.statics.addGift = async function (streamId, coins) {
    return this.findByIdAndUpdate(
        streamId,
        {
            $inc: {
                totalGifts: coins,
                giftCount: 1,
            },
        },
        { new: true }
    );
};

/**
 * End stream
 */
liveStreamSchema.statics.endStream = async function (streamId) {
    const stream = await this.findById(streamId);
    if (!stream) return null;

    stream.isLive = false;
    stream.status = "ended";
    stream.endedAt = new Date();
    stream.duration = Math.floor((stream.endedAt - stream.startedAt) / 1000);
    stream.viewerCount = 0;
    stream.viewers = 0;
    stream.activeViewers = [];

    return stream.save();
};

/**
 * End all streams for a user
 */
liveStreamSchema.statics.endUserStreams = async function (userId) {
    const now = new Date();
    return this.updateMany(
        { user: userId, isLive: true },
        {
            $set: {
                isLive: false,
                status: "ended",
                endedAt: now,
                viewerCount: 0,
                viewers: 0,
            },
        }
    );
};

/**
 * Get stream statistics
 */
liveStreamSchema.statics.getStats = async function () {
    const [liveCount, totalStreams] = await Promise.all([
        this.countDocuments({ isLive: true }),
        this.countDocuments({}),
    ]);

    const viewerAgg = await this.aggregate([
        { $match: { isLive: true } },
        {
            $group: {
                _id: null,
                totalViewers: { $sum: "$viewerCount" },
                totalPeak: { $sum: "$peakViewers" },
            },
        },
    ]);

    const viewerStats = viewerAgg[0] || { totalViewers: 0, totalPeak: 0 };

    return {
        liveStreams: liveCount,
        totalStreams,
        totalViewers: viewerStats.totalViewers,
        totalPeakViewers: viewerStats.totalPeak,
    };
};

/**
 * Search streams
 */
liveStreamSchema.statics.searchStreams = async function (query, limit = 20) {
    return this.find({
        $text: { $search: query },
        isLive: true,
    })
        .sort({ score: { $meta: "textScore" } })
        .limit(limit)
        .populate("user", "username avatar")
        .lean();
};

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Go live
 */
liveStreamSchema.methods.goLive = async function () {
    this.isLive = true;
    this.status = "live";
    this.startedAt = new Date();
    this.endedAt = null;
    this.duration = 0;
    this.viewerCount = 0;
    this.viewers = 0;
    return this.save();
};

/**
 * End this stream
 */
liveStreamSchema.methods.end = async function () {
    this.isLive = false;
    this.status = "ended";
    this.endedAt = new Date();
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    this.viewerCount = 0;
    this.viewers = 0;
    this.activeViewers = [];
    return this.save();
};

/**
 * Update viewer count
 */
liveStreamSchema.methods.setViewers = async function (count) {
    this.viewerCount = Math.max(0, count);
    this.viewers = this.viewerCount;
    if (this.viewerCount > this.peakViewers) {
        this.peakViewers = this.viewerCount;
    }
    return this.save();
};

/**
 * Add viewer
 */
liveStreamSchema.methods.addViewer = async function (userId, username) {
    // Increment count
    this.viewerCount += 1;
    this.viewers = this.viewerCount;

    if (this.viewerCount > this.peakViewers) {
        this.peakViewers = this.viewerCount;
    }

    // Track viewer if userId provided
    if (userId) {
        const exists = this.activeViewers.some(
            (v) => v.userId?.toString() === userId.toString()
        );
        if (!exists) {
            this.activeViewers.push({
                userId,
                username,
                joinedAt: new Date(),
            });
            this.totalUniqueViewers = new Set(
                this.activeViewers.map((v) => v.userId?.toString()).filter(Boolean)
            ).size;
        }
    }

    return this.save();
};

/**
 * Remove viewer
 */
liveStreamSchema.methods.removeViewer = async function (userId) {
    this.viewerCount = Math.max(0, this.viewerCount - 1);
    this.viewers = this.viewerCount;

    if (userId) {
        this.activeViewers = this.activeViewers.filter(
            (v) => v.userId?.toString() !== userId.toString()
        );
    }

    return this.save();
};

/**
 * Ban user from stream
 */
liveStreamSchema.methods.banUser = async function (userId, reason = "") {
    const alreadyBanned = this.bannedUsers.some(
        (b) => b.userId?.toString() === userId.toString()
    );

    if (!alreadyBanned) {
        this.bannedUsers.push({
            userId,
            reason,
            bannedAt: new Date(),
        });
    }

    return this.save();
};

/**
 * Unban user from stream
 */
liveStreamSchema.methods.unbanUser = async function (userId) {
    this.bannedUsers = this.bannedUsers.filter(
        (b) => b.userId?.toString() !== userId.toString()
    );
    return this.save();
};

/**
 * Check if user is banned
 */
liveStreamSchema.methods.isUserBanned = function (userId) {
    return this.bannedUsers.some(
        (b) => b.userId?.toString() === userId.toString()
    );
};

/**
 * Add moderator
 */
liveStreamSchema.methods.addModerator = async function (userId) {
    const isAlready = this.moderators.some(
        (m) => m.toString() === userId.toString()
    );

    if (!isAlready) {
        this.moderators.push(userId);
    }

    return this.save();
};

/**
 * Remove moderator
 */
liveStreamSchema.methods.removeModerator = async function (userId) {
    this.moderators = this.moderators.filter(
        (m) => m.toString() !== userId.toString()
    );
    return this.save();
};

/**
 * Check if user is moderator
 */
liveStreamSchema.methods.isModerator = function (userId) {
    return this.moderators.some((m) => m.toString() === userId.toString());
};

/**
 * Check if user is owner
 */
liveStreamSchema.methods.isOwner = function (userId) {
    return this.user?.toString() === userId.toString();
};

/**
 * Check if user can moderate (owner or mod)
 */
liveStreamSchema.methods.canModerate = function (userId) {
    return this.isOwner(userId) || this.isModerator(userId);
};

// ===========================================
// EXPORT
// ===========================================
module.exports =
    mongoose.models.LiveStream || mongoose.model("LiveStream", liveStreamSchema);