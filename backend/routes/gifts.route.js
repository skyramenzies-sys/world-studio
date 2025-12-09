// backend/routes/gifts.route.js
// World-Studio.live - Gift System Routes (UNIVERSE EDITION 🎁🌌)
// Handles sending gifts, history, leaderboards, and analytics

const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Gift = require("../models/Gift");
const Stream = require("../models/Stream");
const PlatformWallet = require("../models/PlatformWallet");
const auth = require("../middleware/auth"); // ✅ zelfde als admin.js

// ===========================================
// GIFT DEFINITIONS (HIGH LEVEL TYPES)

// ===========================================
const GIFT_TYPES = {
    // Basic Gifts
    Rose: { icon: "🌹", minAmount: 10, category: "basic" },
    Heart: { icon: "❤️", minAmount: 25, category: "basic" },
    Star: { icon: "⭐", minAmount: 5, category: "basic" },
    Fire: { icon: "🔥", minAmount: 15, category: "basic" },

    // Premium Gifts
    Diamond: { icon: "💎", minAmount: 50, category: "premium" },
    Crown: { icon: "👑", minAmount: 100, category: "premium" },
    Trophy: { icon: "🏆", minAmount: 150, category: "premium" },

    // Luxury Gifts
    Rocket: { icon: "🚀", minAmount: 250, category: "luxury" },
    Universe: { icon: "🌌", minAmount: 500, category: "luxury" },
    Planet: { icon: "🪐", minAmount: 1000, category: "luxury" },

    // Special
    Coins: { icon: "💰", minAmount: 1, category: "tip" },
};

// Platform takes e.g. 15%, creator gets 85%

const PLATFORM_FEE_PERCENT = Number(process.env.GIFTS_PLATFORM_FEE || 15);
const CREATOR_SHARE_PERCENT = 100 - PLATFORM_FEE_PERCENT;

// Export for reuse if you want
router.GIFT_TYPES = GIFT_TYPES;

// ===========================================
// HELPERS
// ===========================================

/**
 * Bouw payload voor Socket.io & frontend (GiftPanel)
 * amount = coins die ONTVANGER krijgt (na fee)
 * spent  = coins die SENDER heeft uitgegeven
 */
function buildGiftEventPayload({
    gift,
    sender,
    recipient,
    creatorShare,
    platformFee,
    rawAmount,
    isAnonymous,
}) {
    return {
        giftId: gift._id.toString(),

        senderId: isAnonymous ? null : sender._id.toString(),
        recipientId: recipient._id.toString(),

        senderUsername: isAnonymous ? "Anonymous" : sender.username,
        senderAvatar: isAnonymous ? "" : sender.avatar,
        recipientUsername: recipient.username,
        recipientAvatar: recipient.avatar,


        item: gift.itemName || gift.item || "Coins",
        icon: gift.icon || "🎁",


        amount: creatorShare,
        spent: rawAmount,

        message: gift.message,
        context: gift.context || (gift.streamId ? "stream" : "profile"),

        streamId: gift.streamId,
        postId: gift.postId,
        pkBattleId: gift.pkBattleId,

        platformFee,
        creatorShare,
        timestamp: gift.createdAt || new Date(),
        status: gift.status || "completed",
    };
}

// ===========================================
// GET /api/gifts/types
// Get available gift types
// ===========================================
router.get("/types", (req, res) => {
    const gifts = Object.entries(GIFT_TYPES).map(([name, data]) => ({
        name,
        ...data,
    }));

    res.json({
        success: true,
        gifts,
        platformFee: `${PLATFORM_FEE_PERCENT}%`,
        creatorShare: `${CREATOR_SHARE_PERCENT}%`,
    });
});

