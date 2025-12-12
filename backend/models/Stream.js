// backend/models/Stream.js
// World-Studio.live - Stream Model (MASTER / UNIVERSE EDITION) 🌍🎥

const mongoose = require("mongoose");
const crypto = require("crypto"); // ✅ For secure random generation
const bcrypt = require("bcryptjs"); // ✅ For password hashing

// ===========================================
// SUB-SCHEMAS
// ===========================================

/**
 * Seat Schema - For multi-guest streams (host, cohost, guests)
 */
const SeatSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        username: String,
        avatar: String,
        role: {
            type: String,
            enum: ["host", "cohost", "guest", "speaker"],
            default: "guest",
        },
        isMuted: {
            type: Boolean,
            default: false,
        },
        isVideoOff: {
            type: Boolean,
            default: false,
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
        leftAt: Date,
    },
    { _id: true }
);

/**
 * Stream Gift Schema - Quick reference for latest gifts
 */
const StreamGiftSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: String,
        giftType: String,
        icon: String,
        amount: Number,
        coins: Number,
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false }
);

/**
 * Viewer Record Schema - For analytics and watch time
 */
const ViewerRecordSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: String,
        joinedAt: { type: Date, default: Date.now },
        leftAt: Date,
        watchTime: { type: Number, default: 0 }, // seconds
    },
    { _id: false }
);

// ===========================================
// MAIN STREAM SCHEMA
// ===========================================

