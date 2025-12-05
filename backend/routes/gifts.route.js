// backend/routes/gifts.route.js
// World-Studio.live - Gift System Routes
// Handles sending gifts, history, leaderboards, and analytics

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Gift = require("../models/Gift");
const Stream = require("../models/Stream");
const PlatformWallet = require("../models/PlatformWallet");
const authMiddleware = require("../middleware/authMiddleware");

// ===========================================
// GIFT DEFINITIONS
// ===========================================
const GIFT_TYPES = {
    // Basic Gifts
    "Rose": { icon: "🌹", minAmount: 10, category: "basic" },
    "Heart": { icon: "❤️", minAmount: 25, category: "basic" },
    "Star": { icon: "⭐", minAmount: 5, category: "basic" },
    "Fire": { icon: "🔥", minAmount: 15, category: "basic" },

    // Premium Gifts
    "Diamond": { icon: "💎", minAmount: 50, category: "premium" },
    "Crown": { icon: "👑", minAmount: 100, category: "premium" },
    "Trophy": { icon: "🏆", minAmount: 150, category: "premium" },

    // Luxury Gifts
    "Rocket": { icon: "🚀", minAmount: 250, category: "luxury" },
    "Universe": { icon: "🌌", minAmount: 500, category: "luxury" },
    "Planet": { icon: "🪐", minAmount: 1000, category: "luxury" },

    // Special
    "Coins": { icon: "💰", minAmount: 1, category: "tip" },
};

// Platform takes 15%, creator gets 85%
const PLATFORM_FEE_PERCENT = 15;
const CREATOR_SHARE_PERCENT = 85;

// Export for use in other files
router.GIFT_TYPES = GIFT_TYPES;

// ===========================================
// GET GIFT TYPES
// ===========================================

/**
 * GET /api/gifts/types
 * Get all available gift types
 */
router.get("/types", (req, res) => {
    const gifts = Object.entries(GIFT_TYPES).map(([name, data]) => ({
        name,
        ...data
    }));

    res.json({
        success: true,
        gifts,
        platformFee: `${PLATFORM_FEE_PERCENT}%`,
        creatorShare: `${CREATOR_SHARE_PERCENT}%`
    });
});

// ===========================================
// SEND GIFT
// ===========================================

