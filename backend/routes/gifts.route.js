// backend/routes/gifts.route.js
"use strict";

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Gift = require("../models/Gift");
const User = require("../models/User");

// -------------------------------------------------------------
// Allowed Gift Items (Static Catalog)
// -------------------------------------------------------------
const ALLOWED_GIFT_ITEMS = [
    { name: "Diamond", icon: "💎", image: "https://cdn-icons-png.flaticon.com/512/616/616490.png", price: 100 },
    { name: "Heart", icon: "❤️", image: "https://cdn-icons-png.flaticon.com/512/833/833472.png", price: 10 },
    { name: "Super Star", icon: "🌟", image: "https://cdn-icons-png.flaticon.com/512/616/616494.png", price: 50 },
    { name: "Crown", icon: "👑", image: "https://cdn-icons-png.flaticon.com/512/616/616491.png", price: 200 }
];

// -------------------------------------------------------------
// SEND A GIFT (Protected)
// -------------------------------------------------------------
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { recipientId, item, message = "", amount = 1 } = req.body;

        // Validate gift item
        const selectedGift = ALLOWED_GIFT_ITEMS.find(g => g.name === item);
        if (!selectedGift)
            return res.status(400).json({ message: "Invalid gift item." });

        // Prevent self-gifting
        if (!recipientId || recipientId === String(req.userId))
            return res.status(400).json({ message: "Invalid recipient." });

        const qty = Number(amount);
        if (qty < 1)
            return res.status(400).json({ message: "Amount must be at least 1." });

        const cost = selectedGift.price * qty;

        // Load sender & recipient
        const sender = await User.findById(req.userId);
        const recipient = await User.findById(recipientId);

        if (!sender || !recipient)
            return res.status(404).json({ message: "User not found." });

        // Verify wallets exist
        sender.wallet = sender.wallet || { balance: 0, transactions: [] };
        recipient.wallet = recipient.wallet || { balance: 0, transactions: [] };

        // Check balance
        if (sender.wallet.balance < cost)
            return res.status(400).json({ message: "Not enough WS-Coins." });

        // Update wallets
        sender.wallet.balance -= cost;
        sender.wallet.transactions.push({
            type: "debit",
            amount: cost,
            reason: `Gift sent: ${selectedGift.name} x${qty}`,
            date: new Date()
        });

        recipient.wallet.balance += cost;
        recipient.wallet.transactions.push({
            type: "credit",
            amount: cost,
            reason: `Gift received: ${selectedGift.name} x${qty}`,
            date: new Date()
        });

        await sender.save();
        await recipient.save();

        // Log gift in DB
        const gift = await Gift.create({
            sender: sender._id,
            recipient: recipient._id,
            amount: qty,
            item: selectedGift.name,
            itemIcon: selectedGift.icon,
            itemImage: selectedGift.image,
            message
        });

        // Auto-notification (optional)
        if (recipient.notifications) {
            recipient.notifications.push({
                type: "gift",
                message: `${sender.username} sent you a ${selectedGift.name}!`,
                timestamp: new Date()
            });
            await recipient.save();
        }

        return res.status(201).json({ message: "Gift sent successfully!", gift });

    } catch (err) {
        console.error("Gift error:", err);
        return res.status(500).json({ message: "Something went wrong." });
    }
});

// -------------------------------------------------------------
// Get All Available Gift Items
// -------------------------------------------------------------
router.get("/available-items", (req, res) => {
    res.json(ALLOWED_GIFT_ITEMS);
});

// -------------------------------------------------------------
// Gifts Sent by Current User
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Gifts Received by Current User
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Leaderboard — Top Senders
// -------------------------------------------------------------
router.get("/leaderboard/senders", async (req, res) => {
    try {
        const leaderboard = await Gift.aggregate([
            { $group: { _id: "$sender", total: { $sum: "$amount" } } },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        await User.populate(leaderboard, { path: "_id", select: "username avatar" });

        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// Leaderboard — Top Receivers
// -------------------------------------------------------------
router.get("/leaderboard/receivers", async (req, res) => {
    try {
        const leaderboard = await Gift.aggregate([
            { $group: { _id: "$recipient", total: { $sum: "$amount" } } },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        await User.populate(leaderboard, { path: "_id", select: "username avatar" });

        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------------------------
// ADMIN — Retrieve All Gifts
// -------------------------------------------------------------
router.get("/", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ error: "Access denied" });

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
