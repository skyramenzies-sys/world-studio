// backend/routes/users.js
// World-Studio.live - User Routes
// Handles user profiles, follows, notifications, search, and user management

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");
const { upload } = require("../config/cloudinary");

// ===========================================
// HELPER FUNCTIONS
// ===========================================

const safeId = (id) => {
    if (!id) return null;
    return mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : null;
};

const formatUserPublic = (user, currentUserId = null) => {
    if (!user) return null;
    const userObj = user.toObject ? user.toObject() : user;

    return {
        _id: userObj._id,
        id: userObj._id,
        username: userObj.username,
        avatar: userObj.avatar || "/defaults/default-avatar.png",
        coverImage: userObj.coverImage || "/defaults/default-cover.jpg",
        bio: userObj.bio || "",
        isVerified: userObj.isVerified || false,
        isLive: userObj.isLive || false,
        currentStreamId: userObj.currentStreamId,
        role: userObj.role || "user",
        followersCount: userObj.followers?.length || userObj.followersCount || 0,
        followingCount: userObj.following?.length || userObj.followingCount || 0,
        postsCount: userObj.stats?.totalPosts || 0,
        isFollowing: currentUserId ?
            userObj.followers?.some(id => id.toString() === currentUserId.toString()) : false,
        socialLinks: userObj.socialLinks || {},
        location: userObj.location || "",
        website: userObj.website || "",
        joinedAt: userObj.createdAt,
        lastActive: userObj.lastActive,
        badges: userObj.badges || [],
        stats: {
            totalPosts: userObj.stats?.totalPosts || 0,
            totalLikes: userObj.stats?.totalLikes || 0,
            totalViews: userObj.stats?.totalViews || 0,
            totalStreams: userObj.stats?.totalStreams || 0
        }
    };
};

// ===========================================
// SEARCH ROUTES
// ===========================================

/**
 * GET /api/users
 * Search users
 */