const StreamSchema = new mongoose.Schema(
    {
        // Stream Info
        title: {
            type: String,
            required: true,
            maxLength: 100,
            trim: true,
        },
        description: {
            type: String,
            maxLength: 500,
            default: "",
        },

        // Streamer Info (HOST)
        streamerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        streamerName: {
            type: String,
            required: true,
        },
        streamerAvatar: {
            type: String,
            default: "",
        },
        isVerifiedStreamer: {
            type: Boolean,
            default: false,
        },

        // Room/Connection
        roomId: {
            type: String,
            default: "",
            index: true,
        },
        streamKey: {
            type: String,
            unique: true,
            sparse: true,
        },

        // Category & Discovery
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
        language: {
            type: String,
            default: "en",
        },

        // Media
        coverImage: {
            type: String,
            default: "",
        },

        thumbnail: {
            type: String,
            default: "",
        },

        thumbnailUrl: {
            type: String,
            default: "",
        },
        previewGif: {
            type: String,
            default: "",
        },

        // Stream Type
        type: {
            type: String,
            enum: [
                "solo",
                "multi",
                "multi-guest",
                "audio",
                "screen",
                "interview",
                "podcast",
            ],
            default: "solo",
        },
        mode: {
            type: String,
            enum: ["video", "audio", "screen"],
            default: "video",
        },

        // Multi-Guest Settings
        maxSeats: {
            type: Number,
            default: 1,
            min: 1,
            max: 12,
        },
        seats: [SeatSchema],
        guestRequests: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                username: String,
                avatar: String,
                requestedAt: { type: Date, default: Date.now },
                status: {
                    type: String,
                    enum: ["pending", "accepted", "declined"],
                    default: "pending",
                },
            },
        ],

        // Viewer Stats

        viewers: {
            type: Number,
            default: 0,
            min: 0,
        },

        viewersCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        peakViewers: {
            type: Number,
            default: 0,
        },
        totalUniqueViewers: {
            type: Number,
            default: 0,
        },
        viewerList: [ViewerRecordSchema],

        // Stream Status
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

        // Timing
        startedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        endedAt: {
            type: Date,
        },
        duration: {
            type: Number,
            default: 0, // seconds
        },
        scheduledFor: Date,

        // Monetization
        totalGifts: {
            type: Number,
            default: 0,
        },
        totalGiftsCount: {
            type: Number,
            default: 0,
        },
        topGifters: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                username: String,
                avatar: String,
                total: Number,
            },
        ],
        recentGifts: [StreamGiftSchema],
        giftsEnabled: {
            type: Boolean,
            default: true,
        },

        // Chat Settings
        chatEnabled: {
            type: Boolean,
            default: true,
        },
        chatSlowMode: {
            type: Number,
            default: 0, // seconds, 0 = off
        },
        chatFollowersOnly: {
            type: Boolean,
            default: false,
        },

        // Privacy
        privacy: {
            type: String,
            enum: ["public", "followers", "subscribers", "private"],
            default: "public",
        },
        // ✅ Password is hashed in pre-save middleware
        password: String,
        ageRestricted: {
            type: Boolean,
            default: false,
        },

        // Quality
        quality: {
            type: String,
            enum: ["360p", "480p", "720p", "1080p", "auto"],
            default: "720p",
        },
        bitrate: Number,

        // Recording
        isRecording: {
            type: Boolean,
            default: false,
        },
        recordingUrl: String,

        // PK Battle
        pkBattle: {
            isInPK: { type: Boolean, default: false },
            pkId: { type: mongoose.Schema.Types.ObjectId, ref: "PK" },
            opponentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            opponentName: String,
            myScore: { type: Number, default: 0 },
            opponentScore: { type: Number, default: 0 },
        },

        // Moderation
        moderators: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        bannedUsers: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                username: String,
                reason: String,
                bannedAt: { type: Date, default: Date.now },
                expiresAt: Date,
            },
        ],
        blockedWords: [String],

        // Featured
        isFeatured: {
            type: Boolean,
            default: false,
            index: true,
        },
        featuredUntil: Date,

        // Analytics
        likes: {
            type: Number,
            default: 0,
        },
        shares: {
            type: Number,
            default: 0,
        },
        avgWatchTime: {
            type: Number,
            default: 0,
        },

        // Technical
        hlsUrl: String,
        rtmpUrl: String,
        webrtcEnabled: {
            type: Boolean,
            default: true,
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
StreamSchema.index({ isLive: 1, viewers: -1 });

StreamSchema.index({ isLive: 1, viewersCount: -1 });
StreamSchema.index({ streamerId: 1, isLive: 1 });
StreamSchema.index({ category: 1, isLive: 1 });
StreamSchema.index({ roomId: 1, isLive: 1 });
StreamSchema.index({ isLive: 1, startedAt: -1 });
StreamSchema.index({ isFeatured: 1, isLive: 1 });
StreamSchema.index({ tags: 1 });
StreamSchema.index({ "pkBattle.isInPK": 1 });

// Text search
StreamSchema.index({
    title: "text",
    streamerName: "text",
    tags: "text",
});

// ===========================================
// VIRTUALS
// ===========================================

/**
 * Host virtual (for .populate("host"))
 
 */
StreamSchema.virtual("host", {
    ref: "User",
    localField: "streamerId",
    foreignField: "_id",
    justOne: true,
});

// Stream URL
StreamSchema.virtual("streamUrl").get(function () {
    return `https://world-studio.live/live/${this._id}`;
});

// Duration formatted
StreamSchema.virtual("durationFormatted").get(function () {
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

// Live duration (real-time)
StreamSchema.virtual("liveDuration").get(function () {
    if (!this.startedAt) return 0;
    const end = this.endedAt || new Date();
    return Math.floor((end - this.startedAt) / 1000);
});

// Seats available
StreamSchema.virtual("seatsAvailable").get(function () {
    const occupied = this.seats?.filter((s) => !s.leftAt).length || 0;
    return this.maxSeats - occupied;
});

// Is multi-guest
StreamSchema.virtual("isMultiGuest").get(function () {
    return ["multi", "multi-guest", "interview", "podcast"].includes(this.type);
});

// ===========================================
// PRE-SAVE MIDDLEWARE
// ===========================================
StreamSchema.pre("save", async function (next) {
    // ✅ SECURITY FIX: Hash password if modified
    if (this.isModified("password") && this.password) {
        try {
            this.password = await bcrypt.hash(this.password, 10);
        } catch (err) {
            console.error("Failed to hash stream password:", err);
            return next(err);
        }
    }

    // Update peak viewers
    if (this.viewers > this.peakViewers) {
        this.peakViewers = this.viewers;
    }

    // Keep viewersCount in sync with viewers
    this.viewersCount = this.viewers;

    // Calculate duration on end
    if (this.endedAt && this.startedAt && !this.duration) {
        this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    }

    // ✅ SECURITY FIX: Generate cryptographically secure roomId
    if (!this.roomId && this.isNew) {
        this.roomId = `stream-${this._id}-${crypto.randomBytes(8).toString("hex")}`;
    }

    // ✅ SECURITY FIX: Generate cryptographically secure stream key
    if (!this.streamKey && this.isNew) {
        this.streamKey = `sk_${this._id}_${crypto.randomBytes(16).toString("hex")}`;
    }

    next();
});

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Get live streams for discovery
 */
StreamSchema.statics.getLiveStreams = async function (options = {}) {
    const {
        category,
        type,
        limit = 20,
        skip = 0,
        sortBy = "viewers",
        featured = false,
    } = options;

    const query = { isLive: true, status: "live" };

    if (category && category !== "all") query.category = category;
    if (type && type !== "all") query.type = type;
    if (featured) query.isFeatured = true;

    const sortOptions = {
        viewers: { viewers: -1 },
        recent: { startedAt: -1 },
        gifts: { totalGifts: -1 },
    };

    return this.find(query)
        .sort(sortOptions[sortBy] || { viewers: -1 })
        .skip(skip)
        .limit(limit)
        .populate("streamerId", "username avatar isVerified")
        .select("-viewerList -bannedUsers -blockedWords -password")
        .lean();
};

/**
 * Get stream by room ID
 */
StreamSchema.statics.getByRoomId = async function (roomId) {
    return this.findOne({ roomId, isLive: true })
        .populate("streamerId", "username avatar isVerified")
        .populate("seats.userId", "username avatar")
        .select("-password");
};

/**
 * Get user's active stream
 */
StreamSchema.statics.getUserActiveStream = async function (userId) {
    return this.findOne({
        streamerId: userId,
        isLive: true,
    }).select("-password");
};

/**
 * Update viewer count
 */
StreamSchema.statics.updateViewers = async function (streamId, count) {
    const stream = await this.findById(streamId);
    if (!stream) return null;

    stream.viewers = count;

    stream.viewersCount = count;

    if (count > stream.peakViewers) {
        stream.peakViewers = count;
    }

    return stream.save();
};

/**
 * Add gift to stream
 */
StreamSchema.statics.addGift = async function (streamId, gift) {
    return this.findByIdAndUpdate(
        streamId,
        {
            $inc: {
                totalGifts: gift.coins || gift.amount,
                totalGiftsCount: 1,
            },
            $push: {
                recentGifts: {
                    $each: [gift],
                    $slice: -50, // Keep last 50
                },
            },
        },
        { new: true }
    ).select("-password");
};

/**
 * End stream
 */
StreamSchema.statics.endStream = async function (streamId) {
    const stream = await this.findById(streamId);
    if (!stream) return null;

    stream.isLive = false;
    stream.status = "ended";
    stream.endedAt = new Date();
    stream.duration = Math.floor((stream.endedAt - stream.startedAt) / 1000);

    // Calculate avg watch time
    if (stream.viewerList?.length > 0) {
        const totalWatchTime = stream.viewerList.reduce(
            (sum, v) => sum + (v.watchTime || 0),
            0
        );
        stream.avgWatchTime = Math.floor(totalWatchTime / stream.viewerList.length);
    }

    return stream.save();
};

/**
 * Get categories with counts
 */
StreamSchema.statics.getCategoryCounts = async function () {
    return this.aggregate([
        { $match: { isLive: true } },
        {
            $group: {
                _id: "$category",
                count: { $sum: 1 },
                viewers: { $sum: "$viewers" },
            },
        },
        { $sort: { viewers: -1 } },
    ]);
};

/**
 * Search streams
 */
StreamSchema.statics.searchStreams = async function (query, limit = 20) {
    return this.find({
        $text: { $search: query },
        isLive: true,
    })
        .sort({ score: { $meta: "textScore" } })
        .limit(limit)
        .populate("streamerId", "username avatar")
        .select("-password")
        .lean();
};

/**
 * Admin dashboard stats for streams
 */
StreamSchema.statics.getDashboardStats = async function () {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [live, endedToday, endedWeek, featured] = await Promise.all([
        this.countDocuments({ isLive: true, status: "live" }),
        this.countDocuments({ status: "ended", endedAt: { $gte: dayAgo } }),
        this.countDocuments({ status: "ended", endedAt: { $gte: weekAgo } }),
        this.countDocuments({ isLive: true, isFeatured: true }),
    ]);

    // Total viewers on live streams
    const liveAgg = await this.aggregate([
        { $match: { isLive: true, status: "live" } },
        {
            $group: {
                _id: null,
                totalViewers: { $sum: "$viewers" },
                totalPeak: { $sum: "$peakViewers" },
            },
        },
    ]);

    const liveStats = liveAgg[0] || {
        totalViewers: 0,
        totalPeak: 0,
    };

    return {
        live,
        endedToday,
        endedWeek,
        featured,
        totalLiveViewers: liveStats.totalViewers,
        totalPeakViewers: liveStats.totalPeak,
    };
};

/**
 * ✅ Verify stream password
 */
StreamSchema.statics.verifyPassword = async function (streamId, password) {
    const stream = await this.findById(streamId).select("+password");
    if (!stream || !stream.password) return true; // No password set
    return bcrypt.compare(password, stream.password);
};

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Go live
 */
StreamSchema.methods.goLive = async function () {
    this.isLive = true;
    this.status = "live";
    this.startedAt = new Date();
    this.endedAt = null;
    this.duration = 0;
    return this.save();
};

/**
 * End this stream
 */
StreamSchema.methods.end = async function () {
    this.isLive = false;
    this.status = "ended";
    this.endedAt = new Date();
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    return this.save();
};

/**
 * Add guest to seat
 */
StreamSchema.methods.addGuest = async function (userId, username, avatar) {
    if (this.seatsAvailable <= 0) {
        throw new Error("No seats available");
    }

    this.seats.push({
        userId,
        username,
        avatar,
        role: "guest",
        joinedAt: new Date(),
    });

    return this.save();
};

/**
 * Remove guest from seat
 */
StreamSchema.methods.removeGuest = async function (userId) {
    const seat = this.seats.find(
        (s) => s.userId?.toString() === userId.toString() && !s.leftAt
    );

    if (seat) {
        seat.leftAt = new Date();
    }

    return this.save();
};

/**
 * Ban user from stream
 */
StreamSchema.methods.banUser = async function (
    userId,
    username,
    reason,
    duration = null
) {
    this.bannedUsers.push({
        userId,
        username,
        reason,
        bannedAt: new Date(),
        expiresAt: duration ? new Date(Date.now() + duration * 1000) : null,
    });
    return this.save();
};

/**
 * Check if user is banned
 */
StreamSchema.methods.isUserBanned = function (userId) {
    const ban = this.bannedUsers.find(
        (b) => b.userId?.toString() === userId.toString()
    );

    if (!ban) return false;
    if (!ban.expiresAt) return true;
    return new Date() < ban.expiresAt;
};

/**
 * Add moderator
 */
StreamSchema.methods.addModerator = async function (userId) {
    if (!this.moderators.includes(userId)) {
        this.moderators.push(userId);
        return this.save();
    }
    return this;
};

/**
 * Check if user is moderator
 */
StreamSchema.methods.isModerator = function (userId) {
    return this.moderators.some((m) => m.toString() === userId.toString());
};

/**
 * Record viewer join
 * ✅ FIX: Properly counts unique viewers
 */
StreamSchema.methods.recordViewerJoin = function (userId, username) {
    if (!userId) return this;

    const existing = this.viewerList.find(
        (v) => v.userId?.toString() === userId.toString() && !v.leftAt
    );

    if (!existing) {
        this.viewerList.push({
            userId,
            username,
            joinedAt: new Date(),
            watchTime: 0,
        });

        // ✅ FIX: Count unique userIds, not total entries
        const uniqueUserIds = new Set(
            this.viewerList
                .filter((v) => v.userId)
                .map((v) => v.userId.toString())
        );
        this.totalUniqueViewers = uniqueUserIds.size;
    }

    return this;
};

/**
 * Record viewer leave (update watch time)
 */
StreamSchema.methods.recordViewerLeave = function (userId) {
    if (!userId) return this;

    const record = this.viewerList.find(
        (v) => v.userId?.toString() === userId.toString() && !v.leftAt
    );

    if (record) {
        const now = new Date();
        record.leftAt = now;
        const diff = Math.floor((now - record.joinedAt) / 1000);
        record.watchTime = (record.watchTime || 0) + diff;
    }

    return this;
};

/**
 * ✅ Verify password for this stream instance
 */
StreamSchema.methods.verifyPassword = async function (password) {
    if (!this.password) return true; // No password set
    return bcrypt.compare(password, this.password);
};

/**
 * ✅ Set password (will be hashed on save)
 */
StreamSchema.methods.setPassword = async function (password) {
    this.password = password; // Will be hashed in pre-save
    return this.save();
};

/**
 * ✅ Remove password protection
 */
StreamSchema.methods.removePassword = async function () {
    this.password = undefined;
    return this.save();
};

// ===========================================
// EXPORT
// ===========================================
const Stream = mongoose.model("Stream", StreamSchema);

module.exports = Stream;
module.exports.Stream = Stream;
module.exports.StreamSchema = StreamSchema;
module.exports.SeatSchema = SeatSchema;
module.exports.StreamGiftSchema = StreamGiftSchema;
module.exports.ViewerRecordSchema = ViewerRecordSchema;
