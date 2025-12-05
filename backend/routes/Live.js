// backend/routes/Live.js
// World-Studio.live - Live Streaming Routes
// Handles stream creation, discovery, management, and analytics

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Stream = require("../models/Stream");
const User = require("../models/User");
const Gift = require("../models/Gift");
const auth = require("../middleware/authMiddleware");

// ===========================================
// HELPERS
// ===========================================

/**
 * Safe ObjectId creation
 */
const safeId = (id) => {
    if (!id) return null;
    return mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : null;
};

/**
 * Generate unique room ID
 */
const generateRoomId = () => {
    return `stream_${new mongoose.Types.ObjectId().toString()}_${Date.now()}`;
};

/**
 * Generate stream key
 */
const generateStreamKey = (userId) => {
    const random = Math.random().toString(36).substring(2, 15);
    return `sk_live_${userId}_${random}`;
};

// ===========================================
// START LIVE STREAM
// ===========================================

/**
 * POST /api/live/start
 * Start a new live stream
 */
router.post("/start", auth, async (req, res) => {
    try {
        const {
            title,
            category = "General",
            description = "",
            type = "solo",
            maxSeats = 1,
            privacy = "public",
            tags = [],
            coverImage = "",
            giftsEnabled = true,
            chatEnabled = true
        } = req.body;

        const userId = req.userId;

        // Validation
        if (!title) {
            return res.status(400).json({
                success: false,
                error: "Title is required"
            });
        }

        if (!category) {
            return res.status(400).json({
                success: false,
                error: "Category is required"
            });
        }

        // Check if already streaming
        const existingStream = await Stream.findOne({
            $or: [
                { streamerId: userId, isLive: true },
                { host: userId, isLive: true }
            ]
        });

        if (existingStream) {
            return res.status(400).json({
                success: false,
                error: "You already have an active stream",
                streamId: existingStream._id,
                roomId: existingStream.roomId
            });
        }

        // Get user info
        const user = await User.findById(userId)
            .select("username avatar isVerified followers");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Generate IDs
        const roomId = generateRoomId();
        const streamKey = generateStreamKey(userId);

        // Create stream
        const stream = await Stream.create({
            roomId,
            streamKey,
            title: title.substring(0, 100),
            description: description.substring(0, 500),
            category,
            type,
            maxSeats: Math.min(Math.max(1, maxSeats), 12),
            privacy,
            tags: tags.slice(0, 10),
            coverImage,
            giftsEnabled,
            chatEnabled,

            // Host info (support both field names)
            host: userId,
            streamerId: userId,
            streamerName: user.username,
            streamerAvatar: user.avatar || "",
            isVerifiedStreamer: user.isVerified || false,

            // Status
            isLive: true,
            status: "live",
            startedAt: new Date(),

            // Stats
            viewers: 0,
            peakViewers: 0,
            totalUniqueViewers: 0,
            totalGifts: 0,
            totalGiftsCount: 0
        });

        // Update user status
        await User.findByIdAndUpdate(userId, {
            isLive: true,
            currentStreamId: stream._id,
            lastStreamedAt: new Date()
        });

        // Emit socket events
        const io = req.app.get("io");
        if (io) {
            // Notify followers
            const followers = user.followers || [];
            followers.forEach(followerId => {
                io.to(`user_${followerId}`).emit("following_live", {
                    userId,
                    username: user.username,
                    avatar: user.avatar,
                    streamId: stream._id,
                    roomId,
                    title,
                    category
                });
            });

            // Broadcast new stream
            io.emit("stream_started", {
                streamId: stream._id,
                roomId,
                streamerName: user.username,
                streamerAvatar: user.avatar,
                title,
                category
            });
        }

        console.log(`🎬 Stream started: ${user.username} - "${title}" [${roomId}]`);

        res.status(201).json({
            success: true,
            message: "Live stream started!",
            stream: {
                _id: stream._id,
                roomId,
                streamKey,
                title,
                category,
                type,
                streamUrl: `https://world-studio.live/live/${stream._id}`
            }
        });
    } catch (err) {
        console.error("❌ LIVE START ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Failed to start live stream"
        });
    }
});

// ===========================================
// STOP STREAM
// ===========================================

/**
 * POST /api/live/stop
 * Stop a live stream
 */
