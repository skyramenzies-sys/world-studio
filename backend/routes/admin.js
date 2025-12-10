// backend/routes/admin.js
// World-Studio.live - Admin Routes (UNIVERSUM EDITION 🌌)

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

const User = require("../models/User");
const Stream = require("../models/Stream");
const Post = require("../models/Post");
const Gift = require("../models/Gift");
const PK = require("../models/PK");
const PlatformWallet = require("../models/PlatformWallet");

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get start of today
 */
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get start of this week (Monday)
 */
const startOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get start of this month
 */
const startOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Safe model query (returns 0 if model doesn't exist)
 */
const safeCount = async (Model, query = {}) => {
    try {
        if (!Model) return 0;
        return await Model.countDocuments(query);
    } catch (err) {
        return 0;
    }
};

/**
 * Safe aggregate sum
 */
const safeSum = async (Model, field, query = {}) => {
    try {
        if (!Model) return 0;
        const result = await Model.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: `$${field}` } } }
        ]);
        return result[0]?.total || 0;
    } catch (err) {
        return 0;
    }
};

// ===========================================
// DASHBOARD STATS
// ===========================================

/**
 * GET /api/admin/stats
 * Main dashboard statistics (aligned with AdminDashboard.jsx U.E.)
 */
router.get("/stats", auth, requireAdmin, async (req, res) => {
    try {
        const today = startOfToday();
        const thisWeek = startOfWeek();
        const thisMonth = startOfMonth();

        // ---------- USER STATS ----------
        const totalUsers = await User.countDocuments();
        const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });
        const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: thisWeek } });
        const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: thisMonth } });
        const bannedUsers = await User.countDocuments({ isBanned: true });
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const premiumUsers = await User.countDocuments({ isPremium: true });

        // growth vs vorige week (voor userGrowthPercent)
        const lastWeekStart = new Date(thisWeek);
        lastWeekStart.setDate(thisWeek.getDate() - 7);

        const lastWeekUsers = await User.countDocuments({
            createdAt: { $gte: lastWeekStart, $lt: thisWeek }
        });

        let userGrowthPercent = 0;
        if (lastWeekUsers > 0) {
            userGrowthPercent = Math.round(
                ((newUsersThisWeek - lastWeekUsers) / lastWeekUsers) * 100
            );
        } else if (newUsersThisWeek > 0) {
            userGrowthPercent = 100;
        }

        // ---------- STREAM STATS ----------
        const activeStreams = await safeCount(Stream, { isLive: true });
        const totalStreamsToday = await safeCount(Stream, { startedAt: { $gte: today } });
        const totalStreams = await safeCount(Stream);

        // ---------- POST STATS ----------
        const totalPosts = await safeCount(Post);
        const postsToday = await safeCount(Post, { createdAt: { $gte: today } });
        const paidPosts = await safeCount(Post, { isFree: false });

        // ---------- GIFT STATS ----------
        const totalGiftsToday = await safeSum(Gift, "amount", { createdAt: { $gte: today } });
        const totalGiftsThisMonth = await safeSum(Gift, "amount", { createdAt: { $gte: thisMonth } });
        const totalGiftsAllTime = await safeSum(Gift, "amount");

        // extra velden voor Gifts-tab
        let totalGiftsSent = 0;
        let totalCoinsSpent = 0;
        let uniqueGifters = 0;
        let topGiftedStreamers = [];

        try {
            if (Gift) {
                totalGiftsSent = await Gift.countDocuments({});
                totalCoinsSpent = await safeSum(Gift, "coins"); // als "coins" niet bestaat => 0

                const distinctSenders = await Gift.distinct("senderId");
                uniqueGifters = distinctSenders.length;

                // Top gifted streamers
                const agg = await Gift.aggregate([
                    {
                        $group: {
                            _id: "$recipientId",
                            gifts: { $sum: 1 },
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    { $sort: { totalAmount: -1 } },
                    { $limit: 10 }
                ]);

                const userIds = agg.map(a => a._id).filter(Boolean);
                const users = await User.find({ _id: { $in: userIds } })
                    .select("username avatar")
                    .lean();

                const userMap = new Map(
                    users.map(u => [u._id.toString(), u])
                );

                topGiftedStreamers = agg.map(a => {
                    const u = userMap.get((a._id || "").toString());
                    return {
                        userId: a._id,
                        username: u?.username || "Unknown",
                        avatar: u?.avatar || null,
                        giftsReceived: a.gifts,
                        totalAmount: a.totalAmount || 0
                    };
                });
            }
        } catch (err) {
            console.log("Gift stats error:", err.message);
        }

        // ---------- PK BATTLES ----------
        const activePKs = await safeCount(PK, { status: "active" });
        const totalPKsToday = await safeCount(PK, { createdAt: { $gte: today } });

        // ---------- PLATFORM REVENUE SNAPSHOT ----------
        let platformRevenue = { today: 0, thisMonth: 0, total: 0, balance: 0 };
        try {
            if (PlatformWallet) {
                const wallet = await PlatformWallet.getWallet();
                if (wallet) {
                    platformRevenue = {
                        today: wallet.monthlyStats?.revenue || 0, // basic snapshot
                        thisMonth: wallet.monthlyStats?.revenue || 0,
                        total: wallet.lifetimeStats?.totalRevenue || 0,
                        balance: wallet.balance || 0
                    };
                }
            }
        } catch (err) {
            console.log("PlatformWallet not available");
        }

        // ---------- USER GROWTH (7 DAYS) ----------
        const userGrowth = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date();
            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - i);

            const nextDay = new Date(day);
            nextDay.setDate(day.getDate() + 1);

            const count = await User.countDocuments({
                createdAt: { $gte: day, $lt: nextDay },
            });

            userGrowth.push({
                date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                fullDate: day.toISOString().split("T")[0],
                count,
            });
        }

        // ---------- STREAM GROWTH (7 DAYS) ----------
        const streamGrowth = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date();
            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - i);

            const nextDay = new Date(day);
            nextDay.setDate(day.getDate() + 1);

            const count = await safeCount(Stream, {
                startedAt: { $gte: day, $lt: nextDay },
            });

            streamGrowth.push({
                date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                count,
            });
        }

        // ---------- TOP EARNERS ----------
        const topEarnersRaw = await User.find({
            "wallet.totalReceived": { $gt: 0 },
        })
            .select("username avatar wallet.totalReceived wallet.balance isVerified")
            .sort({ "wallet.totalReceived": -1 })
            .limit(10)
            .lean();

        const topEarners = topEarnersRaw.map((u) => ({
            _id: u._id,
            username: u.username,
            avatar: u.avatar,
            isVerified: u.isVerified,
            earnings: u.wallet?.totalReceived || 0,
            balance: u.wallet?.balance || 0,
        }));

        // ---------- TOP STREAMERS BY FOLLOWERS ----------
        const topStreamers = await User.find({
            followersCount: { $gt: 0 }
        })
            .select("username avatar followersCount isVerified isLive")
            .sort({ followersCount: -1 })
            .limit(10)
            .lean();

        // ---------- TOP CATEGORIES ----------
        let topCategories = [];
        try {
            if (Stream) {
                topCategories = await Stream.aggregate([
                    { $match: { isLive: true } },
                    {
                        $group: {
                            _id: "$category",
                            count: { $sum: 1 },
                            viewers: { $sum: "$viewers" }
                        }
                    },
                    { $sort: { viewers: -1 } },
                    { $limit: 10 }
                ]);
                topCategories = topCategories.map(c => ({
                    name: c._id || "General",
                    count: c.count,
                    viewers: c.viewers
                }));
            }
        } catch (err) {
            topCategories = [
                { name: "General", count: 0, viewers: 0 },
            ];
        }

        // ---------- RECENT USERS ----------
        const recentUsers = await User.find()
            .select("username avatar createdAt")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        // ---------- RESPONSE SHAPE (FLAT + LEGACY) ----------
        const flatStats = {
            // Users
            totalUsers,
            newUsersToday,
            newUsersThisWeek,
            newUsersThisMonth,
            bannedUsers,
            verifiedUsers,
            premiumUsers,
            userGrowthPercent,
            // Streams
            activeStreams,
            totalStreamsToday,
            totalStreams,
            // Posts
            totalPosts,
            postsToday,
            paidPosts,
            // Gifts
            totalGiftsToday,
            totalGiftsThisMonth,
            totalGiftsAllTime,
            totalGiftsSent,
            totalCoinsSpent,
            totalGiftValue: totalGiftsAllTime,
            uniqueGifters,
            // PK
            activePKs,
            totalPKsToday,
            // Charts & leaderboards
            userGrowth,
            streamGrowth,
            topEarners,
            topStreamers,
            topCategories,
            topGiftedStreamers,
            recentUsers,
            // Platform revenue snapshot (optional use)
            platformRevenue
        };

        res.json({
            success: true,
            ...flatStats,
            // legacy nested structure (for eventueel ander gebruik)
            stats: {
                users: {
                    total: totalUsers,
                    today: newUsersToday,
                    thisWeek: newUsersThisWeek,
                    thisMonth: newUsersThisMonth,
                    banned: bannedUsers,
                    verified: verifiedUsers,
                    premium: premiumUsers
                },
                streams: {
                    active: activeStreams,
                    today: totalStreamsToday,
                    total: totalStreams
                },
                posts: {
                    total: totalPosts,
                    today: postsToday,
                    paid: paidPosts
                },
                gifts: {
                    today: totalGiftsToday,
                    thisMonth: totalGiftsThisMonth,
                    total: totalGiftsAllTime
                },
                pk: {
                    active: activePKs,
                    today: totalPKsToday
                },
                revenue: platformRevenue
            },
            charts: {
                userGrowth,
                streamGrowth
            },
            leaderboards: {
                topEarners,
                topStreamers,
                topCategories,
                topGiftedStreamers
            },
            recent: {
                users: recentUsers
            }
        });
    } catch (err) {
        console.error("❌ Error in /admin/stats:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load stats",
            message: err.message
        });
    }
});

