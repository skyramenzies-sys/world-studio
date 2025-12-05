// backend/models/LiveStream.js
// World-Studio.live - Live Stream Model
// Handles live streaming sessions, chat, gifts, and viewer tracking

const mongoose = require("mongoose");

// ===========================================
// SUB-SCHEMAS
// ===========================================

/**
 * Gift Schema - Gifts sent during stream
 */
const StreamGiftSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    senderAvatar: String,
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    item: {
        type: String,
        default: "coins"
    },
    icon: {
        type: String,
        default: "💰"
    },
    message: {
        type: String,
        maxLength: 200
    },
    animation: {
        type: String,
        enum: ["none", "float", "explode", "rain", "spotlight"],
        default: "float"
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
}, { _id: true });

/**
 * Chat Message Schema - Messages during stream
 */
const StreamChatSchema = new mongoose.Schema({
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
        maxLength: 500
    },
    type: {
        type: String,
        enum: ["message", "system", "gift", "join", "leave", "pin", "mod"],
        default: "message"
    },
    isStreamer: {
        type: Boolean,
        default: false
    },
    isModerator: {
        type: Boolean,
        default: false
    },
    isVIP: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    replyTo: {
        messageId: mongoose.Schema.Types.ObjectId,
        username: String,
        text: String
    },
    deleted: {
        type: Boolean,
        default: false
    },
    deletedBy: String,
    timestamp: {
        type: Date,
        default: Date.now
    },
}, { _id: true });

/**
 * Viewer Schema - Track individual viewers
 */
const ViewerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    username: String,
    avatar: String,
    joinedAt: {
        type: Date,
        default: Date.now
    },
    leftAt: Date,
    watchTime: {
        type: Number,
        default: 0 // seconds
    },
    giftsTotal: {
        type: Number,
        default: 0
    },
    messagesCount: {
        type: Number,
        default: 0
    },
    isGuest: {
        type: Boolean,
        default: false
    }
}, { _id: false });

/**
 * Co-Host/Guest Schema - For multi-guest streams
 */
const CoHostSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    username: String,
    avatar: String,
    role: {
        type: String,
        enum: ["cohost", "guest", "interviewer"],
        default: "guest"
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    leftAt: Date,
    isMuted: {
        type: Boolean,
        default: false
    },
    isVideoOff: {
        type: Boolean,
        default: false
    }
}, { _id: true });

