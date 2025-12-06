// backend/middleware/checkBan.js
// World-Studio.live - Moderation/Ban guard (UNIVERSE EDITION 🌌)

const User = require("../models/User");

module.exports = async function checkBan(req, res, next) {
    try {
        // Geen auth → gewoon door
        if (!req.user || !req.user._id) {
            return next();
        }

        const userId = req.user._id.toString();
        const user = await User.findById(userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND",
            });
        }

        // Niet geband → door
        if (!user.isBanned) {
            return next();
        }

        const now = new Date();

        // Tijdelijke ban en ban is afgelopen → auto-unban door robot
        if (!user.isPermanentBan && user.bannedUntil && user.bannedUntil <= now) {
            user.isBanned = false;
            user.bannedAt = null;
            user.bannedUntil = null;
            user.banReason = null;
            user.isPermanentBan = false;
            await user.save();
            return next();
        }

        // Nog steeds geband → blokkeren
        let remainingSeconds = null;
        if (!user.isPermanentBan && user.bannedUntil) {
            remainingSeconds = Math.max(
                0,
                Math.floor((user.bannedUntil.getTime() - now.getTime()) / 1000)
            );
        }

        return res.status(403).json({
            success: false,
            error: "Account is banned",
            code: "ACCOUNT_BANNED",
            isPermanent: user.isPermanentBan,
            bannedUntil: user.bannedUntil,
            banReason: user.banReason || "Community guidelines violation",
            remainingSeconds,
        });
    } catch (err) {
        console.error("checkBan middleware error:", err);
        return res.status(500).json({
            success: false,
            error: "Moderation check failed",
            code: "MODERATION_ERROR",
        });
    }
};
