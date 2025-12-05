// backend/models/Gift.js
// World-Studio.live - Gift Model
// Handles virtual gifts, tips, and donations between users

const mongoose = require("mongoose");

// ===========================================
// PREDEFINED GIFT ITEMS
// ===========================================
const GIFT_ITEMS = {
    // Basic Gifts (1-50 coins)
    heart: { name: "Heart", icon: "❤️", cost: 1, category: "basic" },
    star: { name: "Star", icon: "⭐", cost: 5, category: "basic" },
    fire: { name: "Fire", icon: "🔥", cost: 10, category: "basic" },
    rocket: { name: "Rocket", icon: "🚀", cost: 20, category: "basic" },
    diamond: { name: "Diamond", icon: "💎", cost: 50, category: "basic" },

    // Premium Gifts (100-500 coins)
    crown: { name: "Crown", icon: "👑", cost: 100, category: "premium" },
    rose: { name: "Rose Bouquet", icon: "🌹", cost: 150, category: "premium" },
    trophy: { name: "Trophy", icon: "🏆", cost: 200, category: "premium" },
    unicorn: { name: "Unicorn", icon: "🦄", cost: 300, category: "premium" },
    castle: { name: "Castle", icon: "🏰", cost: 500, category: "premium" },

    // Luxury Gifts (1000+ coins)
    galaxy: { name: "Galaxy", icon: "🌌", cost: 1000, category: "luxury" },
    planet: { name: "Planet", icon: "🪐", cost: 2000, category: "luxury" },
    yacht: { name: "Yacht", icon: "🛥️", cost: 5000, category: "luxury" },
    jet: { name: "Private Jet", icon: "✈️", cost: 10000, category: "luxury" },
    island: { name: "Island", icon: "🏝️", cost: 50000, category: "luxury" },

    // Special/Custom
    coins: { name: "Coins", icon: "💰", cost: 0, category: "tip" }, // Variable amount
    custom: { name: "Custom Gift", icon: "🎁", cost: 0, category: "custom" },
};