router.get("/", async (req, res) => {
    try {
        const { q = "", page = 1, limit = 20, sortBy = "followers", verified, live } = req.query;

        const query = {};
        if (q) {
            query.$or = [
                { username: { $regex: q, $options: "i" } },
                { bio: { $regex: q, $options: "i" } }
            ];
        }
        if (verified === "true") query.isVerified = true;
        if (live === "true") query.isLive = true;

        const sortOptions = {
            followers: { followersCount: -1, createdAt: -1 },
            recent: { createdAt: -1 },
            active: { lastActive: -1 },
            username: { username: 1 }
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            User.find(query)
                .select("-password -wallet -notifications -blockedUsers")
                .sort(sortOptions[sortBy] || sortOptions.followers)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            User.countDocuments(query)
        ]);

        res.json({
            success: true,
            users: users.map(u => formatUserPublic(u)),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error("❌ Search users error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/users/suggested
 */
router.get("/suggested", authMiddleware, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const me = await User.findById(req.userId).select("following blockedUsers");

        if (!me) return res.status(404).json({ success: false, error: "User not found" });

        const excludeIds = [me._id, ...(me.following || []), ...(me.blockedUsers || [])];

        const suggestions = await User.find({ _id: { $nin: excludeIds } })
            .select("-password -wallet -notifications -blockedUsers")
            .sort({ isVerified: -1, followersCount: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            suggestions: suggestions.map(u => formatUserPublic(u, req.userId)),
            count: suggestions.length
        });
    } catch (err) {
        console.error("❌ Suggested users error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/users/live
 */
router.get("/live", async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const liveUsers = await User.find({ isLive: true })
            .select("-password -wallet -notifications -blockedUsers")
            .sort({ followersCount: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            users: liveUsers.map(u => formatUserPublic(u)),
            count: liveUsers.length
        });
    } catch (err) {
        console.error("❌ Live users error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/users/top
 */
router.get("/top", async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const topUsers = await User.find({ isVerified: true })
            .select("-password -wallet -notifications -blockedUsers")
            .sort({ "wallet.totalReceived": -1, followersCount: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            users: topUsers.map((u, i) => ({ ...formatUserPublic(u), rank: i + 1 })),
            count: topUsers.length
        });
    } catch (err) {
        console.error("❌ Top users error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// NOTIFICATION ROUTES
// ===========================================

/**
 * GET /api/users/notifications
 */
router.get("/notifications", authMiddleware, async (req, res) => {
    try {
        const { limit = 50, unreadOnly = false } = req.query;
        const user = await User.findById(req.userId).select("notifications unreadNotifications");

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        let notifications = user.notifications || [];
        if (unreadOnly === "true") notifications = notifications.filter(n => !n.read);
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        notifications = notifications.slice(0, parseInt(limit));

        res.json({
            success: true,
            notifications,
            unreadCount: user.unreadNotifications || notifications.filter(n => !n.read).length,
            total: user.notifications?.length || 0
        });
    } catch (err) {
        console.error("❌ Get notifications error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/users/notifications/read-all
 */
router.post("/notifications/read-all", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        if (user.notifications?.length > 0) {
            user.notifications = user.notifications.map(n => ({
                ...(n.toObject ? n.toObject() : n),
                read: true
            }));
            user.unreadNotifications = 0;
            await user.save();
        }

        res.json({ success: true, message: "All notifications marked as read" });
    } catch (err) {
        console.error("❌ Mark all read error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/users/notifications/:notificationId/read
 */
router.post("/notifications/:notificationId/read", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const notification = user.notifications?.id(req.params.notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            user.unreadNotifications = Math.max(0, (user.unreadNotifications || 0) - 1);
            await user.save();
        }

        res.json({ success: true });
    } catch (err) {
        console.error("❌ Mark single read error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/users/notifications
 */
router.delete("/notifications", authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userId, { notifications: [], unreadNotifications: 0 });
        res.json({ success: true, message: "All notifications cleared" });
    } catch (err) {
        console.error("❌ Clear notifications error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// PROFILE ROUTES
// ===========================================

/**
 * GET /api/users/me
 */
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password").lean();
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        res.json({
            success: true,
            user: {
                ...user,
                followersCount: user.followers?.length || 0,
                followingCount: user.following?.length || 0,
                unreadNotifications: user.unreadNotifications || user.notifications?.filter(n => !n.read).length || 0
            }
        });
    } catch (err) {
        console.error("❌ Get me error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/users/:id
 */
router.get("/:id", async (req, res) => {
    try {
        let user;

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            user = await User.findOne({ username: { $regex: new RegExp(`^${req.params.id}$`, "i") } })
                .select("-password -wallet -notifications -blockedUsers")
                .lean();
        } else {
            user = await User.findById(req.params.id)
                .select("-password -wallet -notifications -blockedUsers")
                .lean();
        }

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        let currentUserId = null;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            try {
                const jwt = require("jsonwebtoken");
                const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
                currentUserId = decoded.userId || decoded.id;
            } catch (e) { }
        }

        res.json({ success: true, user: formatUserPublic(user, currentUserId) });
    } catch (err) {
        console.error("❌ Get user error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/users/:id/posts
 */
router.get("/:id/posts", async (req, res) => {
    try {
        const { limit = 20, skip = 0, type } = req.query;
        const userId = safeId(req.params.id);
        if (!userId) return res.status(400).json({ success: false, error: "Invalid user ID" });

        const query = { userId, status: { $ne: "deleted" }, visibility: "public" };
        if (type && type !== "all") query.type = type;

        const [posts, total] = await Promise.all([
            Post.find(query).sort({ createdAt: -1 }).skip(parseInt(skip)).limit(parseInt(limit)).lean(),
            Post.countDocuments(query)
        ]);

        res.json({
            success: true,
            posts,
            pagination: { total, limit: parseInt(limit), skip: parseInt(skip), hasMore: parseInt(skip) + posts.length < total }
        });
    } catch (err) {
        console.error("❌ Get user posts error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/users/:id
 */
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        if (req.userId.toString() !== req.params.id) {
            const user = await User.findById(req.userId);
            if (user?.role !== "admin") {
                return res.status(403).json({ success: false, error: "Not authorized" });
            }
        }

        const { username, bio, avatar, coverImage, location, website, socialLinks, displayName } = req.body;
        const updates = {};

        if (username) {
            const existing = await User.findOne({
                username: { $regex: new RegExp(`^${username}$`, "i") },
                _id: { $ne: req.params.id }
            });
            if (existing) return res.status(400).json({ success: false, error: "Username taken" });
            if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
                return res.status(400).json({ success: false, error: "Invalid username format" });
            }
            updates.username = username;
        }

        if (bio !== undefined) updates.bio = bio.substring(0, 500);
        if (avatar) updates.avatar = avatar;
        if (coverImage) updates.coverImage = coverImage;
        if (location !== undefined) updates.location = location.substring(0, 100);
        if (website !== undefined) updates.website = website.substring(0, 200);
        if (displayName !== undefined) updates.displayName = displayName.substring(0, 50);
        if (socialLinks) {
            updates.socialLinks = {
                twitter: socialLinks.twitter?.substring(0, 100) || "",
                instagram: socialLinks.instagram?.substring(0, 100) || "",
                youtube: socialLinks.youtube?.substring(0, 100) || "",
                tiktok: socialLinks.tiktok?.substring(0, 100) || "",
                discord: socialLinks.discord?.substring(0, 100) || ""
            };
        }

        updates.updatedAt = new Date();

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
            .select("-password -wallet -notifications");

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        res.json({ success: true, message: "Profile updated", user: formatUserPublic(user) });
    } catch (err) {
        console.error("❌ Update profile error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// AVATAR & COVER
// ===========================================

/**
 * POST /api/users/avatar
 */
router.post("/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

        const user = await User.findByIdAndUpdate(
            req.userId,
            { avatar: req.file.path, avatarPublicId: req.file.filename },
            { new: true }
        ).select("-password -wallet -notifications");

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        res.json({ success: true, message: "Avatar updated", avatar: req.file.path, user: formatUserPublic(user) });
    } catch (err) {
        console.error("❌ Avatar upload error:", err);
        res.status(500).json({ success: false, error: "Failed to upload avatar" });
    }
});

/**
 * POST /api/users/cover
 */
router.post("/cover", authMiddleware, upload.single("cover"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

        const user = await User.findByIdAndUpdate(
            req.userId,
            { coverImage: req.file.path, coverPublicId: req.file.filename },
            { new: true }
        ).select("-password -wallet -notifications");

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        res.json({ success: true, message: "Cover updated", coverImage: req.file.path });
    } catch (err) {
        console.error("❌ Cover upload error:", err);
        res.status(500).json({ success: false, error: "Failed to upload cover" });
    }
});

// ===========================================
// FOLLOW ROUTES
// ===========================================

/**
 * POST /api/users/:id/follow
 */
router.post("/:id/follow", authMiddleware, async (req, res) => {
    try {
        const targetId = req.params.id;
        const myId = req.userId.toString();

        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            return res.status(400).json({ success: false, error: "Invalid user ID" });
        }

        if (targetId === myId) {
            return res.status(400).json({ success: false, error: "Cannot follow yourself" });
        }

        const [me, target] = await Promise.all([
            User.findById(req.userId),
            User.findById(targetId)
        ]);

        if (!me || !target) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        if (target.blockedUsers?.some(id => id.toString() === myId)) {
            return res.status(403).json({ success: false, error: "Cannot follow this user" });
        }

        if (!Array.isArray(me.following)) me.following = [];
        if (!Array.isArray(target.followers)) target.followers = [];

        const isFollowing = me.following.some(id => id.toString() === targetId);

        if (isFollowing) {
            me.following = me.following.filter(id => id.toString() !== targetId);
            target.followers = target.followers.filter(id => id.toString() !== myId);
            me.followingCount = Math.max(0, (me.followingCount || 0) - 1);
            target.followersCount = Math.max(0, (target.followersCount || 0) - 1);
        } else {
            me.following.push(new mongoose.Types.ObjectId(targetId));
            target.followers.push(new mongoose.Types.ObjectId(myId));
            me.followingCount = (me.followingCount || 0) + 1;
            target.followersCount = (target.followersCount || 0) + 1;

            target.notifications = target.notifications || [];
            target.notifications.unshift({
                message: `${me.username} started following you`,
                type: "follow",
                fromUser: me._id,
                fromUsername: me.username,
                fromAvatar: me.avatar,
                read: false,
                createdAt: new Date()
            });
            if (target.notifications.length > 100) {
                target.notifications = target.notifications.slice(0, 100);
            }
            target.unreadNotifications = (target.unreadNotifications || 0) + 1;

            const io = req.app.get("io");
            if (io) {
                io.to(`user_${targetId}`).emit("notification", {
                    message: `${me.username} started following you`,
                    type: "follow",
                    fromUser: me._id,
                    fromUsername: me.username,
                    fromAvatar: me.avatar
                });
            }
        }

        await Promise.all([me.save(), target.save()]);

        console.log(`👤 ${me.username} ${isFollowing ? "unfollowed" : "followed"} ${target.username}`);

        res.json({
            success: true,
            isFollowing: !isFollowing,
            followersCount: target.followers.length,
            followingCount: me.following.length
        });
    } catch (err) {
        console.error("❌ Follow error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/users/:id/followers
 */
router.get("/:id/followers", async (req, res) => {
    try {
        const { limit = 20, skip = 0 } = req.query;

        const user = await User.findById(req.params.id)
            .select("followers")
            .populate({
                path: "followers",
                select: "username avatar isVerified followersCount",
                options: { skip: parseInt(skip), limit: parseInt(limit) }
            });

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const total = await User.findById(req.params.id).select("followers");

        res.json({
            success: true,
            followers: user.followers || [],
            pagination: {
                total: total?.followers?.length || 0,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    } catch (err) {
        console.error("❌ Get followers error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/users/:id/following
 */
router.get("/:id/following", async (req, res) => {
    try {
        const { limit = 20, skip = 0 } = req.query;

        const user = await User.findById(req.params.id)
            .select("following")
            .populate({
                path: "following",
                select: "username avatar isVerified followersCount isLive",
                options: { skip: parseInt(skip), limit: parseInt(limit) }
            });

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const total = await User.findById(req.params.id).select("following");

        res.json({
            success: true,
            following: user.following || [],
            pagination: {
                total: total?.following?.length || 0,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    } catch (err) {
        console.error("❌ Get following error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// BLOCK ROUTES
// ===========================================

/**
 * POST /api/users/:id/block
 */
router.post("/:id/block", authMiddleware, async (req, res) => {
    try {
        const targetId = req.params.id;
        const myId = req.userId.toString();

        if (targetId === myId) {
            return res.status(400).json({ success: false, error: "Cannot block yourself" });
        }

        const me = await User.findById(req.userId);
        if (!me) return res.status(404).json({ success: false, error: "User not found" });

        me.blockedUsers = me.blockedUsers || [];
        const isBlocked = me.blockedUsers.some(id => id.toString() === targetId);

        if (isBlocked) {
            me.blockedUsers = me.blockedUsers.filter(id => id.toString() !== targetId);
        } else {
            me.blockedUsers.push(new mongoose.Types.ObjectId(targetId));
            me.following = me.following?.filter(id => id.toString() !== targetId) || [];
            await User.findByIdAndUpdate(targetId, { $pull: { following: me._id } });
        }

        await me.save();

        res.json({ success: true, isBlocked: !isBlocked, message: isBlocked ? "User unblocked" : "User blocked" });
    } catch (err) {
        console.error("❌ Block error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/users/blocked
 */
router.get("/blocked", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("blockedUsers")
            .populate({ path: "blockedUsers", select: "username avatar" });

        res.json({ success: true, blockedUsers: user?.blockedUsers || [] });
    } catch (err) {
        console.error("❌ Get blocked error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// STATS & ACTIVITY
// ===========================================

/**
 * GET /api/users/:id/stats
 */
router.get("/:id/stats", async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select("stats followers following wallet createdAt");

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const postStats = await Post.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.params.id) } },
            {
                $group: {
                    _id: null,
                    totalPosts: { $sum: 1 },
                    totalLikes: { $sum: "$likes" },
                    totalViews: { $sum: "$views" }
                }
            }
        ]);

        res.json({
            success: true,
            stats: {
                followersCount: user.followers?.length || 0,
                followingCount: user.following?.length || 0,
                totalPosts: postStats[0]?.totalPosts || 0,
                totalLikes: postStats[0]?.totalLikes || 0,
                totalViews: postStats[0]?.totalViews || 0,
                totalStreams: user.stats?.totalStreams || 0,
                totalEarned: user.wallet?.totalReceived || 0,
                memberSince: user.createdAt
            }
        });
    } catch (err) {
        console.error("❌ Get stats error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/users/activity
 */
router.post("/activity", authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userId, { lastActive: new Date(), isOnline: true });
        res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (err) {
        console.error("❌ Activity update error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;