// backend/routes/adminWallet.js
"use strict";

const express = require("express");
const router = express.Router();
const PlatformWallet = require("../models/PlatformWallet");
const authMiddleware = require("../middleware/authMiddleware");

// -----------------------------------------
// ADMIN CHECK MIDDLEWARE
// -----------------------------------------
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    next();
}

// -----------------------------------------
// GET WALLET HISTORY (Paginated)
// -----------------------------------------
router.get("/history", authMiddleware, requireAdmin, async (req, res) => {
    try {
        // Pagination params
        const limit = Math.min(parseInt(req.query.limit) || 100, 500); // prevent abuse
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const skip = (page - 1) * limit;

        const wallet = await PlatformWallet.findOne().lean();

        if (!wallet) {
            return res.status(404).json({ error: "Platform wallet not found" });
        }

        const total = wallet.history.length;

        const paginatedHistory = wallet.history
            .slice()                // clone array to avoid DB mutation
            .reverse()              // newest first
            .slice(skip, skip + limit);

        res.json({
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
            history: paginatedHistory
        });

    } catch (err) {
        console.error("🔥 Admin wallet history error:", err);
        res.status(500).json({ error: "Failed to load wallet history" });
    }
});

module.exports = router;
