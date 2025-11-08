const express = require("express");
const router = express.Router();
const LiveStream = require("../models/LiveStream");

// 🧠 Global analytics
router.get("/stats", async (req, res) => {
    try {
        const totalStreams = await LiveStream.countDocuments();
        const activeStreams = await LiveStream.countDocuments({ isLive: true });
        const totalGifts = (await LiveStream.find()).reduce(
            (sum, s) => sum + s.gifts.reduce((a, g) => a + g.amount, 0),
            0
        );
        const totalViewers = (await LiveStream.find()).reduce(
            (sum, s) => sum + (s.viewers || 0),
            0
        );

        res.json({
            totalStreams,
            activeStreams,
            totalGifts,
            totalViewers,
            updatedAt: new Date(),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