// ===========================================
// MAIN LIVE STREAM SCHEMA
// ===========================================
const LiveStreamSchema = new mongoose.Schema({
    // Streamer Information
    streamerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    streamerName: {
        type: String,
        required: true
    },
    streamerAvatar: String,

    // Stream Details
    title: {
        type: String,
        required: true,
        maxLength: 100,
        trim: true
    },
    description: {
        type: String,
        maxLength: 500
    },
    category: {
        type: String,
        default: "general",
        index: true
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    language: {
        type: String,
        default: "en"
    },

    // Stream Media
    coverImage: {
        type: String,
        default: "/defaults/stream-cover.jpg"
    },
    thumbnail: String,
    previewGif: String,

    // Stream Mode
    mode: {
        type: String,
        enum: ["video", "audio", "screen", "multi-guest"],
        default: "video"
    },

    // Stream Status
    isLive: {
        type: Boolean,
        default: false,
        index: true
    },
    status: {
        type: String,
        enum: ["scheduled", "live", "ended", "cancelled", "suspended"],
        default: "live",
        index: true
    },

    // Privacy & Access
    privacy: {
        type: String,
        enum: ["public", "followers", "subscribers", "private"],
        default: "public"
    },
    password: String, // For private streams
    ageRestricted: {
        type: Boolean,
        default: false
    },

    // Viewer Stats
    viewers: {
        type: Number,
        default: 0,
        min: 0
    },
    peakViewers: {
        type: Number,
        default: 0
    },
    totalViewers: {
        type: Number,
        default: 0
    },
    viewerList: [ViewerSchema],

    // Chat
    chat: {
        type: [StreamChatSchema],
        default: []
    },
    chatEnabled: {
        type: Boolean,
        default: true
    },
    chatSlowMode: {
        type: Number, // seconds between messages (0 = off)
        default: 0
    },
    chatFollowersOnly: {
        type: Boolean,
        default: false
    },
    chatSubscribersOnly: {
        type: Boolean,
        default: false
    },

    // Gifts
    gifts: {
        type: [StreamGiftSchema],
        default: []
    },
    giftsEnabled: {
        type: Boolean,
        default: true
    },
    totalGiftsAmount: {
        type: Number,
        default: 0
    },
    totalGiftsCount: {
        type: Number,
        default: 0
    },

    // Co-hosts / Multi-guest
    coHosts: [CoHostSchema],
    maxCoHosts: {
        type: Number,
        default: 4
    },
    guestRequests: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: String,
        avatar: String,
        requestedAt: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ["pending", "accepted", "declined"],
            default: "pending"
        }
    }],

    // PK Battle
    pkBattle: {
        isInPK: { type: Boolean, default: false },
        pkId: { type: mongoose.Schema.Types.ObjectId, ref: "PKBattle" },
        opponentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        opponentName: String,
        myScore: { type: Number, default: 0 },
        opponentScore: { type: Number, default: 0 },
        startedAt: Date,
        duration: Number // minutes
    },

    // Recording
    isRecording: {
        type: Boolean,
        default: false
    },
    recordingUrl: String,
    recordingDuration: Number,

    // Scheduled Stream
    scheduledFor: Date,
    reminderSent: {
        type: Boolean,
        default: false
    },

    // Moderation
    moderators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    bannedUsers: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: String,
        reason: String,
        bannedAt: { type: Date, default: Date.now },
        expiresAt: Date // null = permanent
    }],
    blockedWords: [String],

    // WebRTC / Technical
    roomId: {
        type: String,
        unique: true,
        sparse: true
    },
    streamKey: {
        type: String,
        unique: true,
        sparse: true
    },
    rtmpUrl: String,
    hlsUrl: String,
    quality: {
        type: String,
        enum: ["360p", "480p", "720p", "1080p", "auto"],
        default: "720p"
    },
    bitrate: Number,

    // Analytics
    likes: {
        type: Number,
        default: 0
    },
    shares: {
        type: Number,
        default: 0
    },
    avgWatchTime: {
        type: Number,
        default: 0 // seconds
    },

    // Timestamps
    startedAt: {
        type: Date,
        index: true
    },
    endedAt: {
        type: Date
    },
    duration: {
        type: Number, // seconds
        default: 0
    },

    // Featured/Promoted
    isFeatured: {
        type: Boolean,
        default: false,
        index: true
    },
    featuredUntil: Date,

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===========================================
// INDEXES
// ===========================================
LiveStreamSchema.index({ isLive: 1, viewers: -1 }); // Live streams by popularity
LiveStreamSchema.index({ streamerId: 1, isLive: 1 });
LiveStreamSchema.index({ category: 1, isLive: 1 });
LiveStreamSchema.index({ startedAt: -1 });
LiveStreamSchema.index({ status: 1, scheduledFor: 1 });
LiveStreamSchema.index({ isFeatured: 1, isLive: 1 });
LiveStreamSchema.index({ tags: 1 });
LiveStreamSchema.index({ "pkBattle.isInPK": 1 });

// Text index for search
LiveStreamSchema.index({
    title: "text",
    description: "text",
    streamerName: "text",
    tags: "text"
});

// ===========================================
// VIRTUALS
// ===========================================

// Stream URL
LiveStreamSchema.virtual("streamUrl").get(function () {
    return `https://world-studio.live/live/${this._id}`;
});

// Is stream active (live or scheduled soon)
LiveStreamSchema.virtual("isActive").get(function () {
    if (this.isLive) return true;
    if (this.status === "scheduled" && this.scheduledFor) {
        const hoursUntilStart = (this.scheduledFor - new Date()) / (1000 * 60 * 60);
        return hoursUntilStart <= 1; // Active if starting within 1 hour
    }
    return false;
});

