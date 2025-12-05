// backend/routes/adminDashboard.js
// World-Studio.live - Admin Dashboard Routes
// Dashboard-specific endpoints for admin panel

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Stream = require("../models/Stream");
const Post = require("../models/Post");
const Gift = require("../models/Gift");
const PK = require("../models/PK");
const authMiddleware = require("../middleware/authMiddleware");

// ===========================================
// ADMIN CHECK MIDDLEWARE
// ===========================================

/**
 * Check if user is admin
 * Only allows hardcoded admin email or users with admin role
 */
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User not found"
            });
        }

        // Check admin access
        const hasAdminAccess =
            user.email === "menziesalm@gmail.com" ||
            user.role === "admin" ||
            user.isAdmin === true;

        if (!hasAdminAccess) {
            console.warn(`⚠️ Admin access denied for: ${user.email}`);
            return res.status(403).json({
                success: false,
                error: "Admin access only"
            });
        }

        req.adminUser = user;
        next();
    } catch (err) {
        console.error("Admin auth error:", err);
        res.status(500).json({
            success: false,
            error: "Authorization failed"
        });
    }
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Safe model operations
 */
const safeCount = async (Model, query = {}) => {
    try {
        if (!Model) return 0;
        return await Model.countDocuments(query);
    } catch (err) {
        return 0;
    }
};

const safeAggregate = async (Model, pipeline) => {
    try {
        if (!Model) return [];
        return await Model.aggregate(pipeline);
    } catch (err) {
        return [];
    }
};

/**
 * Get date helpers
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
        lastMonthEnd
    };
};

// ===========================================
// DASHBOARD STATS
// ===========================================

/**
 * GET /api/admin-dashboard/stats
 * Main dashboard statistics
 */
