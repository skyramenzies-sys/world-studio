const express = require("express");
const router = express.Router();
const PlatformWallet = require("../models/PlatformWallet");

// GET full wallet history (admin panel)
router.get("/history", async (req, res) => {
    try {
        const wallet = await PlatformWallet.findOne();
        if (!wallet) return res.status(404).json({ message: "No platform wallet found" });
        res.json(wallet.history.reverse());
    } catch (err) {
        console.error("Admin wallet history error:", err);
        res.status(500).json({ message: "Failed to load history" });
    }
});

module.exports = router;