/**
 * POST /api/gifts
 * Send a gift to a user
 */
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            recipientId,
            item = "Coins",
            amount,
            message,
            streamId,
            pkBattleId,
            isAnonymous = false
        } = req.body;

        const sender = req.user;

        // Validation
        if (!recipientId) {
            return res.status(400).json({
                success: false,
                error: "Recipient is required"
            });
        }

        if (!amount || amount < 1) {
            return res.status(400).json({
                success: false,
                error: "Amount must be at least 1 coin"
            });
        }

        if (amount > 100000) {
            return res.status(400).json({
                success: false,
                error: "Maximum gift is 100,000 coins"
            });
        }

        if (recipientId === sender._id.toString()) {
            return res.status(400).json({
                success: false,
                error: "Cannot send gift to yourself"
            });
        }

        // Check balance
        const senderBalance = sender.wallet?.balance || 0;
        if (senderBalance < amount) {
            return res.status(400).json({
                success: false,
                error: "Insufficient balance",
                balance: senderBalance,
                required: amount
            });
        }

        // Find recipient
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                error: "Recipient not found"
            });
        }

        if (recipient.isBanned) {
            return res.status(400).json({
                success: false,
                error: "Cannot send gift to this user"
            });
        }

        // Get gift type info
        const giftType = GIFT_TYPES[item] || GIFT_TYPES["Coins"];
        const icon = giftType.icon;

        // Validate minimum amount
        if (amount < giftType.minAmount) {
            return res.status(400).json({
                success: false,
                error: `Minimum for ${item} is ${giftType.minAmount} coins`
            });
        }

        // Calculate shares (85% creator, 15% platform)
        const platformFee = Math.floor(amount * (PLATFORM_FEE_PERCENT / 100));
        const creatorShare = amount - platformFee;

        // Create gift record
        const gift = await Gift.create({
            senderId: sender._id,
            senderUsername: isAnonymous ? "Anonymous" : sender.username,
            senderAvatar: isAnonymous ? "" : sender.avatar,
            recipientId: recipient._id,
            recipientUsername: recipient.username,
            recipientAvatar: recipient.avatar,
            item: item || "Coins",
            itemName: item,
            icon,
            amount,
            coinValue: amount,
            message: message?.slice(0, 200) || "",
            streamId: streamId || null,
            pkBattleId: pkBattleId || null,
            platformFee: PLATFORM_FEE_PERCENT,
            recipientReceives: creatorShare,
            isAnonymous,
            status: "completed"
        });

        // Deduct from sender
        await User.findByIdAndUpdate(sender._id, {
            $inc: {
                "wallet.balance": -amount,
                "wallet.totalSpent": amount,
                "stats.totalGiftsSent": 1,
                "stats.totalGiftsSentValue": amount
            },
            $push: {
                "wallet.transactions": {
                    $each: [{
                        type: "gift_sent",
                        amount: -amount,
                        description: `Sent ${icon} ${item} to ${recipient.username}`,
                        status: "completed",
                        relatedUserId: recipient._id,
                        relatedUsername: recipient.username,
                        giftId: gift._id,
                        createdAt: new Date()
                    }],
                    $slice: -500
                }
            }
        });

        // Add to recipient (creator share only)
        await User.findByIdAndUpdate(recipient._id, {
            $inc: {
                "wallet.balance": creatorShare,
                "wallet.totalReceived": creatorShare,
                "wallet.totalEarned": creatorShare,
                "stats.totalGiftsReceived": 1,
                "stats.totalGiftsReceivedValue": amount
            },
            $push: {
                "wallet.transactions": {
                    $each: [{
                        type: "gift_received",
                        amount: creatorShare,
                        description: `Received ${icon} ${item} from ${isAnonymous ? "Anonymous" : sender.username}`,
                        status: "completed",
                        relatedUserId: isAnonymous ? null : sender._id,
                        relatedUsername: isAnonymous ? "Anonymous" : sender.username,
                        giftId: gift._id,
                        meta: { originalAmount: amount, platformFee, item, icon },
                        createdAt: new Date()
                    }],
                    $slice: -500
                },
                notifications: {
                    $each: [{
                        message: `${isAnonymous ? "Someone" : sender.username} sent you ${icon} ${item} (${amount} coins)${message ? `: "${message}"` : ""}`,
                        type: "gift",
                        fromUser: isAnonymous ? null : sender._id,
                        fromUsername: isAnonymous ? "Anonymous" : sender.username,
                        fromAvatar: isAnonymous ? "" : sender.avatar,
                        giftId: gift._id,
                        amount,
                        icon,
                        read: false,
                        createdAt: new Date(),
                    }],
                    $slice: -100
                }
            },
            $inc: { unreadNotifications: 1 }
        });

        // Record platform fee
        try {
            if (PlatformWallet && platformFee > 0) {
                const wallet = await PlatformWallet.getWallet();
                if (wallet && wallet.recordGiftFee) {
                    await wallet.recordGiftFee(amount, sender._id, sender.username, gift._id);
                }
            }
        } catch (err) {
            console.log("Platform fee recording skipped:", err.message);
        }

        // Update stream if applicable
        if (streamId && Stream) {
            try {
                await Stream.findByIdAndUpdate(streamId, {
                    $inc: {
                        totalGifts: amount,
                        totalGiftsCount: 1
                    },
                    $push: {
                        recentGifts: {
                            $each: [{
                                userId: sender._id,
                                username: isAnonymous ? "Anonymous" : sender.username,
                                giftType: item,
                                icon,
                                amount,
                                coins: amount,
                                timestamp: new Date()
                            }],
                            $slice: -50
                        }
                    }
                });
            } catch (err) {
                console.log("Stream gift update skipped");
            }
        }

        // Emit socket events
        const io = req.app.get("io");
        if (io) {
            const giftEvent = {
                _id: gift._id,
                senderId: isAnonymous ? null : sender._id,
                senderUsername: isAnonymous ? "Anonymous" : sender.username,
                senderAvatar: isAnonymous ? "" : sender.avatar,
                recipientId: recipient._id,
                recipientUsername: recipient.username,
                item,
                icon,
                amount,
                creatorShare,
                message,
                timestamp: new Date()
            };

            // Notify recipient
            io.to(`user_${recipient._id}`).emit("gift_received", giftEvent);
            io.to(`user_${recipient._id}`).emit("notification", {
                type: "gift",
                message: `${isAnonymous ? "Someone" : sender.username} sent you ${icon}!`,
                amount,
                icon
            });
            io.to(`user_${recipient._id}`).emit("wallet_update", {
                balance: (recipient.wallet?.balance || 0) + creatorShare
            });

            // Notify sender
            io.to(`user_${sender._id}`).emit("gift_sent", {
                success: true,
                gift: giftEvent,
                newBalance: senderBalance - amount
            });
            io.to(`user_${sender._id}`).emit("wallet_update", {
                balance: senderBalance - amount
            });

            // Stream events
            if (streamId) {
                io.to(streamId).emit("stream_gift", giftEvent);
                io.to(`stream_${streamId}`).emit("stream_gift", giftEvent);
            }

            // PK battle events
            if (pkBattleId) {
                io.to(`pk_${pkBattleId}`).emit("pk_gift", {
                    ...giftEvent,
                    recipientId: recipient._id
                });
            }
        }

        console.log(`🎁 Gift: ${sender.username} → ${recipient.username}: ${amount} ${item}`);

        res.status(201).json({
            success: true,
            message: "Gift sent successfully!",
            gift: {
                _id: gift._id,
                item,
                icon,
                amount,
                recipientUsername: recipient.username,
                creatorShare,
                platformFee
            },
            newBalance: senderBalance - amount
        });

    } catch (err) {
        console.error("❌ Gift send error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to send gift"
        });
    }
});