router.post("/stop", auth, async (req, res) => {
    try {
        const { streamId } = req.body;
        const userId = req.userId;

        if (!streamId) {
            return res.status(400).json({
                success: false,
                error: "Stream ID required"
            });
        }

        // Find stream (support both field names)
        const stream = await Stream.findOne({
            _id: safeId(streamId),
            $or: [
                { streamerId: userId },
                { host: userId }
            ],
            isLive: true
        });

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Active stream not found"
            });
        }

        // Calculate duration
        const duration = Math.floor((Date.now() - stream.startedAt) / 1000);

        // Calculate average watch time
        let avgWatchTime = 0;
        if (stream.viewerList?.length > 0) {
            const totalWatchTime = stream.viewerList.reduce((sum, v) => sum + (v.watchTime || 0), 0);
            avgWatchTime = Math.floor(totalWatchTime / stream.viewerList.length);
        }

        // Update stream
        await Stream.updateOne(
            { _id: stream._id },
            {
                $set: {
                    isLive: false,
                    status: "ended",
                    endedAt: new Date(),
                    duration,
                    avgWatchTime
                }
            }
        );

        // Update user status
        await User.findByIdAndUpdate(userId, {
            isLive: false,
            currentStreamId: null,
            $inc: {
                "stats.totalStreams": 1,
                "stats.totalLiveMinutes": Math.floor(duration / 60),
                "stats.totalStreamViewers": stream.totalUniqueViewers || 0
            }
        });

        // Emit socket events
        const io = req.app.get("io");
        if (io) {
            io.to(stream.roomId).emit("stream_ended", {
                streamId: stream._id,
                duration,
                peakViewers: stream.peakViewers,
                totalGifts: stream.totalGifts
            });

            io.emit("stream_stopped", {
                streamId: stream._id,
                streamerId: userId
            });
        }

        // Format duration
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;
        const durationFormatted = hours > 0
            ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
            : `${minutes}:${seconds.toString().padStart(2, "0")}`;

        console.log(`⏹️ Stream ended: ${stream.streamerName || "User"} - ${durationFormatted}`);

        res.json({
            success: true,
            message: "Live stream ended",
            stats: {
                duration,
                durationFormatted,
                peakViewers: stream.peakViewers || 0,
                totalViewers: stream.totalUniqueViewers || stream.viewerList?.length || 0,
                totalGifts: stream.totalGifts || 0,
                totalGiftsCount: stream.totalGiftsCount || 0,
                avgWatchTime
            }
        });
    } catch (err) {
        console.error("❌ LIVE STOP ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Failed to stop live stream"
        });
    }
});

// ===========================================
// GET STREAM DETAILS
// ===========================================

/**
 * GET /api/live/:streamId
 * Get live stream details
 */
router.get("/:streamId", async (req, res) => {
    try {
        const { streamId } = req.params;

        const stream = await Stream.findOne({
            $or: [
                { _id: safeId(streamId) },
                { roomId: streamId }
            ]
        })
            .populate("host", "username avatar isVerified followersCount bio")
            .populate("streamerId", "username avatar isVerified followersCount bio")
            .lean();

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found"
            });
        }

        // Don't expose sensitive data
        delete stream.streamKey;
        delete stream.viewerList;
        delete stream.bannedUsers;

        res.json({
            success: true,
            stream
        });
    } catch (err) {
        console.error("❌ LIVE GET ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch stream"
        });
    }
});

// ===========================================
// DISCOVER LIVE STREAMS
// ===========================================

/**
 * GET /api/live
 * Discover live streams
 */
router.get("/", async (req, res) => {
    try {
        const {
            category,
            type,
            sortBy = "viewers",
            limit = 50,
            skip = 0,
            featured
        } = req.query;

        const query = { isLive: true };

        if (category && category !== "all") {
            query.category = category;
        }

        if (type && type !== "all") {
            query.type = type;
        }

        if (featured === "true") {
            query.isFeatured = true;
        }

        const sortOptions = {
            viewers: { viewers: -1, startedAt: -1 },
            recent: { startedAt: -1 },
            gifts: { totalGifts: -1 }
        };

        const [streams, total] = await Promise.all([
            Stream.find(query)
                .sort(sortOptions[sortBy] || sortOptions.viewers)
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .populate("host", "username avatar isVerified")
                .populate("streamerId", "username avatar isVerified")
                .select("-streamKey -viewerList -bannedUsers -blockedWords")
                .lean(),
            Stream.countDocuments(query)
        ]);

        res.json({
            success: true,
            streams: streams || [],
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: parseInt(skip) + streams.length < total
            }
        });
    } catch (err) {
        console.error("❌ DISCOVERY ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load live streams"
        });
    }
});

// ===========================================
// GET STREAMS BY USER
// ===========================================

/**
 * GET /api/live/user/:userId
 * Get streams by user
 */
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { includeEnded = "true", limit = 20 } = req.query;

        const query = {
            $or: [
                { host: safeId(userId) },
                { streamerId: safeId(userId) }
            ]
        };

        if (includeEnded !== "true") {
            query.isLive = true;
        }

        const streams = await Stream.find(query)
            .sort({ startedAt: -1 })
            .limit(parseInt(limit))
            .select("-streamKey -viewerList -bannedUsers")
            .lean();

        res.json({
            success: true,
            streams
        });
    } catch (err) {
        console.error("❌ USER STREAM ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch user streams"
        });
    }
});

