// backend/routes/gifts.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// Gift Schema (embedded or separate collection)
const giftSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderUsername: String,
    senderAvatar: String,
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientUsername: String,
    item: { type: String, default: "Coins" },
    icon: { type: String, default: "💰" },
    amount: { type: Number, required: true, min: 1 },
    message: { type: String, maxLength: 200 },
    streamId: { type: mongoose.Schema.Types.ObjectId, ref: "Stream" },
    createdAt: { type: Date, default: Date.now },
});

const Gift = mongoose.models.Gift || mongoose.model("Gift", giftSchema);

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

        // Validate
        if (!recipientId) {
            return res.status(400).json({ error: "Recipient is required" });
        }

        if (!amount || amount < 1) {
            return res.status(400).json({ error: "Amount must be at least 1" });
        }

        // Can't gift yourself
        if (recipientId === sender._id.toString()) {
            return res.status(400).json({ error: "Cannot send gift to yourself" });
        }

        // Check sender balance
        const senderBalance = sender.wallet?.balance || 0;
        if (senderBalance < amount) {
            return res.status(400).json({
                error: "Insufficient balance",
                balance: senderBalance,
                required: amount
            });
        }

        // Find recipient
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ error: "Recipient not found" });
        }

        // Get gift icon
        const giftType = GIFT_TYPES[item] || GIFT_TYPES["Coins"];
        const icon = giftType.icon;

        // Create gift record
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

        // Update balances
        // Deduct from sender
        await User.findByIdAndUpdate(sender._id, {
            $inc: { "wallet.balance": -amount }
        });

        // Add to recipient (creator gets 70%, platform takes 30%)
        const creatorShare = Math.floor(amount * 0.7);
        await User.findByIdAndUpdate(recipient._id, {
            $inc: {
                "wallet.balance": creatorShare,
                "wallet.totalReceived": amount,
            }
        });

        // Add notification to recipient
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
                    $slice: -100, // Keep only last 100 notifications
                }
            }
        });

        // Emit socket event for realtime notification
        const io = req.app.get("io");
        if (io) {
            // Notify recipient
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

            // If this is a stream gift, also emit to the stream room
            if (streamId) {
                io.to(streamId).emit("gift_received", {
                    _id: gift._id,
                    senderId: sender._id,
                    senderUsername: sender.username,
                    senderAvatar: sender.avatar,
                    recipientId: recipient._id,
                    recipientUsername: recipient.username,
                    item,
                    icon,
                    amount,
                    message,
                });

                io.to(`stream_${streamId}`).emit("gift_received", {
                    _id: gift._id,
                    senderId: sender._id,
                    senderUsername: sender.username,
                    senderAvatar: sender.avatar,
                    item,
                    icon,
                    amount,
                    message,
                });
            }
        }

        // Return success
        res.status(201).json({
            message: "Gift sent successfully",
            gift: {
                _id: gift._id,
                item,
                icon,
                amount,
                recipientUsername: recipient.username,
                creatorShare,
            },
            newBalance: senderBalance - amount,
        });

    } catch (err) {
        console.error("Gift send error:", err);
        res.status(500).json({ error: "Failed to send gift" });
    }
});

// =========================
// GET: Gift history for user
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

        // Calculate date range
        let startDate = new Date();
        if (period === "day") {
            startDate.setDate(startDate.getDate() - 1);
        } else if (period === "week") {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === "month") {
            startDate.setMonth(startDate.getMonth() - 1);
        } else {
            startDate = new Date(0); // All time
        }

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
// GET: Top receivers leaderboard
// /api/gifts/top-creators
// =========================
router.get("/top-creators", async (req, res) => {
    try {
        const { period = "week", limit = 10 } = req.query;

        let startDate = new Date();
        if (period === "day") {
            startDate.setDate(startDate.getDate() - 1);
        } else if (period === "week") {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === "month") {
            startDate.setMonth(startDate.getMonth() - 1);
        } else {
            startDate = new Date(0);
        }

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

        // Get avatars
        const userIds = topCreators.map(c => c._id);
        const users = await User.find({ _id: { $in: userIds } }).select("avatar").lean();
        const avatarMap = {};
        users.forEach(u => { avatarMap[u._id.toString()] = u.avatar; });

        const result = topCreators.map(c => ({
            ...c,
            avatar: avatarMap[c._id.toString()] || "",
        }));

        res.json(result);
    } catch (err) {
        console.error("Top creators error:", err);
        res.status(500).json({ error: "Failed to fetch top creators" });
    }
});

module.exports = router;