// ===========================================
// USER MANAGEMENT
// ===========================================

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get("/users", auth, requireAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            sort = "createdAt",
            order = "desc",
            search,
            role,
            status,
            verified
        } = req.query;

        const query = {};

        // Search filter
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
        if (status === "banned") {
            query.isBanned = true;
        } else if (status === "active") {
            query.isBanned = false;
        } else if (status === "live") {
            query.isLive = true;
        }

        // Verified filter
        if (verified === "true") {
            query.isVerified = true;
        } else if (verified === "false") {
            query.isVerified = false;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = order === "desc" ? -1 : 1;
        const sortField = sort === "earnings" ? "wallet.totalReceived" : sort;

        const [users, total] = await Promise.all([
            User.find(query)
                .select("-password -notifications -wallet.transactions")
                .sort({ [sortField]: sortOrder })
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
        console.error("❌ Error in /admin/users:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load users"
        });
    }
});

/**
 * GET /api/admin/users/:userId
 * Get single user details
 */
router.get("/users/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select("-password")
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Get additional stats
        const [postsCount, streamsCount, giftsReceived, giftsSent] = await Promise.all([
            safeCount(Post, { userId: user._id }),
            safeCount(Stream, { streamerId: user._id }),
            safeSum(Gift, "amount", { recipientId: user._id }),
            safeSum(Gift, "amount", { senderId: user._id })
        ]);

        res.json({
            success: true,
            user: {
                ...user,
                stats: {
                    ...user.stats,
                    postsCount,
                    streamsCount,
                    giftsReceived,
                    giftsSent
                }
            }
        });
    } catch (err) {
        console.error("❌ Error getting user:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get user"
        });
    }
});

