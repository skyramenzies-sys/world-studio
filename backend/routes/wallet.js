const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

// GET balance
router.get("/balance", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({ balance: user.wallet?.balance || 0 });
    } catch (err) {
        console.error("Balance error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST add transaction
router.post("/transaction", authMiddleware, async (req, res) => {
    try {
        const { type, amount, reason } = req.body;

        const user = await User.findById(req.userId);
        if (!user.wallet) {
            user.wallet = { balance: 0, transactions: [] };
        }

        const numericAmount = Number(amount) || 0;
        if (numericAmount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        if (type === "credit") {
            user.wallet.balance += numericAmount;
        } else if (type === "debit") {
            if (user.wallet.balance < numericAmount) {
                return res.status(400).json({ message: "Insufficient balance" });
            }
            user.wallet.balance -= numericAmount;
        } else {
            return res.status(400).json({ message: "Invalid transaction type" });
        }

        user.wallet.transactions.push({ type, amount: numericAmount, reason });
        await user.save();

        res.json({ balance: user.wallet.balance });
    } catch (err) {
        console.error("Transaction error:", err);
        res.status(500).json({ message: "Transaction failed" });
    }
});

module.exports = router;
