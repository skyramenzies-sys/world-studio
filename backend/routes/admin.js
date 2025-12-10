// backend/routes/admin.js
// World-Studio.live - Core Admin Routes (UNIVERSE EDITION 🌌)
// Admin dashboard API: stats, users, streams, revenue

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

const User = require("../models/User");

// Optionele modellen (niet verplicht, server mag niet crashen als ze ontbreken)
let Stream = null;
let Gift = null;
let PlatformWallet = null;

try {
    Stream = require("../models/Stream");
} catch (e) {
    console.warn("⚠️ Optional model 'Stream' not found for admin routes");
}

try {
    Gift = require("../models/Gift");
} catch (e) {
    console.warn("⚠️ Optional model 'Gift' not found for admin routes");
}

try {
    PlatformWallet = require("../models/PlatformWallet");
} catch (e) {
    console.warn("⚠️ Optional model 'PlatformWallet' not found for admin routes");
}

// Kleine helper om user veilig terug te geven
const sanitizeUser = (userDoc) => {
    if (!userDoc) return null;
    const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };

    delete u.password;
    delete u.resetPasswordToken;
    delete u.resetPasswordExpires;
    delete u.passwordResetToken;
    delete u.passwordResetExpires;
    delete u.emailVerificationToken;
    delete u.emailVerificationExpires;
    delete u.twoFactorSecret;
    delete u.stripeCustomerId;
    delete u.stripeSubscriptionId;

    return u;
};

// Helper: check admin consistent met /auth/me
const isAdminUser = (user) => {
    if (!user) return false;
    const email = (user.email || "").toLowerCase();
    return user.role === "admin" || email === "menziesalm@gmail.com";
};

// ===========================================
// DASHBOARD STATS
// ===========================================

/**
 * GET /api/admin/stats
 * Global platform stats for admin dashboard
 */
router.get("/stats", auth, requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            creatorsCount,
            adminsCount,
            bannedUsers,
            verifiedUsers,
            activeLast24h,
            signupsLast24h,
            signupsLast7d,
        ] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ role: "creator" }),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ isBanned: true }),
            User.countDocuments({ isVerified: true }),
            User.countDocuments({ lastSeen: { $gte: last24h } }),
            User.countDocuments({ createdAt: { $gte: last24h } }),
            User.countDocuments({ createdAt: { $gte: last7d } }),
        ]);

        let liveStreams = 0;
        let totalStreams = 0;

        if (Stream) {
            liveStreams = await Stream.countDocuments({ isLive: true });
            totalStreams = await Stream.countDocuments({});
        }

        // Optional: revenue from PlatformWallet
        let revenueSummary = null;
        if (PlatformWallet && typeof PlatformWallet.getRevenueReport === "function") {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            revenueSummary = await PlatformWallet.getRevenueReport(monthStart, now);
        }

        res.json({
            success: true,

            stats: {
                users: {
                    total: totalUsers,
                    creators: creatorsCount,
                    admins: adminsCount,
                    banned: bannedUsers,
                    verified: verifiedUsers,
                    activeLast24h,
                    signupsLast24h,
                    signupsLast7d,
                },
                streams: {
                    live: liveStreams,
                    total: totalStreams,
                },
                revenue: revenueSummary || null,
                serverTime: now,
            },
        });
    } catch (err) {
        console.error("❌ /api/admin/stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load admin stats",
        });
    }
});

// ===========================================
// REVENUE (SIMPLE WRAPPER)
// ===========================================

/**
 * GET /api/admin/revenue
 * Simple wrapper around PlatformWallet.getRevenueReport
 */
router.get("/revenue", auth, requireAdmin, async (req, res) => {
    try {
        if (!PlatformWallet || typeof PlatformWallet.getRevenueReport !== "function") {
            return res.json({ success: true, period: { start: new Date(), end: new Date() }, report: { total: 0, gifts: 0, subscriptions: 0, coins: 0 } }); // Mock data
        // OLD: return res.status(503).json({
                success: false,
                error: "Revenue engine not configured",
            });
        }

        const { startDate, endDate, period = "month" } = req.query;
        const now = new Date();
        let start;
        let end;

        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            if (period === "today") {
                start = new Date(now);
                start.setHours(0, 0, 0, 0);
                end = now;
            } else if (period === "week") {
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                start.setHours(0, 0, 0, 0);
                end = now;
            } else if (period === "year") {
                start = new Date(now.getFullYear(), 0, 1);
                end = now;
            } else {
                // month
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = now;
            }
        }

        const report = await PlatformWallet.getRevenueReport(start, end);

        res.json({
            success: true,
            period: { start, end },
            report,
        });
    } catch (err) {
        console.error("❌ /api/admin/revenue error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load revenue",
        });
    }
});

// ===========================================
// USERS LIST & MANAGEMENT
// ===========================================

/**
 * GET /api/admin/users
 * Paginated user list with filters
 * Query:
 *  - page, limit
 *  - search (username/email)
 *  - role (admin/creator)
 *  - banned (true/false)
 *  - verified (true/false)
 */