router.get("/stats", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { todayStart, weekStart, monthStart, yesterdayStart } = getDateRanges();

        // ===== USER STATS =====
        const totalUsers = await User.countDocuments();
        const newUsersToday = await User.countDocuments({ createdAt: { $gte: todayStart } });
        const newUsersYesterday = await User.countDocuments({
            createdAt: { $gte: yesterdayStart, $lt: todayStart }
        });
        const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: weekStart } });
        const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: monthStart } });

        const bannedUsers = await User.countDocuments({ isBanned: true });
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const premiumUsers = await User.countDocuments({ isPremium: true });
        const onlineUsers = await User.countDocuments({
            lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        });

        // User growth trend
        const userGrowthTrend = newUsersToday > newUsersYesterday ? "up" :
            newUsersToday < newUsersYesterday ? "down" : "stable";

        // ===== STREAM STATS =====
        const activeStreams = await safeCount(Stream, { isLive: true });
        const totalStreamsToday = await safeCount(Stream, { startedAt: { $gte: todayStart } });
        const totalStreamsThisWeek = await safeCount(Stream, { startedAt: { $gte: weekStart } });
        const totalStreams = await safeCount(Stream);

        // Total viewers currently watching
        let currentViewers = 0;
        try {
            const viewerAgg = await Stream.aggregate([
                { $match: { isLive: true } },
                { $group: { _id: null, total: { $sum: "$viewers" } } }
            ]);
            currentViewers = viewerAgg[0]?.total || 0;
        } catch (err) {
            currentViewers = 0;
        }

        // ===== POST STATS =====
        const totalPosts = await safeCount(Post);
        const postsToday = await safeCount(Post, { createdAt: { $gte: todayStart } });
        const paidPosts = await safeCount(Post, { isFree: false, price: { $gt: 0 } });
        const reportedPosts = await safeCount(Post, { isReported: true });

        // ===== GIFT STATS =====
        let totalGiftsToday = 0;
        let totalGiftsThisMonth = 0;
        let totalGiftsAllTime = 0;

        try {
            if (Gift) {
                const giftStatsToday = await Gift.aggregate([
                    { $match: { createdAt: { $gte: todayStart } } },
                    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
                ]);
                totalGiftsToday = giftStatsToday[0]?.total || 0;

                const giftStatsMonth = await Gift.aggregate([
                    { $match: { createdAt: { $gte: monthStart } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);
                totalGiftsThisMonth = giftStatsMonth[0]?.total || 0;

                const giftStatsAll = await Gift.aggregate([
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);
                totalGiftsAllTime = giftStatsAll[0]?.total || 0;
            }
        } catch (err) {
            console.log("Gift stats error:", err.message);
        }

        // ===== PK STATS =====
        const activePKs = await safeCount(PK, { status: "active" });
        const totalPKsToday = await safeCount(PK, { createdAt: { $gte: todayStart } });
        const totalPKs = await safeCount(PK);

        // ===== COIN/REVENUE STATS =====
        const allUsers = await User.find().select("wallet").lean();

        let totalCoinsSold = 0;
        let coinsSoldToday = 0;
        let totalWalletBalance = 0;

        allUsers.forEach(user => {
            totalCoinsSold += user.wallet?.totalReceived || 0;
            totalWalletBalance += user.wallet?.balance || 0;

            const todayPurchases = user.wallet?.transactions?.filter(
                tx => new Date(tx.createdAt) >= todayStart && tx.type === "purchase"
            ) || [];
            coinsSoldToday += todayPurchases.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        });

        // ===== USER GROWTH CHART (Last 7 days) =====
        const userGrowth = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await User.countDocuments({
                createdAt: { $gte: date, $lt: nextDate }
            });

            userGrowth.push({
                date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                fullDate: date.toISOString().split("T")[0],
                count
            });
        }

        // ===== STREAM GROWTH CHART (Last 7 days) =====
        const streamGrowth = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await safeCount(Stream, {
                startedAt: { $gte: date, $lt: nextDate }
            });

            streamGrowth.push({
                date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                count
            });
        }

        // ===== TOP CATEGORIES =====
        let topCategories = [];
        try {
            topCategories = await Stream.aggregate([
                {
                    $group: {
                        _id: "$category",
                        count: { $sum: 1 },
                        liveCount: {
                            $sum: { $cond: ["$isLive", 1, 0] }
                        },
                        totalViewers: { $sum: "$viewers" }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        name: "$_id",
                        count: 1,
                        liveCount: 1,
                        totalViewers: 1,
                        _id: 0
                    }
                }
            ]);
        } catch (err) {
            topCategories = [{ name: "General", count: 0, liveCount: 0 }];
        }

        // ===== TOP EARNERS =====
        const topEarners = await User.find({
            "wallet.totalReceived": { $gt: 0 }
        })
            .select("username avatar wallet.totalReceived wallet.balance isVerified followersCount")
            .sort({ "wallet.totalReceived": -1 })
            .limit(10)
            .lean();

        const formattedTopEarners = topEarners.map(u => ({
            _id: u._id,
            username: u.username,
            avatar: u.avatar,
            isVerified: u.isVerified,
            earnings: u.wallet?.totalReceived || 0,
            balance: u.wallet?.balance || 0,
            followers: u.followersCount || 0
        }));

        // ===== TOP STREAMERS =====
        const topStreamers = await User.find({
            followersCount: { $gt: 0 }
        })
            .select("username avatar followersCount isVerified isLive stats.totalStreams")
            .sort({ followersCount: -1 })
            .limit(10)
            .lean();

        // ===== RECENT USERS =====
        const recentUsers = await User.find()
            .select("username avatar email createdAt role isVerified isBanned")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // ===== ACTIVE STREAMS =====
        let activeStreamsList = [];
        try {
            activeStreamsList = await Stream.find({ isLive: true })
                .populate("streamerId", "username avatar")
                .select("title category viewers startedAt totalGifts")
                .sort({ viewers: -1 })
                .limit(10)
                .lean();
        } catch (err) {
            activeStreamsList = [];
        }

        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    today: newUsersToday,
                    yesterday: newUsersYesterday,
                    thisWeek: newUsersThisWeek,
                    thisMonth: newUsersThisMonth,
                    banned: bannedUsers,
                    verified: verifiedUsers,
                    premium: premiumUsers,
                    online: onlineUsers,
                    trend: userGrowthTrend
                },
                streams: {
                    active: activeStreams,
                    today: totalStreamsToday,
                    thisWeek: totalStreamsThisWeek,
                    total: totalStreams,
                    currentViewers
                },
                posts: {
                    total: totalPosts,
                    today: postsToday,
                    paid: paidPosts,
                    reported: reportedPosts
                },
                gifts: {
                    today: totalGiftsToday,
                    thisMonth: totalGiftsThisMonth,
                    total: totalGiftsAllTime
                },
                pk: {
                    active: activePKs,
                    today: totalPKsToday,
                    total: totalPKs
                },
                coins: {
                    totalSold: totalCoinsSold,
                    soldToday: coinsSoldToday,
                    totalInCirculation: totalWalletBalance
                }
            },
            charts: {
                userGrowth,
                streamGrowth
            },
            leaderboards: {
                topEarners: formattedTopEarners,
                topStreamers,
                topCategories
            },
            recent: {
                users: recentUsers,
                streams: activeStreamsList
            }
        });
    } catch (err) {
        console.error("❌ Stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch stats",
            message: err.message
        });
    }
});