// ===========================================
// CHECK IF USER IS LIVE
// ===========================================

/**
 * GET /api/live/isLive/:userId
 * Check if user is currently live
 */
router.get("/isLive/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const stream = await Stream.findOne({
            $or: [
                { host: safeId(userId) },
                { streamerId: safeId(userId) }
            ],
            isLive: true
        })
            .select("_id roomId title category viewers startedAt thumbnail")
            .lean();

        res.json({
            success: true,
            isLive: !!stream,
            stream: stream || null
        });
    } catch (err) {
        console.error("❌ Is live check error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to check live state"
        });
    }
});

// ===========================================
// VIEWER COUNT
// ===========================================

/**
 * GET /api/live/viewers/:streamId
 * Get viewer count for a stream
 */
router.get("/viewers/:streamId", async (req, res) => {
    try {
        const { streamId } = req.params;
        const io = req.app.get("io");

        // Try socket.io first
        let count = 0;
        if (io?.viewerCounts) {
            count = io.viewerCounts.get(streamId) || 0;
        }

        // Fallback to database
        if (count === 0) {
            const stream = await Stream.findById(safeId(streamId))
                .select("viewers")
                .lean();
            count = stream?.viewers || 0;
        }

        res.json({
            success: true,
            viewers: count
        });
    } catch (err) {
        console.error("❌ VIEWER COUNT ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get viewer count"
        });
    }
});

// ===========================================
// GET CATEGORIES
// ===========================================

/**
 * GET /api/live/data/categories
 * Get all categories with live stream counts
 */
router.get("/data/categories", async (req, res) => {
    try {
        const categories = await Stream.aggregate([
            { $match: { isLive: true } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    totalViewers: { $sum: "$viewers" }
                }
            },
            { $sort: { totalViewers: -1 } },
            {
                $project: {
                    name: "$_id",
                    count: 1,
                    totalViewers: 1,
                    _id: 0
                }
            }
        ]);

        res.json({
            success: true,
            categories
        });
    } catch (err) {
        console.error("❌ Categories error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch categories"
        });
    }
});

// ===========================================
// GET FEATURED STREAMS
// ===========================================

/**
 * GET /api/live/data/featured
 * Get featured streams
 */
router.get("/data/featured", async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const streams = await Stream.find({
            isLive: true,
            isFeatured: true,
            $or: [
                { featuredUntil: { $exists: false } },
                { featuredUntil: { $gt: new Date() } }
            ]
        })
            .sort({ viewers: -1 })
            .limit(parseInt(limit))
            .populate("host", "username avatar isVerified")
            .populate("streamerId", "username avatar isVerified")
            .select("-streamKey -viewerList -bannedUsers")
            .lean();

        res.json({
            success: true,
            streams
        });
    } catch (err) {
        console.error("❌ Featured error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch featured streams"
        });
    }
});

// ===========================================
// UPDATE STREAM
// ===========================================

/**
 * PUT /api/live/:streamId
 * Update stream details
 */
router.put("/:streamId", auth, async (req, res) => {
    try {
        const { streamId } = req.params;
        const userId = req.userId;
        const {
            title,
            category,
            description,
            tags,
            coverImage,
            giftsEnabled,
            chatEnabled,
            chatSlowMode
        } = req.body;

        const stream = await Stream.findOne({
            _id: safeId(streamId),
            $or: [
                { streamerId: userId },
                { host: userId }
            ]
        });

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found or not authorized"
            });
        }

        // Update fields
        if (title) stream.title = title.substring(0, 100);
        if (category) stream.category = category;
        if (description !== undefined) stream.description = description.substring(0, 500);
        if (tags) stream.tags = tags.slice(0, 10);
        if (coverImage) stream.coverImage = coverImage;
        if (giftsEnabled !== undefined) stream.giftsEnabled = giftsEnabled;
        if (chatEnabled !== undefined) stream.chatEnabled = chatEnabled;
        if (chatSlowMode !== undefined) stream.chatSlowMode = chatSlowMode;

        await stream.save();

        // Emit update
        const io = req.app.get("io");
        if (io) {
            io.to(stream.roomId).emit("stream_updated", {
                streamId: stream._id,
                title: stream.title,
                category: stream.category
            });
        }

        res.json({
            success: true,
            message: "Stream updated",
            stream
        });
    } catch (err) {
        console.error("❌ Update stream error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to update stream"
        });
    }
});

// ===========================================
// MODERATION
// ===========================================

/**
 * POST /api/live/:streamId/ban
 * Ban user from stream
 */
