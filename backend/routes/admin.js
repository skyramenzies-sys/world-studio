// backend/routes/admin.js
// World-Studio.live - Core Admin Routes (UNIVERSE EDITION)

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

const User = require("../models/User");

let Stream = null;
let Gift = null;
let PlatformWallet = null;

try { Stream = require("../models/Stream"); } catch (e) { }
try { Gift = require("../models/Gift"); } catch (e) { }
try { PlatformWallet = require("../models/PlatformWallet"); } catch (e) { }

const sanitizeUser = (userDoc) => {
    if (!userDoc) return null;
    const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
    delete u.password;
    delete u.resetPasswordToken;
    delete u.resetPasswordExpires;
    return u;
};

const isAdminUser = (user) => {
    if (!user) return false;
    const email = (user.email || "").toLowerCase();
    return user.role === "admin" || email === "menziesalm@gmail.com";
};

// GET /api/admin/stats
router.get("/stats", auth, requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [totalUsers, creatorsCount, adminsCount, bannedUsers, verifiedUsers, activeLast24h, signupsLast24h, signupsLast7d] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ role: "creator" }),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ isBanned: true }),
            User.countDocuments({ isVerified: true }),
            User.countDocuments({ lastSeen: { $gte: last24h } }),
            User.countDocuments({ createdAt: { $gte: last24h } }),
            User.countDocuments({ createdAt: { $gte: last7d } }),
        ]);

        let liveStreams = 0, totalStreams = 0;
        if (Stream) {
            liveStreams = await Stream.countDocuments({ isLive: true });
            totalStreams = await Stream.countDocuments({});
        }

        res.json({
            success: true,
            stats: {
                users: { total: totalUsers, creators: creatorsCount, admins: adminsCount, banned: bannedUsers, verified: verifiedUsers, activeLast24h, signupsLast24h, signupsLast7d },
                streams: { live: liveStreams, total: totalStreams },
                serverTime: now,
            },
        });
    } catch (err) {
        console.error("GET /admin/stats error:", err);
        res.status(500).json({ success: false, error: "Failed to load admin stats" });
    }
});

// GET /api/admin/revenue
router.get("/revenue", auth, requireAdmin, async (req, res) => {
    try {
        res.json({ success: true, period: { start: new Date(), end: new Date() }, report: { total: 0, gifts: 0, subscriptions: 0, coins: 0 } });
    } catch (err) {
        res.status(500).json({ error: "Failed to load revenue" });
    }
});

// GET /api/admin/reports
router.get("/reports", auth, requireAdmin, async (req, res) => {
    try {
        res.json({ success: true, reports: [] });
    } catch (err) {
        res.status(500).json({ error: "Failed to load reports" });
    }
});

// GET /api/admin/users
router.get("/users", auth, requireAdmin, async (req, res) => {
    try {
        let { page = 1, limit = 25, search, role, banned, verified } = req.query;
        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 25;

        const filter = {};
        if (search) {
            const s = search.trim();
            filter.$or = [{ username: new RegExp(s, "i") }, { email: new RegExp(s, "i") }];
        }
        if (role && role !== "all") filter.role = role;
        if (banned === "true") filter.isBanned = true;
        if (banned === "false") filter.isBanned = false;
        if (verified === "true") filter.isVerified = true;
        if (verified === "false") filter.isVerified = false;

        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments(filter),
        ]);

        const sanitized = users.map((u) => {
            const user = sanitizeUser(u);
            user.isAdmin = isAdminUser(user);
            return user;
        });

        res.json({ success: true, users: sanitized, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to load users" });
    }
});

const getUserOr404 = async (userId, res) => {
    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return null; }
    return user;
};

// POST /api/admin/make-admin/:userId
router.post("/make-admin/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;
        user.role = "admin";
        await user.save();
        res.json({ success: true, message: `@${user.username} is now admin`, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to make admin" });
    }
});

// POST /api/admin/remove-admin/:userId
router.post("/remove-admin/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;
        user.role = "creator";
        await user.save();
        res.json({ success: true, message: `@${user.username} is no longer admin`, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to remove admin" });
    }
});

