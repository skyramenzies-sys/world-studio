// backend/routes/streamCleanupRoutes.js
// World-Studio.live - Stream Cleanup & Maintenance Routes (UNIVERSE EDITION 🚀)
// Handles stale stream cleanup, orphaned streams, and database maintenance

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

// ===========================================
// MODEL IMPORTS (Safe Loading)
// ===========================================

let LiveStream, Stream, User;

try {
    LiveStream = require("../models/LiveStream");
} catch (e) {
    console.log("⚠️ LiveStream model not available");
}

try {
    Stream = require("../models/Stream");
} catch (e) {
    console.log("⚠️ Stream model not available");
}

try {
    User = require("../models/User");
} catch (e) {
    console.log("⚠️ User model not available");
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get the correct stream model
 */
const getStreamModel = () => {
    if (LiveStream) return LiveStream;
    if (Stream) return Stream;
    return null;
};

/**
 * Get date X hours ago
 */
const hoursAgo = (hours) => {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
};

/**
 * Get date X days ago
 */
const daysAgo = (days) => {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};



/**
 * Calculate stream duration in seconds
 */
const calculateDuration = (startedAt, endedAt = new Date()) => {
    if (!startedAt) return 0;
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    return Math.floor((end - start) / 1000);
};

/**
 * Format duration in seconds to readable string
 */
const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
};

// ===========================================
// CLEANUP ROUTES
// ===========================================

/**
 * GET /api/stream-cleanup/status
 * Get cleanup status and statistics (admin only)
 */
