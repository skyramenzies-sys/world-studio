// backend/models/PK.js
// World-Studio.live - PK Battle Model (UNIVERSE EDITION 🌌)
// Handles live PK battles between streamers

const mongoose = require("mongoose");
const { Schema } = mongoose;

// ===========================================
// SUB-SCHEMAS
// ===========================================

/**
 * Gift Schema - Gifts sent during PK battle
 */
const PKGiftSchema = new Schema(
    {
        from: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        fromUsername: String,
        fromAvatar: String,
        to: {
            type: String,
            enum: ["challenger", "opponent"],
            required: true,
        },
        giftType: {
            type: String,
            default: "coins",
        },
        giftName: String,
        icon: {
            type: String,
            default: "💰",
        },
        amount: {
            type: Number,
            default: 1,
            min: 1,
        },
        coins: {
            type: Number,
            required: true,
            min: 1,
        },
        message: {
            type: String,
            maxLength: 100,
        },
        animation: {
            type: String,
            enum: ["none", "float", "explode", "rain"],
            default: "float",
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

/**
 * Participant Schema - Each side of the battle
 */
const ParticipantSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        username: String,
        avatar: String,
        streamId: {
            type: Schema.Types.ObjectId,
            ref: "LiveStream",
        },
        streamTitle: String,
        score: {
            type: Number,
            default: 0,
            min: 0,
        },
        giftsReceived: [PKGiftSchema],
        giftsCount: {
            type: Number,
            default: 0,
        },
        uniqueSupporters: {
            type: Number,
            default: 0,
        },
        viewerCount: {
            type: Number,
            default: 0,
        },
        peakViewers: {
            type: Number,
            default: 0,
        },
        isReady: {
            type: Boolean,
            default: false,
        },
        joinedAt: Date,
        connectionStatus: {
            type: String,
            enum: ["connected", "disconnected", "reconnecting"],
            default: "connected",
        },
    },
    { _id: false }
);

/**
 * Chat Message Schema - PK-specific chat
 */
const PKChatSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        username: String,
        avatar: String,
        text: String,
        side: {
            type: String,
            enum: ["challenger", "opponent", "spectator"],
        },
        type: {
            type: String,
            enum: ["message", "system", "gift", "cheer"],
            default: "message",
        },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: true }
);

