// backend/routes/adminCoins.js
// World-Studio.live - Admin Coin History Routes (UNIVERSE EDITION 💰📊)

const express = require("express");
const router = express.Router();

const { auth, adminOnly } = require("../middleware/auth");
const { Gift, hasModel } = require("../models");

// Safety: check of Gift model bestaat
if (!Gift || !hasModel("Gift")) {
    console.error("❌ Gift model is not loaded. Admin coin history routes will not work!");
}

/**
 * GET /api/admin/coins/history
 * Query params:
 *   - range: today | 7d | 30d | 90d | all
 *   - groupBy: day | week | month
 */
router.get("/coins/history", auth, adminOnly, async (req, res) => {
    try {
        if (!Gift || !hasModel("Gift")) {
            return res.status(500).json({
                success: false,
                error: "Gift model not available",
                code: "GIFT_MODEL_MISSING",
            });
        }

        const { range = "7d", groupBy = "day" } = req.query;

        const data = await Gift.getAdminCoinHistory({
            range,
            groupBy,
        });

        return res.json({
            success: true,
            ...data,
        });
    } catch (err) {
        console.error("Admin coins history error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to load coin history",
            code: "COIN_HISTORY_ERROR",
        });
    }
});

module.exports = router;