/**
 * PUT /api/admin/users/:userId
 * Update user details
 */
router.put("/users/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { role, isVerified, isPremium, premiumTier, bio } = req.body;

        const updateData = {};
        if (role !== undefined) updateData.role = role;
        if (isVerified !== undefined) {
            updateData.isVerified = isVerified;
            if (isVerified) updateData.verifiedAt = new Date();
        }
        if (isPremium !== undefined) updateData.isPremium = isPremium;
        if (premiumTier !== undefined) updateData.premiumTier = premiumTier;
        if (bio !== undefined) updateData.bio = bio;

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

        res.json({ success: true, user });
    } catch (err) {
        console.error("❌ Error updating user:", err);
        res.status(500).json({
            success: false,
            error: "Failed to update user"
        });
    }
});

/**
 * POST /api/admin/make-admin/:userId
 * Make user an admin
 */
router.post("/make-admin/:userId", auth, requireAdmin, async (req, res) => {
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

        console.log(`👑 User ${user.username} promoted to admin by ${req.user.username}`);

        res.json({ success: true, user });
    } catch (err) {
        console.error("❌ Error in make-admin:", err);
        res.status(500).json({
            success: false,
            error: "Failed to make user admin"
        });
    }
});

/**
 * POST /api/admin/remove-admin/:userId
 * Remove admin role
 */
router.post("/remove-admin/:userId", auth, requireAdmin, async (req, res) => {
    try {
        // Prevent removing own admin role
        if (req.params.userId === req.user._id.toString()) {
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
    } catch (err) {
        console.error("❌ Error in remove-admin:", err);
        res.status(500).json({
            success: false,
            error: "Failed to remove admin role"
        });
    }
});

/**
 * POST /api/admin/verify-user/:userId
 * Verify a user
 */
router.post("/verify-user/:userId", auth, requireAdmin, async (req, res) => {
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

        // Send notification to user
        await user.addNotification({
            message: "Congratulations! Your account has been verified! ✓",
            type: "system",
            icon: "✓"
        });

        res.json({ success: true, user });
    } catch (err) {
        console.error("❌ Error verifying user:", err);
        res.status(500).json({
            success: false,
            error: "Failed to verify user"
        });
    }
});

/**
 * POST /api/admin/unverify-user/:userId
 * Remove verification
 */
router.post("/unverify-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                isVerified: false,
                verificationBadge: "none"
            },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        res.json({ success: true, user });
    } catch (err) {
        console.error("❌ Error unverifying user:", err);
        res.status(500).json({
            success: false,
            error: "Failed to unverify user"
        });
    }
});

/**
 * POST /api/admin/ban-user/:userId
 * Ban a user
 */
router.post("/ban-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        const { reason, duration } = req.body; // duration in hours, null = permanent

        // Prevent banning yourself
        if (req.params.userId === req.user._id.toString()) {
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

        // End any active streams
        if (Stream) {
            await Stream.updateMany(
                { streamerId: user._id, isLive: true },
                { isLive: false, status: "ended", endedAt: new Date() }
            );
        }

        console.log(`🚫 User ${user.username} banned by ${req.user.username}. Reason: ${reason}`);

        res.json({ success: true, user });
    } catch (err) {
        console.error("❌ Error in ban-user:", err);
        res.status(500).json({
            success: false,
            error: "Failed to ban user"
        });
    }
});

/**
 * POST /api/admin/unban-user/:userId
 * Unban a user
 */
router.post("/unban-user/:userId", auth, requireAdmin, async (req, res) => {
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

        // Send notification
        await user.addNotification({
            message: "Your account has been unbanned. Welcome back!",
            type: "system"
        });

        console.log(`✅ User ${user.username} unbanned by ${req.user.username}`);

        res.json({ success: true, user });
    } catch (err) {
        console.error("❌ Error in unban-user:", err);
        res.status(500).json({
            success: false,
            error: "Failed to unban user"
        });
    }
});

/**
 * DELETE /api/admin/delete-user/:userId
 * Delete a user permanently
 */
router.delete("/delete-user/:userId", auth, requireAdmin, async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.params.userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: "Cannot delete your own account"
            });
        }

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Delete related data
        if (Post) await Post.deleteMany({ userId: user._id });
        if (Stream) await Stream.deleteMany({ streamerId: user._id });
        // Add more cleanup as needed

        await User.findByIdAndDelete(req.params.userId);

        console.log(`🗑️ User ${user.username} deleted by ${req.user.username}`);

        res.json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (err) {
        console.error("❌ Error in delete-user:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete user"
        });
    }
});

/**
 * POST /api/admin/add-coins/:userId
 * Add coins to user wallet
 */
