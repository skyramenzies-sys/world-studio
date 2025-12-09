// backend/routes/users.js
// World-Studio.live - Users Routes (UNIVERSE EDITION 🌌)

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const auth = authMiddleware; // alias voor oude code
const checkBan = require("../middleware/checkBan");
const User = require("../models/User");

// ---------------------------------------------
// Helpers
// ---------------------------------------------
const getCurrentUserId = (req) => {
    if (req.user && (req.user.id || req.user._id)) {
        return req.user.id || req.user._id;
    }
    return req.userId;
};

const toPublicProfile = (user) =>
    user.toPublicProfile
        ? user.toPublicProfile()
        : {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            coverImage: user.coverImage,
            bio: user.bio,
            isVerified: user.isVerified,
            verificationBadge: user.verificationBadge,
            isLive: user.isLive,
            currentStreamId: user.currentStreamId,
            followersCount: user.followersCount || 0,
            followingCount: user.followingCount || 0,
            socialLinks: user.socialLinks || {},
            createdAt: user.createdAt,
        };

// ---------------------------------------------
// CURRENT USER
// ---------------------------------------------

// GET /api/users/me  -> eigen profiel
router.get("/me", auth, checkBan, async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        if (!currentUserId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await User.findById(currentUserId);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            success: true,
            user: toPublicProfile(user),
        });
    } catch (err) {
        console.error("GET /users/me error:", err);
        res.status(500).json({ error: "Failed to load profile" });
    }
});

// shared handler voor profile update (meerdere routes kunnen deze gebruiken)
const handleProfileUpdate = async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        if (!currentUserId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await User.findById(currentUserId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const {
            username,
            displayName,
            bio,
            location,
            website,
            avatar,
            coverImage,
            socialLinks,
        } = req.body || {};

        if (username) user.username = username.trim();
        if (displayName !== undefined) user.displayName = displayName;
        if (bio !== undefined) user.bio = bio;
        if (location !== undefined) user.location = location;
        if (website !== undefined) user.website = website;
        if (avatar !== undefined) user.avatar = avatar;
        if (coverImage !== undefined) user.coverImage = coverImage;

        if (socialLinks && typeof socialLinks === "object") {
            user.socialLinks = {
                ...(user.socialLinks || {}),
                ...socialLinks,
            };
        }

        await user.save();

        res.json({
            success: true,
            message: "Profile updated",
            user: toPublicProfile(user),
        });
    } catch (err) {
        console.error("UPDATE profile error:", err);
        if (err.code === 11000 && err.keyPattern?.username) {
            return res.status(400).json({ error: "Username already taken" });
        }
        res.status(500).json({ error: "Failed to update profile" });
    }
};

// Aliassen zodat ALLE oude front-end endpoints werken:
// PUT /api/users/me
router.put("/me", auth, checkBan, handleProfileUpdate);
// PUT /api/users/profile
router.put("/profile", auth, checkBan, handleProfileUpdate);
// PATCH /api/users/profile
router.patch("/profile", auth, checkBan, handleProfileUpdate);

// ---------------------------------------------
// FOLLOW / UNFOLLOW
// ---------------------------------------------

// core follow-logica
const followUser = async (currentUserId, targetId) => {
    if (!currentUserId) {
        const err = new Error("Not authenticated");
        err.statusCode = 401;
        throw err;
    }

    if (currentUserId.toString() === targetId.toString()) {
        throw new Error("You cannot follow yourself");
    }

    const [me, target] = await Promise.all([
        User.findById(currentUserId),
        User.findById(targetId),
    ]);

    if (!me || !target) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
    }

    const alreadyFollowing = me.following.some(
        (id) => id.toString() === target._id.toString()
    );

    if (!alreadyFollowing) {
        me.following.push(target._id);
        target.followers.push(me._id);
    }

    me.followingCount = me.following.length;
    target.followersCount = target.followers.length;

    await Promise.all([me.save(), target.save()]);

    // Probeer notificatie, maar breek niet bij fout
    try {
        if (target.addNotification) {
            await target.addNotification({
                type: "follow",
                fromUser: me._id,
                fromUsername: me.username,
                fromAvatar: me.avatar,
                message: `${me.username} started following you`,
            });
        }
    } catch (e) {
        console.log("Follow notification error:", e.message);
    }

    return { me, target, alreadyFollowing };
};