// ===========================================
// GIFT SCHEMA
// ===========================================
const giftSchema = new mongoose.Schema({
    // Sender Information
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    senderUsername: {
        type: String,
        trim: true
    },
    senderAvatar: {
        type: String
    },

    // Recipient Information
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    recipientUsername: {
        type: String,
        trim: true
    },
    recipientAvatar: {
        type: String
    },

    // Gift Details
    item: {
        type: String,
        default: "coins",
        trim: true,
        lowercase: true
    },
    itemName: {
        type: String,
        default: "Coins"
    },
    icon: {
        type: String,
        default: "💰"
    },
    amount: {
        type: Number,
        required: true,
        min: 1,
        validate: {
            validator: Number.isInteger,
            message: "Amount must be a whole number"
        }
    },

    // Calculated coin value (for variable gifts)
    coinValue: {
        type: Number,
        min: 0,
        default: 0
    },

    // Optional message
    message: {
        type: String,
        maxLength: 200,
        trim: true
    },

    // Context (where gift was sent)
    context: {
        type: String,
        enum: ["stream", "profile", "post", "chat", "pk_battle", "other"],
        default: "stream"
    },

    // Related Stream (if sent during live stream)
    streamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stream",
        index: true
    },
    streamTitle: {
        type: String
    },

    // Related Post (if sent on a post)
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
    },

    // PK Battle (if sent during PK)
    pkBattleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PKBattle"
    },

    // Gift category
    category: {
        type: String,
        enum: ["basic", "premium", "luxury", "tip", "custom"],
        default: "tip"
    },

    // Animation/effect for gift display
    animation: {
        type: String,
        enum: ["none", "float", "explode", "rain", "spotlight"],
        default: "float"
    },

    // Status
    status: {
        type: String,
        enum: ["pending", "completed", "refunded", "failed"],
        default: "completed"
    },

    // Platform fee (percentage taken by platform)
    platformFee: {
        type: Number,
        default: 0,
        min: 0
    },

    // Amount recipient actually receives
    recipientReceives: {
        type: Number,
        min: 0
    },

    // Is anonymous gift
    isAnonymous: {
        type: Boolean,
        default: false
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    // For refund tracking
    refundedAt: {
        type: Date
    },
    refundReason: {
        type: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===========================================
// INDEXES FOR PERFORMANCE
// ===========================================
giftSchema.index({ senderId: 1, createdAt: -1 });
giftSchema.index({ recipientId: 1, createdAt: -1 });
giftSchema.index({ streamId: 1, createdAt: -1 });
giftSchema.index({ pkBattleId: 1 });
giftSchema.index({ createdAt: -1 });
giftSchema.index({ status: 1 });

// Compound indexes for common queries
giftSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
giftSchema.index({ senderId: 1, status: 1, createdAt: -1 });
giftSchema.index({ streamId: 1, status: 1 });

// ===========================================
// VIRTUALS
// ===========================================

// Get gift item details
giftSchema.virtual("giftDetails").get(function () {
    return GIFT_ITEMS[this.item] || GIFT_ITEMS.coins;
});

// Check if gift is a tip (variable amount)
giftSchema.virtual("isTip").get(function () {
    return this.item === "coins" || this.category === "tip";
});

// Format amount with icon
giftSchema.virtual("displayAmount").get(function () {
    return `${this.icon} ${this.amount.toLocaleString()}`;
});

// ===========================================
// PRE-SAVE MIDDLEWARE
// ===========================================
giftSchema.pre("save", function (next) {
    // Set gift details from predefined items
    if (this.item && GIFT_ITEMS[this.item]) {
        const giftItem = GIFT_ITEMS[this.item];
        this.itemName = giftItem.name;
        this.icon = giftItem.icon;
        this.category = giftItem.category;

        // For predefined gifts, coin value is the cost * quantity
        if (giftItem.cost > 0) {
            this.coinValue = giftItem.cost * this.amount;
        }
    }

    // Calculate recipient receives (after platform fee)
    if (this.coinValue > 0 && this.platformFee > 0) {
        const fee = Math.floor(this.coinValue * (this.platformFee / 100));
        this.recipientReceives = this.coinValue - fee;
    } else if (this.coinValue > 0) {
        this.recipientReceives = this.coinValue;
    } else {
        // For direct coin tips
        const fee = Math.floor(this.amount * (this.platformFee / 100));
        this.recipientReceives = this.amount - fee;
    }

    next();
});

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Get total gifts received by user
 */
giftSchema.statics.getTotalReceived = async function (userId) {
    const result = await this.aggregate([
        {
            $match: {
                recipientId: new mongoose.Types.ObjectId(userId),
                status: "completed"
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$recipientReceives" },
                count: { $sum: 1 }
            }
        }
    ]);

    return result[0] || { total: 0, count: 0 };
};

/**
 * Get total gifts sent by user
 */
giftSchema.statics.getTotalSent = async function (userId) {
    const result = await this.aggregate([
        {
            $match: {
                senderId: new mongoose.Types.ObjectId(userId),
                status: "completed"
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        }
    ]);

    return result[0] || { total: 0, count: 0 };
};

/**
 * Get stream gift stats
 */
giftSchema.statics.getStreamStats = async function (streamId) {
    const result = await this.aggregate([
        {
            $match: {
                streamId: new mongoose.Types.ObjectId(streamId),
                status: "completed"
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$amount" },
                count: { $sum: 1 },
                uniqueSenders: { $addToSet: "$senderId" }
            }
        },
        {
            $project: {
                total: 1,
                count: 1,
                uniqueSendersCount: { $size: "$uniqueSenders" }
            }
        }
    ]);

    return result[0] || { total: 0, count: 0, uniqueSendersCount: 0 };
};

/**
 * Get top gifters for a stream
 */
giftSchema.statics.getTopGifters = async function (streamId, limit = 10) {
    return this.aggregate([
        {
            $match: {
                streamId: new mongoose.Types.ObjectId(streamId),
                status: "completed"
            }
        },
        {
            $group: {
                _id: "$senderId",
                username: { $first: "$senderUsername" },
                avatar: { $first: "$senderAvatar" },
                total: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        },
        { $sort: { total: -1 } },
        { $limit: limit }
    ]);
};

/**
 * Get recent gifts for display
 */
giftSchema.statics.getRecentGifts = async function (recipientId, limit = 20) {
    return this.find({
        recipientId,
        status: "completed"
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("senderUsername senderAvatar item icon amount message createdAt isAnonymous")
        .lean();
};

/**
 * Get gift leaderboard (top recipients)
 */
giftSchema.statics.getLeaderboard = async function (period = "week", limit = 50) {
    const dateFilter = {};
    const now = new Date();

    if (period === "day") {
        dateFilter.createdAt = { $gte: new Date(now - 24 * 60 * 60 * 1000) };
    } else if (period === "week") {
        dateFilter.createdAt = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
    } else if (period === "month") {
        dateFilter.createdAt = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
    }

    return this.aggregate([
        { $match: { ...dateFilter, status: "completed" } },
        {
            $group: {
                _id: "$recipientId",
                username: { $first: "$recipientUsername" },
                avatar: { $first: "$recipientAvatar" },
                total: { $sum: "$recipientReceives" },
                count: { $sum: 1 }
            }
        },
        { $sort: { total: -1 } },
        { $limit: limit }
    ]);
};

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Refund this gift
 */
giftSchema.methods.refund = async function (reason = "Requested refund") {
    if (this.status === "refunded") {
        throw new Error("Gift already refunded");
    }

    this.status = "refunded";
    this.refundedAt = new Date();
    this.refundReason = reason;

    return this.save();
};

/**
 * Get display format for notifications
 */
giftSchema.methods.toNotification = function () {
    return {
        type: "gift_received",
        icon: this.icon,
        message: this.isAnonymous
            ? `Someone sent you ${this.displayAmount}!`
            : `${this.senderUsername} sent you ${this.displayAmount}!`,
        amount: this.amount,
        giftId: this._id
    };
};

// ===========================================
// EXPORT MODEL & CONSTANTS
// ===========================================
const Gift = mongoose.model("Gift", giftSchema);

module.exports = Gift;
module.exports.Gift = Gift;
module.exports.GIFT_ITEMS = GIFT_ITEMS;
module.exports.giftSchema = giftSchema;