// ===========================================
// MAIN PK BATTLE SCHEMA
// ===========================================
const PKBattleSchema = new Schema(
    {
        // Participants
        challenger: {
            type: ParticipantSchema,
            required: true,
        },
        opponent: {
            type: ParticipantSchema,
            required: true,
        },

        // Battle Settings
        title: {
            type: String,
            maxLength: 100,
            default: "PK Battle",
        },
        duration: {
            type: Number,
            default: 300, // seconds (5 minutes)
            min: 60, // Minimum 1 minute
            max: 3600, // Maximum 1 hour
        },
        durationMinutes: {
            type: Number,
            default: 5,
        },

        // Timing
        scheduledFor: Date,
        startTime: {
            type: Date,
            index: true,
        },
        endTime: {
            type: Date,
        },
        actualDuration: {
            type: Number, // Actual duration in seconds
            default: 0,
        },

        // Status
        status: {
            type: String,
            enum: [
                "pending",
                "accepted",
                "active",
                "paused",
                "finished",
                "declined",
                "cancelled",
                "expired",
            ],
            default: "pending",
            index: true,
        },
        statusReason: String, // Reason for cancellation/decline

        // Challenge Message
        challengeMessage: {
            type: String,
            maxLength: 200,
        },
        challengeSentAt: {
            type: Date,
            default: Date.now,
        },
        challengeExpiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 30000), // 30 seconds to accept
        },
        respondedAt: Date,

        // Results
        winner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        winnerUsername: String,
        winnerSide: {
            type: String,
            enum: ["challenger", "opponent", null],
            default: null,
        },
        winnerScore: {
            type: Number,
            default: 0,
        },
        loserScore: {
            type: Number,
            default: 0,
        },
        isDraw: {
            type: Boolean,
            default: false,
        },
        scoreDifference: {
            type: Number,
            default: 0,
        },

        // Viewers
        viewers: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        currentViewers: {
            type: Number,
            default: 0,
        },
        peakViewers: {
            type: Number,
            default: 0,
        },
        totalUniqueViewers: {
            type: Number,
            default: 0,
        },

        // Chat
        chat: [PKChatSchema],
        chatEnabled: {
            type: Boolean,
            default: true,
        },

        // Total Stats
        totalGifts: {
            type: Number,
            default: 0,
        },
        totalCoins: {
            type: Number,
            default: 0,
        },
        totalSupporters: {
            type: Number,
            default: 0,
        },

        // Room/Connection
        roomId: {
            type: String,
            unique: true,
            sparse: true,
        },

        // Privacy
        isPrivate: {
            type: Boolean,
            default: false,
        },
        inviteOnly: {
            type: Boolean,
            default: false,
        },

        // Moderation
        isReported: {
            type: Boolean,
            default: false,
        },
        reportReason: String,

        // Rematch
        rematchRequested: {
            type: Boolean,
            default: false,
        },
        rematchRequestedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        previousBattleId: {
            type: Schema.Types.ObjectId,
            ref: "PK",
        },
        nextBattleId: {
            type: Schema.Types.ObjectId,
            ref: "PK",
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
// status heeft al 'index: true' in het schema, dus geen extra losse index nodig

PKBattleSchema.index({ status: 1, startTime: -1 });
PKBattleSchema.index({ "challenger.user": 1, status: 1, createdAt: -1 });
PKBattleSchema.index({ "opponent.user": 1, status: 1, createdAt: -1 });
PKBattleSchema.index({ winner: 1 });
// createdAt krijgt al index via bovenstaande samengestelde indexes
PKBattleSchema.index({ startTime: -1 });



// ===========================================
// VIRTUALS
// ===========================================

/**
 * Time remaining in battle (seconds)
 */
PKBattleSchema.virtual("timeRemaining").get(function () {
    if (this.status !== "active" || !this.endTime) return 0;
    const remaining = Math.max(
        0,
        Math.floor((this.endTime.getTime() - Date.now()) / 1000)
    );
    return remaining;
});

/**
 * Time remaining formatted (mm:ss)
 */
PKBattleSchema.virtual("timeRemainingFormatted").get(function () {
    const remaining = this.timeRemaining;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

/**
 * Progress percentage (0-100)
 */
PKBattleSchema.virtual("progressPercentage").get(function () {
    if (this.status !== "active" || !this.startTime || !this.endTime) return 0;
    const total = this.endTime.getTime() - this.startTime.getTime();
    if (total <= 0) return 0;
    const elapsed = Date.now() - this.startTime.getTime();
    return Math.min(
        100,
        Math.max(0, Math.floor((elapsed / total) * 100))
    );
});

/**
 * Is battle expired (pending challenge timed out)
 */
PKBattleSchema.virtual("isExpired").get(function () {
    if (this.status !== "pending") return false;
    return this.challengeExpiresAt && new Date() > this.challengeExpiresAt;
});

/**
 * Battle URL
 */
PKBattleSchema.virtual("battleUrl").get(function () {
    return `https://world-studio.live/pk/${this._id}`;
});

/**
 * Score difference percentage
 */
PKBattleSchema.virtual("scoreDifferencePercent").get(function () {
    const total = (this.challenger.score || 0) + (this.opponent.score || 0);
    if (total === 0) return 0;
    return (
        (Math.abs((this.challenger.score || 0) - (this.opponent.score || 0)) /
            total) *
        100
    );
});

/**
 * Challenger percentage of total score
 */
PKBattleSchema.virtual("challengerPercentage").get(function () {
    const total = (this.challenger.score || 0) + (this.opponent.score || 0);
    if (total === 0) return 50;
    return Math.round(((this.challenger.score || 0) / total) * 100);
});

/**
 * Opponent percentage of total score
 */
PKBattleSchema.virtual("opponentPercentage").get(function () {
    return 100 - this.challengerPercentage;
});

// ===========================================
// PRE-SAVE MIDDLEWARE
// ===========================================
PKBattleSchema.pre("save", function (next) {
    // Generate room ID if not set
    if (!this.roomId && this.isNew) {
        this.roomId = `pk-${this._id}-${Date.now()}`;
    }

    // Update viewer stats
    if (this.currentViewers > this.peakViewers) {
        this.peakViewers = this.currentViewers;
    }

    // Update participant unique supporters
    if (this.challenger?.giftsReceived?.length > 0) {
        const uniqueChallengerSupporters = new Set(
            this.challenger.giftsReceived
                .map((g) => g.from && g.from.toString())
                .filter(Boolean)
        );
        this.challenger.uniqueSupporters = uniqueChallengerSupporters.size;
    }

    if (this.opponent?.giftsReceived?.length > 0) {
        const uniqueOpponentSupporters = new Set(
            this.opponent.giftsReceived
                .map((g) => g.from && g.from.toString())
                .filter(Boolean)
        );
        this.opponent.uniqueSupporters = uniqueOpponentSupporters.size;
    }

    // Calculate totals
    this.totalGifts =
        (this.challenger?.giftsReceived?.length || 0) +
        (this.opponent?.giftsReceived?.length || 0);
    this.totalCoins = (this.challenger.score || 0) + (this.opponent.score || 0);

    // Calculate score difference
    this.scoreDifference = Math.abs(
        (this.challenger.score || 0) - (this.opponent.score || 0)
    );

    next();
});

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Determine winner based on scores
 */
PKBattleSchema.methods.determineWinner = function () {
    const cScore = this.challenger.score || 0;
    const oScore = this.opponent.score || 0;

    if (cScore > oScore) {
        this.winner = this.challenger.user;
        this.winnerUsername = this.challenger.username;
        this.winnerSide = "challenger";
        this.winnerScore = cScore;
        this.loserScore = oScore;
        this.isDraw = false;
    } else if (oScore > cScore) {
        this.winner = this.opponent.user;
        this.winnerUsername = this.opponent.username;
        this.winnerSide = "opponent";
        this.winnerScore = oScore;
        this.loserScore = cScore;
        this.isDraw = false;
    } else {
        this.isDraw = true;
        this.winner = null;
        this.winnerUsername = null;
        this.winnerSide = null;
        this.winnerScore = cScore;
        this.loserScore = oScore;
    }

    this.scoreDifference = Math.abs(cScore - oScore);
    return this;
};

/**
 * Accept the challenge
 */
PKBattleSchema.methods.accept = async function () {
    if (this.status !== "pending") {
        throw new Error("Can only accept pending challenges");
    }

    this.status = "accepted";
    this.respondedAt = new Date();
    this.opponent.isReady = true;

    return this.save();
};

/**
 * Decline the challenge
 */
PKBattleSchema.methods.decline = async function (reason = null) {
    if (this.status !== "pending") {
        throw new Error("Can only decline pending challenges");
    }

    this.status = "declined";
    this.respondedAt = new Date();
    this.statusReason = reason;

    return this.save();
};

/**
 * Start the battle
 */
PKBattleSchema.methods.start = async function () {
    if (this.status !== "accepted" && this.status !== "pending") {
        throw new Error("Battle must be accepted before starting");
    }

    const now = new Date();
    this.status = "active";
    this.startTime = now;
    this.endTime = new Date(now.getTime() + this.duration * 1000);
    this.challenger.isReady = true;
    this.opponent.isReady = true;
    this.challenger.joinedAt = now;
    this.opponent.joinedAt = now;

    return this.save();
};

/**
 * End the battle
 */
PKBattleSchema.methods.end = async function () {
    if (this.status !== "active") {
        throw new Error("Can only end active battles");
    }

    this.status = "finished";
    this.endTime = new Date();

    if (this.startTime) {
        this.actualDuration = Math.floor(
            (this.endTime.getTime() - this.startTime.getTime()) / 1000
        );
    }

    this.determineWinner();

    return this.save();
};

/**
 * Cancel the battle
 */
PKBattleSchema.methods.cancel = async function (reason = null) {
    if (this.status === "finished") {
        throw new Error("Cannot cancel finished battles");
    }

    this.status = "cancelled";
    this.statusReason = reason;
    this.endTime = new Date();

    return this.save();
};

/**
 * Add gift to a participant
 */
PKBattleSchema.methods.addGift = function (side, gift) {
    if (side !== "challenger" && side !== "opponent") {
        throw new Error("Invalid side: must be challenger or opponent");
    }

    gift.to = side;
    this[side].giftsReceived.push(gift);
    this[side].score += gift.coins;
    this[side].giftsCount += 1;

    return this;
};

/**
 * Add chat message
 */
PKBattleSchema.methods.addChatMessage = function (message) {
    this.chat.push(message);

    // Keep only last 200 messages
    if (this.chat.length > 200) {
        this.chat = this.chat.slice(-200);
    }

    return this;
};

/**
 * Update viewer count
 */
PKBattleSchema.methods.updateViewers = function (count, viewerIds = []) {
    this.currentViewers = count;

    if (count > this.peakViewers) {
        this.peakViewers = count;
    }

    // Add unique viewers (cast naar string om goed te vergelijken)
    const existing = new Set(this.viewers.map((v) => v.toString()));
    viewerIds.forEach((id) => {
        const idStr = id.toString();
        if (!existing.has(idStr)) {
            this.viewers.push(id);
            existing.add(idStr);
        }
    });

    this.totalUniqueViewers = this.viewers.length;

    return this;
};

/**
 * Get result summary
 */
PKBattleSchema.methods.getResultSummary = function () {
    return {
        battleId: this._id,
        status: this.status,
        isDraw: this.isDraw,
        winner: this.winner,
        winnerUsername: this.winnerUsername,
        winnerSide: this.winnerSide,
        winnerScore: this.winnerScore,
        loserScore: this.loserScore,
        scoreDifference: this.scoreDifference,
        challenger: {
            userId: this.challenger.user,
            username: this.challenger.username,
            score: this.challenger.score,
            giftsCount: this.challenger.giftsCount,
            supporters: this.challenger.uniqueSupporters,
        },
        opponent: {
            userId: this.opponent.user,
            username: this.opponent.username,
            score: this.opponent.score,
            giftsCount: this.opponent.giftsCount,
            supporters: this.opponent.uniqueSupporters,
        },
        duration: this.actualDuration,
        peakViewers: this.peakViewers,
        totalGifts: this.totalGifts,
        totalCoins: this.totalCoins,
    };
};

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Get active battles
 */
PKBattleSchema.statics.getActiveBattles = async function (limit = 20) {
    return this.find({ status: "active" })
        .sort({ currentViewers: -1, startTime: -1 })
        .limit(limit)
        .populate("challenger.user", "username avatar")
        .populate("opponent.user", "username avatar")
        .select("-chat -viewers")
        .lean();
};

/**
 * Get user's battle history
 */
PKBattleSchema.statics.getUserBattles = async function (userId, options = {}) {
    const { limit = 20, skip = 0, status } = options;

    const query = {
        $or: [{ "challenger.user": userId }, { "opponent.user": userId }],
    };

    if (status) {
        query.status = status;
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("challenger.user", "username avatar")
        .populate("opponent.user", "username avatar")
        .populate("winner", "username avatar")
        .select("-chat -viewers")
        .lean();
};

/**
 * Get user's battle stats
 */
PKBattleSchema.statics.getUserStats = async function (userId) {
    const battles = await this.find({
        $or: [{ "challenger.user": userId }, { "opponent.user": userId }],
        status: "finished",
    }).lean();

    let wins = 0,
        losses = 0,
        draws = 0;
    let totalScore = 0,
        totalCoins = 0;

    battles.forEach((battle) => {
        if (battle.isDraw) {
            draws++;
        } else if (battle.winner?.toString() === userId.toString()) {
            wins++;
        } else {
            losses++;
        }

        // Add score from user's side
        if (battle.challenger.user.toString() === userId.toString()) {
            totalScore += battle.challenger.score || 0;
        } else {
            totalScore += battle.opponent.score || 0;
        }

        totalCoins += battle.totalCoins || 0;
    });

    return {
        total: battles.length,
        wins,
        losses,
        draws,
        winRate: battles.length > 0 ? Math.round((wins / battles.length) * 100) : 0,
        totalScore,
        averageScore:
            battles.length > 0 ? Math.round(totalScore / battles.length) : 0,
    };
};

/**
 * Get pending challenge for user
 */
PKBattleSchema.statics.getPendingChallenge = async function (userId) {
    return this.findOne({
        "opponent.user": userId,
        status: "pending",
        challengeExpiresAt: { $gt: new Date() },
    }).populate("challenger.user", "username avatar");
};

/**
 * Clean up expired challenges
 */
PKBattleSchema.statics.cleanupExpired = async function () {
    const result = await this.updateMany(
        {
            status: "pending",
            challengeExpiresAt: { $lt: new Date() },
        },
        {
            $set: {
                status: "expired",
                statusReason: "Challenge expired",
            },
        }
    );

    if (result.modifiedCount > 0) {
        console.log(
            `🧹 Cleaned up ${result.modifiedCount} expired PK challenges`
        );
    }

    return result;
};

/**
 * Get leaderboard
 */
PKBattleSchema.statics.getLeaderboard = async function (
    period = "week",
    limit = 50
) {
    const dateFilter = {};
    const now = new Date();

    if (period === "day") {
        dateFilter.createdAt = { $gte: new Date(now - 24 * 60 * 60 * 1000) };
    } else if (period === "week") {
        dateFilter.createdAt = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
    } else if (period === "month") {
        dateFilter.createdAt = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
    }

    // Simplified leaderboard
    const battles = await this.find({
        ...dateFilter,
        status: "finished",
    }).lean();

    const userStats = {};

    battles.forEach((battle) => {
        // Process challenger
        const cId = battle.challenger.user.toString();
        if (!userStats[cId]) {
            userStats[cId] = {
                wins: 0,
                battles: 0,
                score: 0,
                username: battle.challenger.username,
            };
        }
        userStats[cId].battles++;
        userStats[cId].score += battle.challenger.score || 0;
        if (battle.winner?.toString() === cId) userStats[cId].wins++;

        // Process opponent
        const oId = battle.opponent.user.toString();
        if (!userStats[oId]) {
            userStats[oId] = {
                wins: 0,
                battles: 0,
                score: 0,
                username: battle.opponent.username,
            };
        }
        userStats[oId].battles++;
        userStats[oId].score += battle.opponent.score || 0;
        if (battle.winner?.toString() === oId) userStats[oId].wins++;
    });

    return Object.entries(userStats)
        .map(([id, stats]) => ({
            userId: id,
            ...stats,
            winRate: Math.round((stats.wins / stats.battles) * 100),
        }))
        .sort((a, b) => b.wins - a.wins || b.score - a.score)
        .slice(0, limit);
};

// ===========================================
// EXPORT
// ===========================================
const PK = mongoose.model("PK", PKBattleSchema);

module.exports = PK;
module.exports.PK = PK;
module.exports.PKBattle = PK; // Alias
module.exports.PKBattleSchema = PKBattleSchema;
module.exports.ParticipantSchema = ParticipantSchema;
module.exports.PKGiftSchema = PKGiftSchema;
module.exports.PKChatSchema = PKChatSchema;
