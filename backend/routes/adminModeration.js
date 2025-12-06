// backend/routes/adminModeration.js
// World-Studio.live - Admin Moderation Routes (UNIVERSE EDITION 🌌)

const express = require("express");
const router = express.Router();

const User = require("../models/User");

// Helper: user object schoonmaken
function sanitizeUser(userDoc) {
    if (!userDoc) return null;
    const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };

    delete user.password;
    delete user.resetPasswordToken;
    delete user.resetPasswordExpires;
    delete user.emailVerificationToken;
    delete user.emailVerificationExpires;
    delete user.twoFactorSecret;
    delete user.stripeCustomerId;
    delete user.stripeSubscriptionId;

    return user;
}

// Kleine helper voor automatische ban ladder (10m, 1u, 1d, 3d, 30d, perm)
function computeAutoBanDurationSeconds(strikesBefore) {
    const s = strikesBefore + 1; // volgende strike
    if (s === 1) return 10 * 60; // 10 minuten
    if (s === 2) return 60 * 60; // 1 uur
    if (s === 3) return 24 * 60 * 60; // 1 dag
    if (s === 4) return 3 * 24 * 60 * 60; // 3 dagen
    if (s === 5) return 30 * 24 * 60 * 60; // 1 maand
    return -1; // permanent vanaf 6e keer
}

// GET /api/admin/moderation/user?query=xxx   of  ?userId=...
// query kan username, email of _id zijn
router.get("/user", async (req, res) => {
    try {
        const { query, userId } = req.query;

        if (!query && !userId) {
            return res.status(400).json({
                success: false,
                error: "Missing query or userId",
            });
        }

        let user = null;

        if (userId) {
            user = await User.findById(userId);
        } else {
            const q = query.trim();

            // Probeer eerst ID
            if (q.match(/^[0-9a-fA-F]{24}$/)) {
                user = await User.findById(q);
            }

            // Nog niets gevonden → username/email (case-insensitive)
            if (!user) {
                user = await User.findOne({
                    $or: [
                        { username: new RegExp(`^${q}$`, "i") },
                        { email: new RegExp(`^${q}$`, "i") },
                    ],
                });
            }
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        return res.json({
            success: true,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error("GET /admin/moderation/user error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch user",
        });
    }
});

// POST /api/admin/moderation/action
// body: { userId, action, durationSeconds?, reason? }
// action: "warning" | "ban" | "unban"
router.post("/action", async (req, res) => {
    try {
        const { userId, action, durationSeconds, reason } = req.body;

        if (!userId || !action) {
            return res.status(400).json({
                success: false,
                error: "userId and action are required",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        const now = new Date();
        const moderatorId = req.user?._id;
        const moderatorUsername = req.user?.username || "system";

        const baseEvent = {
            reason: reason || null,
            durationSeconds:
                typeof durationSeconds === "number" ? durationSeconds : null,
            moderator: moderatorId,
            moderatorUsername,
            createdAt: now,
        };

        let message = "";
        let event = null;

        // ======================================
        // WARNING
        // ======================================
        if (action === "warning") {
            user.moderationStrikes = (user.moderationStrikes || 0) + 1;
            user.lastViolationAt = now;

            event = {
                ...baseEvent,
                action: "warning",
                durationSeconds: 0,
            };

            message = `Warning sent to @${user.username}`;
        }

        // ======================================
        // BAN (tijdelijk of permanent)
        // ======================================
        else if (action === "ban") {
            let dur = null;

            if (typeof durationSeconds === "number") {
                dur = durationSeconds;
            } else {
                // Auto ladder gebaseerd op strikes
                const currentStrikes = user.moderationStrikes || 0;
                dur = computeAutoBanDurationSeconds(currentStrikes);
            }

            user.isBanned = true;
            user.bannedAt = now;
            user.banReason =
                reason || "Violation of community guidelines";
            user.lastViolationAt = now;
            user.moderationStrikes = (user.moderationStrikes || 0) + 1;

            if (dur === -1) {
                // permanent
                user.isPermanentBan = true;
                user.bannedUntil = null;

                event = {
                    ...baseEvent,
                    action: "permanent_ban",
                    durationSeconds: -1,
                };

                message = `@${user.username} permanently banned`;
            } else {
                const seconds = isNaN(dur) || dur <= 0 ? 0 : dur;

                user.isPermanentBan = false;
                user.bannedUntil =
                    seconds > 0 ? new Date(now.getTime() + seconds * 1000) : null;

                event = {
                    ...baseEvent,
                    action: "temp_ban",
                    durationSeconds: seconds,
                };

                message = seconds
                    ? `@${user.username} banned for ${Math.round(
                        seconds / 60
                    )} minutes`
                    : `@${user.username} banned`;
            }
        }

        // ======================================
        // UNBAN
        // ======================================
        else if (action === "unban") {
            user.isBanned = false;
            user.bannedAt = null;
            user.bannedUntil = null;
            user.isPermanentBan = false;
            user.banReason = null;

            event = {
                ...baseEvent,
                action: "unban",
                durationSeconds: 0,
            };

            message = `@${user.username} has been unbanned`;
        } else {
            return res.status(400).json({
                success: false,
                error: "Invalid action",
            });
        }

        // Event in history
        if (event) {
            user.moderationHistory = user.moderationHistory || [];
            user.moderationHistory.push(event);

            if (user.moderationHistory.length > 200) {
                user.moderationHistory =
                    user.moderationHistory.slice(-200);
            }
        }

        await user.save();

        // Optioneel: stuur notificatie naar user
        try {
            if (typeof user.addNotification === "function") {
                let notifType = "warning";
                if (action === "ban") notifType = "warning";
                if (action === "unban") notifType = "system";

                await user.addNotification({
                    type: notifType,
                    message:
                        action === "warning"
                            ? "You received a warning from moderation."
                            : action === "ban"
                                ? "Your account has been restricted by moderation."
                                : "Your account ban has been lifted.",
                    icon:
                        action === "warning"
                            ? "⚠️"
                            : action === "ban"
                                ? "🚫"
                                : "✅",
                    actionUrl: "/guidelines",
                });
            }
        } catch (notifyErr) {
            console.warn(
                "Moderation notification failed:",
                notifyErr.message
            );
        }

        // Optioneel: socket update naar client
        try {
            const io = req.app.get("io");
            if (io && (action === "ban" || action === "unban")) {
                io.to(`user:${user._id.toString()}`).emit(
                    "moderation:update",
                    {
                        action,
                        isBanned: user.isBanned,
                        isPermanentBan: user.isPermanentBan,
                        bannedUntil: user.bannedUntil,
                        banReason: user.banReason,
                        moderationStrikes: user.moderationStrikes,
                    }
                );
            }
        } catch (ioErr) {
            console.warn("Moderation io emit failed:", ioErr.message);
        }

        return res.json({
            success: true,
            message,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error("POST /admin/moderation/action error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to apply moderation action",
        });
    }
});

module.exports = router;