router.post("/add-coins/:userId", auth, requireAdmin, async (req, res) => {
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

        await user.addTransaction({
            type: "bonus",
            amount,
            description: reason || `Admin bonus from ${req.user.username}`,
            meta: { addedBy: req.user._id }
        });

        // Notify user
        await user.addNotification({
            message: `You received ${amount} coins! ${reason || ""}`,
            type: "system",
            amount,
            icon: "🎁"
        });

        console.log(`💰 Added ${amount} coins to ${user.username} by ${req.user.username}`);

        res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                wallet: { balance: user.wallet.balance }
            }
        });
    } catch (err) {
        console.error("❌ Error adding coins:", err);
        res.status(500).json({
            success: false,
            error: "Failed to add coins"
        });
    }
});

/**
 * POST /api/admin/remove-coins/:userId
 * Remove coins from user wallet
 */
router.post("/remove-coins/:userId", auth, requireAdmin, async (req, res) => {
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

        if (user.wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                error: "User doesn't have enough coins"
            });
        }

        await user.addTransaction({
            type: "adjustment",
            amount: -amount,
            description: reason || `Admin adjustment by ${req.user.username}`,
            meta: { removedBy: req.user._id }
        });

        console.log(`💸 Removed ${amount} coins from ${user.username} by ${req.user.username}`);

        res.json({
            success: true,
            user: {
                _id: user._id,
                username: user.username,
                wallet: { balance: user.wallet.balance }
            }
        });
    } catch (err) {
        console.error("❌ Error removing coins:", err);
        res.status(500).json({
            success: false,
            error: "Failed to remove coins"
        });
    }
});

// ===========================================
// WITHDRAWALS (NEW - Was Missing!)
// ===========================================

/**
 * GET /api/admin/withdrawals
 * Get all withdrawal requests
 */
router.get("/withdrawals", auth, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build match conditions for withdrawal transactions
        const matchConditions = { "wallet.transactions.type": "withdrawal" };
        if (status && status !== "all") {
            matchConditions["wallet.transactions.status"] = status;
        }

        // Aggregate withdrawals from all users
        const withdrawals = await User.aggregate([
            { $unwind: "$wallet.transactions" },
            { $match: { "wallet.transactions.type": "withdrawal" } },
            { $sort: { "wallet.transactions.createdAt": -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $project: {
                    _id: "$wallet.transactions._id",
                    oderId: "$wallet.transactions.orderId",
                    amount: "$wallet.transactions.amount",
                    status: { $ifNull: ["$wallet.transactions.status", "pending"] },
                    description: "$wallet.transactions.description",
                    createdAt: "$wallet.transactions.createdAt",
                    processedAt: "$wallet.transactions.processedAt",
                    userId: "$_id",
                    username: "$username",
                    email: "$email",
                    avatar: "$avatar"
                }
            }
        ]);

        // Count total withdrawals
        const totalResult = await User.aggregate([
            { $unwind: "$wallet.transactions" },
            { $match: { "wallet.transactions.type": "withdrawal" } },
            { $count: "total" }
        ]);

        const total = totalResult[0]?.total || 0;

        // Get summary stats
        const pendingCount = await User.aggregate([
            { $unwind: "$wallet.transactions" },
            {
                $match: {
                    "wallet.transactions.type": "withdrawal",
                    "wallet.transactions.status": { $in: ["pending", null] }
                }
            },
            { $count: "count" }
        ]);

        const approvedSum = await User.aggregate([
            { $unwind: "$wallet.transactions" },
            {
                $match: {
                    "wallet.transactions.type": "withdrawal",
                    "wallet.transactions.status": "approved"
                }
            },
            { $group: { _id: null, total: { $sum: { $abs: "$wallet.transactions.amount" } } } }
        ]);

        res.json({
            success: true,
            withdrawals,
            summary: {
                pending: pendingCount[0]?.count || 0,
                totalApproved: approvedSum[0]?.total || 0
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error("❌ Error getting withdrawals:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load withdrawals"
        });
    }
});

/**
 * POST /api/admin/withdrawals/:id/approve
 * Approve a withdrawal request
 */
router.post("/withdrawals/:id/approve", auth, requireAdmin, async (req, res) => {
    try {
        const { transactionId } = req.body;
        const withdrawalId = req.params.id;

        // Find user with this withdrawal
        const user = await User.findOne({
            "wallet.transactions._id": withdrawalId
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Withdrawal not found"
            });
        }

        // Find and update the transaction
        const tx = user.wallet.transactions.id(withdrawalId);
        if (!tx) {
            return res.status(404).json({
                success: false,
                error: "Transaction not found"
            });
        }

        if (tx.status === "approved") {
            return res.status(400).json({
                success: false,
                error: "Withdrawal already approved"
            });
        }

        tx.status = "approved";
        tx.processedAt = new Date();
        tx.processedBy = req.user._id;
        if (transactionId) tx.externalTransactionId = transactionId;

        await user.save();

        // Notify user
        if (user.addNotification) {
            await user.addNotification({
                message: `Your withdrawal of ${Math.abs(tx.amount)} coins has been approved!`,
                type: "system",
                icon: "✅"
            });
        }

        console.log(`✅ Withdrawal ${withdrawalId} approved by ${req.user.username}`);

        res.json({
            success: true,
            message: "Withdrawal approved",
            withdrawal: {
                _id: tx._id,
                amount: tx.amount,
                status: tx.status,
                processedAt: tx.processedAt
            }
        });
    } catch (err) {
        console.error("❌ Error approving withdrawal:", err);
        res.status(500).json({
            success: false,
            error: "Failed to approve withdrawal"
        });
    }
});

