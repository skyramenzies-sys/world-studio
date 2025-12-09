// backend/routes/liveAnalytics.js
// World-Studio.live - Live Stream Analytics Routes (UNIVERSE EDITION 🚀)
// Comprehensive analytics for streaming platform

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Stream = require("../models/Stream");
const User = require("../models/User");

// Gift is OPTIONAL → backend mag niet crashen als model ontbreekt
let Gift = null;
try {
    Gift = require("../models/Gift");
} catch (err) {
    console.warn(
        "⚠️ Optional model 'Gift' not found in liveAnalytics:",
        err.message
    );
}

const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Safe ObjectId creator for aggregation & queries
 */
const safeObjectId = (id) => {
    if (!id) return null;
    return mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : null;
};

/**
 * Get date ranges for analytics
 */
const getDateRanges = () => {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
        now,
        todayStart,
        yesterdayStart,
        weekStart,
        monthStart,
        lastMonthStart,
        lastMonthEnd,
    };
};

/**
 * Safe aggregate helper
 */
const safeAggregate = async (Model, pipeline) => {
    try {
        if (!Model) return [];
        return await Model.aggregate(pipeline);
    } catch (err) {
        console.error("Aggregate error:", err.message);
        return [];
    }
};

// ===========================================
// PUBLIC ANALYTICS
// ===========================================

/**
 * GET /api/live-analytics/summary
 * Get live streaming summary (public)
 */