const unfollowUser = async (currentUserId, targetId) => {
    if (!currentUserId) {
        const err = new Error("Not authenticated");
        err.statusCode = 401;
        throw err;
    }

    const [me, target] = await Promise.all([
        User.findById(currentUserId),
        User.findById(targetId),
    ]);

    if (!me || !target) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
    }

    me.following = me.following.filter(
        (id) => id.toString() !== target._id.toString()
    );
    target.followers = target.followers.filter(
        (id) => id.toString() !== me._id.toString()
    );

    me.followingCount = me.following.length;
    target.followersCount = target.followers.length;

    await Promise.all([me.save(), target.save()]);

    return { me, target };
};

// POST /api/users/:id/follow
router.post("/:id/follow", auth, checkBan, async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const { me, target, alreadyFollowing } = await followUser(
            currentUserId,
            req.params.id
        );

        res.json({
            success: true,
            following: true,
            alreadyFollowing,
            me: {
                _id: me._id,


                followingCount: me.followingCount,
            },
            target: {
                _id: target._id,
                followersCount: target.followersCount,
            },
        });
    } catch (err) {
        console.error("POST /users/:id/follow error:", err);
        res
            .status(err.statusCode || 500)
            .json({ error: err.message || "Failed to follow user" });
    }
});

// POST /api/users/:id/unfollow
router.post("/:id/unfollow", auth, checkBan, async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const { me, target } = await unfollowUser(currentUserId, req.params.id);

        res.json({
            success: true,
            following: false,
            me: {
                _id: me._id,
                followingCount: me.followingCount,
            },
            target: {
                _id: target._id,
                followersCount: target.followersCount,
            },
        });
    } catch (err) {
        console.error("POST /users/:id/unfollow error:", err);
        res
            .status(err.statusCode || 500)
            .json({ error: err.message || "Failed to unfollow user" });
    }
});

// Extra: oude front-end varianten
// POST /api/users/follow  body: { targetUserId }
router.post("/follow", auth, checkBan, async (req, res) => {
    const targetId = req.body.targetUserId || req.body.userId;
    if (!targetId) {
        return res.status(400).json({ error: "targetUserId is required" });
    }
    try {
        const currentUserId = getCurrentUserId(req);
        const { me, target, alreadyFollowing } = await followUser(
            currentUserId,
            targetId
        );
        res.json({
            success: true,
            following: true,
            alreadyFollowing,
            me: {
                _id: me._id,


                followingCount: me.followingCount,
            },
            target: {
                _id: target._id,
                followersCount: target.followersCount,
            },
        });
    } catch (err) {
        console.error("POST /users/follow error:", err);
        res
            .status(err.statusCode || 500)
            .json({ error: err.message || "Failed to follow user" });
    }
});

// POST /api/users/unfollow  body: { targetUserId }
router.post("/unfollow", auth, checkBan, async (req, res) => {
    const targetId = req.body.targetUserId || req.body.userId;
    if (!targetId) {
        return res.status(400).json({ error: "targetUserId is required" });
    }
    try {
        const currentUserId = getCurrentUserId(req);
        const { me, target } = await unfollowUser(currentUserId, targetId);
        res.json({
            success: true,
            following: false,
            me: {
                _id: me._id,


                followingCount: me.followingCount,
            },
            target: {
                _id: target._id,
                followersCount: target.followersCount,
            },
        });
    } catch (err) {
        console.error("POST /users/unfollow error:", err);
        res
            .status(err.statusCode || 500)
            .json({ error: err.message || "Failed to unfollow user" });
    }
});

