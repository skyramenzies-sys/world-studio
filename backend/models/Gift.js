// backend/models/Gift.js
// World-Studio.live - Gift Model (UNIVERSE EDITION 🌌)
// Handles virtual gifts, tips, donations & SKYRA universe items

const mongoose = require("mongoose");

// ===========================================
// PREDEFINED GIFT ITEMS (SYNCED WITH FRONTEND)
// ===========================================
//
// key: {
//   name, icon, cost, category, tier, sound, animation,
//   multiplier?, lootbox?, quantum?
// }
//
// cost = base coin value per "unit" (amount * cost)

const GIFT_ITEMS = {
    // -------------------------
    // COMMON
    // -------------------------
    neon_spark: {
        name: "Neon Spark",
        icon: "✨",
        cost: 5,
        category: "common",
        tier: "common",
        sound: "pop",
        animation: "float",
    },
    pixel_heart: {
        name: "Pixel Heart",
        icon: "💟",
        cost: 10,
        category: "common",
        tier: "common",
        sound: "pop",
        animation: "float",
    },
    hologram_rose: {
        name: "Hologram Rose",
        icon: "🌹",
        cost: 15,
        category: "common",
        tier: "common",
        sound: "pop",
        animation: "float",
    },
    glow_stick: {
        name: "Glow Stick",
        icon: "🧪",
        cost: 20,
        category: "common",
        tier: "common",
        sound: "pop",
        animation: "float",
    },

    // -------------------------
    // RARE
    // -------------------------
    crystal_chip: {
        name: "Crystal Chip",
        icon: "💠",
        cost: 100,
        category: "rare",
        tier: "rare",
        sound: "sparkle",
        animation: "float",
    },
    laser_wave: {
        name: "Laser Wave",
        icon: "📡",
        cost: 150,
        category: "rare",
        tier: "rare",
        sound: "sparkle",
        animation: "rain",
    },

    // -------------------------
    // EPIC
    // -------------------------
    cyber_panther: {
        name: "Cyber Panther",
        icon: "🐆",
        cost: 300,
        category: "epic",
        tier: "epic",
        sound: "magic",
        animation: "spotlight",
    },
    teleport_gate: {
        name: "Teleport Gate",
        icon: "🌀",
        cost: 750,
        category: "epic",
        tier: "epic",
        sound: "magic",
        animation: "explode",
    },

    // -------------------------
    // LEGENDARY
    // -------------------------
    aurora_horizon: {
        name: "Aurora Horizon",
        icon: "🌈",
        cost: 2500,
        category: "legendary",
        tier: "legendary",
        sound: "magic",
        animation: "explode",
    },
    digital_palace: {
        name: "Digital Palace",
        icon: "🏰",
        cost: 4000,
        category: "legendary",
        tier: "legendary",
        sound: "fanfare",
        animation: "spotlight",
    },

    // -------------------------
    // MYTHIC
    // -------------------------
    phoenix_reboot: {
        name: "Phoenix Reboot",
        icon: "🐦‍🔥",
        cost: 6000,
        category: "mythic",
        tier: "mythic",
        sound: "cosmic",
        animation: "explode",
    },
    dragon_core: {
        name: "Dragon Core",
        icon: "🐉",
        cost: 8000,
        category: "mythic",
        tier: "mythic",
        sound: "roar",
        animation: "explode",
    },

    // -------------------------
    // CYBER
    // -------------------------
    ai_core: {
        name: "AI Core",
        icon: "🤖",
        cost: 3000,
        category: "cyber",
        tier: "cyber",
        sound: "sparkle",
        animation: "float",
    },
    neon_chip_rain: {
        name: "Neon Chip Rain",
        icon: "💾",
        cost: 6500,
        category: "cyber",
        tier: "cyber",
        sound: "magic",
        animation: "rain",
    },

    // -------------------------
    // COSMIC
    // -------------------------
    galaxy_orb: {
        name: "Galaxy Orb",
        icon: "🌌",
        cost: 15000,
        category: "cosmic",
        tier: "cosmic",
        sound: "cosmic",
        animation: "explode",
    },
    planet_drop: {
        name: "Planet Drop",
        icon: "🪐",
        cost: 30000,
        category: "cosmic",
        tier: "cosmic",
        sound: "explosion",
        animation: "explode",
    },

    // -------------------------
    // SKYRA ULTRA
    // -------------------------
    skyra_jetpack: {
        name: "SKYRA Jetpack",
        icon: "🧥",
        cost: 50000,
        category: "skyra",
        tier: "skyra",
        sound: "rocket",
        animation: "spotlight",
    },
    airpath_beam: {
        name: "AIRPATH Beam",
        icon: "🛰️",
        cost: 65000,
        category: "skyra",
        tier: "skyra",
        sound: "magic",
        animation: "explode",
    },
    commander_badge: {
        name: "Commander Badge",
        icon: "🎖️",
        cost: 80000,
        category: "skyra",
        tier: "skyra",
        sound: "fanfare",
        animation: "spotlight",
    },
    skyra_universe: {
        name: "SKYRA Universe",
        icon: "✨",
        cost: 100000,
        category: "skyra",
        tier: "skyra",
        sound: "cosmic",
        animation: "explode",
    },

    // -------------------------
    // MULTIPLIERS (VISUAL)
    // -------------------------
    x2_multiplier: {
        name: "x2 Multiplier",
        icon: "✖️2",
        cost: 2000,
        category: "cyber",
        tier: "cyber",
        sound: "magic",
        animation: "float",
        multiplier: 2,
    },
    x5_multiplier: {
        name: "x5 Multiplier",
        icon: "✖️5",
        cost: 5000,
        category: "epic",
        tier: "epic",
        sound: "magic",
        animation: "float",
        multiplier: 5,
    },
    x10_multiplier: {
        name: "x10 Multiplier",
        icon: "✖️10",
        cost: 12000,
        category: "mythic",
        tier: "mythic",
        sound: "cosmic",
        animation: "explode",
        multiplier: 10,
    },
    x25_multiplier: {
        name: "x25 Multiplier",
        icon: "✖️25",
        cost: 30000,
        category: "legendary",
        tier: "legendary",
        sound: "fanfare",
        animation: "spotlight",
        multiplier: 25,
    },
    x100_skyra_multiplier: {
        name: "x100 SKYRA Multiplier",
        icon: "💯",
        cost: 80000,
        category: "skyra",
        tier: "skyra",
        sound: "cosmic",
        animation: "explode",
        multiplier: 100,
    },

    // -------------------------
    // LOOTBOXES
    // -------------------------
    bronze_loot_box: {
        name: "Bronze Loot Box",
        icon: "📦",
        cost: 500,
        category: "common",
        tier: "common",
        sound: "magic",
        animation: "rain",
        lootbox: true,
    },
    silver_loot_box: {
        name: "Silver Loot Box",
        icon: "📦",
        cost: 2000,
        category: "rare",
        tier: "rare",
        sound: "magic",
        animation: "rain",
        lootbox: true,
    },
    gold_loot_box: {
        name: "Gold Loot Box",
        icon: "📦",
        cost: 5000,
        category: "epic",
        tier: "epic",
        sound: "magic",
        animation: "rain",
        lootbox: true,
    },
    diamond_loot_box: {
        name: "Diamond Loot Box",
        icon: "💎",
        cost: 15000,
        category: "legendary",
        tier: "legendary",
        sound: "magic",
        animation: "spotlight",
        lootbox: true,
    },
    skyra_quantum_box: {
        name: "SKYRA Quantum Box",
        icon: "⚡",
        cost: 75000,
        category: "skyra",
        tier: "skyra",
        sound: "cosmic",
        animation: "explode",
        lootbox: true,
        quantum: true,
    },

    // -------------------------
    // LEGACY / FALLBACK ITEMS
    // -------------------------
    heart: { name: "Heart", icon: "❤️", cost: 1, category: "basic", tier: "basic", sound: "pop", animation: "float" },
    star: { name: "Star", icon: "⭐", cost: 5, category: "basic", tier: "basic", sound: "pop", animation: "float" },
    fire: { name: "Fire", icon: "🔥", cost: 10, category: "basic", tier: "basic", sound: "pop", animation: "float" },
    rocket: { name: "Rocket", icon: "🚀", cost: 20, category: "basic", tier: "basic", sound: "rocket", animation: "spotlight" },
    diamond: { name: "Diamond", icon: "💎", cost: 50, category: "basic", tier: "basic", sound: "magic", animation: "spotlight" },

    coins: {
        name: "Coins",
        icon: "💰",
        cost: 0,
        category: "tip",
        tier: "tip",
        sound: "pop",
        animation: "float",
    },
    custom: {
        name: "Custom Gift",
        icon: "🎁",
        cost: 0,
        category: "custom",
        tier: "custom",
        sound: "magic",
        animation: "float",
    },
};