// ===========================================
// GIFT HISTORY
// ===========================================

/**
 * GET /api/gifts/history
 * Get user's gift history
 */
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { type = "all", limit = 50, skip = 0 } = req.query;

        let query = {};
        if (type === "sent") {
            query.senderId = userId;
        } else if (type === "received") {
            query.recipientId = userId;
        } else {
            query.$or = [{ senderId: userId }, { recipientId: userId }];
        }

        const [gifts, total] = await Promise.all([
            Gift.find(query)
                .sort({ createdAt: -1 })
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .lean(),
            Gift.countDocuments(query)
        ]);

        res.json({
            success: true,
            gifts,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: parseInt(skip) + gifts.length < total
            }
        });
    } catch (err) {
        console.error("❌ Gift history error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch gift history"
        });
    }
});

/**
 * GET /api/gifts/received
 * Get gifts received by user
 */
router.get("/received", authMiddleware, async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const gifts = await Gift.find({ recipientId: req.userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        const totalAgg = await Gift.aggregate([
            { $match: { recipientId: req.userId } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            gifts,
            totalReceived: totalAgg[0]?.total || 0,
            count: totalAgg[0]?.count || 0
        });
    } catch (err) {
        console.error("❌ Received gifts error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch received gifts"
        });
    }
});

/**
 * GET /api/gifts/sent
 * Get gifts sent by user
 */
router.get("/sent", authMiddleware, async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const gifts = await Gift.find({ senderId: req.userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        const totalAgg = await Gift.aggregate([
            { $match: { senderId: req.userId } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            gifts,
            totalSent: totalAgg[0]?.total || 0,
            count: totalAgg[0]?.count || 0
        });
    } catch (err) {
        console.error("❌ Sent gifts error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch sent gifts"
        });
    }
});

// ===========================================
// LEADERBOARDS
// ===========================================

/**
 * GET /api/gifts/leaderboard
 * Get top gifters leaderboard
 */
router.get("/leaderboard", async (req, res) => {
    try {
        const { period = "week", limit = 10 } = req.query;

        let startDate = new Date();
        switch (period) {
            case "day":
                startDate.setDate(startDate.getDate() - 1);
                break;
            case "week":
                startDate.setDate(startDate.getDate() - 7);
                break;
            case "month":
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case "all":
                startDate = new Date(0);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }

        const leaderboard = await Gift.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: "completed" } },
            {
                $group: {
                    _id: "$senderId",
                    totalGifted: { $sum: "$amount" },
                    giftCount: { $sum: 1 },
                    username: { $first: "$senderUsername" },
                    avatar: { $first: "$senderAvatar" },
                    lastGift: { $max: "$createdAt" }
                }
            },
            { $sort: { totalGifted: -1 } },
            { $limit: parseInt(limit) }
        ]);

        // Add rank
        const ranked = leaderboard.map((entry, index) => ({
            rank: index + 1,
            userId: entry._id,
            ...entry
        }));

        res.json({
            success: true,
            period,
            leaderboard: ranked
        });
    } catch (err) {
        console.error("❌ Leaderboard error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch leaderboard"
        });
    }
});

/**
 * GET /api/gifts/top-creators
 * Get top earning creators
 */