/**
 * POST /api/admin/withdrawals/:id/reject
 * Reject a withdrawal request (refunds the amount)
 */
router.post("/withdrawals/:id/reject", auth, requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const withdrawalId = req.params.id;

        const user = await User.findOne({
            "wallet.transactions._id": withdrawalId
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Withdrawal not found"
            });
        }

        const tx = user.wallet.transactions.id(withdrawalId);
        if (!tx) {
            return res.status(404).json({
                success: false,
                error: "Transaction not found"
            });
        }

        if (tx.status === "rejected") {
            return res.status(400).json({
                success: false,
                error: "Withdrawal already rejected"
            });
        }

        if (tx.status === "approved") {
            return res.status(400).json({
                success: false,
                error: "Cannot reject an approved withdrawal"
            });
        }

        // Refund the amount (withdrawal amounts are negative)
        const refundAmount = Math.abs(tx.amount);
        user.wallet.balance += refundAmount;

        // Update transaction
        tx.status = "rejected";
        tx.rejectionReason = reason || "Rejected by admin";
        tx.processedAt = new Date();
        tx.processedBy = req.user._id;

        await user.save();

        // Notify user
        if (user.addNotification) {
            await user.addNotification({
                message: `Your withdrawal request was declined. ${refundAmount} coins have been refunded. ${reason ? `Reason: ${reason}` : ""}`,
                type: "system",
                icon: "❌"
            });
        }

        console.log(`❌ Withdrawal ${withdrawalId} rejected by ${req.user.username}. Reason: ${reason}`);

        res.json({
            success: true,
            message: "Withdrawal rejected and refunded",
            refundedAmount: refundAmount
        });
    } catch (err) {
        console.error("❌ Error rejecting withdrawal:", err);
        res.status(500).json({
            success: false,
            error: "Failed to reject withdrawal"
        });
    }
});

// ===========================================
// REPORTS / MODERATION (NEW - Was Missing!)
// ===========================================

/**
 * GET /api/admin/reports
 * Get all user/content reports
 */
router.get("/reports", auth, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, status = "all", type = "all" } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let reports = [];
        let total = 0;

        // Get reported posts
        let reportedPosts = [];
        if (Post && (type === "all" || type === "post")) {
            const postQuery = { isReported: true };
            if (status === "pending") postQuery.reportStatus = { $in: ["pending", null, undefined] };
            if (status === "resolved") postQuery.reportStatus = "resolved";

            reportedPosts = await Post.find(postQuery)
                .populate("userId", "username avatar")
                .sort({ reportedAt: -1, createdAt: -1 })
                .lean();

            reportedPosts = reportedPosts.map(p => ({
                _id: p._id,
                type: "post",
                contentType: p.type || "post",
                reason: p.reportReason || "Reported content",
                status: p.reportStatus || "pending",
                reportedBy: p.reportedBy,
                reportedAt: p.reportedAt || p.createdAt,
                item: {
                    _id: p._id,
                    content: p.content?.substring(0, 200),
                    mediaUrl: p.mediaUrl,
                    user: p.userId
                }
            }));
        }

        // Get reported users
        let reportedUsers = [];
        if (type === "all" || type === "user") {
            const userQuery = { isReported: true };
            if (status === "pending") userQuery.reportStatus = { $in: ["pending", null, undefined] };
            if (status === "resolved") userQuery.reportStatus = "resolved";

            reportedUsers = await User.find(userQuery)
                .select("username avatar reportReason reportedAt reportedBy reportStatus bio")
                .sort({ reportedAt: -1 })
                .lean();

            reportedUsers = reportedUsers.map(u => ({
                _id: u._id,
                type: "user",
                contentType: "user",
                reason: u.reportReason || "Reported user",
                status: u.reportStatus || "pending",
                reportedBy: u.reportedBy,
                reportedAt: u.reportedAt,
                item: {
                    _id: u._id,
                    username: u.username,
                    avatar: u.avatar,
                    bio: u.bio?.substring(0, 200)
                }
            }));
        }

        // Get reported streams
        let reportedStreams = [];
        if (Stream && (type === "all" || type === "stream")) {
            const streamQuery = { isReported: true };
            if (status === "pending") streamQuery.reportStatus = { $in: ["pending", null, undefined] };
            if (status === "resolved") streamQuery.reportStatus = "resolved";

            reportedStreams = await Stream.find(streamQuery)
                .populate("streamerId", "username avatar")
                .sort({ reportedAt: -1 })
                .lean();

            reportedStreams = reportedStreams.map(s => ({
                _id: s._id,
                type: "stream",
                contentType: "stream",
                reason: s.reportReason || "Reported stream",
                status: s.reportStatus || "pending",
                reportedBy: s.reportedBy,
                reportedAt: s.reportedAt || s.createdAt,
                item: {
                    _id: s._id,
                    title: s.title,
                    category: s.category,
                    isLive: s.isLive,
                    user: s.streamerId
                }
            }));
        }

        // Combine all reports
        reports = [...reportedPosts, ...reportedUsers, ...reportedStreams]
            .sort((a, b) => new Date(b.reportedAt || 0) - new Date(a.reportedAt || 0));

        total = reports.length;

        // Apply pagination
        const paginatedReports = reports.slice(skip, skip + parseInt(limit));

        // Get summary counts
        const pendingCount = reports.filter(r => r.status === "pending" || !r.status).length;
        const resolvedCount = reports.filter(r => r.status === "resolved").length;

        res.json({
            success: true,
            reports: paginatedReports,
            summary: {
                total,
                pending: pendingCount,
                resolved: resolvedCount,
                byType: {
                    posts: reportedPosts.length,
                    users: reportedUsers.length,
                    streams: reportedStreams.length
                }
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error("❌ Error getting reports:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load reports"
        });
    }
});