// ===========================================
// HELPER: FIND GIFT CONFIG BY KEY OR NAME
// ===========================================
function normalizeKey(str = "") {
    return str
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

function findGiftConfig(itemValue) {
    if (!itemValue) return GIFT_ITEMS.coins;

    // Try as key directly
    const key = normalizeKey(itemValue);
    if (GIFT_ITEMS[key]) return GIFT_ITEMS[key];

    // Try by name (case-insensitive)
    const lowerName = itemValue.toString().trim().toLowerCase();
    const byName = Object.values(GIFT_ITEMS).find(
        g => g.name.toLowerCase() === lowerName
    );
    if (byName) return byName;

    // Fallback
    return GIFT_ITEMS.coins;
}

// ===========================================
// GIFT SCHEMA
// ===========================================
const giftSchema = new mongoose.Schema(
    {
        // Sender Information
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        senderUsername: {
            type: String,
            trim: true,
        },
        senderAvatar: {
            type: String,
        },

        // Recipient Information
        recipientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        recipientUsername: {
            type: String,
            trim: true,
        },
        recipientAvatar: {
            type: String,
        },

        // Gift Details
        // `item` may be key ("neon_spark") OR name ("Neon Spark") from frontend
        item: {
            type: String,
            default: "coins",
            trim: true,
        },
        itemName: {
            type: String,
            default: "Coins",
        },
        icon: {
            type: String,
            default: "💰",
        },
        // "Universe" tier
        tier: {
            type: String,
            enum: [
                "basic",
                "common",
                "rare",
                "epic",
                "legendary",
                "mythic",
                "cyber",
                "cosmic",
                "skyra",
                "tip",
                "custom",
            ],
            default: "tip",
        },
        // Legacy / high-level category
        category: {
            type: String,
            enum: [
                "basic",
                "premium",
                "luxury",
                "tip",
                "custom",
                "common",
                "rare",
                "epic",
                "legendary",
                "mythic",
                "cyber",
                "cosmic",
                "skyra",
            ],
            default: "tip",
        },
        amount: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Amount must be a whole number",
            },
        },

        // Calculated coin value (for variable gifts)
        coinValue: {
            type: Number,
            min: 0,
            default: 0,
        },

        // Optional message
        message: {
            type: String,
            maxLength: 200,
            trim: true,
        },

        // Audio/sfx
        sound: {
            type: String,
            default: "pop",
        },

        // Multiplier / lootbox flags (Universe FX)
        multiplier: {
            type: Number,
            default: 1,
            min: 1,
        },
        isLootbox: {
            type: Boolean,
            default: false,
        },
        isQuantum: {
            type: Boolean,
            default: false,
        },

        // Context (where gift was sent)
        context: {
            type: String,
            enum: ["stream", "profile", "post", "chat", "pk_battle", "other"],
            default: "stream",
        },

        // Related Stream (if sent during live stream)
        streamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stream",
            index: true,
        },
        streamTitle: {
            type: String,
        },

        // Related Post (if sent on a post)
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        },

        // PK Battle (if sent during PK)
        pkBattleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PKBattle",
        },

        // Animation/effect for gift display
        animation: {
            type: String,
            enum: ["none", "float", "explode", "rain", "spotlight"],
            default: "float",
        },

        // Status
        status: {
            type: String,
            enum: ["pending", "completed", "refunded", "failed"],
            default: "completed",
        },

        // Platform fee (percentage taken by platform)
        platformFee: {
            type: Number,
            default: 0,
            min: 0,
        },

        // Amount recipient actually receives
        recipientReceives: {
            type: Number,
            min: 0,
        },

        // Is anonymous gift
        isAnonymous: {
            type: Boolean,
            default: false,
        },

        // Timestamps (manual + plugin)
        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
        },

        // For refund tracking
        refundedAt: {
            type: Date,
        },
        refundReason: {
            type: String,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ===========================================
// INDEXES FOR PERFORMANCE
// ===========================================
giftSchema.index({ senderId: 1, createdAt: -1 });
giftSchema.index({ recipientId: 1, createdAt: -1 });
giftSchema.index({ streamId: 1, createdAt: -1 });
giftSchema.index({ pkBattleId: 1 });
giftSchema.index({ createdAt: -1 });
giftSchema.index({ status: 1 });
giftSchema.index({ tier: 1 });
giftSchema.index({ category: 1 });

// Compound indexes for common queries
giftSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
giftSchema.index({ senderId: 1, status: 1, createdAt: -1 });
giftSchema.index({ streamId: 1, status: 1 });

// ===========================================
// VIRTUALS
// ===========================================

// Get gift item details
giftSchema.virtual("giftDetails").get(function () {
    return findGiftConfig(this.item);
});

// Check if gift is a tip (variable amount)
giftSchema.virtual("isTip").get(function () {
    return (
        this.item === "coins" ||
        this.category === "tip" ||
        this.tier === "tip"
    );
});

// Format amount with icon
giftSchema.virtual("displayAmount").get(function () {
    return `${this.icon} ${this.amount.toLocaleString()}`;
});

// ===========================================
// PRE-SAVE MIDDLEWARE
// ===========================================
giftSchema.pre("save", function (next) {
    // Map incoming item → config (supports key OR name)
    const giftConfig = findGiftConfig(this.item);

    // Persist final normalized itemName/icon/tier/category/etc.
    this.itemName = giftConfig.name || this.itemName;
    this.icon = giftConfig.icon || this.icon;
    this.category = giftConfig.category || this.category;
    this.tier = giftConfig.tier || this.tier;
    this.sound = giftConfig.sound || this.sound;
    this.animation = giftConfig.animation || this.animation || "float";

    if (giftConfig.multiplier && giftConfig.multiplier > 1) {
        this.multiplier = giftConfig.multiplier;
    }

    if (giftConfig.lootbox) {
        this.isLootbox = true;
    }
    if (giftConfig.quantum) {
        this.isQuantum = true;
    }

    // 🔥 Belangrijk: amount = coins, coinValue = amount
    // (dus geen cost * amount meer)
    const base = this.amount || 0;
    this.coinValue = base;

    // Calculate recipientReceives (after platform fee)
    if (base > 0 && this.platformFee > 0) {
        const fee = Math.floor(base * (this.platformFee / 100));
        this.recipientReceives = base - fee;
    } else {
        this.recipientReceives = base;
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
                status: "completed",
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$recipientReceives" },
                count: { $sum: 1 },
            },
        },
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
                status: "completed",
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
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
                status: "completed",
            },
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$amount" },
                count: { $sum: 1 },
                uniqueSenders: { $addToSet: "$senderId" },
            },
        },
        {
            $project: {
                total: 1,
                count: 1,
                uniqueSendersCount: { $size: "$uniqueSenders" },
            },
        },
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
                status: "completed",
            },
        },
        {
            $group: {
                _id: "$senderId",
                username: { $first: "$senderUsername" },
                avatar: { $first: "$senderAvatar" },
                total: { $sum: "$amount" },
                count: { $sum: 1 },
            },
        },
        { $sort: { total: -1 } },
        { $limit: limit },
    ]);
};

