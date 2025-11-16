// backend/routes/wallet.js
"use strict";

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

// -------------------------------------------------------
// Helper: Ensure a wallet exists for the user
// -------------------------------------------------------
async function ensureWallet(user) {
    if (!user.wallet) {
        user.wallet = {
            balance: 0,
            transactions: []
        };
        await user.save();
    }
    return user;
}

// -------------------------------------------------------
// GET /wallet/balance
// -------------------------------------------------------
router.get("/balance", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        await ensureWallet(user);

        return res.json({
            balance: user.wallet.balance,
            transactions: user.wallet.transactions || [],
        });

    } catch (err) {
        console.error("Balance error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

// -------------------------------------------------------
// POST /wallet/transaction
// Body: { type: "credit" | "debit", amount, reason }
// -------------------------------------------------------
router.post("/transaction", authMiddleware, async (req, res) => {
    try {
        const { type, amount, reason = "" } = req.body;

        if (!["credit", "debit"].includes(type)) {
            return res.status(400).json({ message: "Invalid transaction type" });
        }

        const amt = Number(amount);
        if (!amt || amt <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        await ensureWallet(user);

        // Handle credit / debit logic
        if (type === "credit") {
            user.wallet.balance += amt;
        } else {
            if (user.wallet.balance < amt) {
                return res.status(400).json({ message: "Insufficient balance" });
            }
            user.wallet.balance -= amt;
        }

        // Push transaction history
        user.wallet.transactions.push({
            type,
            amount: amt,
            reason: reason || "",
            date: new Date(),
        });

        await user.save();

        return res.json({
            message: "Transaction successful",
            balance: user.wallet.balance,
            transactions: user.wallet.transactions,
        });

    } catch (err) {
        console.error("Transaction error:", err);
        return res.status(500).json({ message: "Transaction failed" });
    }
});

module.exports = router;
