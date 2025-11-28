// backend/routes/gifts.route.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Gift = require("../models/Gift");
const authMiddleware = require("../middleware/authMiddleware");

// Gift definitions with icons
const GIFT_TYPES = {
    "Rose": { icon: "🌹", minAmount: 10 },
    "Heart": { icon: "❤️", minAmount: 25 },
    "Diamond": { icon: "💎", minAmount: 50 },
    "Crown": { icon: "👑", minAmount: 100 },
    "Rocket": { icon: "🚀", minAmount: 250 },
    "Universe": { icon: "🌌", minAmount: 500 },
    "Coins": { icon: "💰", minAmount: 1 },
};

// =========================
// POST: Send a gift
// /api/gifts
// =========================
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { recipientId, item, amount, message, streamId } = req.body;
        const sender = req.user;

        if (!recipientId) {
            return res.status(400).json({ error: "Recipient is required" });
        }

        if (!amount || amount < 1) {
            return res.status(400).json({ error: "Amount must be at least 1" });
        }

        if (recipientId === sender._id.toString()) {
            return res.status(400).json({ error: "Cannot send gift to yourself" });
        }

        const senderBalance = sender.wallet?.balance || 0;
        if (senderBalance < amount) {
            return res.status(400).json({
                error: "Insufficient balance",
                balance: senderBalance,
                required: amount
            });
        }

        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ error: "Recipient not found" });
        }

        const giftType = GIFT_TYPES[item] || GIFT_TYPES["Coins"];
        const icon = giftType.icon;

        const gift = await Gift.create({
            senderId: sender._id,
            senderUsername: sender.username,
            senderAvatar: sender.avatar,
            recipientId: recipient._id,
            recipientUsername: recipient.username,
            item: item || "Coins",
            icon,
            amount,
            message: message?.slice(0, 200),
            streamId: streamId || null,
        });

        // Deduct from sender
        await User.findByIdAndUpdate(sender._id, {
            $inc: { "wallet.balance": -amount, "wallet.totalSpent": amount }
        });

        // Add to recipient (70% creator, 30% platform)
        const creatorShare = Math.floor(amount * 0.7);
        await User.findByIdAndUpdate(recipient._id, {
            $inc: {
                "wallet.balance": creatorShare,
                "wallet.totalReceived": amount,
            }
        });

        // Add notification
        await User.findByIdAndUpdate(recipient._id, {
            $push: {
                notifications: {
                    $each: [{
                        message: `${sender.username} sent you ${icon} ${item} (${amount} coins)${message ? `: "${message}"` : ""}`,
                        type: "gift",
                        fromUser: sender._id,
                        amount,
                        read: false,
                        createdAt: new Date(),
                    }],
                    $slice: -100,
                }
            }
        });

        // Emit socket events
        const io = req.app.get("io");
        if (io) {
            io.to(`user_${recipient._id}`).emit("gift_received", {
                _id: gift._id,
                senderId: sender._id,
                senderUsername: sender.username,
                senderAvatar: sender.avatar,
                item,
                icon,
                amount,
                message,
            });

            io.to(`user_${recipient._id}`).emit("notification", {
                type: "gift",
                message: `${sender.username} sent you ${icon}!`,
                amount,
            });

            if (streamId) {
                io.to(streamId).emit("gift_received", {
                    _id: gift._id,
                    senderUsername: sender.username,
                    senderAvatar: sender.avatar,
                    item,
                    icon,
                    amount,
                    message,
                });
                io.to(`stream_${streamId}`).emit("gift_received", {
                    _id: gift._id,
                    senderUsername: sender.username,
                    senderAvatar: sender.avatar,
                    item,
                    icon,
                    amount,
                    message,
                });
            }
        }

        res.status(201).json({
            message: "Gift sent successfully",
            gift: { _id: gift._id, item, icon, amount, recipientUsername: recipient.username, creatorShare },
            newBalance: senderBalance - amount,
        });

    } catch (err) {
        console.error("Gift send error:", err);
        res.status(500).json({ error: "Failed to send gift" });
    }
});

// =========================
// GET: Gift history
// /api/gifts/history
// =========================
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { type = "all", limit = 50 } = req.query;

        let query = {};
        if (type === "sent") {
            query.senderId = userId;
        } else if (type === "received") {
            query.recipientId = userId;
        } else {
            query.$or = [{ senderId: userId }, { recipientId: userId }];
        }

        const gifts = await Gift.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json(gifts);
    } catch (err) {
        console.error("Gift history error:", err);
        res.status(500).json({ error: "Failed to fetch gift history" });
    }
});

// =========================
// GET: Top gifters leaderboard
// /api/gifts/leaderboard
// =========================
router.get("/leaderboard", async (req, res) => {
    try {
        const { period = "week", limit = 10 } = req.query;

        let startDate = new Date();
        if (period === "day") startDate.setDate(startDate.getDate() - 1);
        else if (period === "week") startDate.setDate(startDate.getDate() - 7);
        else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
        else startDate = new Date(0);

        const leaderboard = await Gift.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: "$senderId",
                    totalGifted: { $sum: "$amount" },
                    giftCount: { $sum: 1 },
                    username: { $first: "$senderUsername" },
                    avatar: { $first: "$senderAvatar" },
                }
            },
            { $sort: { totalGifted: -1 } },
            { $limit: parseInt(limit) },
        ]);

        res.json(leaderboard);
    } catch (err) {
        console.error("Leaderboard error:", err);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

// =========================
// GET: Top creators
// /api/gifts/top-creators
// =========================
router.get("/top-creators", async (req, res) => {
    try {
        const { period = "week", limit = 10 } = req.query;

        let startDate = new Date();
        if (period === "day") startDate.setDate(startDate.getDate() - 1);
        else if (period === "week") startDate.setDate(startDate.getDate() - 7);
        else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
        else startDate = new Date(0);

        const topCreators = await Gift.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: "$recipientId",
                    totalReceived: { $sum: "$amount" },
                    giftCount: { $sum: 1 },
                    username: { $first: "$recipientUsername" },
                }
            },
            { $sort: { totalReceived: -1 } },
            { $limit: parseInt(limit) },
        ]);

        const userIds = topCreators.map(c => c._id);
        const users = await User.find({ _id: { $in: userIds } }).select("avatar").lean();
        const avatarMap = {};
        users.forEach(u => { avatarMap[u._id.toString()] = u.avatar; });

        const result = topCreators.map(c => ({
            ...c,
            avatar: avatarMap[c._id?.toString()] || "",
        }));

        res.json(result);
    } catch (err) {
        console.error("Top creators error:", err);
        res.status(500).json({ error: "Failed to fetch top creators" });
    }
});

module.exports = router;