// ===========================================
// GET ALL USERS
// ===========================================

/**
 * GET /api/admin-dashboard/users
 * Get all users with pagination and filtering
 */
router.get("/users", authMiddleware, isAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search,
            role,
            status,
            sort = "createdAt",
            order = "desc"
        } = req.query;

        const query = {};

        // Search
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { displayName: { $regex: search, $options: "i" } }
            ];
        }

        // Role filter
        if (role && role !== "all") {
            query.role = role;
        }

        // Status filter
        if (status === "banned") query.isBanned = true;
        else if (status === "active") query.isBanned = false;
        else if (status === "live") query.isLive = true;
        else if (status === "verified") query.isVerified = true;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = order === "desc" ? -1 : 1;

        const [users, total] = await Promise.all([
            User.find(query)
                .select("-password -passwordResetToken -passwordResetExpires -notifications -wallet.transactions")
                .sort({ [sort]: sortOrder })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            User.countDocuments(query)
        ]);

        res.json({
            success: true,
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error("❌ Users fetch error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch users"
        });
    }
});

// ===========================================
// GET REVENUE DATA
// ===========================================

/**
 * GET /api/admin-dashboard/revenue
 * Get detailed revenue statistics
 */
router.get("/revenue", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { todayStart, monthStart, weekStart } = getDateRanges();

        // Coin package prices (EUR)
        const COIN_PRICES = {
            100: 4.99,
            550: 19.99,   // 500 + 50 bonus
            1150: 34.99,  // 1000 + 150 bonus
            3000: 79.99,  // 2500 + 500 bonus
            6500: 149.99  // 5000 + 1500 bonus
        };

        // Get all purchase transactions
        const allUsers = await User.find()
            .select("wallet username avatar")
            .lean();

        let totalRevenue = 0;
        let revenueToday = 0;
        let revenueThisWeek = 0;
        let revenueThisMonth = 0;
        const recentTransactions = [];
        const revenueByDay = {};

        allUsers.forEach(user => {
            const purchases = user.wallet?.transactions?.filter(tx => tx.type === "purchase") || [];

            purchases.forEach(tx => {
                // Calculate revenue based on coin amount
                let revenue = 0;
                const amount = tx.amount || 0;

                // Find closest package price
                if (amount <= 100) revenue = COIN_PRICES[100];
                else if (amount <= 550) revenue = COIN_PRICES[550];
                else if (amount <= 1150) revenue = COIN_PRICES[1150];
                else if (amount <= 3000) revenue = COIN_PRICES[3000];
                else if (amount <= 6500) revenue = COIN_PRICES[6500];
                else revenue = (amount / 100) * 4.99; // Estimate for custom amounts

                totalRevenue += revenue;

                const txDate = new Date(tx.createdAt);
                const dateKey = txDate.toISOString().split("T")[0];

                // Track by day
                revenueByDay[dateKey] = (revenueByDay[dateKey] || 0) + revenue;

                if (txDate >= todayStart) revenueToday += revenue;
                if (txDate >= weekStart) revenueThisWeek += revenue;
                if (txDate >= monthStart) revenueThisMonth += revenue;

                recentTransactions.push({
                    _id: tx._id,
                    username: user.username,
                    avatar: user.avatar,
                    type: tx.type,
                    coins: amount,
                    revenue: revenue.toFixed(2),
                    description: tx.description,
                    date: tx.createdAt
                });
            });
        });

        // Sort recent transactions
        recentTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Create chart data for last 30 days
        const revenueChart = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split("T")[0];

            revenueChart.push({
                date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                revenue: Math.round((revenueByDay[dateKey] || 0) * 100) / 100
            });
        }

        // Platform fee estimate (15% of gifts)
        let platformFees = 0;
        try {
            if (Gift) {
                const giftTotal = await Gift.aggregate([
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);
                // Convert coins to EUR and take 15%
                platformFees = ((giftTotal[0]?.total || 0) / 100) * 0.15;
            }
        } catch (err) {
            platformFees = 0;
        }

        res.json({
            success: true,
            revenue: {
                total: Math.round(totalRevenue * 100) / 100,
                today: Math.round(revenueToday * 100) / 100,
                thisWeek: Math.round(revenueThisWeek * 100) / 100,
                thisMonth: Math.round(revenueThisMonth * 100) / 100,
                platformFees: Math.round(platformFees * 100) / 100,
                currency: "EUR"
            },
            chart: revenueChart,
            recentTransactions: recentTransactions.slice(0, 50)
        });
    } catch (err) {
        console.error("❌ Revenue fetch error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch revenue"
        });
    }
});