// Duration formatted
LiveStreamSchema.virtual("durationFormatted").get(function () {
    if (!this.duration) return "0:00";
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// Chat message count
LiveStreamSchema.virtual("chatCount").get(function () {
    return this.chat?.length || 0;
});

// ===========================================
// PRE-SAVE MIDDLEWARE
// ===========================================
LiveStreamSchema.pre("save", function (next) {
    // Update peak viewers
    if (this.viewers > this.peakViewers) {
        this.peakViewers = this.viewers;
    }

    // Calculate duration if stream ended
    if (this.endedAt && this.startedAt && !this.duration) {
        this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    }

    // Generate room ID if not set
    if (!this.roomId && this.isNew) {
        this.roomId = `ws-${this._id}-${Date.now()}`;
    }

    // Generate stream key if not set
    if (!this.streamKey && this.isNew) {
        this.streamKey = `sk_${this._id}_${Math.random().toString(36).substring(2, 15)}`;
    }

    this.updatedAt = new Date();
    next();
});

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Get live streams (with filters)
 */
LiveStreamSchema.statics.getLiveStreams = async function (options = {}) {
    const {
        category,
        limit = 20,
        skip = 0,
        sortBy = "viewers",
        featured = false
    } = options;

    const query = { isLive: true, status: "live" };

    if (category && category !== "all") {
        query.category = category;
    }

    if (featured) {
        query.isFeatured = true;
    }

    const sortOptions = {
        viewers: { viewers: -1 },
        recent: { startedAt: -1 },
        gifts: { totalGiftsAmount: -1 }
    };

    return this.find(query)
        .sort(sortOptions[sortBy] || { viewers: -1 })
        .skip(skip)
        .limit(limit)
        .select("-chat -gifts -viewerList")
        .populate("streamerId", "username avatar isVerified")
        .lean();
};

/**
 * Get scheduled streams
 */
LiveStreamSchema.statics.getScheduledStreams = async function (options = {}) {
    const { limit = 10, userId } = options;

    const query = {
        status: "scheduled",
        scheduledFor: { $gte: new Date() }
    };

    if (userId) {
        query.streamerId = userId;
    }

    return this.find(query)
        .sort({ scheduledFor: 1 })
        .limit(limit)
        .populate("streamerId", "username avatar")
        .lean();
};

/**
 * Get user's active stream
 */
LiveStreamSchema.statics.getUserActiveStream = async function (userId) {
    return this.findOne({
        streamerId: userId,
        isLive: true
    });
};

/**
 * Get stream stats
 */
LiveStreamSchema.statics.getStreamStats = async function (streamId) {
    const stream = await this.findById(streamId);
    if (!stream) return null;

    return {
        viewers: stream.viewers,
        peakViewers: stream.peakViewers,
        totalViewers: stream.totalViewers,
        duration: stream.duration,
        chatCount: stream.chat?.length || 0,
        giftsCount: stream.totalGiftsCount,
        giftsAmount: stream.totalGiftsAmount,
        likes: stream.likes,
        shares: stream.shares
    };
};

/**
 * Add chat message
 */
LiveStreamSchema.statics.addChatMessage = async function (streamId, message) {
    return this.findByIdAndUpdate(
        streamId,
        {
            $push: {
                chat: {
                    $each: [message],
                    $slice: -500 // Keep last 500 messages
                }
            }
        },
        { new: true }
    );
};

/**
 * Add gift
 */
LiveStreamSchema.statics.addGift = async function (streamId, gift) {
    return this.findByIdAndUpdate(
        streamId,
        {
            $push: { gifts: gift },
            $inc: {
                totalGiftsAmount: gift.amount,
                totalGiftsCount: 1
            }
        },
        { new: true }
    );
};

/**
 * Update viewer count
 */
LiveStreamSchema.statics.updateViewers = async function (streamId, count) {
    const stream = await this.findById(streamId);
    if (!stream) return null;

    stream.viewers = count;
    if (count > stream.peakViewers) {
        stream.peakViewers = count;
    }
    stream.totalViewers = Math.max(stream.totalViewers, count);

    return stream.save();
};

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Start the stream
 */
LiveStreamSchema.methods.goLive = async function () {
    this.isLive = true;
    this.status = "live";
    this.startedAt = new Date();
    this.endedAt = null;
    this.duration = 0;
    return this.save();
};

/**
 * End the stream
 */
LiveStreamSchema.methods.endStream = async function () {
    this.isLive = false;
    this.status = "ended";
    this.endedAt = new Date();

    if (this.startedAt) {
        this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    }

    // Calculate average watch time
    if (this.viewerList?.length > 0) {
        const totalWatchTime = this.viewerList.reduce((sum, v) => sum + (v.watchTime || 0), 0);
        this.avgWatchTime = Math.floor(totalWatchTime / this.viewerList.length);
    }

    return this.save();
};

/**
 * Ban user from stream
 */
LiveStreamSchema.methods.banUser = async function (userId, username, reason, duration = null) {
    const banEntry = {
        userId,
        username,
        reason,
        bannedAt: new Date(),
        expiresAt: duration ? new Date(Date.now() + duration * 1000) : null
    };

    this.bannedUsers.push(banEntry);
    return this.save();
};

/**
 * Check if user is banned
 */
LiveStreamSchema.methods.isUserBanned = function (userId) {
    const ban = this.bannedUsers.find(b =>
        b.userId.toString() === userId.toString()
    );

    if (!ban) return false;
    if (!ban.expiresAt) return true; // Permanent ban
    return new Date() < ban.expiresAt;
};

/**
 * Add moderator
 */
LiveStreamSchema.methods.addModerator = async function (userId) {
    if (!this.moderators.includes(userId)) {
        this.moderators.push(userId);
        return this.save();
    }
    return this;
};

/**
 * Check if user is moderator
 */
LiveStreamSchema.methods.isModerator = function (userId) {
    return this.moderators.some(modId => modId.toString() === userId.toString());
};

// ===========================================
// EXPORT
// ===========================================
const LiveStream = mongoose.model("LiveStream", LiveStreamSchema);

module.exports = LiveStream;
module.exports.LiveStream = LiveStream;
module.exports.LiveStreamSchema = LiveStreamSchema;
module.exports.StreamGiftSchema = StreamGiftSchema;
module.exports.StreamChatSchema = StreamChatSchema;
module.exports.ViewerSchema = ViewerSchema;
module.exports.CoHostSchema = CoHostSchema;