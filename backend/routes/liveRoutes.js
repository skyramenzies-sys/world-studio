// backend/routes/liveRoutes.js
// World-Studio.live - Live Stream Management Routes (UNIVERSE EDITION 🚀)
// Handles stream cleanup, discovery, and maintenance

const express = require("express");
const router = express.Router();

// LiveStream is OPTIONAL (oud model), Stream is de huidige standaard
let LiveStream = null;
try {
    LiveStream = require("../models/LiveStream");
} catch (err) {
    console.warn(
        "⚠️ Optional model 'LiveStream' not found, falling back to 'Stream':",
        err.message
    );
}

const Stream = require("../models/Stream");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get the correct Stream model (supports both LiveStream and Stream)
 */
const getStreamModel = () => {
    return LiveStream || Stream;
};

/**
 * Get hours ago date
 */
const hoursAgo = (hours) =>
    new Date(Date.now() - hours * 60 * 60 * 1000);

/**
 * Get days ago date
 */
const daysAgo = (days) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// ===========================================
// CLEANUP ROUTES
// ===========================================

/**
 * GET /api/live/cleanup
 * Cleanup stale streams (auto or manual trigger)
 */
router.get("/cleanup", async (req, res) => {
    try {
        const StreamModel = getStreamModel();
        const now = new Date();
        const twoHoursAgo = hoursAgo(2);
        const twelveHoursAgo = hoursAgo(12);


        const results = {
            staleEnded: 0,
            orphanedEnded: 0,
            userStatusReset: 0,
        };

        // 1. End streams older than 12 hours
        const oldStreamsResult = await StreamModel.updateMany(
            {
                isLive: true,
                $or: [
                    { createdAt: { $lt: twelveHoursAgo } },
                    { startedAt: { $lt: twelveHoursAgo } },
                ],
            },
            {
                $set: {
                    isLive: false,
                    endedAt: now,
                    status: "ended",
                },
            }
        );
        results.staleEnded += oldStreamsResult.modifiedCount || 0;

        // 2. End streams with no activity for 2+ hours
        const inactiveResult = await StreamModel.updateMany(
            {
                isLive: true,
                updatedAt: { $lt: twoHoursAgo },
                createdAt: { $lt: twoHoursAgo },
            },
            {
                $set: {
                    isLive: false,
                    endedAt: now,
                    status: "ended",
                },
            }
        );
        results.staleEnded += inactiveResult.modifiedCount || 0;

        // 3. End streams where streamer hasn't been seen in 2 hours
        if (User) {
            try {
                const inactiveStreamers = await User.find({
                    isLive: true,
                    lastSeen: { $lt: twoHoursAgo },
                }).select("_id currentStreamId");

                for (const user of inactiveStreamers) {
                    if (user.currentStreamId) {
                        await StreamModel.updateOne(
                            {
                                _id: user.currentStreamId,
                                isLive: true,
                            },
                            {
                                $set: {
                                    isLive: false,
                                    endedAt: now,
                                    status: "ended",
                                },
                            }
                        );
                        results.orphanedEnded++;
                    }
                }

                // Reset user live status
                const userResetResult = await User.updateMany(
                    {
                        isLive: true,
                        lastSeen: { $lt: twoHoursAgo },
                    },
                    {
                        $set: {
                            isLive: false,
                            currentStreamId: null,
                        },
                    }
                );
                results.userStatusReset =
                    userResetResult.modifiedCount || 0;
            } catch (err) {
                console.log(
                    "User cleanup skipped:",
                    err.message
                );
            }
        }

        const totalCleaned =
            results.staleEnded + results.orphanedEnded;

        if (totalCleaned > 0) {
            console.log(
                `🧹 Cleaned up ${totalCleaned} stale streams, reset ${results.userStatusReset} user statuses`
            );
        }

        res.json({
            success: true,
            cleaned: totalCleaned,
            details: results,
            message: `Ended ${totalCleaned} stale streams`,
        });
    } catch (error) {
        console.error("❌ Cleanup error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to cleanup streams",
        });
    }
});