/**
 * Get recent gifts for display
 */
giftSchema.statics.getRecentGifts = async function (recipientId, limit = 20) {
    return this.find({
        recipientId,
        status: "completed",
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(
            "senderUsername senderAvatar item itemName icon amount message createdAt isAnonymous tier category"
        )
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
                count: { $sum: 1 },
            },
        },
        { $sort: { total: -1 } },
        { $limit: limit },
    ]);
};

/**
 * Admin Coin History (for dashboards)
 *
 * @param {Object} options
 * @param {"today"|"7d"|"30d"|"90d"|"all"} options.range
 * @param {"day"|"week"|"month"} options.groupBy
 * @returns {Promise<{summary, timeline, topStreamers, topSenders}>}
 */
giftSchema.statics.getAdminCoinHistory = async function (options = {}) {
    const range = options.range || "7d";
    const groupBy = options.groupBy || "day";

    const now = new Date();
    let startDate = null;

    if (range === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "7d") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
        // "all" → geen extra date filter
        startDate = null;
    }

    const match = { status: "completed" };
    if (startDate) {
        match.createdAt = { $gte: startDate };
    }

    const groupUnit =
        groupBy === "month" ? "month" : groupBy === "week" ? "week" : "day";

    const [result] = await this.aggregate([
        { $match: match },
        {
            $facet: {
                // SUMMARY
                summary: [
                    {
                        $group: {
                            _id: null,
                            totalCoins: { $sum: "$coinValue" },
                            senders: { $addToSet: "$senderId" },
                            receivers: { $addToSet: "$recipientId" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            totalCoins: 1,
                            totalSenders: { $size: "$senders" },
                            totalReceivers: { $size: "$receivers" },
                        },
                    },
                ],

                // TIMELINE
                timeline: [
                    {
                        $group: {
                            _id: {
                                bucket: {
                                    $dateTrunc: {
                                        date: "$createdAt",
                                        unit: groupUnit,
                                    },
                                },
                            },
                            coins: { $sum: "$coinValue" },
                            gifts: { $sum: 1 },
                            streamsSet: { $addToSet: "$streamId" },
                        },
                    },
                    { $sort: { "_id.bucket": 1 } },
                    {
                        $project: {
                            _id: 0,
                            date: "$_id.bucket",
                            coins: 1,
                            gifts: 1,
                            streams: {
                                $size: {
                                    $filter: {
                                        input: "$streamsSet",
                                        as: "s",
                                        cond: { $ne: ["$$s", null] },
                                    },
                                },
                            },
                        },
                    },
                ],

                // TOP STREAMERS
                topStreamers: [
                    {
                        $group: {
                            _id: "$recipientId",
                            recipientId: { $first: "$recipientId" },
                            username: { $first: "$recipientUsername" },
                            coins: { $sum: "$coinValue" },
                            streamsSet: { $addToSet: "$streamId" },
                        },
                    },
                    { $sort: { coins: -1 } },
                    { $limit: 50 },
                    {
                        $lookup: {
                            from: "users",
                            localField: "recipientId",
                            foreignField: "_id",
                            as: "user",
                        },
                    },
                    {
                        $unwind: {
                            path: "$user",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            userId: "$recipientId",
                            username: {
                                $ifNull: ["$username", "$user.username"],
                            },
                            coins: 1,
                            streams: {
                                $size: {
                                    $filter: {
                                        input: "$streamsSet",
                                        as: "s",
                                        cond: { $ne: ["$$s", null] },
                                    },
                                },
                            },
                            followers: {
                                $ifNull: ["$user.followersCount", 0],
                            },
                        },
                    },
                ],

                // TOP SENDERS
                topSenders: [
                    {
                        $group: {
                            _id: "$senderId",
                            senderId: { $first: "$senderId" },
                            username: { $first: "$senderUsername" },
                            coins: { $sum: "$coinValue" },
                            gifts: { $sum: 1 },
                        },
                    },
                    { $sort: { coins: -1 } },
                    { $limit: 50 },
                    {
                        $project: {
                            _id: 0,
                            userId: "$senderId",
                            username: 1,
                            coins: 1,
                            gifts: 1,
                        },
                    },
                ],
            },
        },
    ]);

    const summary = (result.summary && result.summary[0]) || {
        totalCoins: 0,
        totalSenders: 0,
        totalReceivers: 0,
    };

    let timeline = result.timeline || [];
    const topStreamers = result.topStreamers || [];
    const topSenders = result.topSenders || [];

    // Label voor grafiek
    timeline = timeline.map((entry) => {
        const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
        let label = "";

        if (groupUnit === "day") {
            label = `${d.getDate()}/${d.getMonth() + 1}`;
        } else if (groupUnit === "week") {
            label = `W${Math.ceil(d.getDate() / 7)} ${d.getMonth() + 1}/${d.getFullYear()}`;
        } else if (groupUnit === "month") {
            label = `${d.getMonth() + 1}/${d.getFullYear()}`;
        }

        return {
            ...entry,
            date: d,
            label,
        };
    });

    // Top streamer/sender in summary
    const topStreamerEntry = topStreamers[0] || null;
    const topSenderEntry = topSenders[0] || null;

    const extendedSummary = {
        ...summary,
        topStreamer: topStreamerEntry
            ? {
                username: topStreamerEntry.username,
                coins: topStreamerEntry.coins,
            }
            : null,
        topSender: topSenderEntry
            ? {
                username: topSenderEntry.username,
                coins: topSenderEntry.coins,
            }
            : null,
    };

    return {
        summary: extendedSummary,
        timeline,
        topStreamers,
        topSenders,
    };
};

