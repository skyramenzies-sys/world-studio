// backend/routes/cleanupRoutes.js
// World-Studio.live - Cleanup & Maintenance Routes
// Handles database cleanup, expired data removal, and maintenance tasks

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

// Models (with safe loading)
let User, Stream, Post, Gift, PK, Notification, PredictionLog, PlatformWallet;

try { User = require("../models/User"); } catch (e) { }
try { Stream = require("../models/Stream"); } catch (e) { }
try { Post = require("../models/Post"); } catch (e) { }
try { Gift = require("../models/Gift"); } catch (e) { }
try { PK = require("../models/PK"); } catch (e) { }
try { Notification = require("../models/Notification"); } catch (e) { }
try { PredictionLog = require("../models/PredictionLog"); } catch (e) { }
try { PlatformWallet = require("../models/PlatformWallet"); } catch (e) { }

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Safe delete with count
 */
const safeDeleteMany = async (Model, query, description) => {
    if (!Model) return { deleted: 0, skipped: true, description };

    try {
        const result = await Model.deleteMany(query);
        return {
            deleted: result.deletedCount,
            description,
            success: true
        };
    } catch (err) {
        return {
            deleted: 0,
            error: err.message,
            description,
            success: false
        };
    }
};

/**
 * Safe update with count
 */
const safeUpdateMany = async (Model, query, update, description) => {
    if (!Model) return { updated: 0, skipped: true, description };

    try {
        const result = await Model.updateMany(query, update);
        return {
            updated: result.modifiedCount,
            description,
            success: true
        };
    } catch (err) {
        return {
            updated: 0,
            error: err.message,
            description,
            success: false
        };
    }
};

/**
 * Get date X days ago
 */
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * Get date X hours ago
 */
const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

// ===========================================
// CLEANUP ENDPOINTS
// ===========================================

/**
 * POST /api/cleanup/all
 * Run all cleanup tasks (admin only)
 */