// POST /api/admin/verify-user/:userId
router.post("/verify-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;
        user.isVerified = true;
        user.verificationBadge = { type: "creator", label: "Verified Creator" };
        await user.save();
        res.json({ success: true, message: `@${user.username} is now verified`, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to verify user" });
    }
});

// POST /api/admin/unverify-user/:userId
router.post("/unverify-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;
        user.isVerified = false;
        user.verificationBadge = null;
        await user.save();
        res.json({ success: true, message: `@${user.username} is no longer verified`, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to unverify user" });
    }
});

// POST /api/admin/ban-user/:userId
router.post("/ban-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { reason, durationHours } = req.body || {};
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;
        user.isBanned = true;
        user.bannedAt = new Date();
        user.banReason = reason || "Banned by admin";
        user.isPermanentBan = !durationHours;
        user.bannedUntil = durationHours ? new Date(Date.now() + durationHours * 3600000) : null;
        await user.save();
        res.json({ success: true, message: `@${user.username} has been banned`, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to ban user" });
    }
});

// POST /api/admin/unban-user/:userId
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
        res.json({ success: true, message: `@${user.username} has been unbanned`, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to unban user" });
    }
});

// DELETE /api/admin/delete-user/:userId
router.delete("/delete-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;
        user.isDeactivated = true;
        user.deactivatedAt = new Date();
        await user.save();
        res.json({ success: true, message: `User @${user.username} has been deactivated` });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to delete user" });
    }
});

// POST /api/admin/add-coins/:userId
router.post("/add-coins/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { amount, reason } = req.body || {};
        const coins = parseInt(amount, 10);
        if (!coins || coins <= 0) return res.status(400).json({ success: false, error: "Positive amount required" });
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;
        if (!user.wallet) user.wallet = { balance: 0, totalReceived: 0, totalSpent: 0, transactions: [] };
        user.wallet.balance = (user.wallet.balance || 0) + coins;
        user.wallet.totalReceived = (user.wallet.totalReceived || 0) + coins;
        await user.save();
        res.json({ success: true, message: `Added ${coins} coins to @${user.username}`, wallet: user.wallet });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to add coins" });
    }
});

// POST /api/admin/remove-coins/:userId
router.post("/remove-coins/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { amount, reason } = req.body || {};
        const coins = parseInt(amount, 10);
        if (!coins || coins <= 0) return res.status(400).json({ success: false, error: "Positive amount required" });
        const user = await getUserOr404(req.params.userId, res);
        if (!user) return;
        if (!user.wallet) user.wallet = { balance: 0, totalReceived: 0, totalSpent: 0, transactions: [] };
        user.wallet.balance = Math.max(0, (user.wallet.balance || 0) - coins);
        user.wallet.totalSpent = (user.wallet.totalSpent || 0) + coins;
        await user.save();
        res.json({ success: true, message: `Removed ${coins} coins from @${user.username}`, wallet: user.wallet });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to remove coins" });
    }
});

// GET /api/admin/streams
router.get("/streams", auth, requireAdmin, async (req, res) => {
    try {
        if (!Stream) return res.json({ success: true, streams: [] });
        const { status = "all", limit = 50 } = req.query;
        const q = {};
        if (status === "live") q.isLive = true;
        if (status === "ended") q.isLive = false;
        const streams = await Stream.find(q).sort({ startedAt: -1 }).limit(parseInt(limit, 10));
        res.json({ success: true, streams });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to load streams" });
    }
});

// POST /api/admin/streams/:streamId/end
router.post("/streams/:streamId/end", auth, requireAdmin, async (req, res) => {
    try {
        if (!Stream) return res.status(503).json({ success: false, error: "Stream model not configured" });
        const stream = await Stream.findById(req.params.streamId);
        if (!stream) return res.status(404).json({ success: false, error: "Stream not found" });
        stream.isLive = false;
        stream.endedAt = new Date();
        stream.status = "ended";
        await stream.save();
        if (stream.hostId) {
            try {
                const host = await User.findById(stream.hostId);
                if (host) { host.isLive = false; host.currentStreamId = null; await host.save(); }
            } catch (e) { }
        }
        res.json({ success: true, message: "Stream ended by admin", stream });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to end stream" });
    }
});

module.exports = router;
