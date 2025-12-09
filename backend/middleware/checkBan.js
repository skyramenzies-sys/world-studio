// backend/middleware/checkBan.js
// World-Studio.live - Moderation/Ban guard (UNIVERSE EDITION 🌌)

const User = require("../models/User");

module.exports = async function checkBan(req, res, next) {
    try {
        // Geen auth → gewoon door (gast of public route)
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

        const now = new Date();

        // Niet geband in flags of status → gewoon door
        const isBannedFlag = user.isBanned === true || user.status === "banned";

        if (!isBannedFlag) {
            return next();
        }

        // Tijdelijke ban: is er een einddatum én is die voorbij → auto-unban door AIRPATH-robot 🤖
        if (!user.isPermanentBan && user.bannedUntil && user.bannedUntil <= now) {
            user.isBanned = false;
            user.status = "active";
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
            status: user.status || "banned",
            isPermanent: user.isPermanentBan === true,
            bannedUntil: user.bannedUntil || null,
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