// ===========================================
// USER MANAGEMENT ACTIONS
// ===========================================

/**
 * POST /api/admin-dashboard/make-admin/:userId
 */
router.post("/make-admin/:userId", authMiddleware, isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { role: "admin" },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        console.log(`👑 ${user.username} promoted to admin by ${req.adminUser.username}`);

        res.json({
            success: true,
            message: "User promoted to admin",
            user
        });
    } catch (err) {
        console.error("❌ Make admin error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to make user admin"
        });
    }
});

/**
 * POST /api/admin-dashboard/remove-admin/:userId
 */
router.post("/remove-admin/:userId", authMiddleware, isAdmin, async (req, res) => {
    try {
        // Prevent self-demotion
        if (req.params.userId === req.userId) {
            return res.status(400).json({
                success: false,
                error: "Cannot remove your own admin role"
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { role: "creator" },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        console.log(`⬇️ ${user.username} demoted from admin by ${req.adminUser.username}`);

        res.json({
            success: true,
            message: "Admin role removed",
            user
        });
    } catch (err) {
        console.error("❌ Remove admin error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to remove admin role"
        });
    }
});

/**
 * POST /api/admin-dashboard/verify-user/:userId
 */
router.post("/verify-user/:userId", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { badge = "creator" } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                isVerified: true,
                verifiedAt: new Date(),
                verificationBadge: badge
            },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Notify user
        if (user.addNotification) {
            await user.addNotification({
                message: "🎉 Congratulations! Your account has been verified!",
                type: "system",
                icon: "✓"
            });
        }

        console.log(`✓ ${user.username} verified by ${req.adminUser.username}`);

        res.json({
            success: true,
            message: "User verified",
            user
        });
    } catch (err) {
        console.error("❌ Verify user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to verify user"
        });
    }
});

/**
 * POST /api/admin-dashboard/ban-user/:userId
 */
router.post("/ban-user/:userId", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { reason, duration } = req.body;

        // Prevent self-ban
        if (req.params.userId === req.userId) {
            return res.status(400).json({
                success: false,
                error: "Cannot ban yourself"
            });
        }

        const updateData = {
            isBanned: true,
            banReason: reason || "Violation of terms of service",
            bannedAt: new Date()
        };

        if (duration) {
            updateData.bannedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            updateData,
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // End all their active streams
        try {
            await Stream.updateMany(
                { streamerId: req.params.userId, isLive: true },
                { isLive: false, status: "ended", endedAt: new Date() }
            );
        } catch (err) {
            console.log("No streams to end");
        }

        console.log(`🚫 ${user.username} banned by ${req.adminUser.username}. Reason: ${reason}`);

        res.json({
            success: true,
            message: "User banned",
            user
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
 * POST /api/admin-dashboard/unban-user/:userId
 */
router.post("/unban-user/:userId", authMiddleware, isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                isBanned: false,
                banReason: null,
                bannedAt: null,
                bannedUntil: null
            },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Notify user
        if (user.addNotification) {
            await user.addNotification({
                message: "Your account has been unbanned. Welcome back!",
                type: "system"
            });
        }

        console.log(`✅ ${user.username} unbanned by ${req.adminUser.username}`);

        res.json({
            success: true,
            message: "User unbanned",
            user
        });
    } catch (err) {
        console.error("❌ Unban user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to unban user"
        });
    }
});