/**
 * POST /api/admin/reports/:id/resolve
 * Resolve a report with an action
 */
router.post("/reports/:id/resolve", auth, requireAdmin, async (req, res) => {
    try {
        const { action, reason, type } = req.body;
        // action: "dismiss" | "warn" | "delete" | "ban"
        // type: "post" | "user" | "stream"

        const reportId = req.params.id;
        let resolved = false;
        let targetType = type;

        // Try to find and resolve in posts
        if (!resolved && Post && (!type || type === "post")) {
            const post = await Post.findById(reportId);
            if (post) {
                targetType = "post";
                if (action === "delete") {
                    await Post.findByIdAndDelete(reportId);
                    resolved = true;
                } else {
                    post.isReported = false;
                    post.reportStatus = "resolved";
                    post.resolvedBy = req.user._id;
                    post.resolvedAt = new Date();
                    post.resolutionAction = action;
                    post.resolutionReason = reason;
                    await post.save();
                    resolved = true;
                }
            }
        }

        // Try to find and resolve in users
        if (!resolved && (!type || type === "user")) {
            const user = await User.findById(reportId);
            if (user) {
                targetType = "user";
                user.isReported = false;
                user.reportStatus = "resolved";
                user.resolvedBy = req.user._id;
                user.resolvedAt = new Date();

                if (action === "ban") {
                    user.isBanned = true;
                    user.banReason = reason || "Violation of community guidelines";
                    user.bannedAt = new Date();

                    // End active streams
                    if (Stream) {
                        await Stream.updateMany(
                            { streamerId: user._id, isLive: true },
                            { isLive: false, status: "ended", endedAt: new Date() }
                        );
                    }
                } else if (action === "warn" && user.addNotification) {
                    await user.addNotification({
                        message: `Warning: ${reason || "Your account has received a warning for violating community guidelines."}`,
                        type: "warning",
                        icon: "⚠️"
                    });
                }

                await user.save();
                resolved = true;
            }
        }

        // Try to find and resolve in streams
        if (!resolved && Stream && (!type || type === "stream")) {
            const stream = await Stream.findById(reportId);
            if (stream) {
                targetType = "stream";
                if (action === "delete" || action === "end") {
                    stream.isLive = false;
                    stream.status = "ended";
                    stream.endedAt = new Date();
                    stream.endedReason = reason || "Ended by admin due to report";

                    // Update streamer status
                    await User.findByIdAndUpdate(stream.streamerId, {
                        isLive: false,
                        currentStreamId: null
                    });
                }

                stream.isReported = false;
                stream.reportStatus = "resolved";
                stream.resolvedBy = req.user._id;
                stream.resolvedAt = new Date();
                await stream.save();
                resolved = true;
            }
        }

        if (!resolved) {
            return res.status(404).json({
                success: false,
                error: "Report not found"
            });
        }

        console.log(`✅ Report ${reportId} (${targetType}) resolved with action: ${action} by ${req.user.username}`);

        res.json({
            success: true,
            message: `Report resolved with action: ${action}`,
            action,
            type: targetType
        });
    } catch (err) {
        console.error("❌ Error resolving report:", err);
        res.status(500).json({
            success: false,
            error: "Failed to resolve report"
        });
    }
});

/**
 * DELETE /api/admin/reports/:id
 * Dismiss/delete a report without action
 */
router.delete("/reports/:id", auth, requireAdmin, async (req, res) => {
    try {
        const reportId = req.params.id;
        let dismissed = false;

        // Try posts
        if (Post) {
            const post = await Post.findByIdAndUpdate(reportId, {
                isReported: false,
                reportStatus: "dismissed",
                resolvedBy: req.user._id,
                resolvedAt: new Date()
            });
            if (post) dismissed = true;
        }

        // Try users
        if (!dismissed) {
            const user = await User.findByIdAndUpdate(reportId, {
                isReported: false,
                reportStatus: "dismissed",
                resolvedBy: req.user._id,
                resolvedAt: new Date()
            });
            if (user) dismissed = true;
        }

        // Try streams
        if (!dismissed && Stream) {
            const stream = await Stream.findByIdAndUpdate(reportId, {
                isReported: false,
                reportStatus: "dismissed",
                resolvedBy: req.user._id,
                resolvedAt: new Date()
            });
            if (stream) dismissed = true;
        }

        if (!dismissed) {
            return res.status(404).json({
                success: false,
                error: "Report not found"
            });
        }

        console.log(`🗑️ Report ${reportId} dismissed by ${req.user.username}`);

        res.json({
            success: true,
            message: "Report dismissed"
        });
    } catch (err) {
        console.error("❌ Error dismissing report:", err);
        res.status(500).json({
            success: false,
            error: "Failed to dismiss report"
        });
    }
});

// ===========================================
// REVENUE & TRANSACTIONS
// ===========================================

/**
 * GET /api/admin/revenue
 * Get revenue statistics (aligned with AdminDashboard.jsx U.E.)
 */