router.get("/summary", async (req, res) => {
    try {
        const { todayStart } = getDateRanges();

        // Current live stats
        const totalLive = await Stream.countDocuments({ isLive: true });

        // Total viewers across all live streams
        const viewerStats = await Stream.aggregate([
            { $match: { isLive: true } },
            {
                $group: {
                    _id: null,
                    totalViewers: { $sum: "$viewers" },
                    peakViewers: { $max: "$viewers" },
                    avgViewers: { $avg: "$viewers" },
                },
            },
        ]);

        // Recent streams
        const recent = await Stream.find()
            .sort({ startedAt: -1 })
            .limit(10)
            .populate("streamerId", "username avatar isVerified")
            .select(
                "title category viewers isLive startedAt endedAt duration totalGifts streamerName"
            )
            .lean();

        // Streams today
        const streamsToday = await Stream.countDocuments({
            startedAt: { $gte: todayStart },
        });

        // Top categories right now
        const topCategories = await Stream.aggregate([
            { $match: { isLive: true } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    totalViewers: { $sum: "$viewers" },
                },
            },
            { $sort: { totalViewers: -1 } },
            { $limit: 10 },
            {
                $project: {
                    category: "$_id",
                    count: 1,
                    totalViewers: 1,
                    _id: 0,
                },
            },
        ]);

        res.json({
            success: true,
            live: {
                totalStreams: totalLive,
                totalViewers: viewerStats[0]?.totalViewers || 0,
                peakViewers: viewerStats[0]?.peakViewers || 0,
                avgViewersPerStream: Math.round(
                    viewerStats[0]?.avgViewers || 0
                ),
            },
            streamsToday,
            topCategories,
            recent,
        });
    } catch (err) {
        console.error("❌ Live analytics summary error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

/**
 * GET /api/live-analytics/trending
 * Get trending streams
 */
router.get("/trending", async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        // Trending = high viewers + recent gifts + recent
        const trending = await Stream.find({ isLive: true })
            .sort({ viewers: -1, totalGifts: -1, startedAt: -1 })
            .limit(parseInt(limit))
            .populate(
                "streamerId",
                "username avatar isVerified followersCount"
            )
            .select("-streamKey -viewerList -bannedUsers")
            .lean();

        res.json({
            success: true,
            trending,
        });
    } catch (err) {
        console.error("❌ Trending error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

/**
 * GET /api/live-analytics/categories
 * Get category analytics
 */
router.get("/categories", async (req, res) => {
    try {
        const { period = "all" } = req.query;
        const { weekStart, monthStart } = getDateRanges();

        let dateFilter = {};
        if (period === "week") dateFilter = { startedAt: { $gte: weekStart } };
        else if (period === "month")
            dateFilter = { startedAt: { $gte: monthStart } };

        // Live categories
        const liveCategories = await Stream.aggregate([
            { $match: { isLive: true } },
            {
                $group: {
                    _id: "$category",
                    liveCount: { $sum: 1 },
                    totalViewers: { $sum: "$viewers" },
                },
            },
            { $sort: { totalViewers: -1 } },
        ]);

        // Historical category stats
        const categoryStats = await Stream.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$category",
                    totalStreams: { $sum: 1 },
                    totalDuration: { $sum: "$duration" },
                    totalGifts: { $sum: "$totalGifts" },
                    avgViewers: { $avg: "$peakViewers" },
                    maxViewers: { $max: "$peakViewers" },
                },
            },
            { $sort: { totalStreams: -1 } },
            {
                $project: {
                    category: "$_id",
                    totalStreams: 1,
                    totalHours: { $divide: ["$totalDuration", 3600] },
                    totalGifts: 1,
                    avgViewers: { $round: ["$avgViewers", 0] },
                    maxViewers: 1,
                    _id: 0,
                },
            },
        ]);

        // Merge live and historical
        const categories = categoryStats.map((cat) => {
            const live =
                liveCategories.find((l) => l._id === cat.category) || {};
            return {
                ...cat,
                liveNow: live.liveCount || 0,
                currentViewers: live.totalViewers || 0,
            };
        });

        res.json({
            success: true,
            period,
            categories,
        });
    } catch (err) {
        console.error("❌ Categories analytics error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

/**
 * GET /api/live-analytics/peak-hours
 * Get peak streaming hours
 */
router.get("/peak-hours", async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date(
            Date.now() - parseInt(days) * 24 * 60 * 60 * 1000
        );

        const hourlyStats = await Stream.aggregate([
            { $match: { startedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { $hour: "$startedAt" },
                    streamCount: { $sum: 1 },
                    avgViewers: { $avg: "$peakViewers" },
                    totalGifts: { $sum: "$totalGifts" },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    hour: "$_id",
                    streamCount: 1,
                    avgViewers: { $round: ["$avgViewers", 0] },
                    totalGifts: 1,
                    _id: 0,
                },
            },
        ]);

        // Fill in missing hours
        const allHours = [];
        for (let i = 0; i < 24; i++) {
            const existing = hourlyStats.find((h) => h.hour === i);
            allHours.push(
                existing || {
                    hour: i,
                    streamCount: 0,
                    avgViewers: 0,
                    totalGifts: 0,
                }
            );
        }

        // Find peak hour
        const peakHour = allHours.reduce(
            (max, h) => (h.streamCount > max.streamCount ? h : max),
            allHours[0]
        );

        res.json({
            success: true,
            days: parseInt(days),
            hourlyStats: allHours,
            peakHour: peakHour.hour,
            peakHourFormatted: `${peakHour.hour}:00 - ${peakHour.hour + 1
                }:00`,
        });
    } catch (err) {
        console.error("❌ Peak hours error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// STREAMER ANALYTICS (Authenticated)
// ===========================================

/**
 * GET /api/live-analytics/my-stats
 * Get current user's streaming statistics
 */
router.get("/my-stats", auth, async (req, res) => {
    try {
        const rawUserId = req.user?.id || req.user?._id;
        if (!rawUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }
        const userId = safeObjectId(rawUserId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "Invalid user id",
            });
        }

        const { period = "all" } = req.query;
        const { weekStart, monthStart } = getDateRanges();

        let dateFilter = {
            $or: [{ streamerId: userId }, { host: userId }],
        };

        if (period === "week") dateFilter.startedAt = { $gte: weekStart };
        else if (period === "month")
            dateFilter.startedAt = { $gte: monthStart };

        // Overall stats
        const stats = await Stream.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalStreams: { $sum: 1 },
                    totalDuration: { $sum: "$duration" },
                    totalViewers: { $sum: "$totalUniqueViewers" },
                    peakViewers: { $max: "$peakViewers" },
                    avgViewers: { $avg: "$peakViewers" },
                    totalGifts: { $sum: "$totalGifts" },
                    totalGiftsCount: { $sum: "$totalGiftsCount" },
                },
            },
        ]);

        // Recent streams
        const recentStreams = await Stream.find({
            $or: [{ streamerId: userId }, { host: userId }],
        })
            .sort({ startedAt: -1 })
            .limit(10)
            .select(
                "title category viewers peakViewers duration totalGifts startedAt endedAt isLive"
            )
            .lean();

        // Stream history by day (last 30 days)
        const thirtyDaysAgo = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
        );
        const dailyStats = await Stream.aggregate([
            {
                $match: {
                    $or: [{ streamerId: userId }, { host: userId }],
                    startedAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$startedAt",
                        },
                    },
                    streams: { $sum: 1 },
                    duration: { $sum: "$duration" },
                    viewers: { $sum: "$peakViewers" },
                    gifts: { $sum: "$totalGifts" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Category breakdown
        const categoryBreakdown = await Stream.aggregate([
            {
                $match: {
                    $or: [{ streamerId: userId }, { host: userId }],
                },
            },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    duration: { $sum: "$duration" },
                    gifts: { $sum: "$totalGifts" },
                },
            },
            { $sort: { count: -1 } },
        ]);

        const summary =
            stats[0] || {
                totalStreams: 0,
                totalDuration: 0,
                totalViewers: 0,
                peakViewers: 0,
                avgViewers: 0,
                totalGifts: 0,
                totalGiftsCount: 0,
            };

        // Format duration
        const totalHours = Math.floor(summary.totalDuration / 3600);
        const totalMinutes = Math.floor(
            (summary.totalDuration % 3600) / 60
        );

        res.json({
            success: true,
            period,
            summary: {
                ...summary,
                totalHours,
                totalMinutes,
                durationFormatted: `${totalHours}h ${totalMinutes}m`,
                avgViewers: Math.round(summary.avgViewers || 0),
            },
            recentStreams,
            dailyStats,
            categoryBreakdown,
        });
    } catch (err) {
        console.error("❌ My stats error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

/**
 * GET /api/live-analytics/stream/:streamId
 * Get detailed analytics for a specific stream
 */
router.get("/stream/:streamId", auth, async (req, res) => {
    try {
        const rawUserId = req.user?.id || req.user?._id;
        if (!rawUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }
        const userId = safeObjectId(rawUserId);
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "Invalid user id",
            });
        }

        const { streamId } = req.params;
        const streamObjectId = safeObjectId(streamId);
        if (!streamObjectId) {
            return res.status(400).json({
                success: false,
                error: "Invalid stream id",
            });
        }

        const stream = await Stream.findOne({
            _id: streamObjectId,
            $or: [{ streamerId: userId }, { host: userId }],
        }).lean();

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found or not authorized",
            });
        }

        // Get gift statistics (OPTIONAL, only if Gift model exists)
        let giftStats = {
            total: 0,
            count: 0,
            topGifters: [],
            giftTypes: [],
        };

        if (Gift) {
            try {
                const matchStage = { streamId: streamObjectId };

                const giftAgg = await safeAggregate(Gift, [
                    { $match: matchStage },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$amount" },
                            count: { $sum: 1 },
                        },
                    },
                ]);
                giftStats.total = giftAgg[0]?.total || 0;
                giftStats.count = giftAgg[0]?.count || 0;

                // Top gifters
                giftStats.topGifters = await safeAggregate(Gift, [
                    { $match: matchStage },
                    {
                        $group: {
                            _id: "$senderId",
                            total: { $sum: "$amount" },
                            count: { $sum: 1 },
                            username: { $first: "$senderUsername" },
                            avatar: { $first: "$senderAvatar" },
                        },
                    },
                    { $sort: { total: -1 } },
                    { $limit: 10 },
                ]);

                // Gift types breakdown
                giftStats.giftTypes = await safeAggregate(Gift, [
                    { $match: matchStage },
                    {
                        $group: {
                            _id: "$item",
                            total: { $sum: "$amount" },
                            count: { $sum: 1 },
                            icon: { $first: "$icon" },
                        },
                    },
                    { $sort: { total: -1 } },
                ]);
            } catch (err) {
                console.log("Gift stats unavailable:", err.message);
            }
        }

        // Calculate duration
        const duration =
            stream.duration ||
            (stream.endedAt
                ? Math.floor(
                    (new Date(stream.endedAt) -
                        new Date(stream.startedAt)) /
                    1000
                )
                : 0);

        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;

        const totalUnique =
            stream.totalUniqueViewers || stream.viewerList?.length || 0;

        let averageViewers = 0;
        if (stream.avgWatchTime && duration > 0 && totalUnique > 0) {
            averageViewers = Math.round(
                (totalUnique * stream.avgWatchTime) / duration
            );
        }

        res.json({
            success: true,
            stream: {
                _id: stream._id,
                title: stream.title,
                category: stream.category,
                startedAt: stream.startedAt,
                endedAt: stream.endedAt,
                isLive: stream.isLive,
                duration,
                durationFormatted: `${hours}:${minutes
                    .toString()
                    .padStart(2, "0")}:${seconds
                        .toString()
                        .padStart(2, "0")}`,
                viewers: {
                    peak: stream.peakViewers || 0,
                    total: totalUnique,
                    average: averageViewers,
                },
                engagement: {
                    likes: stream.likes || 0,
                    shares: stream.shares || 0,
                    comments: stream.chatMessages || 0,
                },
                gifts: giftStats,
                avgWatchTime: stream.avgWatchTime || 0,
            },
        });
    } catch (err) {
        console.error("❌ Stream analytics error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// ADMIN ANALYTICS
// ===========================================

/**
 * GET /api/live-analytics/admin/overview
 * Admin platform overview (admin only)
 */
router.get("/admin/overview", auth, requireAdmin, async (req, res) => {
    try {
        const { todayStart, weekStart, monthStart, yesterdayStart } =
            getDateRanges();

        // Current stats
        const liveNow = await Stream.countDocuments({ isLive: true });

        const viewerStats = await Stream.aggregate([
            { $match: { isLive: true } },
            { $group: { _id: null, total: { $sum: "$viewers" } } },
        ]);

        // Today's stats
        const todayStats = await Stream.aggregate([
            { $match: { startedAt: { $gte: todayStart } } },
            {
                $group: {
                    _id: null,
                    streams: { $sum: 1 },
                    duration: { $sum: "$duration" },
                    viewers: { $sum: "$totalUniqueViewers" },
                    gifts: { $sum: "$totalGifts" },
                },
            },
        ]);

        // Yesterday's stats (for comparison)
        const yesterdayStats = await Stream.aggregate([
            {
                $match: {
                    startedAt: { $gte: yesterdayStart, $lt: todayStart },
                },
            },
            {
                $group: {
                    _id: null,
                    streams: { $sum: 1 },
                    duration: { $sum: "$duration" },
                    viewers: { $sum: "$totalUniqueViewers" },
                    gifts: { $sum: "$totalGifts" },
                },
            },
        ]);

        // This week
        const weekStats = await Stream.aggregate([
            { $match: { startedAt: { $gte: weekStart } } },
            {
                $group: {
                    _id: null,
                    streams: { $sum: 1 },
                    duration: { $sum: "$duration" },
                    viewers: { $sum: "$totalUniqueViewers" },
                    gifts: { $sum: "$totalGifts" },
                    peakViewers: { $max: "$peakViewers" },
                },
            },
        ]);

        // This month
        const monthStats = await Stream.aggregate([
            { $match: { startedAt: { $gte: monthStart } } },
            {
                $group: {
                    _id: null,
                    streams: { $sum: 1 },
                    duration: { $sum: "$duration" },
                    viewers: { $sum: "$totalUniqueViewers" },
                    gifts: { $sum: "$totalGifts" },
                },
            },
        ]);

        // All time
        const allTimeStats = await Stream.aggregate([
            {
                $group: {
                    _id: null,
                    streams: { $sum: 1 },
                    duration: { $sum: "$duration" },
                    peakViewers: { $max: "$peakViewers" },
                    gifts: { $sum: "$totalGifts" },
                },
            },
        ]);

        // Top streamers this week
        const topStreamers = await Stream.aggregate([
            { $match: { startedAt: { $gte: weekStart } } },
            {
                $group: {
                    _id: "$streamerId",
                    streams: { $sum: 1 },
                    duration: { $sum: "$duration" },
                    viewers: { $sum: "$totalUniqueViewers" },
                    gifts: { $sum: "$totalGifts" },
                    username: { $first: "$streamerName" },
                },
            },
            { $sort: { viewers: -1 } },
            { $limit: 10 },
        ]);

        // Get avatars for top streamers
        const streamerIds = topStreamers
            .map((s) => s._id)
            .filter(Boolean);
        const streamersInfo = await User.find({ _id: { $in: streamerIds } })
            .select("avatar isVerified")
            .lean();

        const streamerMap = {};
        streamersInfo.forEach((s) => {
            streamerMap[s._id.toString()] = s;
        });

        const topStreamersWithInfo = topStreamers.map((s) => ({
            ...s,
            avatar: streamerMap[s._id?.toString()]?.avatar || "",
            isVerified: streamerMap[s._id?.toString()]?.isVerified || false,
        }));

        // Calculate growth
        const today = todayStats[0] || {
            streams: 0,
            duration: 0,
            viewers: 0,
            gifts: 0,
        };
        const yesterday = yesterdayStats[0] || {
            streams: 0,
            duration: 0,
            viewers: 0,
            gifts: 0,
        };

        const growth = {
            streams:
                yesterday.streams > 0
                    ? Math.round(
                        ((today.streams - yesterday.streams) /
                            yesterday.streams) *
                        100
                    )
                    : 0,
            viewers:
                yesterday.viewers > 0
                    ? Math.round(
                        ((today.viewers - yesterday.viewers) /
                            yesterday.viewers) *
                        100
                    )
                    : 0,
            gifts:
                yesterday.gifts > 0
                    ? Math.round(
                        ((today.gifts - yesterday.gifts) /
                            yesterday.gifts) *
                        100
                    )
                    : 0,
        };

        res.json({
            success: true,
            live: {
                streams: liveNow,
                viewers: viewerStats[0]?.total || 0,
            },
            today: today,
            yesterday: yesterday,
            growth,
            thisWeek: weekStats[0] || {},
            thisMonth: monthStats[0] || {},
            allTime: allTimeStats[0] || {},
            topStreamers: topStreamersWithInfo,
        });
    } catch (err) {
        console.error("❌ Admin overview error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

/**
 * GET /api/live-analytics/admin/chart
 * Get chart data for admin dashboard
 */
router.get("/admin/chart", auth, requireAdmin, async (req, res) => {
    try {
        const { days = 30, metric = "streams" } = req.query;
        const startDate = new Date(
            Date.now() - parseInt(days) * 24 * 60 * 60 * 1000
        );

        const dailyStats = await Stream.aggregate([
            { $match: { startedAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$startedAt",
                        },
                    },
                    streams: { $sum: 1 },
                    duration: { $sum: "$duration" },
                    viewers: { $sum: "$totalUniqueViewers" },
                    gifts: { $sum: "$totalGifts" },
                    peakViewers: { $max: "$peakViewers" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Fill in missing days
        const chart = [];
        for (let i = parseInt(days) - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split("T")[0];

            const existing = dailyStats.find((d) => d._id === dateKey);
            chart.push({
                date: date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                fullDate: dateKey,
                streams: existing?.streams || 0,
                duration: Math.round((existing?.duration || 0) / 3600), // hours
                viewers: existing?.viewers || 0,
                gifts: existing?.gifts || 0,
                peakViewers: existing?.peakViewers || 0,
            });
        }

        res.json({
            success: true,
            days: parseInt(days),
            metric,
            chart,
        });
    } catch (err) {
        console.error("❌ Admin chart error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

/**
 * GET /api/live-analytics/admin/realtime
 * Get real-time dashboard data
 */
router.get("/admin/realtime", auth, requireAdmin, async (req, res) => {
    try {
        // Current live streams
        const liveStreams = await Stream.find({ isLive: true })
            .sort({ viewers: -1 })
            .limit(20)
            .populate(
                "streamerId",
                "username avatar isVerified"
            )
            .select(
                "title category viewers peakViewers startedAt totalGifts roomId streamerName"
            )
            .lean();

        // Total viewers
        const totalViewers = liveStreams.reduce(
            (sum, s) => sum + (s.viewers || 0),
            0
        );

        // Categories distribution
        const categories = {};
        liveStreams.forEach((s) => {
            const cat = s.category || "Other";
            if (!categories[cat]) {
                categories[cat] = { count: 0, viewers: 0 };
            }
            categories[cat].count++;
            categories[cat].viewers += s.viewers || 0;
        });

        const categoryList = Object.entries(categories)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.viewers - a.viewers);

        res.json({
            success: true,
            timestamp: new Date(),
            live: {
                totalStreams: liveStreams.length,
                totalViewers,
                streams: liveStreams,
            },
            categories: categoryList,
        });
    } catch (err) {
        console.error("❌ Realtime error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

/**
 * GET /api/live-analytics/admin/streamers
 * Get streamer analytics
 */
router.get("/admin/streamers", auth, requireAdmin, async (req, res) => {
    try {
        const { period = "month", limit = 50 } = req.query;
        const { weekStart, monthStart } = getDateRanges();

        let dateFilter = {};
        if (period === "week") dateFilter = { startedAt: { $gte: weekStart } };
        else if (period === "month")
            dateFilter = { startedAt: { $gte: monthStart } };

        const streamers = await Stream.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$streamerId",
                    totalStreams: { $sum: 1 },
                    totalDuration: { $sum: "$duration" },
                    totalViewers: { $sum: "$totalUniqueViewers" },
                    peakViewers: { $max: "$peakViewers" },
                    avgViewers: { $avg: "$peakViewers" },
                    totalGifts: { $sum: "$totalGifts" },
                    username: { $first: "$streamerName" },
                    lastStream: { $max: "$startedAt" },
                },
            },
            { $sort: { totalViewers: -1 } },
            { $limit: parseInt(limit) },
            {
                $project: {
                    userId: "$_id",
                    totalStreams: 1,
                    totalHours: { $divide: ["$totalDuration", 3600] },
                    totalViewers: 1,
                    peakViewers: 1,
                    avgViewers: { $round: ["$avgViewers", 0] },
                    totalGifts: 1,
                    username: 1,
                    lastStream: 1,
                    _id: 0,
                },
            },
        ]);

        // Get additional user info
        const userIds = streamers.map((s) => s.userId).filter(Boolean);
        const users = await User.find({ _id: { $in: userIds } })
            .select("avatar isVerified followersCount isLive")
            .lean();

        const userMap = {};
        users.forEach((u) => {
            userMap[u._id.toString()] = u;
        });

        const streamersWithInfo = streamers.map((s) => ({
            ...s,
            avatar: userMap[s.userId?.toString()]?.avatar || "",
            isVerified: userMap[s.userId?.toString()]?.isVerified || false,
            followersCount:
                userMap[s.userId?.toString()]?.followersCount || 0,
            isLive: userMap[s.userId?.toString()]?.isLive || false,
        }));

        res.json({
            success: true,
            period,
            streamers: streamersWithInfo,
        });
    } catch (err) {
        console.error("❌ Streamers analytics error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

module.exports = router;