/**
 * Expose gift config statically (optional helper)
 */
giftSchema.statics.getGiftConfig = function (itemValue) {
    return findGiftConfig(itemValue);
};

/**
 * Admin Coin History (for dashboards)
 *
 * @param {Object} options
 * @param {"today"|"7d"|"30d"|"90d"|"all"} options.range
 * @param {"day"|"week"|"month"} options.groupBy
 * @returns {Promise<{summary, timeline, topStreamers, topSenders}>}
 */
giftSchema.statics.getAdminCoinHistory = async function (options = {}) {
    const range = options.range || "7d";
    const groupBy = options.groupBy || "day";

    const now = new Date();
    let startDate = null;

    if (range === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "7d") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
        // "all" → geen extra date filter
        startDate = null;
    }

    const match = { status: "completed" };
    if (startDate) {
        match.createdAt = { $gte: startDate };
    }

    const groupUnit =
        groupBy === "month" ? "month" : groupBy === "week" ? "week" : "day";

    const [result] = await this.aggregate([
        { $match: match },
        {
            $facet: {
                // ---------------------
                // SUMMARY
                // ---------------------
                summary: [
                    {
                        $group: {
                            _id: null,
                            totalCoins: { $sum: "$coinValue" },
                            senders: { $addToSet: "$senderId" },
                            receivers: { $addToSet: "$recipientId" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            totalCoins: 1,
                            totalSenders: { $size: "$senders" },
                            totalReceivers: { $size: "$receivers" },
                        },
                    },
                ],

                // ---------------------
                // TIMELINE
                // ---------------------
                timeline: [
                    {
                        $group: {
                            _id: {
                                bucket: {
                                    $dateTrunc: {
                                        date: "$createdAt",
                                        unit: groupUnit,
                                    },
                                },
                            },
                            coins: { $sum: "$coinValue" },
                            gifts: { $sum: 1 },
                            streamsSet: { $addToSet: "$streamId" },
                        },
                    },
                    { $sort: { "_id.bucket": 1 } },
                    {
                        $project: {
                            _id: 0,
                            date: "$_id.bucket",
                            coins: 1,
                            gifts: 1,
                            streams: {
                                $size: {
                                    $filter: {
                                        input: "$streamsSet",
                                        as: "s",
                                        cond: { $ne: ["$$s", null] },
                                    },
                                },
                            },
                        },
                    },
                ],

                // ---------------------
                // TOP STREAMERS
                // ---------------------
                topStreamers: [
                    {
                        $group: {
                            _id: "$recipientId",
                            recipientId: { $first: "$recipientId" },
                            username: { $first: "$recipientUsername" },
                            coins: { $sum: "$coinValue" },
                            streamsSet: { $addToSet: "$streamId" },
                        },
                    },
                    { $sort: { coins: -1 } },
                    { $limit: 50 },
                    {
                        $lookup: {
                            from: "users",
                            localField: "recipientId",
                            foreignField: "_id",
                            as: "user",
                        },
                    },
                    {
                        $unwind: {
                            path: "$user",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            userId: "$recipientId",
                            username: {
                                $ifNull: ["$username", "$user.username"],
                            },
                            coins: 1,
                            streams: {
                                $size: {
                                    $filter: {
                                        input: "$streamsSet",
                                        as: "s",
                                        cond: { $ne: ["$$s", null] },
                                    },
                                },
                            },
                            followers: {
                                $ifNull: ["$user.followersCount", 0],
                            },
                        },
                    },
                ],

                // ---------------------
                // TOP SENDERS
                // ---------------------
                topSenders: [
                    {
                        $group: {
                            _id: "$senderId",
                            senderId: { $first: "$senderId" },
                            username: { $first: "$senderUsername" },
                            coins: { $sum: "$coinValue" },
                            gifts: { $sum: 1 },
                        },
                    },
                    { $sort: { coins: -1 } },
                    { $limit: 50 },
                    {
                        $project: {
                            _id: 0,
                            userId: "$senderId",
                            username: 1,
                            coins: 1,
                            gifts: 1,
                        },
                    },
                ],
            },
        },
    ]);

    const summary = (result.summary && result.summary[0]) || {
        totalCoins: 0,
        totalSenders: 0,
        totalReceivers: 0,
    };

    let timeline = result.timeline || [];
    const topStreamers = result.topStreamers || [];
    const topSenders = result.topSenders || [];

    // Voeg label toe voor frontend grafiek
    timeline = timeline.map((entry) => {
        const d = entry.date instanceof Date ? entry.date : new Date(entry.date);
        let label = "";

        if (groupUnit === "day") {
            label = `${d.getDate()}/${d.getMonth() + 1}`;
        } else if (groupUnit === "week") {
            // Week-achtige label (rough)
            label = `W${Math.ceil(d.getDate() / 7)} ${d.getMonth() + 1}/${d.getFullYear()}`;
        } else if (groupUnit === "month") {
            label = `${d.getMonth() + 1}/${d.getFullYear()}`;
        }

        return {
            ...entry,
            date: d,
            label,
        };
    });

    // Top streamer / sender in summary
    const topStreamerEntry = topStreamers[0] || null;
    const topSenderEntry = topSenders[0] || null;

    const extendedSummary = {
        ...summary,
        topStreamer: topStreamerEntry
            ? {
                username: topStreamerEntry.username,
                coins: topStreamerEntry.coins,
            }
            : null,
        topSender: topSenderEntry
            ? {
                username: topSenderEntry.username,
                coins: topSenderEntry.coins,
            }
            : null,
    };

    return {
        summary: extendedSummary,
        timeline,
        topStreamers,
        topSenders,
    };
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
        sound: this.sound,
        tier: this.tier,
        message: this.isAnonymous
            ? `Someone sent you ${this.displayAmount}!`
            : `${this.senderUsername} sent you ${this.displayAmount}!`,
        amount: this.amount,
        giftId: this._id,
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
module.exports.findGiftConfig = findGiftConfig;