/**
 * GET /api/live/cleanup/all
 * Force cleanup ALL live streams (nuclear option - admin only)
 */
router.get(
    "/cleanup/all",
    auth,
    requireAdmin,
    async (req, res) => {
        try {
            const StreamModel = getStreamModel();
            const now = new Date();

            // End all live streams
            const streamResult = await StreamModel.updateMany(
                { isLive: true },
                {
                    $set: {
                        isLive: false,
                        endedAt: now,
                        status: "ended",
                    },
                }
            );

            // Reset all user live statuses
            let userResult = { modifiedCount: 0 };
            if (User) {
                userResult = await User.updateMany(
                    { isLive: true },
                    {
                        $set: {
                            isLive: false,
                            currentStreamId: null,
                        },
                    }
                );
            }

            console.log(
                `🧹 FORCE CLEANED: ${streamResult.modifiedCount || 0} streams, ${userResult.modifiedCount || 0
                } users`
            );

            // Emit socket event to notify all clients
            const io = req.app.get("io");
            if (io) {
                io.emit("all_streams_ended", {
                    reason: "System maintenance",
                    timestamp: now,
                });
            }

            res.json({
                success: true,
                cleaned: streamResult.modifiedCount || 0,
                usersReset: userResult.modifiedCount || 0,
                message: `Force ended ALL ${streamResult.modifiedCount || 0
                    } streams`,
            });
        } catch (error) {
            console.error("❌ Force cleanup error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to force cleanup streams",
            });
        }
    }
);

/**
 * GET /api/live/cleanup/old
 * Delete old ended streams
 */
router.get(
    "/cleanup/old",
    auth,
    requireAdmin,
    async (req, res) => {
        try {
            const { daysOld = 30 } = req.query;
            const StreamModel = getStreamModel();
            const cutoffDate = daysAgo(parseInt(daysOld));

            const result = await StreamModel.deleteMany({
                isLive: false,
                endedAt: { $lt: cutoffDate },
            });

            console.log(
                `🗑️ Deleted ${result.deletedCount} old streams (${daysOld}+ days)`
            );

            res.json({
                success: true,
                deleted: result.deletedCount || 0,
                message: `Deleted ${result.deletedCount || 0
                    } streams older than ${daysOld} days`,
            });
        } catch (error) {
            console.error("❌ Delete old streams error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to delete old streams",
            });
        }
    }
);

// ===========================================
// END SPECIFIC STREAM
// ===========================================

/**
 * POST /api/live/:id/end
 * End a specific stream
 */
router.post("/:id/end", auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const StreamModel = getStreamModel();

        const rawUserId = req.user?.id || req.user?._id;
        if (!rawUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }
        const userIdStr = String(rawUserId);

        // Find stream first to check ownership
        const stream = await StreamModel.findById(id);

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found",
            });
        }

        // Check if user owns stream or is admin
        const user = await User.findById(rawUserId);

        const isOwner =
            (stream.host &&
                String(stream.host) === userIdStr) ||
            (stream.streamerId &&
                String(stream.streamerId) === userIdStr);

        const isAdmin =
            user?.role === "admin" ||
            user?.email === "menziesalm@gmail.com";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: "Not authorized to end this stream",
            });
        }

        // Calculate duration
        const duration = stream.startedAt
            ? Math.floor(
                (Date.now() - stream.startedAt.getTime()) / 1000
            )
            : 0;

        // Update stream
        stream.isLive = false;
        stream.endedAt = new Date();
        stream.status = "ended";
        stream.duration = duration;
        if (reason) stream.endReason = reason;
        await stream.save();

        // Update user status
        const streamerId = stream.host || stream.streamerId;
        if (streamerId) {
            await User.findByIdAndUpdate(streamerId, {
                isLive: false,
                currentStreamId: null,
            });
        }

        // Emit socket events
        const io = req.app.get("io");
        if (io) {
            io.emit("stream_ended", {
                streamId: id,
                _id: id,
                duration,
                reason,
            });
            io.emit("live_ended", {
                streamId: id,
                _id: id,
            });

            if (stream.roomId) {
                io.to(stream.roomId).emit("stream_ended", {
                    streamId: id,
                    duration,
                });
            }
        }

        console.log(
            `⏹️ Stream ${id} ended by ${user?.username || "system"
            }`
        );

        res.json({
            success: true,
            stream,
            duration,
            message: "Stream ended successfully",
        });
    } catch (error) {
        console.error("❌ End stream error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to end stream",
        });
    }
});