router.get("/users", auth, requireAdmin, async (req, res) => {
    try {
        let {
            page = 1,
            limit = 25,
            search,
            role,
            banned,
            verified,
        } = req.query;

        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 25;

        const filter = {};

        if (search) {
            const s = search.trim();
            filter.$or = [
                { username: new RegExp(s, "i") },
                { email: new RegExp(s, "i") },
            ];
        }

        if (role && role !== "all") {
            filter.role = role;
        }

        if (banned === "true") filter.isBanned = true;
        if (banned === "false") filter.isBanned = false;

        if (verified === "true") filter.isVerified = true;
        if (verified === "false") filter.isVerified = false;

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(filter),
        ]);

        const sanitized = users.map((u) => {
            const user = sanitizeUser(u);
            user.isAdmin = isAdminUser(user);
            user.followersCount =
                user.followersCount || (user.followers ? user.followers.length : 0);
            user.followingCount =
                user.followingCount || (user.following ? user.following.length : 0);
            return user;
        });

        res.json({
            success: true,
            users: sanitized,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("❌ /api/admin/users error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load users",
        });
    }
});

// --- Helper om user by id te pakken ---
const getUserOr404 = async (userId, res) => {
    const user = await User.findById(userId);
    if (!user) {
        res.status(404).json({ success: false, error: "User not found" });
        return null;
    }
    return user;
};

// MAKE ADMIN
router.post("/make-admin/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;

        user.role = "admin";
        await user.save();

        res.json({
            success: true,
            message: `@${user.username} is now admin`,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error("❌ make-admin error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to make admin",
        });
    }
});

// REMOVE ADMIN
router.post("/remove-admin/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;

        user.role = "creator";
        await user.save();

        res.json({
            success: true,
            message: `@${user.username} is no longer admin`,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error("❌ remove-admin error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to remove admin",
        });
    }
});

// VERIFY USER
router.post("/verify-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;

        user.isVerified = true;
        user.verificationBadge =
            user.verificationBadge || {
                type: "creator",
                label: "Verified Creator",
            };

        await user.save();

        res.json({
            success: true,
            message: `@${user.username} is now verified`,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error("❌ verify-user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to verify user",
        });
    }
});

// UNVERIFY USER
router.post("/unverify-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;

        user.isVerified = false;
        user.verificationBadge = null;

        await user.save();

        res.json({
            success: true,
            message: `@${user.username} is no longer verified`,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error("❌ unverify-user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to unverify user",
        });
    }
});

// BAN USER (simple, voor dashboard-knoppen)
// body: { reason?, durationHours? } (optioneel)
router.post("/ban-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { reason, durationHours } = req.body || {};
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;

        const now = new Date();
        user.isBanned = true;
        user.bannedAt = now;
        user.banReason = reason || "Banned by admin";
        user.isPermanentBan = !durationHours;
        user.bannedUntil = durationHours
            ? new Date(now.getTime() + durationHours * 60 * 60 * 1000)
            : null;

        await user.save();



        res.json({
            success: true,
            message: `@${user.username} has been banned`,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error("❌ ban-user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to ban user",
        });
    }
});

// UNBAN USER
router.post("/unban-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;

        user.isBanned = false;
        user.bannedAt = null;
        user.bannedUntil = null;
        user.isPermanentBan = false;
        user.banReason = null;

        await user.save();



        res.json({
            success: true,
            message: `@${user.username} has been unbanned`,
            user: sanitizeUser(user),
        });
    } catch (err) {
        console.error("❌ unban-user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to unban user",
        });
    }
});

// DELETE USER (soft deactivate)
router.delete("/delete-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;

        user.isDeactivated = true;
        user.deactivatedAt = new Date();
        user.deactivationReason = "Deleted by admin";
        await user.save();

        res.json({
            success: true,
            message: `User @${user.username} has been deactivated`,
        });
    } catch (err) {
        console.error("❌ delete-user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete user",
        });
    }
});

// ADD COINS
router.post("/add-coins/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { amount, reason } = req.body || {};
        const coins = parseInt(amount, 10);

        if (!coins || coins <= 0) {
            return res.status(400).json({
                success: false,
                error: "Positive amount is required",
            });
        }

        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;

        if (!user.wallet) {
            user.wallet = {
                balance: 0,
                totalReceived: 0,
                totalSpent: 0,
                transactions: [],
            };
        }

        user.wallet.balance = (user.wallet.balance || 0) + coins;
        user.wallet.totalReceived =
            (user.wallet.totalReceived || 0) + coins;
        user.wallet.transactions = user.wallet.transactions || [];

        user.wallet.transactions.unshift({
            type: "admin_adjust",
            amount: coins,
            description: reason || "Admin added coins",
            status: "completed",
            meta: {
                adminId: req.user?._id,
                adminUsername: req.user?.username,
                direction: "credit",
            },
            createdAt: new Date(),
        });

        if (user.wallet.transactions.length > 500) {
            user.wallet.transactions = user.wallet.transactions.slice(0, 500);
        }

        await user.save();

        res.json({
            success: true,
            message: `Added ${coins} coins to @${user.username}`,
            wallet: {
                balance: user.wallet.balance,
                totalReceived: user.wallet.totalReceived,
                totalSpent: user.wallet.totalSpent,
            },
        });
    } catch (err) {
        console.error("❌ add-coins error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to add coins",
        });
    }
});