/**
 * DELETE /api/admin-dashboard/delete-user/:userId
 */
router.delete("/delete-user/:userId", authMiddleware, isAdmin, async (req, res) => {
    try {
        // Prevent self-deletion
        if (req.params.userId === req.userId) {
            return res.status(400).json({
                success: false,
                error: "Cannot delete yourself"
            });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        const username = user.username;

        // Delete related data
        try {
            if (Stream) await Stream.deleteMany({ streamerId: req.params.userId });
            if (Post) await Post.deleteMany({ userId: req.params.userId });
            if (Gift) {
                await Gift.deleteMany({ senderId: req.params.userId });
                // Note: Don't delete received gifts (for recipient's records)
            }
        } catch (err) {
            console.log("Error cleaning up user data:", err.message);
        }

        // Delete user
        await User.findByIdAndDelete(req.params.userId);

        console.log(`🗑️ ${username} deleted by ${req.adminUser.username}`);

        res.json({
            success: true,
            message: "User deleted permanently"
        });
    } catch (err) {
        console.error("❌ Delete user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete user"
        });
    }
});

/**
 * POST /api/admin-dashboard/add-coins/:userId
 */
router.post("/add-coins/:userId", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { amount, reason } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid amount"
            });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Add coins
        if (user.addTransaction) {
            await user.addTransaction({
                type: "bonus",
                amount,
                description: reason || `Admin bonus from ${req.adminUser.username}`
            });
        } else {
            // Fallback if method doesn't exist
            user.wallet.balance += amount;
            user.wallet.totalReceived += amount;
            user.wallet.transactions.unshift({
                type: "bonus",
                amount,
                description: reason || `Admin bonus from ${req.adminUser.username}`,
                status: "completed",
                createdAt: new Date()
            });
            await user.save();
        }

        // Notify user
        if (user.addNotification) {
            await user.addNotification({
                message: `🎁 You received ${amount} coins! ${reason || ""}`,
                type: "system",
                amount
            });
        }

        console.log(`💰 Added ${amount} coins to ${user.username} by ${req.adminUser.username}`);

        res.json({
            success: true,
            message: `Added ${amount} coins`,
            balance: user.wallet.balance
        });
    } catch (err) {
        console.error("❌ Add coins error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to add coins"
        });
    }
});

// ===========================================
// LIVE STREAMS MANAGEMENT
// ===========================================

/**
 * GET /api/admin-dashboard/streams
 */
router.get("/streams", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { live, page = 1, limit = 50 } = req.query;

        const query = {};
        if (live === "true") query.isLive = true;
        if (live === "false") query.isLive = false;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [streams, total] = await Promise.all([
            Stream.find(query)
                .populate("streamerId", "username avatar email")
                .sort({ startedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Stream.countDocuments(query)
        ]);

        res.json({
            success: true,
            streams,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error("❌ Streams fetch error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch streams"
        });
    }
});

/**
 * POST /api/admin-dashboard/streams/:streamId/end
 */
router.post("/streams/:streamId/end", authMiddleware, isAdmin, async (req, res) => {
    try {
        const stream = await Stream.findById(req.params.streamId);

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found"
            });
        }

        stream.isLive = false;
        stream.status = "ended";
        stream.endedAt = new Date();
        await stream.save();

        // Update user status
        await User.findByIdAndUpdate(stream.streamerId, {
            isLive: false,
            currentStreamId: null
        });

        console.log(`⏹️ Stream ${stream._id} force-ended by ${req.adminUser.username}`);

        res.json({
            success: true,
            message: "Stream ended",
            stream
        });
    } catch (err) {
        console.error("❌ End stream error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to end stream"
        });
    }
});

module.exports = router;