// ===========================================
// POST /api/gifts
// Send a gift (used by GiftPanel & GiftShop)
// ===========================================
router.post("/", auth, async (req, res) => {
    try {
        const {
            recipientId,
            item = "Coins",
            amount,
            message,
            streamId,
            pkBattleId,
            postId,
            context,
            isAnonymous = false,
        } = req.body;

        const sender = req.user;          // ✅ komt uit auth
        const senderId = sender._id;

        // -----------------------------
        // Validatie
        // -----------------------------
        if (!recipientId) {
            return res.status(400).json({
                success: false,
                error: "Recipient is required",
                code: "MISSING_RECIPIENT",
            });
        }

        if (!amount || amount < 1 || !Number.isInteger(Number(amount))) {
            return res.status(400).json({
                success: false,
                error: "Amount must be at least 1 coin and a whole number",
                code: "INVALID_AMOUNT",
            });
        }

        if (amount > 1000000) {
            return res.status(400).json({
                success: false,
                error: "Maximum gift is 1,000,000 coins",
                code: "AMOUNT_TOO_HIGH",
            });
        }

        if (recipientId === senderId.toString()) {
            return res.status(400).json({
                success: false,
                error: "Cannot send gift to yourself",
                code: "SELF_GIFT_NOT_ALLOWED",
            });
        }


        const senderBalance = sender.wallet?.balance || 0;
        if (senderBalance < amount) {
            return res.status(400).json({
                success: false,
                error: "Insufficient balance",
                code: "INSUFFICIENT_BALANCE",
                balance: senderBalance,
                required: amount,
            });
        }


        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                error: "Recipient not found",
                code: "RECIPIENT_NOT_FOUND",
            });
        }

        if (recipient.isBanned || recipient.status === "banned") {
            return res.status(400).json({
                success: false,
                error: "Cannot send gift to this user",
                code: "RECIPIENT_BANNED",
            });
        }


        const giftType = GIFT_TYPES[item] || GIFT_TYPES["Coins"];
        const icon = giftType.icon || "💰";


        if (giftType && amount < giftType.minAmount) {
            return res.status(400).json({
                success: false,
                error: `Minimum for ${item} is ${giftType.minAmount} coins`,
                code: "MIN_AMOUNT",
            });
        }

        // -----------------------------
        // Fee & shares
        // -----------------------------
        const rawAmount = Number(amount);
        const platformFee = Math.floor(
            rawAmount * (PLATFORM_FEE_PERCENT / 100)
        );
        const creatorShare = rawAmount - platformFee;

        // -----------------------------
        // Gift record opslaan
        // -----------------------------
        const gift = await Gift.create({
            senderId: senderId,
            senderUsername: isAnonymous ? "Anonymous" : sender.username,
            senderAvatar: isAnonymous ? "" : sender.avatar,

            recipientId: recipient._id,
            recipientUsername: recipient.username,
            recipientAvatar: recipient.avatar,

            item: (item || "Coins").toString().toLowerCase(),
            itemName: item,
            icon,

            amount: rawAmount,
            coinValue: rawAmount,

            message: message?.slice(0, 200) || "",
            streamId: streamId || null,
            postId: postId || null,
            pkBattleId: pkBattleId || null,

            context:
                context ||
                (streamId ? "stream" : postId ? "post" : "profile"),

            platformFee: PLATFORM_FEE_PERCENT,
            recipientReceives: creatorShare,
            isAnonymous,
            status: "completed",
        });

        // -----------------------------
        // Wallet updates
        // -----------------------------

        await User.findByIdAndUpdate(senderId, {
            $inc: {
                "wallet.balance": -rawAmount,
                "wallet.totalSpent": rawAmount,
                "stats.totalGiftsSent": 1,
                "stats.totalGiftsSentValue": rawAmount,
            },
            $push: {
                "wallet.transactions": {
                    $each: [
                        {
                            type: "gift_sent",
                            amount: -rawAmount,
                            description: `Sent ${icon} ${item} to ${recipient.username}`,
                            status: "completed",
                            relatedUserId: recipient._id,
                            relatedUsername: recipient.username,
                            giftId: gift._id,
                            createdAt: new Date(),
                        },
                    ],
                    $slice: -500,
                },
            },
        });


        await User.findByIdAndUpdate(recipient._id, {
            $inc: {
                "wallet.balance": creatorShare,
                "wallet.totalReceived": creatorShare,
                "wallet.totalEarned": creatorShare,
                "stats.totalGiftsReceived": 1,
                "stats.totalGiftsReceivedValue": rawAmount,
                unreadNotifications: 1,
            },
            $push: {
                "wallet.transactions": {
                    $each: [
                        {
                            type: "gift_received",
                            amount: creatorShare,
                            description: `Received ${icon} ${item} from ${isAnonymous ? "Anonymous" : sender.username
                                }`,
                            status: "completed",
                            relatedUserId: isAnonymous ? null : sender._id,
                            relatedUsername: isAnonymous
                                ? "Anonymous"
                                : sender.username,
                            giftId: gift._id,
                            meta: {
                                originalAmount: rawAmount,
                                platformFee,
                                item,
                                icon,
                            },
                            createdAt: new Date(),
                        },
                    ],
                    $slice: -500,
                },
                notifications: {
                    $each: [
                        {
                            message: `${isAnonymous ? "Someone" : sender.username
                                } sent you ${icon} ${item} (${rawAmount} coins)${message ? `: "${message}"` : ""
                                }`,
                            type: "gift",
                            fromUser: isAnonymous ? null : sender._id,
                            fromUsername: isAnonymous
                                ? "Anonymous"
                                : sender.username,
                            fromAvatar: isAnonymous ? "" : sender.avatar,
                            giftId: gift._id,
                            amount: rawAmount,
                            icon,
                            read: false,
                            createdAt: new Date(),
                        },
                    ],
                    $slice: -100,
                },
            },

        });

        // -----------------------------
        // Platform wallet (fee)
        // -----------------------------
        try {
            if (PlatformWallet && platformFee > 0) {
                const wallet = await PlatformWallet.getWallet();
                if (wallet && wallet.recordGiftFee) {
                    await wallet.recordGiftFee(
                        rawAmount,
                        sender._id,
                        sender.username,
                        gift._id
                    );
                }
            }
        } catch (err) {
            console.log("Platform fee recording skipped:", err.message);
        }

        // -----------------------------
        // Stream stats update
        // -----------------------------
        if (streamId && Stream) {
            try {
                await Stream.findByIdAndUpdate(streamId, {
                    $inc: {
                        totalGifts: rawAmount,
                        totalGiftsCount: 1,
                    },
                    $push: {
                        recentGifts: {
                            $each: [
                                {
                                    userId: sender._id,
                                    username: isAnonymous
                                        ? "Anonymous"
                                        : sender.username,
                                    giftType: item,
                                    icon,
                                    amount: rawAmount,
                                    coins: rawAmount,
                                    timestamp: new Date(),
                                },
                            ],
                            $slice: -50,
                        },
                    },
                });
            } catch (err) {
                console.log("Stream gift update skipped");
            }
        }

        // -----------------------------
        // Socket events
        // -----------------------------
        const io = req.app.get("io");
        const payload = buildGiftEventPayload({
            gift,
            sender,
            recipient,
            creatorShare,
            platformFee,
            rawAmount,
            isAnonymous,
        });

        if (io) {
            io.to(`user_${recipient._id}`).emit("gift_received", payload);
            io.to(`user_${recipient._id}`).emit("notification", {
                type: "gift",
                message: `${isAnonymous ? "Someone" : sender.username
                    } sent you ${payload.icon}!`,
                amount: rawAmount,
                icon: payload.icon,
            });


            io.to(`user_${sender._id}`).emit("gift_sent", {
                success: true,
                gift: payload,
                newBalance: senderBalance - rawAmount,
            });
            io.to(`user_${sender._id}`).emit("wallet_update", {
                balance: senderBalance - rawAmount,
            });


            if (streamId) {
                io.to(streamId).emit("stream_gift", payload);
                io.to(`stream_${streamId}`).emit("stream_gift", payload);
            }


            if (pkBattleId) {
                io.to(`pk_${pkBattleId}`).emit("pk_gift", payload);
            }


            io.emit("gift_global", payload);
        }

        console.log(
            `🎁 Gift: ${sender.username} → ${recipient.username}: ${rawAmount} ${item}`
        );

        return res.status(201).json({
            success: true,
            message: "Gift sent successfully!",
            gift: {
                _id: gift._id,
                item,
                icon,
                amount: rawAmount,
                creatorShare,
                platformFee,
                recipientUsername: recipient.username,
                message: gift.message,
            },
            newBalance: senderBalance - rawAmount,
        });

    } catch (err) {
        console.error("❌ Gift send error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to send gift",
            code: "GIFT_SEND_ERROR",
        });
    }
});