router.get("/revenue", auth, requireAdmin, async (req, res) => {
    try {
        const today = startOfToday();
        const thisWeek = startOfWeek();
        const thisMonth = startOfMonth();

        // Get platform wallet stats (if available)
        let platformStats = null;
        try {
            if (PlatformWallet) {
                platformStats = await PlatformWallet.getDashboardStats();
            }
        } catch (err) {
            console.log("PlatformWallet not available");
        }

        // Fallback: calculate from user transactions
        let totalRevenue = 0;
        let revenueToday = 0;
        let revenueThisWeek = 0;
        let revenueThisMonth = 0;
        const recentTransactions = [];

        if (!platformStats) {
            const allUsers = await User.find({})
                .select("username avatar wallet.transactions")
                .lean();

            for (const user of allUsers) {
                const txs = user.wallet?.transactions || [];
                for (const tx of txs) {
                    // Only count income transactions
                    if (!["topup", "purchase"].includes(tx.type)) continue;

                    const amount = Math.abs(tx.amount || 0);
                    const createdAt = tx.createdAt ? new Date(tx.createdAt) : null;

                    totalRevenue += amount;

                    if (createdAt) {
                        if (createdAt >= today) revenueToday += amount;
                        if (createdAt >= thisWeek) revenueThisWeek += amount;
                        if (createdAt >= thisMonth) revenueThisMonth += amount;

                        recentTransactions.push({
                            username: user.username,
                            avatar: user.avatar,
                            type: tx.type,
                            amount,
                            description: tx.description,
                            date: createdAt,
                        });
                    }
                }
            }

            recentTransactions.sort((a, b) => b.date - a.date);
        }

        // Revenue by day (last 30 days) via Gifts as proxy (15% fee)
        const revenueByDay = [];
        for (let i = 29; i >= 0; i--) {
            const day = new Date();
            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - i);

            const nextDay = new Date(day);
            nextDay.setDate(day.getDate() + 1);


            const dayRevenue = await safeSum(Gift, "amount", {
                createdAt: { $gte: day, $lt: nextDay }
            }) * 0.15; // 15% platform fee

            revenueByDay.push({
                date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                revenue: Math.round(dayRevenue)
            });
        }

        // Build final revenue object
        const revenueFromPlatform = platformStats
            ? {
                total: platformStats.lifetime?.totalRevenue || 0,
                today: platformStats.today?.revenue || 0,
                thisWeek: platformStats.thisWeek?.revenue || 0,
                thisMonth: platformStats.thisMonth?.revenue || 0,
                balance: platformStats.balance || 0
            }
            : {
                total: totalRevenue,
                today: revenueToday,
                thisWeek: revenueThisWeek,
                thisMonth: revenueThisMonth,
                balance: 0
            };

        // growth vs vorige week (met Gifts als fallback)
        const previousWeekStart = new Date(thisWeek);
        previousWeekStart.setDate(thisWeek.getDate() - 7);

        const previousWeekRevenueGifts = await safeSum(Gift, "amount", {
            createdAt: { $gte: previousWeekStart, $lt: thisWeek }
        }) * 0.15;

        const currentWeekRevenue =
            platformStats?.thisWeek?.revenue || revenueFromPlatform.thisWeek || 0;

        let revenueGrowthPercent = 0;
        if (previousWeekRevenueGifts > 0) {
            revenueGrowthPercent = Math.round(
                ((currentWeekRevenue - previousWeekRevenueGifts) /
                    previousWeekRevenueGifts) * 100
            );
        } else if (currentWeekRevenue > 0) {
            revenueGrowthPercent = 100;
        }

        const revenuePayload = {
            totalRevenue: revenueFromPlatform.total,
            revenueToday: revenueFromPlatform.today,
            revenueThisWeek: revenueFromPlatform.thisWeek,
            revenueThisMonth: revenueFromPlatform.thisMonth,
            balance: revenueFromPlatform.balance,
            revenueGrowthPercent,
            recentTransactions: platformStats ? [] : recentTransactions.slice(0, 50),
            chart: revenueByDay
        };

        res.json({
            success: true,
            ...revenuePayload,
            // ook legacy veld
            revenue: revenuePayload
        });
    } catch (err) {
        console.error("❌ Error in /admin/revenue:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load revenue"
        });
    }
});

// ===========================================
// CONTENT MANAGEMENT
// ===========================================

/**
 * GET /api/admin/posts
 * Get all posts with filters
 */
router.get("/posts", auth, requireAdmin, async (req, res) => {
    try {
        if (!Post) {
            return res.json({ success: true, posts: [], total: 0 });
        }

        const { page = 1, limit = 50, status, type, reported } = req.query;

        const query = {};
        if (status) query.status = status;
        if (type) query.type = type;
        if (reported === "true") query.isReported = true;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [posts, total] = await Promise.all([
            Post.find(query)
                .populate("userId", "username avatar")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Post.countDocuments(query)
        ]);

        res.json({
            success: true,
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error("❌ Error getting posts:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load posts"
        });
    }
});

/**
 * DELETE /api/admin/posts/:postId
 * Delete a post
 */
router.delete("/posts/:postId", auth, requireAdmin, async (req, res) => {
    try {
        if (!Post) {
            return res.status(404).json({
                success: false,
                error: "Posts not available"
            });
        }

        const post = await Post.findByIdAndDelete(req.params.postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: "Post not found"
            });
        }

        console.log(`🗑️ Post ${post._id} deleted by admin ${req.user.username}`);

        res.json({
            success: true,
            message: "Post deleted"
        });
    } catch (err) {
        console.error("❌ Error deleting post:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete post"
        });
    }
});

