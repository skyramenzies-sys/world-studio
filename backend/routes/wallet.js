const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authmiddleware");
const User = require("../models/User");

// GET balance
router.get("/balance", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ balance: user.wallet.balance });
    } catch (err) {
        console.error("Balance error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST add transaction
router.post("/transaction", authMiddleware, async (req, res) => {
    try {
        const { type, amount, reason } = req.body;

        const user = await User.findById(req.user.id);
        if (type === "credit") {
            user.wallet.balance += amount;
        } else if (type === "debit") {
            if (user.wallet.balance < amount)
                return res.status(400).json({ message: "Insufficient balance" });
            user.wallet.balance -= amount;
        } else {
            return res.status(400).json({ message: "Invalid transaction type" });
        }

        user.wallet.transactions.push({ type, amount, reason });
        await user.save();

        res.json({ balance: user.wallet.balance });
    } catch (err) {
        console.error("Transaction error:", err);
        res.status(500).json({ message: "Transaction failed" });
    }
});

module.exports = router;