router.get("/status", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const StreamModel = getStreamModel();

        if (!StreamModel) {
            return res.json({
                success: true,
                message: "No stream model available",
                stats: null
            });
        }

        const now = new Date();
        const twelveHoursAgo = hoursAgo(12);
        const twoHoursAgo = hoursAgo(2);

        const [
            totalActive,
            staleStreams,
            inactiveStreams,
            totalEnded,
            usersLive
        ] = await Promise.all([
            StreamModel.countDocuments({ isLive: true }),
            StreamModel.countDocuments({
                isLive: true,
                startedAt: { $lt: twelveHoursAgo }
            }),
            StreamModel.countDocuments({
                isLive: true,
                updatedAt: { $lt: twoHoursAgo }
            }),
            StreamModel.countDocuments({ isLive: false }),
            User ? User.countDocuments({ isLive: true }) : 0
        ]);

        res.json({
            success: true,
            stats: {
                activeStreams: totalActive,
                staleStreams,
                inactiveStreams,
                endedStreams: totalEnded,
                usersMarkedLive: usersLive,
                needsCleanup: staleStreams > 0 || inactiveStreams > 0,
                timestamp: now.toISOString()
            }
        });
    } catch (err) {
        console.error("❌ Cleanup status error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/stream-cleanup/run
 * Run cleanup for stale and inactive streams (admin only)
 */
router.post("/run", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const StreamModel = getStreamModel();
        const results = {
            staleEnded: 0,
            inactiveEnded: 0,
            orphanedEnded: 0,
            userStatusReset: 0,
            errors: []
        };

        if (!StreamModel) {
            return res.json({
                success: true,
                message: "No stream model available",
                results
            });
        }

        const now = new Date();
        const twelveHoursAgo = hoursAgo(12);
        const twoHoursAgo = hoursAgo(2);

        // 1. End stale streams (running 12+ hours)
        console.log("🧹 Cleaning stale streams (12+ hours)...");
        const staleStreams = await StreamModel.find({
            isLive: true,
            startedAt: { $lt: twelveHoursAgo }
        });

        for (const stream of staleStreams) {
            try {
                const duration = calculateDuration(stream.startedAt, now);

                await StreamModel.findByIdAndUpdate(stream._id, {
                    isLive: false,
                    status: "ended",
                    endedAt: now,
                    duration,
                    endReason: "stale_cleanup"
                });

                // Reset user status
                const streamerId = stream.streamerId || stream.host || stream.userId;
                if (streamerId && User) {
                    await User.findByIdAndUpdate(streamerId, {
                        isLive: false,
                        currentStreamId: null
                    });
                }

                results.staleEnded++;
                console.log(`  ✅ Ended stale stream: ${stream._id}`);
            } catch (e) {
                results.errors.push(`Stale stream ${stream._id}: ${e.message}`);
            }
        }

        // 2. End inactive streams (no activity 2+ hours)
        console.log("🧹 Cleaning inactive streams (2+ hours no activity)...");
        const inactiveStreams = await StreamModel.find({
            isLive: true,
            updatedAt: { $lt: twoHoursAgo },
            startedAt: { $gte: twelveHoursAgo } // Not already caught by stale
        });

        for (const stream of inactiveStreams) {
            try {
                const duration = calculateDuration(stream.startedAt, stream.updatedAt || now);

                await StreamModel.findByIdAndUpdate(stream._id, {
                    isLive: false,
                    status: "ended",
                    endedAt: now,
                    duration,
                    endReason: "inactive_cleanup"
                });

                const streamerId = stream.streamerId || stream.host || stream.userId;
                if (streamerId && User) {
                    await User.findByIdAndUpdate(streamerId, {
                        isLive: false,
                        currentStreamId: null
                    });
                }

                results.inactiveEnded++;
                console.log(`  ✅ Ended inactive stream: ${stream._id}`);
            } catch (e) {
                results.errors.push(`Inactive stream ${stream._id}: ${e.message}`);
            }
        }

        // 3. Find orphaned streams (streamer no longer online)
        console.log("🧹 Cleaning orphaned streams...");
        if (User) {
            const activeStreams = await StreamModel.find({ isLive: true });

            for (const stream of activeStreams) {
                try {
                    const streamerId = stream.streamerId || stream.host || stream.userId;
                    if (!streamerId) continue;

                    const user = await User.findById(streamerId).select("isLive lastActive");

                    // User not found or hasn't been active in 2+ hours
                    const isOrphaned = !user ||
                        (user.lastActive && new Date(user.lastActive) < twoHoursAgo);

                    if (isOrphaned) {
                        const duration = calculateDuration(stream.startedAt, now);

                        await StreamModel.findByIdAndUpdate(stream._id, {
                            isLive: false,
                            status: "ended",
                            endedAt: now,
                            duration,
                            endReason: "orphaned_cleanup"
                        });

                        if (user) {
                            await User.findByIdAndUpdate(streamerId, {
                                isLive: false,
                                currentStreamId: null
                            });
                        }

                        results.orphanedEnded++;
                        console.log(`  ✅ Ended orphaned stream: ${stream._id}`);
                    }
                } catch (e) {
                    results.errors.push(`Orphaned check ${stream._id}: ${e.message}`);
                }
            }
        }

        // 4. Reset stuck user statuses
        console.log("🧹 Resetting stuck user statuses...");
        if (User) {
            const stuckUsers = await User.find({
                isLive: true,
                $or: [
                    { lastActive: { $lt: twoHoursAgo } },
                    { lastActive: { $exists: false } }
                ]
            });

            for (const user of stuckUsers) {
                try {
                    // Verify no active stream exists
                    const hasActiveStream = await StreamModel.findOne({
                        $or: [
                            { streamerId: user._id },
                            { host: user._id },
                            { userId: user._id }
                        ],
                        isLive: true
                    });

                    if (!hasActiveStream) {
                        await User.findByIdAndUpdate(user._id, {
                            isLive: false,
                            currentStreamId: null
                        });
                        results.userStatusReset++;
                        console.log(`  ✅ Reset user status: ${user.username}`);
                    }
                } catch (e) {
                    results.errors.push(`User reset ${user._id}: ${e.message}`);
                }
            }
        }

        // Emit socket events
        const io = req.app.get("io");
        const totalCleaned = results.staleEnded + results.inactiveEnded + results.orphanedEnded;

        if (io && totalCleaned > 0) {
            io.emit("streams_cleaned", {
                count: totalCleaned,
                timestamp: now.toISOString()
            });
        }


        console.log(`🧹 Cleanup complete: ${totalCleaned} streams, ${results.userStatusReset} users`);

        res.json({
            success: true,
            message: `Cleaned ${totalCleaned} streams, reset ${results.userStatusReset} users`,
            results,
            timestamp: now.toISOString()
        });
    } catch (err) {
        console.error("❌ Cleanup error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/stream-cleanup/end-all
 * Force end ALL active streams (ADMIN ONLY - Nuclear option)
 */
router.post("/end-all", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const StreamModel = getStreamModel();

        if (!StreamModel) {
            return res.json({
                success: true,
                message: "No stream model available",
                ended: 0
            });
        }

        const { confirm } = req.body;

        if (confirm !== "END_ALL_STREAMS") {
            return res.status(400).json({
                success: false,
                error: "Confirmation required. Send { confirm: 'END_ALL_STREAMS' }"
            });
        }

        const now = new Date();

        // Get all active streams
        const activeStreams = await StreamModel.find({ isLive: true });
        let ended = 0;

        for (const stream of activeStreams) {
            try {
                const duration = calculateDuration(stream.startedAt, now);

                await StreamModel.findByIdAndUpdate(stream._id, {
                    isLive: false,
                    status: "ended",
                    endedAt: now,
                    duration,
                    endReason: "admin_force_end"
                });

                const streamerId = stream.streamerId || stream.host || stream.userId;
                if (streamerId && User) {
                    await User.findByIdAndUpdate(streamerId, {
                        isLive: false,
                        currentStreamId: null
                    });
                }

                ended++;
            } catch (e) {
                console.error(`Failed to end stream ${stream._id}:`, e);
            }
        }

        // Reset all users marked as live
        if (User) {
            await User.updateMany(
                { isLive: true },
                { isLive: false, currentStreamId: null }
            );
        }

        // Notify all clients
        const io = req.app.get("io");
        if (io) {
            io.emit("all_streams_ended", {
                reason: "maintenance",
                timestamp: now.toISOString()
            });
        }

        console.log(`🔴 ADMIN: Force ended ${ended} streams`);

        res.json({
            success: true,
            message: `Force ended ${ended} streams`,
            ended,
            timestamp: now.toISOString()
        });
    } catch (err) {
        console.error("❌ End all error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * DELETE /api/stream-cleanup/old
 * Delete old ended streams from database (admin only)
 */
router.delete("/old", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const StreamModel = getStreamModel();

        if (!StreamModel) {
            return res.json({
                success: true,
                message: "No stream model available",
                deleted: 0
            });
        }

        const days = parseInt(req.query.days || "30", 10);
        const cutoffDate = daysAgo(days);

        // Only delete ended streams older than X days
        const result = await StreamModel.deleteMany({
            isLive: false,
            status: "ended",
            endedAt: { $lt: cutoffDate }
        });

        console.log(`🗑️ Deleted ${result.deletedCount} old streams (${days}+ days)`);

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} old streams`,
            deleted: result.deletedCount,
            cutoffDate: cutoffDate.toISOString(),
            daysOld: days
        });
    } catch (err) {
        console.error("❌ Delete old error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/stream-cleanup/stream/:id/end
 * End a specific stream (owner or admin)
 */
router.post("/stream/:id/end", authMiddleware, async (req, res) => {
    try {
        const StreamModel = getStreamModel();

        if (!StreamModel) {
            return res.status(400).json({
                success: false,
                error: "Stream model not available"
            });
        }

        const stream = await StreamModel.findById(req.params.id);

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found"
            });
        }


        const streamerId = stream.streamerId || stream.host || stream.userId;

        let isAdmin = false;
        let isOwner = streamerId?.toString() === req.userId?.toString();

        if (User) {
            const user = await User.findById(req.userId);
            isAdmin = !!user && (user.role === "admin" || user.email === "menziesalm@gmail.com");
        }

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: "Not authorized to end this stream"
            });
        }

        if (!stream.isLive) {
            return res.status(400).json({
                success: false,
                error: "Stream already ended"
            });
        }

        const now = new Date();
        const duration = calculateDuration(stream.startedAt, now);

        // End the stream
        await StreamModel.findByIdAndUpdate(stream._id, {
            isLive: false,
            status: "ended",
            endedAt: now,
            duration,
            endReason: isAdmin && !isOwner ? "admin_ended" : "streamer_ended"
        });

        // Update user status
        if (streamerId && User) {
            await User.findByIdAndUpdate(streamerId, {
                isLive: false,
                currentStreamId: null,
                $inc: { "stats.totalStreamTime": duration }
            });
        }

        // Emit socket events
        const io = req.app.get("io");
        if (io) {
            io.to(`stream_${stream._id}`).emit("stream_ended", {
                streamId: stream._id,
                duration,
                reason: isAdmin && !isOwner ? "ended_by_admin" : "ended_by_user"
            });

            io.emit("live_ended", {
                streamId: stream._id,
                streamerId
            });
        }

        console.log(`🔴 Stream ended: ${stream._id} (${duration}s)`);

        res.json({
            success: true,
            message: "Stream ended successfully",
            streamId: stream._id,
            duration,
            durationFormatted: formatDuration(duration)
        });
    } catch (err) {
        console.error("❌ End stream error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/stream-cleanup/user/:userId/reset
 * Reset a user's live status (admin only)
 */
router.post("/user/:userId/reset", authMiddleware, requireAdmin, async (req, res) => {
    try {
        if (!User) {
            return res.status(400).json({
                success: false,
                error: "User model not available"
            });
        }

        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // End any active streams
        const StreamModel = getStreamModel();
        if (StreamModel) {
            await StreamModel.updateMany(
                {
                    $or: [
                        { streamerId: user._id },
                        { host: user._id },
                        { userId: user._id }
                    ],
                    isLive: true
                },
                {
                    isLive: false,
                    status: "ended",
                    endedAt: new Date(),
                    endReason: "admin_user_reset"
                }
            );
        }

        // Reset user status
        await User.findByIdAndUpdate(user._id, {
            isLive: false,
            currentStreamId: null,
            inPK: false,
            currentPKId: null
        });

        console.log(`🔄 Admin reset user status: ${user.username}`);

        res.json({
            success: true,
            message: `Reset live status for ${user.username}`,
            userId: user._id,
            username: user.username
        });
    } catch (err) {
        console.error("❌ Reset user error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * POST /api/stream-cleanup/cron
 * Endpoint for scheduled cleanup (cron job)
 * Protected by CRON_SECRET / CLEANUP_API_KEY header/body
 */
router.post("/cron", async (req, res) => {
    try {
        // Verify cron secret
        const cronSecret = req.headers["x-cron-secret"] || req.body.secret;
        const expectedSecret = process.env.CRON_SECRET || process.env.CLEANUP_API_KEY;

        if (!expectedSecret) {
            console.log("⚠️ No CRON_SECRET configured, allowing cleanup (DEV MODE)");
        } else if (cronSecret !== expectedSecret) {
            return res.status(401).json({
                success: false,
                error: "Invalid cron secret"
            });
        }

        const StreamModel = getStreamModel();
        const results = {
            staleEnded: 0,
            inactiveEnded: 0,
            userStatusReset: 0
        };

        if (!StreamModel) {
            return res.json({
                success: true,
                message: "No stream model available",
                results
            });
        }

        const now = new Date();
        const twelveHoursAgo = hoursAgo(12);
        const twoHoursAgo = hoursAgo(2);

        // End stale streams
        const staleResult = await StreamModel.updateMany(
            {
                isLive: true,
                startedAt: { $lt: twelveHoursAgo }
            },
            {
                isLive: false,
                status: "ended",
                endedAt: now,
                endReason: "cron_stale_cleanup"
            }
        );
        results.staleEnded = staleResult.modifiedCount || staleResult.nModified || 0;

        // End inactive streams
        const inactiveResult = await StreamModel.updateMany(
            {
                isLive: true,
                updatedAt: { $lt: twoHoursAgo }
            },
            {
                isLive: false,
                status: "ended",
                endedAt: now,
                endReason: "cron_inactive_cleanup"
            }
        );
        results.inactiveEnded = inactiveResult.modifiedCount || inactiveResult.nModified || 0;

        // Reset stuck user statuses
        if (User) {
            const userResult = await User.updateMany(
                {
                    isLive: true,
                    lastActive: { $lt: twoHoursAgo }
                },
                {
                    isLive: false,
                    currentStreamId: null
                }
            );
            results.userStatusReset = userResult.modifiedCount || userResult.nModified || 0;
        }

        console.log(`⏰ Cron cleanup: ${results.staleEnded} stale, ${results.inactiveEnded} inactive, ${results.userStatusReset} users`);

        res.json({
            success: true,
            message: "Cron cleanup completed",
            results,
            timestamp: now.toISOString()
        });
    } catch (err) {
        console.error("❌ Cron cleanup error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * GET /api/stream-cleanup/active
 * Get all currently active streams (admin-only dashboard)
 */
router.get("/active", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const StreamModel = getStreamModel();

        if (!StreamModel) {
            return res.json({
                success: true,
                streams: [],
                count: 0
            });
        }

        const { limit = 50, includeDetails = false } = req.query;

        let query = StreamModel.find({ isLive: true })
            .sort({ viewersCount: -1, startedAt: -1 })
            .limit(parseInt(limit, 10));

        if (includeDetails === "true") {
            query = query.select("-__v");
        } else {
            query = query.select("_id title streamerId host userId startedAt viewersCount category");
        }

        const streams = await query.lean();

        // Add duration to each stream
        const now = new Date();
        const streamsWithDuration = streams.map(stream => {
            const duration = calculateDuration(stream.startedAt, now);
            return {
                ...stream,
                duration,
                durationFormatted: formatDuration(duration)
            };
        });

        res.json({
            success: true,
            streams: streamsWithDuration,
            count: streams.length
        });
    } catch (err) {
        console.error("❌ Active streams error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});



module.exports = router;