router.post("/all", auth, requireAdmin, async (req, res) => {
    try {
        console.log("🧹 Starting full cleanup...");
        const startTime = Date.now();
        const results = [];

        // 1. Clean up ended streams older than 30 days
        results.push(await safeDeleteMany(
            Stream,
            {
                isLive: false,
                endedAt: { $lt: daysAgo(30) }
            },
            "Old ended streams (30+ days)"
        ));

        // 2. Clean up expired PK challenges
        results.push(await safeUpdateMany(
            PK,
            {
                status: "pending",
                challengeExpiresAt: { $lt: new Date() }
            },
            { status: "expired" },
            "Expired PK challenges"
        ));

        // 3. Clean up old PK battles (completed, 90+ days)
        results.push(await safeDeleteMany(
            PK,
            {
                status: { $in: ["finished", "cancelled", "expired", "declined"] },
                createdAt: { $lt: daysAgo(90) }
            },
            "Old PK battles (90+ days)"
        ));

        // 4. Clean up old predictions logs (180+ days)
        results.push(await safeDeleteMany(
            PredictionLog,
            { createdAt: { $lt: daysAgo(180) } },
            "Old prediction logs (180+ days)"
        ));

        // 5. Clean up deleted posts (soft deleted 30+ days ago)
        results.push(await safeDeleteMany(
            Post,
            {
                status: "deleted",
                deletedAt: { $lt: daysAgo(30) }
            },
            "Soft-deleted posts (30+ days)"
        ));

        // 6. Clean up old read notifications (60+ days)
        if (User) {
            try {
                const cutoffDate = daysAgo(60);
                const usersWithOldNotifications = await User.find({
                    "notifications.read": true,
                    "notifications.createdAt": { $lt: cutoffDate }
                }).select("_id notifications");

                let notificationsRemoved = 0;
                for (const user of usersWithOldNotifications) {
                    const originalCount = user.notifications.length;
                    user.notifications = user.notifications.filter(n =>
                        !n.read || new Date(n.createdAt) > cutoffDate
                    );
                    notificationsRemoved += originalCount - user.notifications.length;
                    if (originalCount !== user.notifications.length) {
                        await user.save();
                    }
                }
                results.push({
                    deleted: notificationsRemoved,
                    description: "Old read notifications (60+ days)",
                    success: true
                });
            } catch (err) {
                results.push({
                    deleted: 0,
                    error: err.message,
                    description: "Old read notifications",
                    success: false
                });
            }
        }

        // 7. Clean up orphaned streams (no user)
        if (Stream && User) {
            try {
                const allStreamerIds = await Stream.distinct("streamerId");
                const existingUserIds = await User.find({
                    _id: { $in: allStreamerIds }
                }).distinct("_id");

                const orphanedStreamerIds = allStreamerIds.filter(
                    id => !existingUserIds.some(uid => uid.toString() === id.toString())
                );

                if (orphanedStreamerIds.length > 0) {
                    const result = await Stream.deleteMany({
                        streamerId: { $in: orphanedStreamerIds }
                    });
                    results.push({
                        deleted: result.deletedCount,
                        description: "Orphaned streams (user deleted)",
                        success: true
                    });
                } else {
                    results.push({
                        deleted: 0,
                        description: "Orphaned streams (none found)",
                        success: true
                    });
                }
            } catch (err) {
                results.push({
                    deleted: 0,
                    error: err.message,
                    description: "Orphaned streams",
                    success: false
                });
            }
        }

        // 8. Reset stale live status (streams marked live but ended 24+ hours ago)
        results.push(await safeUpdateMany(
            Stream,
            {
                isLive: true,
                startedAt: { $lt: hoursAgo(24) }
            },
            {
                isLive: false,
                status: "ended",
                endedAt: new Date()
            },
            "Stale live streams (24+ hours)"
        ));

        // 9. Reset stale user live status
        results.push(await safeUpdateMany(
            User,
            {
                isLive: true,
                lastSeen: { $lt: hoursAgo(2) }
            },
            {
                isLive: false,
                currentStreamId: null
            },
            "Stale user live status (2+ hours inactive)"
        ));

        // 10. Clean up temporary bans that have expired
        results.push(await safeUpdateMany(
            User,
            {
                isBanned: true,
                bannedUntil: { $lt: new Date() }
            },
            {
                isBanned: false,
                banReason: null,
                bannedAt: null,
                bannedUntil: null
            },
            "Expired temporary bans"
        ));

        // 11. Trim old wallet transactions (keep last 500 per user)
        if (User) {
            try {
                const usersWithManyTransactions = await User.find({
                    "wallet.transactions.500": { $exists: true }
                }).select("_id wallet.transactions");

                let transactionsTrimmed = 0;
                for (const user of usersWithManyTransactions) {
                    if (user.wallet?.transactions?.length > 500) {
                        const excess = user.wallet.transactions.length - 500;
                        user.wallet.transactions = user.wallet.transactions.slice(0, 500);
                        transactionsTrimmed += excess;
                        await user.save();
                    }
                }
                results.push({
                    deleted: transactionsTrimmed,
                    description: "Excess wallet transactions (>500 per user)",
                    success: true
                });
            } catch (err) {
                results.push({
                    deleted: 0,
                    error: err.message,
                    description: "Excess wallet transactions",
                    success: false
                });
            }
        }

        // 12. Trim platform wallet history (keep last 10000)
        if (PlatformWallet) {
            try {
                const wallet = await PlatformWallet.findOne({ identifier: "platform-main" });
                if (wallet && wallet.history?.length > 10000) {
                    const excess = wallet.history.length - 10000;
                    wallet.history = wallet.history.slice(-10000);
                    await wallet.save();
                    results.push({
                        deleted: excess,
                        description: "Excess platform wallet history (>10000)",
                        success: true
                    });
                } else {
                    results.push({
                        deleted: 0,
                        description: "Platform wallet history (within limits)",
                        success: true
                    });
                }
            } catch (err) {
                results.push({
                    deleted: 0,
                    error: err.message,
                    description: "Platform wallet history",
                    success: false
                });
            }
        }

        const duration = Date.now() - startTime;
        const totalDeleted = results.reduce((sum, r) => sum + (r.deleted || 0), 0);
        const totalUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);

        console.log(`✅ Cleanup completed in ${duration}ms. Deleted: ${totalDeleted}, Updated: ${totalUpdated}`);

        res.json({
            success: true,
            message: "Cleanup completed",
            duration: `${duration}ms`,
            summary: {
                totalDeleted,
                totalUpdated,
                tasksRun: results.length,
                tasksSuccessful: results.filter(r => r.success).length
            },
            results
        });
    } catch (err) {
        console.error("❌ Cleanup error:", err);
        res.status(500).json({
            success: false,
            error: "Cleanup failed",
            message: err.message
        });
    }
});

