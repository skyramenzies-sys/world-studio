const express = require("express");
const router = express.Router();
const PlatformWallet = require("../models/PlatformWallet");
const authMiddleware = require("../middleware/authMiddleware");

// GET total platform balance
router.get("/balance", authMiddleware, async (req, res) => {
    try {
        const wallet = await PlatformWallet.findOne();
        res.json({ balance: wallet?.balance || 0 });
    } catch (err) {
        console.error("Platform balance error:", err);
        res.status(500).json({ message: "Failed to get platform balance" });
    }
});

// POST record fee
router.post("/fee", async (req, res) => {
    try {
        const { amount, fromUserId, reason } = req.body;

        let wallet = await PlatformWallet.findOne();
        if (!wallet) {
            wallet = new PlatformWallet({ balance: 0, history: [] });
        }

        const numericAmount = Number(amount) || 0;
        wallet.balance += numericAmount;
        wallet.history.push({ amount: numericAmount, fromUserId, reason, date: new Date() });

        await wallet.save();
        res.json({ success: true, balance: wallet.balance });
    } catch (err) {
        console.error("Fee record error:", err);
        res.status(500).json({ message: "Failed to store fee" });
    }
});

module.exports = router;