/**
 * POST /api/admin/posts/:postId/feature
 * Feature a post
 */
router.post("/posts/:postId/feature", auth, requireAdmin, async (req, res) => {
    try {
        const { duration = 24 } = req.body; // hours

        const post = await Post.findByIdAndUpdate(
            req.params.postId,
            {
                isFeatured: true,
                featuredUntil: new Date(Date.now() + duration * 60 * 60 * 1000)
            },
            { new: true }
        );

        if (!post) {
            return res.status(404).json({
                success: false,
                error: "Post not found"
            });
        }

        res.json({ success: true, post });
    } catch (err) {
        console.error("❌ Error featuring post:", err);
        res.status(500).json({
            success: false,
            error: "Failed to feature post"
        });
    }
});

// ===========================================
// STREAMS MANAGEMENT
// ===========================================

/**
 * GET /api/admin/streams
 * Get all streams
 */
router.get("/streams", auth, requireAdmin, async (req, res) => {
    try {
        if (!Stream) {
            return res.json({ success: true, streams: [], total: 0 });
        }

        const { page = 1, limit = 50, live } = req.query;

        const query = {};
        if (live === "true") query.isLive = true;
        if (live === "false") query.isLive = false;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [streams, total] = await Promise.all([
            Stream.find(query)
                .populate("streamerId", "username avatar")
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
        console.error("❌ Error getting streams:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load streams"
        });
    }
});

/**
 * POST /api/admin/streams/:streamId/end
 * Force end a stream
 */
router.post("/streams/:streamId/end", auth, requireAdmin, async (req, res) => {
    try {
        const stream = await Stream.findByIdAndUpdate(
            req.params.streamId,
            {
                isLive: false,
                status: "ended",
                endedAt: new Date()
            },
            { new: true }
        );

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found"
            });
        }

        // Update user's live status
        await User.findByIdAndUpdate(stream.streamerId, {
            isLive: false,
            currentStreamId: null
        });

        console.log(`⏹️ Stream ${stream._id} force-ended by admin ${req.user.username}`);

        res.json({ success: true, stream });
    } catch (err) {
        console.error("❌ Error ending stream:", err);
        res.status(500).json({
            success: false,
            error: "Failed to end stream"
        });
    }
});

/**
 * POST /api/admin/stop-stream/:streamId
 * Alias route for AdminDashboard.jsx (stopStream)
 */
router.post("/stop-stream/:streamId", auth, requireAdmin, async (req, res) => {
    try {
        const stream = await Stream.findByIdAndUpdate(
            req.params.streamId,
            {
                isLive: false,
                status: "ended",
                endedAt: new Date()
            },
            { new: true }
        );

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: "Stream not found"
            });
        }

        // Update user's live status
        await User.findByIdAndUpdate(stream.streamerId, {
            isLive: false,
            currentStreamId: null
        });

        console.log(`⏹️ Stream ${stream._id} stopped by admin ${req.user.username} (alias route)`);

        res.json({ success: true, stream });
    } catch (err) {
        console.error("❌ Error in /stop-stream:", err);
        res.status(500).json({
            success: false,
            error: "Failed to stop stream"
        });
    }
});

// ===========================================
// SYSTEM
// ===========================================

/**
 * GET /api/admin/system
 * Get system information
 */
router.get("/system", auth, requireAdmin, async (req, res) => {
    try {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();

        res.json({
            success: true,
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                uptime: {
                    seconds: Math.floor(uptime),
                    formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
                },
                memory: {
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
                    rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB"
                },
                env: process.env.NODE_ENV || "development"
            }
        });
    } catch (err) {
        console.error("❌ Error getting system info:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get system info"
        });
    }
});

/**
 * POST /api/admin/announcement
 * Send announcement (used by AdminDashboard AnnouncementModal)
 */
router.post("/announcement", auth, requireAdmin, async (req, res) => {
    try {
        const { title, message, type = "info" } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                error: "Title and message are required"
            });
        }

        const fullMessage = `${title} — ${message}`;

        let processed = 0;
        const cursor = User.find({}).cursor();

        for await (const user of cursor) {
            user.notifications.unshift({
                message: fullMessage,
                type,
                createdAt: new Date()
            });
            user.unreadNotifications += 1;
            await user.save();
            processed++;
        }

        console.log(`📢 Announcement "${title}" sent to ${processed} users by ${req.user.username}`);

        res.json({
            success: true,
            message: `Announcement sent to ${processed} users`
        });
    } catch (err) {
        console.error("❌ Error sending announcement:", err);
        res.status(500).json({
            success: false,
            error: "Failed to send announcement"
        });
    }
});

/**
 * POST /api/admin/broadcast
 * Send system notification to all users (legacy generic)
 */
router.post("/broadcast", auth, requireAdmin, async (req, res) => {
    try {
        const { message, type = "system" } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Message is required"
            });
        }

        // Add notification to all users (in batches)

        let processed = 0;
        const cursor = User.find({}).cursor();

        for await (const user of cursor) {
            user.notifications.unshift({
                message,
                type,
                createdAt: new Date()
            });
            user.unreadNotifications += 1;
            await user.save();
            processed++;
        }

        console.log(`📢 Broadcast sent to ${processed} users by ${req.user.username}`);

        res.json({
            success: true,
            message: `Notification sent to ${processed} users`
        });
    } catch (err) {
        console.error("❌ Error broadcasting:", err);
        res.status(500).json({
            success: false,
            error: "Failed to broadcast"
        });
    }
});

module.exports = router;