router.get("/top-creators", async (req, res) => {
    try {
        const { period = "week", limit = 10 } = req.query;

        let startDate = new Date();
        switch (period) {
            case "day":
                startDate.setDate(startDate.getDate() - 1);
                break;
            case "week":
                startDate.setDate(startDate.getDate() - 7);
                break;
            case "month":
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case "all":
                startDate = new Date(0);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }

        const topCreators = await Gift.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: "completed" } },
            {
                $group: {
                    _id: "$recipientId",
                    totalReceived: { $sum: "$amount" },
                    giftCount: { $sum: 1 },
                    uniqueGifters: { $addToSet: "$senderId" },
                    username: { $first: "$recipientUsername" }
                }
            },
            { $sort: { totalReceived: -1 } },
            { $limit: parseInt(limit) },
            {
                $project: {
                    _id: 1,
                    totalReceived: 1,
                    giftCount: 1,
                    uniqueGifterCount: { $size: "$uniqueGifters" },
                    username: 1
                }
            }
        ]);

        // Get avatars and verification status
        const userIds = topCreators.map(c => c._id);
        const users = await User.find({ _id: { $in: userIds } })
            .select("avatar isVerified followersCount")
            .lean();

        const userMap = {};
        users.forEach(u => {
            userMap[u._id.toString()] = {
                avatar: u.avatar,
                isVerified: u.isVerified,
                followersCount: u.followersCount
            };
        });

        const result = topCreators.map((c, index) => ({
            rank: index + 1,
            userId: c._id,
            ...c,
            avatar: userMap[c._id?.toString()]?.avatar || "",
            isVerified: userMap[c._id?.toString()]?.isVerified || false,
            followersCount: userMap[c._id?.toString()]?.followersCount || 0
        }));

        res.json({
            success: true,
            period,
            creators: result
        });
    } catch (err) {
        console.error("❌ Top creators error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch top creators"
        });
    }
});

// ===========================================
// STREAM GIFTS
// ===========================================

/**
 * GET /api/gifts/stream/:streamId
 * Get gifts for a stream
 */
router.get("/stream/:streamId", async (req, res) => {
    try {
        const { streamId } = req.params;
        const { limit = 100 } = req.query;

        const gifts = await Gift.find({
            streamId,
            status: "completed"
        })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        // Get stats
        const stats = await Gift.aggregate([
            { $match: { streamId, status: "completed" } },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get top gifters
        const topGifters = await Gift.aggregate([
            { $match: { streamId, status: "completed" } },
            {
                $group: {
                    _id: "$senderId",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                    username: { $first: "$senderUsername" },
                    avatar: { $first: "$senderAvatar" }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        res.json({
            success: true,
            gifts,
            stats: stats[0] || { total: 0, count: 0 },
            topGifters
        });
    } catch (err) {
        console.error("❌ Stream gifts error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch stream gifts"
        });
    }
});

// ===========================================
// USER STATS
// ===========================================

/**
 * GET /api/gifts/stats/:userId
 * Get gift statistics for a user
 */
router.get("/stats/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [received, sent] = await Promise.all([
            Gift.aggregate([
                { $match: { recipientId: userId } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]),
            Gift.aggregate([
                { $match: { senderId: userId } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ])
        ]);

        // Unique gifters
        const uniqueGifters = await Gift.aggregate([
            { $match: { recipientId: userId } },
            { $group: { _id: "$senderId" } },
            { $count: "count" }
        ]);

        res.json({
            success: true,
            stats: {
                totalReceived: received[0]?.total || 0,
                receivedCount: received[0]?.count || 0,
                totalSent: sent[0]?.total || 0,
                sentCount: sent[0]?.count || 0,
                uniqueGifters: uniqueGifters[0]?.count || 0
            }
        });
    } catch (err) {
        console.error("❌ Gift stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch gift stats"
        });
    }
});

/**
 * GET /api/gifts/my-stats
 * Get current user's gift statistics
 */
router.get("/my-stats", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        const [received, sent] = await Promise.all([
            Gift.aggregate([
                { $match: { recipientId: userId } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]),
            Gift.aggregate([
                { $match: { senderId: userId } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ])
        ]);

        res.json({
            success: true,
            received: {
                total: received[0]?.total || 0,
                count: received[0]?.count || 0
            },
            sent: {
                total: sent[0]?.total || 0,
                count: sent[0]?.count || 0
            }
        });
    } catch (err) {
        console.error("❌ My stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch stats"
        });
    }
});

module.exports = router;