// ===========================================
// GET ACTIVE STREAMS
// ===========================================

/**
 * GET /api/live/streams
 * Get active live streams (excludes stale)
 */
router.get("/streams", async (req, res) => {
    try {
        const StreamModel = getStreamModel();
        const twelveHoursAgo = hoursAgo(12);
        const {
            category,
            limit = 50,
            skip = 0,
            sortBy = "viewers",
        } = req.query;

        // Build query - only get actually live, non-stale streams
        const query = {
            isLive: true,
            $or: [
                { startedAt: { $gte: twelveHoursAgo } },
                { createdAt: { $gte: twelveHoursAgo } },
            ],
        };

        if (category && category !== "all") {
            query.category = category;
        }

        // Sort options
        const sortOptions = {
            viewers: { viewers: -1, createdAt: -1 },
            recent: { startedAt: -1, createdAt: -1 },
            gifts: { totalGifts: -1, viewers: -1 },
        };

        const streams = await StreamModel.find(query)
            .sort(sortOptions[sortBy] || sortOptions.viewers)
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate("host", "username avatar isVerified")
            .populate(
                "streamerId",
                "username avatar isVerified"
            )
            .select("-streamKey -viewerList -bannedUsers")
            .lean();

        const total = await StreamModel.countDocuments(query);

        res.json({
            success: true,
            streams: streams || [],
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore:
                    parseInt(skip) +
                    (streams ? streams.length : 0) <
                    total,
            },
        });
    } catch (error) {
        console.error("❌ Get streams error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch streams",
        });
    }
});

/**
 * GET /api/live/streams/all
 * Get all streams including ended (for admin/history)
 */
router.get("/streams/all", auth, async (req, res) => {
    try {
        const StreamModel = getStreamModel();
        const {
            limit = 50,
            skip = 0,
            isLive,
            category,
            userId,
        } = req.query;

        const query = {};

        if (isLive !== undefined) {
            query.isLive = isLive === "true";
        }

        if (category && category !== "all") {
            query.category = category;
        }

        if (userId) {
            query.$or = [
                { host: userId },
                { streamerId: userId },
            ];
        }

        const streams = await StreamModel.find(query)
            .sort({ startedAt: -1, createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate("host", "username avatar")
            .populate("streamerId", "username avatar")
            .select("-streamKey -viewerList")
            .lean();

        const total = await StreamModel.countDocuments(query);

        res.json({
            success: true,
            streams: streams || [],
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
            },
        });
    } catch (error) {
        console.error("❌ Get all streams error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch streams",
        });
    }
});

// ===========================================
// STREAM STATS
// ===========================================

/**
 * GET /api/live/stats
 * Get live streaming statistics
 */
