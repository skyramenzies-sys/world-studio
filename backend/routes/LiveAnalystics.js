// backend/routes/LiveAnalystics.js
const express = require("express");
const router = express.Router();
const Stream = require("../models/Stream");

router.get("/summary", async (req, res) => {
    try {
        const totalLive = await Stream.countDocuments({ isLive: true });
        const recent = await Stream.find().sort({ startedAt: -1 }).limit(10);
        res.json({ totalLive, recent });
    } catch (err) {
        console.error("Live analytics error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
