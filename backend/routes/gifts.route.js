const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Gift = require("../models/Gift");
const User = require("../models/User");

// 🎁 Define available special gifts
const ALLOWED_GIFT_ITEMS = [
    {
        name: "Diamond",
        icon: "💎",
        image: "https://cdn-icons-png.flaticon.com/512/616/616490.png",
        price: 100
    },
    {
        name: "Heart",
        icon: "❤️",
        image: "https://cdn-icons-png.flaticon.com/512/833/833472.png",
        price: 10
    },
    {
        name: "Super Star",
        icon: "🌟",
        image: "https://cdn-icons-png.flaticon.com/512/616/616494.png",
        price: 50
    },
    {
        name: "Crown",
        icon: "👑",
        image: "https://cdn-icons-png.flaticon.com/512/616/616491.png",
        price: 200
    }
    // Add more as needed!
];

// 👉 Send a special item gift
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { recipientId, item, message, amount } = req.body;

        // Validate item
        const selectedGift = ALLOWED_GIFT_ITEMS.find(g => g.name === item);
        if (!selectedGift) {
            return res.status(400).json({ message: "Ongeldig cadeau-item." });
        }

        // Validate recipient and prevent self-gifting
        if (!recipientId || recipientId === req.userId.toString()) {
            return res.status(400).json({ message: "Ongeldige ontvanger." });
        }

        // Validate amount
        const giftAmount = Number(amount) || 1;
        if (giftAmount < 1) {
            return res.status(400).json({ message: "Bedrag moet minstens 1 zijn." });
        }
        const totalPrice = selectedGift.price * giftAmount;

        // Fetch users
        const sender = await User.findById(req.userId);
        const recipient = await User.findById(recipientId);

        if (!sender || !recipient) {
            return res.status(404).json({ message: "Gebruiker niet gevonden." });
        }

        if ((sender.wallet?.balance ?? 0) < totalPrice) {
            return res.status(400).json({ message: "Onvoldoende WS-Coins." });
        }

        // Update wallets
        sender.wallet.balance -= totalPrice;
        sender.wallet.transactions.push({
            type: "debit",
            amount: totalPrice,
            reason: `Gift (${selectedGift.name} x${giftAmount}) to ${recipient.username}`,
            date: new Date()
        });

        recipient.wallet.balance += totalPrice;
        recipient.wallet.transactions.push({
            type: "credit",
            amount: totalPrice,
            reason: `Gift (${selectedGift.name} x${giftAmount}) from ${sender.username}`,
            date: new Date()
        });

        await sender.save();
        await recipient.save();

        // Log the gift in DB
        const gift = await Gift.create({
            sender: sender._id,
            recipient: recipient._id,
            amount: giftAmount,
            item: selectedGift.name,
            itemIcon: selectedGift.icon,
            itemImage: selectedGift.image,
            message: message || ""
        });

        // Optional: Send notification to recipient
        if (typeof recipient.addNotification === "function") {
            await recipient.addNotification({
                message: `${sender.username} sent you a ${selectedGift.icon} ${selectedGift.name}!`,
                type: "gift",
                fromUser: sender._id,
                giftId: gift._id
            });
        }

        res.status(201).json({ message: "Gift verstuurd!", gift });
    } catch (err) {
        console.error("Gift fout:", err);
        res.status(500).json({ message: "Er ging iets mis", details: err.message });
    }
});

// 👉 Get all available gift items
router.get("/available-items", (req, res) => {
    res.json(ALLOWED_GIFT_ITEMS);
});

// 👉 View gifts sent by current user
router.get("/sent", authMiddleware, async (req, res) => {
    try {
        const gifts = await Gift.find({ sender: req.userId })
            .populate("recipient", "username avatar")
            .sort({ createdAt: -1 });
        res.json(gifts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 👉 View gifts received by current user
router.get("/received", authMiddleware, async (req, res) => {
    try {
        const gifts = await Gift.find({ recipient: req.userId })
            .populate("sender", "username avatar")
            .sort({ createdAt: -1 });
        res.json(gifts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 👉 Top gifters leaderboard
router.get("/leaderboard/senders", async (req, res) => {
    try {
        const leaderboard = await Gift.aggregate([
            { $group: { _id: "$sender", total: { $sum: { $multiply: ["$amount", 1] } }, count: { $sum: "$amount" } } },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);
        await User.populate(leaderboard, { path: "_id", select: "username avatar" });
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 👉 Top receivers leaderboard
router.get("/leaderboard/receivers", async (req, res) => {
    try {
        const leaderboard = await Gift.aggregate([
            { $group: { _id: "$recipient", total: { $sum: { $multiply: ["$amount", 1] } }, count: { $sum: "$amount" } } },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);
        await User.populate(leaderboard, { path: "_id", select: "username avatar" });
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 👉 (Optional) Admin: Get all gifts
router.get("/", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const gifts = await Gift.find()
            .populate("sender", "username avatar")
            .populate("recipient", "username avatar")
            .sort({ createdAt: -1 });
        res.json(gifts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