router.get("/stats", async (req, res) => {
    try {
        const StreamModel = getStreamModel();
        const twelveHoursAgo = hoursAgo(12);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Count active streams (exclude stale)
        const activeStreams =
            await StreamModel.countDocuments({
                isLive: true,
                $or: [
                    { startedAt: { $gte: twelveHoursAgo } },
                    { createdAt: { $gte: twelveHoursAgo } },
                ],
            });

        // Total viewers
        const viewerStats = await StreamModel.aggregate([
            {
                $match: {
                    isLive: true,
                    $or: [
                        { startedAt: { $gte: twelveHoursAgo } },
                        { createdAt: { $gte: twelveHoursAgo } },
                    ],
                },
            },
            {
                $group: {
                    _id: null,
                    totalViewers: { $sum: "$viewers" },
                    peakViewers: { $max: "$viewers" },
                },
            },
        ]);

        // Streams today
        const streamsToday =
            await StreamModel.countDocuments({
                $or: [
                    { startedAt: { $gte: todayStart } },
                    { createdAt: { $gte: todayStart } },
                ],
            });

        // Categories
        const categories = await StreamModel.aggregate([
            {
                $match: {
                    isLive: true,
                    $or: [
                        { startedAt: { $gte: twelveHoursAgo } },
                        { createdAt: { $gte: twelveHoursAgo } },
                    ],
                },
            },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    viewers: { $sum: "$viewers" },
                },
            },
            { $sort: { viewers: -1 } },
            { $limit: 10 },
        ]);

        res.json({
            success: true,
            stats: {
                activeStreams,
                totalViewers:
                    viewerStats[0]?.totalViewers || 0,
                peakViewers:
                    viewerStats[0]?.peakViewers || 0,
                streamsToday,
            },
            categories,
        });
    } catch (error) {
        console.error("❌ Stats error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch stats",
        });
    }
});

// ===========================================
// FEATURED STREAMS
// ===========================================

/**
 * GET /api/live/featured
 * Get featured streams
 */
router.get("/featured", async (req, res) => {
    try {
        const StreamModel = getStreamModel();
        const { limit = 10 } = req.query;

        const streams = await StreamModel.find({
            isLive: true,
            isFeatured: true,
        })
            .sort({ viewers: -1 })
            .limit(parseInt(limit))
            .populate(
                "host",
                "username avatar isVerified"
            )
            .populate(
                "streamerId",
                "username avatar isVerified"
            )
            .select("-streamKey -viewerList -bannedUsers")
            .lean();

        res.json({
            success: true,
            streams: streams || [],
        });
    } catch (error) {
        console.error("❌ Featured streams error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch featured streams",
        });
    }
});

// ===========================================
// CRON ENDPOINT
// ===========================================

/**
 * POST /api/live/cron-cleanup
 * Endpoint for scheduled cleanup (called by cron job)
 */
router.post("/cron-cleanup", async (req, res) => {
    try {
        const { apiKey } = req.body;

        // Verify API key
        if (
            apiKey !== process.env.CLEANUP_API_KEY &&
            apiKey !== process.env.CRON_SECRET
        ) {
            return res.status(401).json({
                success: false,
                error: "Invalid API key",
            });
        }

        const StreamModel = getStreamModel();
        const now = new Date();
        const twoHoursAgo = hoursAgo(2);
        const twelveHoursAgo = hoursAgo(12);

        // Cleanup stale streams
        const result = await StreamModel.updateMany(
            {
                isLive: true,
                $or: [
                    { createdAt: { $lt: twelveHoursAgo } },
                    { startedAt: { $lt: twelveHoursAgo } },
                    {
                        updatedAt: { $lt: twoHoursAgo },
                        createdAt: { $lt: twoHoursAgo },
                    },
                ],
            },
            {
                $set: {
                    isLive: false,
                    endedAt: now,
                    status: "ended",
                },
            }
        );

        // Reset stale user statuses
        let userResult = { modifiedCount: 0 };
        if (User) {
            userResult = await User.updateMany(
                {
                    isLive: true,
                    lastSeen: { $lt: twoHoursAgo },
                },
                {
                    $set: {
                        isLive: false,
                        currentStreamId: null,
                    },
                }
            );
        }

        if (
            (result.modifiedCount || 0) > 0 ||
            (userResult.modifiedCount || 0) > 0
        ) {
            console.log(
                `🕐 Cron cleanup: ${result.modifiedCount || 0} streams, ${userResult.modifiedCount || 0
                } users`
            );
        }

        res.json({
            success: true,
            cleaned: result.modifiedCount || 0,
            usersReset: userResult.modifiedCount || 0,
        });
    } catch (error) {
        console.error("❌ Cron cleanup error:", error);
        res.status(500).json({
            success: false,
            error: "Cron cleanup failed",
        });
    }
});

module.exports = router;