// ---------------------------------------------
// FOLLOWER / FOLLOWING LIJSTEN
// ---------------------------------------------

// GET /api/users/:id/followers
router.get("/:id/followers", auth, checkBan, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate(
            "followers",
            "username displayName avatar isVerified followersCount"
        );
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            success: true,
            count: user.followers.length,
            followers: user.followers,
        });
    } catch (err) {
        console.error("GET /users/:id/followers error:", err);
        res.status(500).json({ error: "Failed to load followers" });
    }
});

// GET /api/users/:id/following
router.get("/:id/following", auth, checkBan, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate(
            "following",
            "username displayName avatar isVerified followersCount"
        );
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            success: true,
            count: user.following.length,
            following: user.following,
        });
    } catch (err) {
        console.error("GET /users/:id/following error:", err);
        res.status(500).json({ error: "Failed to load following" });
    }
});

// Handige alias voor frontend: eigen followers/following
router.get("/me/followers", auth, checkBan, (req, res) => {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    return res.redirect(`/api/users/${currentUserId}/followers`);
});

router.get("/me/following", auth, checkBan, (req, res) => {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    return res.redirect(`/api/users/${currentUserId}/following`);
});

// ---------------------------------------------
// DISCOVER / SEARCH
// ---------------------------------------------

// GET /api/users/discover  (suggested creators)
router.get("/discover", auth, checkBan, async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const limit = parseInt(req.query.limit || "20", 10);
        const users = await User.getSuggested(currentUserId, limit);
        res.json({ success: true, users });
    } catch (err) {
        console.error("GET /users/discover error:", err);
    }
});
// GET /api/users/suggested
router.get("/suggested", auth, checkBan, async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const limit = parseInt(req.query.limit || "20", 10);
        const users = await User.getSuggested(currentUserId, limit);
        res.json({ success: true, users });
    } catch (err) {
        console.error("GET /users/suggested error:", err);
        res.status(500).json({ error: "Failed to load suggestions" });
    }
});

// GET /api/users/notifications
router.get("/notifications", auth, checkBan, async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const user = await User.findById(currentUserId).select("notifications unreadNotifications");
        res.json({
            success: true,
            notifications: user?.notifications || [],
            unreadCount: user?.unreadNotifications || 0
        });
    } catch (err) {
        console.error("GET /users/notifications error:", err);
        res.status(500).json({ error: "Failed to load notifications" });
    }
});

// /:id route MOET LAATST ZIJN
// /:id route MOET LAATST ZIJN
router.get("/:id", auth, checkBan, async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const userId = req.params.id === "me" ? currentUserId : req.params.id;

        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            success: true,
            user: toPublicProfile(user),
        });
    } catch (err) {
        console.error("GET /users/:id error:", err);
        res.status(500).json({ error: "Failed to load user" });
    }
});



// GET /api/users/search?q=...
router.get("/search", auth, checkBan, async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q) return res.json({ success: true, users: [] });

        const limit = parseInt(req.query.limit || "20", 10);
        const users = await User.searchUsers(q, { limit });

        res.json({ success: true, users });
    } catch (err) {
        console.error("GET /users/search error:", err);
        res.status(500).json({ error: "Failed to search users" });
    }
});

// ---------------------------------------------
// SINGLE USER PROFIEL (laatste, na alle andere)
// ---------------------------------------------

// GET /api/users/:id
router.get("/:id", auth, checkBan, async (req, res) => {
    try {
        const currentUserId = getCurrentUserId(req);
        const userId = req.params.id === "me" ? currentUserId : req.params.id;

        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            success: true,
            user: toPublicProfile(user),
        });
    } catch (err) {
        console.error("GET /users/:id error:", err);
        res.status(500).json({ error: "Failed to load user" });
    }
});


module.exports = router;