// ===========================================
// GIFT HISTORY
// GET /api/gifts/history
// ===========================================
router.get("/history", auth, async (req, res) => {
    try {
        const userId = req.user._id;
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
            Gift.countDocuments(query),
        ]);

        res.json({
            success: true,
            gifts,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: parseInt(skip) + gifts.length < total,
            },
        });
    } catch (err) {
        console.error("❌ Gift history error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch gift history",
        });
    }
});

// ===========================================
// RECEIVED / SENT
// ===========================================
router.get("/received", auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 50 } = req.query;

        const gifts = await Gift.find({ recipientId: userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        const agg = await Gift.getTotalReceived(userId);

        res.json({
            success: true,
            gifts,
            totalReceived: agg.total || 0,
            count: agg.count || 0,
        });
    } catch (err) {
        console.error("❌ Received gifts error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch received gifts",
        });
    }
});

router.get("/sent", auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 50 } = req.query;

        const gifts = await Gift.find({ senderId: userId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        const agg = await Gift.getTotalSent(userId);

        res.json({
            success: true,
            gifts,
            totalSent: agg.total || 0,
            count: agg.count || 0,
        });
    } catch (err) {
        console.error("❌ Sent gifts error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch sent gifts",
        });
    }
});

// ===========================================
// LEADERBOARDS
// ===========================================