router.post("/:streamId/ban", auth, async (req, res) => {
    try {
        const { streamId } = req.params;
        const { userId, username, reason, duration } = req.body;

        const stream = await Stream.findOne({
            _id: safeId(streamId),
            $or: [
                { streamerId: req.userId },
                { host: req.userId }
            ]
        });

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found or not authorized"
            });
        }

        // Add to banned list
        stream.bannedUsers = stream.bannedUsers || [];
        stream.bannedUsers.push({
            userId: safeId(userId),
            username,
            reason,
            bannedAt: new Date(),
            expiresAt: duration ? new Date(Date.now() + duration * 60 * 1000) : null
        });

        await stream.save();

        // Emit ban event
        const io = req.app.get("io");
        if (io) {
            io.to(stream.roomId).emit("user_banned", { userId, username, reason });
            io.to(`user_${userId}`).emit("banned_from_stream", {
                streamId: stream._id,
                reason
            });
        }

        res.json({
            success: true,
            message: `${username} has been banned from the stream`
        });
    } catch (err) {
        console.error("❌ Ban user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to ban user"
        });
    }
});

/**
 * POST /api/live/:streamId/moderator
 * Add moderator
 */
router.post("/:streamId/moderator", auth, async (req, res) => {
    try {
        const { streamId } = req.params;
        const { userId } = req.body;

        const result = await Stream.updateOne(
            {
                _id: safeId(streamId),
                $or: [
                    { streamerId: req.userId },
                    { host: req.userId }
                ]
            },
            { $addToSet: { moderators: safeId(userId) } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: "Stream not found"
            });
        }

        res.json({
            success: true,
            message: "Moderator added"
        });
    } catch (err) {
        console.error("❌ Add moderator error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to add moderator"
        });
    }
});

// ===========================================
// STREAM STATS
// ===========================================

/**
 * GET /api/live/:streamId/stats
 * Get stream statistics
 */
router.get("/:streamId/stats", async (req, res) => {
    try {
        const { streamId } = req.params;

        const stream = await Stream.findById(safeId(streamId))
            .select("viewers peakViewers totalGifts totalGiftsCount likes shares startedAt endedAt duration")
            .lean();

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found"
            });
        }

        // Get gift stats
        let giftStats = { total: 0, count: 0, topGifters: [] };
        try {
            const stats = await Gift.aggregate([
                { $match: { streamId: streamId } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]);
            giftStats.total = stats[0]?.total || 0;
            giftStats.count = stats[0]?.count || 0;

            // Top gifters
            giftStats.topGifters = await Gift.aggregate([
                { $match: { streamId: streamId } },
                {
                    $group: {
                        _id: "$senderId",
                        total: { $sum: "$amount" },
                        username: { $first: "$senderUsername" },
                        avatar: { $first: "$senderAvatar" }
                    }
                },
                { $sort: { total: -1 } },
                { $limit: 10 }
            ]);
        } catch (err) {
            console.log("Gift stats unavailable");
        }

        res.json({
            success: true,
            stats: {
                ...stream,
                giftStats
            }
        });
    } catch (err) {
        console.error("❌ Stream stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get stats"
        });
    }
});

// ===========================================
// SEARCH
// ===========================================

/**
 * GET /api/live/search/:query
 * Search live streams
 */
router.get("/search/:query", async (req, res) => {
    try {
        const { query } = req.params;
        const { limit = 20 } = req.query;

        const streams = await Stream.find({
            isLive: true,
            $or: [
                { title: { $regex: query, $options: "i" } },
                { streamerName: { $regex: query, $options: "i" } },
                { category: { $regex: query, $options: "i" } },
                { tags: { $in: [new RegExp(query, "i")] } }
            ]
        })
            .sort({ viewers: -1 })
            .limit(parseInt(limit))
            .populate("host", "username avatar")
            .populate("streamerId", "username avatar")
            .select("-streamKey -viewerList -bannedUsers")
            .lean();

        res.json({
            success: true,
            query,
            streams
        });
    } catch (err) {
        console.error("❌ Search error:", err);
        res.status(500).json({
            success: false,
            error: "Search failed"
        });
    }
});

// ===========================================
// CLEANUP
// ===========================================

/**
 * DELETE /api/live/cleanup
 * Clean up old ended streams
 */
router.delete("/cleanup", async (req, res) => {
    try {
        const { daysOld = 5 } = req.query;
        const cutoffDate = new Date(Date.now() - parseInt(daysOld) * 24 * 60 * 60 * 1000);

        const result = await Stream.deleteMany({
            isLive: false,
            endedAt: { $lt: cutoffDate }
        });

        console.log(`🧹 Cleaned up ${result.deletedCount} old streams`);

        res.json({
            success: true,
            message: "Cleanup complete",
            deleted: result.deletedCount
        });
    } catch (err) {
        console.error("❌ CLEANUP ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Cleanup failed"
        });
    }
});

module.exports = router;