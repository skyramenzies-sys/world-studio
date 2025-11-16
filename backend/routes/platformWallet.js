// backend/routes/platformWallet.js
"use strict";

const express = require("express");
const router = express.Router();

const PlatformWallet = require("../models/PlatformWallet");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");


// ---------------------------------------------------------
// Helper: ensure platform wallet exists
// ---------------------------------------------------------
async function ensurePlatformWallet() {
    let wallet = await PlatformWallet.findOne();
    if (!wallet) {
        wallet = new PlatformWallet({
            balance: 0,
            history: []
        });
        await wallet.save();
    }
    return wallet;
}


// ---------------------------------------------------------
// GET /platform-wallet/balance
// Only admins should see this
// ---------------------------------------------------------
router.get("/balance", authMiddleware, async (req, res) => {
    try {
        // Admin check
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Admins only" });
        }

        const wallet = await ensurePlatformWallet();

        return res.json({
            balance: wallet.balance,
            historyCount: wallet.history.length,
        });

    } catch (err) {
        console.error("Platform balance error:", err);
        return res.status(500).json({ message: "Failed to get platform balance" });
    }
});


// ---------------------------------------------------------
// POST /platform-wallet/fee
// Records a platform commission / fee
// ---------------------------------------------------------
router.post("/fee", authMiddleware, async (req, res) => {
    try {
        const { amount, fromUserId, reason } = req.body;

        // Only admin can record platform fees
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Admins only" });
        }

        // Validate amount
        const amt = Number(amount);
        if (!amt || amt <= 0) {
            return res.status(400).json({ message: "Invalid fee amount" });
        }

        // Validate user
        if (fromUserId) {
            const exists = await User.findById(fromUserId);
            if (!exists) {
                return res.status(400).json({ message: "Invalid fromUserId: User not found" });
            }
        }

        // Ensure platform wallet exists
        const wallet = await ensurePlatformWallet();

        // Apply the fee
        wallet.balance += amt;
        wallet.history.push({
            amount: amt,
            fromUserId: fromUserId || null,
            reason: reason || "platform_fee",
            date: new Date()
        });

        await wallet.save();

        return res.json({
            success: true,
            balance: wallet.balance,
            added: amt,
        });

    } catch (err) {
        console.error("Platform fee error:", err);
        return res.status(500).json({ message: "Failed to store fee" });
    }
});

module.exports = router;