router.get("/leaderboard", async (req, res) => {
    try {
        const { period = "week", limit = 10 } = req.query;

        const leaderboard = await Gift.getLeaderboard(
            period,
            parseInt(limit)
        );


        const ranked = leaderboard.map((entry, index) => ({
            rank: index + 1,
            ...entry,
        }));

        res.json({
            success: true,
            period,
            leaderboard: ranked,
        });
    } catch (err) {
        console.error("❌ Leaderboard error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch leaderboard",
        });
    }
});

// ===========================================
// TOP CREATORS
// GET /api/gifts/top-creators
// ===========================================
router.get("/top-creators", async (req, res) => {
    try {
        const { period = "week", limit = 10 } = req.query;


        const now = new Date();
        let startDate = new Date(0);

        if (period === "day") {
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else if (period === "week") {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === "month") {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const topCreators = await Gift.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                    status: "completed",
                },
            },
            {
                $group: {
                    _id: "$recipientId",
                    totalReceived: { $sum: "$recipientReceives" },
                    giftCount: { $sum: 1 },
                    uniqueGifters: { $addToSet: "$senderId" },
                    username: { $first: "$recipientUsername" },
                },
            },
            { $sort: { totalReceived: -1 } },
            { $limit: parseInt(limit) },
            {
                $project: {
                    _id: 1,
                    totalReceived: 1,
                    giftCount: 1,
                    uniqueGifterCount: { $size: "$uniqueGifters" },
                    username: 1,
                },
            },
        ]);

        const userIds = topCreators.map((c) => c._id);
        const users = await User.find({ _id: { $in: userIds } })
            .select("avatar isVerified followersCount")
            .lean();

        const userMap = {};
        users.forEach((u) => {
            userMap[u._id.toString()] = {
                avatar: u.avatar,
                isVerified: u.isVerified,
                followersCount: u.followersCount,
            };
        });

        const result = topCreators.map((c, index) => ({
            rank: index + 1,
            ...c,
            avatar: userMap[c._id?.toString()]?.avatar || "",
            isVerified: userMap[c._id?.toString()]?.isVerified || false,
            followersCount:
                userMap[c._id?.toString()]?.followersCount || 0,
        }));

        res.json({
            success: true,
            period,
            creators: result,
        });
    } catch (err) {
        console.error("❌ Top creators error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch top creators",
        });
    }
});

// ===========================================
// STREAM GIFTS
// GET /api/gifts/stream/:streamId
// ===========================================


router.get("/stream/:streamId", async (req, res) => {
    try {
        const { streamId } = req.params;
        const { limit = 100 } = req.query;

        const gifts = await Gift.find({
            streamId,
            status: "completed",
        })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        const stats = await Gift.getStreamStats(streamId);
        const topGifters = await Gift.getTopGifters(streamId, 10);

        res.json({
            success: true,
            gifts,
            stats,
            topGifters,
        });
    } catch (err) {
        console.error("❌ Stream gifts error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch stream gifts",
        });
    }
});

// ===========================================
// USER STATS
// GET /api/gifts/stats/:userId
// ===========================================


router.get("/stats/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const [received, sent, uniqueGifters] = await Promise.all([
            Gift.aggregate([
                { $match: { recipientId: userId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
            Gift.aggregate([
                { $match: { senderId: userId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
            Gift.aggregate([
                { $match: { recipientId: userId } },
                { $group: { _id: "$senderId" } },
                { $count: "count" },
            ]),
        ]);

        res.json({
            success: true,
            stats: {
                totalReceived: received[0]?.total || 0,
                receivedCount: received[0]?.count || 0,
                totalSent: sent[0]?.total || 0,
                sentCount: sent[0]?.count || 0,
                uniqueGifters: uniqueGifters[0]?.count || 0,
            },
        });
    } catch (err) {
        console.error("❌ Gift stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch gift stats",
        });
    }
});

// ===========================================
// MY STATS
// GET /api/gifts/my-stats
// ===========================================
router.get("/my-stats", auth, async (req, res) => {
    try {
        const userId = req.user._id;

        const [received, sent] = await Promise.all([
            Gift.aggregate([
                { $match: { recipientId: userId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
            Gift.aggregate([
                { $match: { senderId: userId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        res.json({
            success: true,
            received: {
                total: received[0]?.total || 0,
                count: received[0]?.count || 0,
            },
            sent: {
                total: sent[0]?.total || 0,
                count: sent[0]?.count || 0,
            },
        });
    } catch (err) {
        console.error("❌ My stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch stats",
        });
    }
});

module.exports = router;
