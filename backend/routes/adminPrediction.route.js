// backend/routes/adminPrediction.route.js
// World-Studio.live - Admin Prediction Routes (UNIVERSE EDITION 🌌)

const express = require("express");
const router = express.Router();

const { Prediction } = require("../models");
const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

// 🔐 Alle routes hieronder: alleen voor ingelogde admins
router.use(authMiddleware, requireAdmin);

/**
 * GET /api/admin/predictions/stats
 * Admin dashboard stats voor predictions & signals
 */
router.get("/stats", async (req, res) => {
    try {
        // Gebruik de bestaande summary + extra statistieken
        const summary = await Prediction.getSummaryStats();

        const [strongBuys, strongSells] = await Promise.all([
            Prediction.countDocuments({
                signal: "strong_buy",
                status: "active"
            }),
            Prediction.countDocuments({
                signal: "strong_sell",
                status: "active"
            })
        ]);

        res.json({
            success: true,
            stats: {
                ...summary,
                strongBuys,
                strongSells
            }
        });
    } catch (err) {
        console.error("❌ Admin prediction stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load prediction stats"
        });
    }
});

/**
 * GET /api/admin/predictions/strong-buys
 * Top sterke koop-signalen (voor widget / lijst)
 */
router.get("/strong-buys", async (req, res) => {
    try {
        const { assetType, limit = 10 } = req.query;

        const strongBuys = await Prediction.getStrongBuys(
            assetType || null,
            parseInt(limit, 10)
        );

        res.json({
            success: true,
            items: strongBuys
        });
    } catch (err) {
        console.error("❌ Admin strong buys error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load strong buy signals"
        });
    }
});

module.exports = router;