/**
 * POST /api/cleanup/streams
 * Clean up old streams
 */
router.post("/streams", auth, requireAdmin, async (req, res) => {
    try {
        const { daysOld = 30 } = req.body;

        const results = [];

        // Delete old ended streams
        results.push(await safeDeleteMany(
            Stream,
            {
                isLive: false,
                endedAt: { $lt: daysAgo(daysOld) }
            },
            `Ended streams older than ${daysOld} days`
        ));

        // Reset stale live streams
        results.push(await safeUpdateMany(
            Stream,
            {
                isLive: true,
                startedAt: { $lt: hoursAgo(24) }
            },
            {
                isLive: false,
                status: "ended",
                endedAt: new Date()
            },
            "Stale live streams (24+ hours)"
        ));

        res.json({
            success: true,
            message: "Stream cleanup completed",
            results
        });
    } catch (err) {
        console.error("❌ Stream cleanup error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/cleanup/pk
 * Clean up PK battles
 */
router.post("/pk", auth, requireAdmin, async (req, res) => {
    try {
        const { daysOld = 90 } = req.body;

        const results = [];

        // Expire old pending challenges
        results.push(await safeUpdateMany(
            PK,
            {
                status: "pending",
                challengeExpiresAt: { $lt: new Date() }
            },
            { status: "expired" },
            "Expired pending challenges"
        ));

        // Delete old completed/cancelled battles
        results.push(await safeDeleteMany(
            PK,
            {
                status: { $in: ["finished", "cancelled", "expired", "declined"] },
                createdAt: { $lt: daysAgo(daysOld) }
            },
            `Old PK battles (${daysOld}+ days)`
        ));

        res.json({
            success: true,
            message: "PK cleanup completed",
            results
        });
    } catch (err) {
        console.error("❌ PK cleanup error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/cleanup/notifications
 * Clean up old notifications
 */
router.post("/notifications", auth, requireAdmin, async (req, res) => {
    try {
        const { daysOld = 60 } = req.body;

        if (!User) {
            return res.status(400).json({
                success: false,
                error: "User model not available"
            });
        }

        const cutoffDate = daysAgo(daysOld);
        let totalRemoved = 0;
        let usersProcessed = 0;

        const cursor = User.find({
            "notifications.0": { $exists: true }
        }).cursor();

        for await (const user of cursor) {
            const originalCount = user.notifications.length;

            // Keep unread notifications and recent read ones
            user.notifications = user.notifications.filter(n =>
                !n.read || new Date(n.createdAt) > cutoffDate
            );

            const removed = originalCount - user.notifications.length;
            if (removed > 0) {
                totalRemoved += removed;
                user.unreadNotifications = user.notifications.filter(n => !n.read).length;
                await user.save();
                usersProcessed++;
            }
        }

        console.log(`🧹 Cleaned ${totalRemoved} notifications from ${usersProcessed} users`);

        res.json({
            success: true,
            message: "Notification cleanup completed",
            removed: totalRemoved,
            usersProcessed
        });
    } catch (err) {
        console.error("❌ Notification cleanup error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/cleanup/posts
 * Clean up deleted posts
 */
router.post("/posts", auth, requireAdmin, async (req, res) => {
    try {
        const { daysOld = 30 } = req.body;

        const results = [];

        // Permanently delete soft-deleted posts
        results.push(await safeDeleteMany(
            Post,
            {
                status: "deleted",
                deletedAt: { $lt: daysAgo(daysOld) }
            },
            `Soft-deleted posts (${daysOld}+ days)`
        ));

        // Clean up posts from deleted users
        if (Post && User) {
            try {
                const allUserIds = await Post.distinct("userId");
                const existingUserIds = await User.find({
                    _id: { $in: allUserIds }
                }).distinct("_id");

                const orphanedUserIds = allUserIds.filter(
                    id => !existingUserIds.some(uid => uid.toString() === id.toString())
                );

                if (orphanedUserIds.length > 0) {
                    const result = await Post.deleteMany({
                        userId: { $in: orphanedUserIds }
                    });
                    results.push({
                        deleted: result.deletedCount,
                        description: "Orphaned posts (user deleted)",
                        success: true
                    });
                }
            } catch (err) {
                results.push({
                    deleted: 0,
                    error: err.message,
                    description: "Orphaned posts",
                    success: false
                });
            }
        }

        res.json({
            success: true,
            message: "Post cleanup completed",
            results
        });
    } catch (err) {
        console.error("❌ Post cleanup error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/cleanup/users
 * Clean up user data
 */
router.post("/users", auth, requireAdmin, async (req, res) => {
    try {
        const results = [];

        // Reset stale live status
        results.push(await safeUpdateMany(
            User,
            {
                isLive: true,
                lastSeen: { $lt: hoursAgo(2) }
            },
            {
                isLive: false,
                currentStreamId: null
            },
            "Stale live status"
        ));

        // Unban users with expired bans
        results.push(await safeUpdateMany(
            User,
            {
                isBanned: true,
                bannedUntil: { $lt: new Date() }
            },
            {
                isBanned: false,
                banReason: null,
                bannedAt: null,
                bannedUntil: null
            },
            "Expired temporary bans"
        ));

        // Trim notifications (keep last 100 per user)
        if (User) {
            try {
                const usersWithManyNotifications = await User.find({
                    "notifications.100": { $exists: true }
                }).select("_id notifications");

                let notificationsTrimmed = 0;
                for (const user of usersWithManyNotifications) {
                    if (user.notifications.length > 100) {
                        const excess = user.notifications.length - 100;
                        user.notifications = user.notifications.slice(0, 100);
                        notificationsTrimmed += excess;
                        await user.save();
                    }
                }
                results.push({
                    deleted: notificationsTrimmed,
                    description: "Excess notifications (>100 per user)",
                    success: true
                });
            } catch (err) {
                results.push({
                    deleted: 0,
                    error: err.message,
                    description: "Excess notifications",
                    success: false
                });
            }
        }

        // Trim wallet transactions (keep last 500 per user)
        if (User) {
            try {
                const usersWithManyTransactions = await User.find({
                    "wallet.transactions.500": { $exists: true }
                }).select("_id wallet");

                let transactionsTrimmed = 0;
                for (const user of usersWithManyTransactions) {
                    if (user.wallet?.transactions?.length > 500) {
                        const excess = user.wallet.transactions.length - 500;
                        user.wallet.transactions = user.wallet.transactions.slice(0, 500);
                        transactionsTrimmed += excess;
                        await user.save();
                    }
                }
                results.push({
                    deleted: transactionsTrimmed,
                    description: "Excess wallet transactions (>500 per user)",
                    success: true
                });
            } catch (err) {
                results.push({
                    deleted: 0,
                    error: err.message,
                    description: "Excess wallet transactions",
                    success: false
                });
            }
        }

        res.json({
            success: true,
            message: "User cleanup completed",
            results
        });
    } catch (err) {
        console.error("❌ User cleanup error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/cleanup/predictions
 * Clean up old prediction logs
 */
router.post("/predictions", auth, requireAdmin, async (req, res) => {
    try {
        const { daysOld = 180 } = req.body;

        const result = await safeDeleteMany(
            PredictionLog,
            { createdAt: { $lt: daysAgo(daysOld) } },
            `Prediction logs (${daysOld}+ days)`
        );

        res.json({
            success: true,
            message: "Prediction cleanup completed",
            ...result
        });
    } catch (err) {
        console.error("❌ Prediction cleanup error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * GET /api/cleanup/stats
 * Get cleanup statistics (what would be cleaned)
 */
router.get("/stats", auth, requireAdmin, async (req, res) => {
    try {
        const stats = {};

        // Old streams
        if (Stream) {
            stats.oldStreams = await Stream.countDocuments({
                isLive: false,
                endedAt: { $lt: daysAgo(30) }
            });
            stats.staleStreams = await Stream.countDocuments({
                isLive: true,
                startedAt: { $lt: hoursAgo(24) }
            });
        }

        // Old PK battles
        if (PK) {
            stats.expiredChallenges = await PK.countDocuments({
                status: "pending",
                challengeExpiresAt: { $lt: new Date() }
            });
            stats.oldBattles = await PK.countDocuments({
                status: { $in: ["finished", "cancelled", "expired"] },
                createdAt: { $lt: daysAgo(90) }
            });
        }

        // Deleted posts
        if (Post) {
            stats.deletedPosts = await Post.countDocuments({
                status: "deleted",
                deletedAt: { $lt: daysAgo(30) }
            });
        }

        // Stale user status
        if (User) {
            stats.staleUserLiveStatus = await User.countDocuments({
                isLive: true,
                lastSeen: { $lt: hoursAgo(2) }
            });
            stats.expiredBans = await User.countDocuments({
                isBanned: true,
                bannedUntil: { $lt: new Date() }
            });
        }

        // Old predictions
        if (PredictionLog) {
            stats.oldPredictions = await PredictionLog.countDocuments({
                createdAt: { $lt: daysAgo(180) }
            });
        }

        res.json({
            success: true,
            stats,
            message: "These items would be cleaned up"
        });
    } catch (err) {
        console.error("❌ Cleanup stats error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/cleanup/cron
 * Endpoint for scheduled cleanup (can be called by cron job)
 * Uses API key instead of user auth
 */
router.post("/cron", async (req, res) => {
    try {
        const { apiKey } = req.body;

        // Verify API key
        if (apiKey !== process.env.CLEANUP_API_KEY && apiKey !== process.env.CRON_SECRET) {
            return res.status(401).json({
                success: false,
                error: "Invalid API key"
            });
        }

        console.log("🕐 Running scheduled cleanup...");
        const startTime = Date.now();
        const results = [];

        // Run essential cleanup tasks
        results.push(await safeUpdateMany(
            PK,
            { status: "pending", challengeExpiresAt: { $lt: new Date() } },
            { status: "expired" },
            "Expired PK challenges"
        ));

        results.push(await safeUpdateMany(
            Stream,
            { isLive: true, startedAt: { $lt: hoursAgo(24) } },
            { isLive: false, status: "ended", endedAt: new Date() },
            "Stale streams"
        ));

        results.push(await safeUpdateMany(
            User,
            { isLive: true, lastSeen: { $lt: hoursAgo(2) } },
            { isLive: false, currentStreamId: null },
            "Stale user live status"
        ));

        results.push(await safeUpdateMany(
            User,
            { isBanned: true, bannedUntil: { $lt: new Date() } },
            { isBanned: false, banReason: null, bannedAt: null, bannedUntil: null },
            "Expired bans"
        ));

        const duration = Date.now() - startTime;
        console.log(`✅ Scheduled cleanup completed in ${duration}ms`);

        res.json({
            success: true,
            message: "Scheduled cleanup completed",
            duration: `${duration}ms`,
            results
        });
    } catch (err) {
        console.error("❌ Cron cleanup error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;