// REMOVE COINS
router.post("/remove-coins/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { amount, reason } = req.body || {};
        const coins = parseInt(amount, 10);

        if (!coins || coins <= 0) {
            return res.status(400).json({
                success: false,
                error: "Positive amount is required",
            });
        }

        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;

        if (!user.wallet) {
            user.wallet = {
                balance: 0,
                totalReceived: 0,
                totalSpent: 0,
                transactions: [],
            };
        }

        user.wallet.balance = Math.max(
            0,
            (user.wallet.balance || 0) - coins
        );
        user.wallet.totalSpent = (user.wallet.totalSpent || 0) + coins;
        user.wallet.transactions = user.wallet.transactions || [];

        user.wallet.transactions.unshift({
            type: "admin_adjust",
            amount: -coins,
            description: reason || "Admin removed coins",
            status: "completed",
            meta: {
                adminId: req.user?._id,
                adminUsername: req.user?.username,
                direction: "debit",
            },
            createdAt: new Date(),
        });

        if (user.wallet.transactions.length > 500) {
            user.wallet.transactions = user.wallet.transactions.slice(0, 500);
        }

        await user.save();

        res.json({
            success: true,
            message: `Removed ${coins} coins from @${user.username}`,
            wallet: {
                balance: user.wallet.balance,
                totalReceived: user.wallet.totalReceived,
                totalSpent: user.wallet.totalSpent,
            },
        });
    } catch (err) {
        console.error("❌ remove-coins error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to remove coins",
        });
    }
});

// ===========================================
// STREAM MANAGEMENT
// ===========================================

/**
 * GET /api/admin/streams
 * List live/recent streams (if Stream model exists)
 */
router.get("/streams", auth, requireAdmin, async (req, res) => {
    try {
        if (!Stream) {
            return res.json({
                success: true,
                streams: [],
                message: "Stream model not configured",
            });
        }

        const { status = "live", limit = 50 } = req.query;
        const q = {};

        if (status === "live") q.isLive = true;
        if (status === "ended") q.isLive = false;

        const streams = await Stream.find(q)
            .sort({ startedAt: -1 })
            .limit(parseInt(limit, 10));

        res.json({
            success: true,
            streams,

        });
    } catch (err) {
        console.error("❌ /api/admin/streams error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load streams",
        });
    }
});

/**
 * POST /api/admin/streams/:streamId/end
 * Force-end a stream
 */
router.post(
    "/streams/:streamId/end",
    auth,
    requireAdmin,
    async (req, res) => {
        try {
            if (!Stream) {
                return res.json({ success: true, period: { start: new Date(), end: new Date() }, report: { total: 0, gifts: 0, subscriptions: 0, coins: 0 } }); // Mock data
        // OLD: return res.status(503).json({
                    success: false,
                    error: "Stream model not configured",
                });
            }

            const stream = await Stream.findById(req.params.streamId);
            if (!stream) {
                return res.status(404).json({
                    success: false,
                    error: "Stream not found",
                });
            }

            stream.isLive = false;
            stream.endedAt = new Date();
            stream.status = "ended";

            await stream.save();

            // Ook user synchroniseren, als host bekend is
            if (stream.hostId) {
                try {
                    const host = await User.findById(stream.hostId);
                    if (host) {
                        host.isLive = false;
                        host.currentStreamId = null;
                        await host.save();
                    }
                } catch (e) {
                    console.warn(
                        "⚠️ Could not update host after ending stream:",
                        e.message
                    );
                }
            }

            // Optioneel: via socket.io broadcast naar room
            try {
                const io = req.app.get("io");
                if (io) {
                    io.to(`stream:${stream._id.toString()}`).emit(
                        "admin:stream-ended",
                        {
                            streamId: stream._id,
                            reason: req.body?.reason || "Ended by admin",
                        }
                    );
                }
            } catch (e) {
                console.warn("⚠️ Socket emit failed on stream end:", e.message);
            }

            res.json({
                success: true,
                message: "Stream ended by admin",
                stream,
            });
        } catch (err) {
            console.error("❌ end-stream error:", err);
            res.status(500).json({
                success: false,
                error: "Failed to end stream",
            });
        }
    }
);

module.exports = router;

// GET /api/admin/reports - Get all reports
router.get("/reports", auth, requireAdmin, async (req, res) => {
    try {
        // Return empty array for now - implement later
        res.json({ success: true, reports: [] });
    } catch (err) {
        console.error("GET /admin/reports error:", err);
        res.status(500).json({ error: "Failed to load reports" });
    }
});
