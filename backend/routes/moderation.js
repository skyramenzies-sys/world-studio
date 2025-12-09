// backend/routes/moderation.js
// World-Studio.live - Moderation Routes (UNIVERSE EDITION 🌌)

const express = require("express");
const router = express.Router();

const User = require("../models/User");
const auth = require("../middleware/authMiddleware"); // Zorg dat deze bestaat en req.user zet
const requireAdmin = require("../middleware/requireAdmin");
const {
    applyViolation,
    computeBanStatus,
    unbanUser,
} = require("../utils/moderation");

// ===========================================
// GET /api/moderation/user/:userId
// -> Haal ban-status + strikes op
// ===========================================
router.get("/user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select(
            "username avatar isBanned banUntil isPermanentBan moderationStrikes moderationHistory"
        );

        if (!user) {
            return res
                .status(404)
                .json({ success: false, error: "User not found" });
        }

        const ban = computeBanStatus(user);

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                avatar: user.avatar,
                isBanned: user.isBanned,
                isPermanentBan: user.isPermanentBan,
                banUntil: user.banUntil,
                moderationStrikes: user.moderationStrikes || 0,
                ban,
                history: user.moderationHistory?.slice(-20) || [],
            },
        });
    } catch (err) {
        console.error("Moderation user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch user moderation",
        });
    }
});

// ===========================================
// POST /api/moderation/strike/:userId
// -> Geef user een strike + automatische ban
// Body: { reason?: string }
// ===========================================
router.post("/strike/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        const result = await applyViolation(userId, reason || "admin_strike");

        if (!result) {
            return res.status(404).json({
                success: false,
                error: "User not found or strike failed",
            });
        }

        res.json({
            success: true,
            message: "Strike applied",
            data: {
                userId,
                action: result.action,
                strikeCount: result.strikeCount,
                durationSeconds: result.durationSeconds,
                permanent: result.permanent,
            },
        });
    } catch (err) {
        console.error("Moderation strike error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to apply strike",
        });
    }
});

// ===========================================
// POST /api/moderation/unban/:userId
// -> Haal ban weg
// ===========================================
router.post("/unban/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        const user = await unbanUser(userId, reason || "admin_unban");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found or already unbanned",
            });
        }

        res.json({
            success: true,
            message: "User unbanned",
            user: {
                id: user._id,
                username: user.username,
                isBanned: user.isBanned,
                isPermanentBan: user.isPermanentBan,
                banUntil: user.banUntil,
                moderationStrikes: user.moderationStrikes,
            },
        });
    } catch (err) {
        console.error("Moderation unban error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to unban user",
        });
    }
});

module.exports = router;
