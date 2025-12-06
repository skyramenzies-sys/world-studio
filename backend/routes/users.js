// =======================================================
// World-Studio.live - Users Routes (Universe Edition 🚀)
// Engineered for Commander Sandro Menzies
// by AIRPATH
// =======================================================

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post"); // gebruikt voor profiel posts
const auth = require("../middleware/authMiddleware");

// -------------------------------------------
// Helper: maak veilig ObjectId
// -------------------------------------------
const toObjectId = (id) => {
    if (!id) return null;
    return mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : null;
};

// -------------------------------------------
// Helper: public user shape naar frontend
// -------------------------------------------
const toPublicUser = (user) => {
    if (!user) return null;

    const followersCount =
        user.followersCount ??
        (Array.isArray(user.followers) ? user.followers.length : 0);

    const followingCount =
        user.followingCount ??
        (Array.isArray(user.following) ? user.following.length : 0);

    return {
        _id: user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        isVerified: !!user.isVerified,
        followersCount,
        followingCount,
    };
};

// =======================================================
// 1. GET CURRENT USER / PROFILE
// =======================================================

// GET /api/users/me  -> eigen profiel
router.get("/me", auth, async (req, res) => {
    try {
        const meId = req.user.id || req.user._id;
        const user = await User.findById(meId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.json({
            success: true,
            user: toPublicUser(user),
        });
    } catch (err) {
        console.error("❌ GET /users/me error:", err);
        return res.status(500).json({ error: "Failed to load profile" });
    }
});

// PUT /api/users/me  -> profiel updaten
router.put("/me", auth, async (req, res) => {
    try {
        const meId = req.user.id || req.user._id;
        const allowedFields = [
            "displayName",
            "bio",
            "location",
            "website",
            "avatar",
            "banner",
        ];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(meId, updates, {
            new: true,
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.json({
            success: true,
            user: toPublicUser(user),
        });
    } catch (err) {
        console.error("❌ PUT /users/me error:", err);
        return res.status(500).json({ error: "Failed to update profile" });
    }
});

// =======================================================
// 2. PUBLIC PROFILE BY ID
// =======================================================

// GET /api/users/:id  -> publiek profiel
// (LET OP: staat NA /me en andere vaste routes)
router.get("/:id", async (req, res) => {
    try {
        const userId = toObjectId(req.params.id);
        if (!userId) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Posts van deze user (volgens Post-schema: userId)
        let posts = [];
        let postsCount = 0;

        try {
            const query = { userId: user._id, status: { $ne: "deleted" } };
            [posts, postsCount] = await Promise.all([
                Post.find(query)
                    .sort({ createdAt: -1 })
                    .limit(20)
                    .lean(),
                Post.countDocuments(query),
            ]);
        } catch (e) {
            console.log("⚠️ Profile posts query failed:", e.message);
            posts = [];
            postsCount = 0;
        }

        return res.json({
            success: true,
            user: toPublicUser(user),
            stats: {
                postsCount,
            },
            posts,
        });
    } catch (err) {
        console.error("❌ GET /users/:id error:", err);
        return res.status(500).json({ error: "Failed to load user profile" });
    }
});

// =======================================================
// 3. FOLLOW / UNFOLLOW
// =======================================================

// POST /api/users/:id/follow
router.post("/:id/follow", auth, async (req, res) => {
    try {
        const targetId = toObjectId(req.params.id);
        const meId = toObjectId(req.user.id || req.user._id);

        if (!targetId) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        if (String(targetId) === String(meId)) {
            return res
                .status(400)
                .json({ error: "You cannot follow yourself" });
        }

        const [me, target] = await Promise.all([
            User.findById(meId),
            User.findById(targetId),
        ]);

        if (!me || !target) {
            return res.status(404).json({ error: "User not found" });
        }

        // Zorg dat arrays bestaan
        if (!Array.isArray(me.following)) me.following = [];
        if (!Array.isArray(target.followers)) target.followers = [];

        const alreadyFollowing = me.following.some(
            (id) => id.toString() === target._id.toString()
        );

        if (alreadyFollowing) {
            // al aan het volgen → gewoon de state teruggeven
            return res.json({
                success: true,
                alreadyFollowing: true,
                targetUser: toPublicUser(target),
                me: {
                    _id: me._id,
                    followersCount: Array.isArray(me.followers)
                        ? me.followers.length
                        : me.followersCount ?? 0,
                    followingCount: Array.isArray(me.following)
                        ? me.following.length
                        : me.followingCount ?? 0,
                },
            });
        }

        // 1️⃣ voeg target toe aan mijn following
        me.following.push(target._id);
        me.followingCount = me.following.length;

        // 2️⃣ voeg mij toe aan target's followers
        if (
            !target.followers.some(
                (id) => id.toString() === me._id.toString()
            )
        ) {
            target.followers.push(me._id);
        }
        target.followersCount = target.followers.length;

        // 3️⃣ notificatie (inline – geen apart model nodig)
        if (!Array.isArray(target.notifications)) {
            target.notifications = [];
        }

        const notification = {
            message: `${me.username} started following you`,
            type: "follow",
            fromUser: me._id,
            postId: null,
            streamId: null,
            amount: null,
            read: false,
            createdAt: new Date(),
        };

        // nieuwe notificatie bovenaan
        target.notifications.unshift(notification);
        // limiter, bv max 100 notificaties bewaren
        if (target.notifications.length > 100) {
            target.notifications = target.notifications.slice(0, 100);
        }

        // unread counter
        target.unreadNotifications =
            (target.unreadNotifications || 0) + 1;

        await Promise.all([me.save(), target.save()]);

        // 4️⃣ real-time push via Socket.io
        const io = req.app.get("io");
        if (io) {
            io.to(`user_${target._id}`).emit("notification", {
                ...notification,
                userId: target._id,
            });
        }

        return res.json({
            success: true,
            targetUser: toPublicUser(target),
            me: {
                _id: me._id,
                followersCount:
                    Array.isArray(me.followers) && me.followers.length
                        ? me.followers.length
                        : me.followersCount ?? 0,
                followingCount: me.followingCount,
            },
        });
    } catch (err) {
        console.error("❌ FOLLOW ERROR /users/:id/follow:", err);
        return res.status(500).json({ error: "Failed to follow user" });
    }
});

// POST /api/users/:id/unfollow
router.post("/:id/unfollow", auth, async (req, res) => {
    try {
        const targetId = toObjectId(req.params.id);
        const meId = toObjectId(req.user.id || req.user._id);

        if (!targetId) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        if (String(targetId) === String(meId)) {
            return res
                .status(400)
                .json({ error: "You cannot unfollow yourself" });
        }

        const [me, target] = await Promise.all([
            User.findById(meId),
            User.findById(targetId),
        ]);

        if (!me || !target) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!Array.isArray(me.following)) me.following = [];
        if (!Array.isArray(target.followers)) target.followers = [];

        // 1️⃣ verwijder target uit mijn following
        me.following = me.following.filter(
            (id) => id.toString() !== target._id.toString()
        );
        me.followingCount = me.following.length;

        // 2️⃣ verwijder mij uit target's followers
        target.followers = target.followers.filter(
            (id) => id.toString() !== me._id.toString()
        );
        target.followersCount = target.followers.length;

        await Promise.all([me.save(), target.save()]);

        return res.json({
            success: true,
            targetUser: toPublicUser(target),
            me: {
                _id: me._id,
                followersCount:
                    Array.isArray(me.followers) && me.followers.length
                        ? me.followers.length
                        : me.followersCount ?? 0,
                followingCount: me.followingCount,
            },
        });
    } catch (err) {
        console.error("❌ UNFOLLOW ERROR /users/:id/unfollow:", err);
        return res.status(500).json({ error: "Failed to unfollow user" });
    }
});

// =======================================================
// 4. FOLLOWERS / FOLLOWING LISTS
// =======================================================

// GET /api/users/:id/followers
router.get("/:id/followers", async (req, res) => {
    try {
        const userId = toObjectId(req.params.id);
        if (!userId) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const user = await User.findById(userId).populate(
            "followers",
            "username displayName avatar isVerified followers followersCount following followingCount"
        );

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const followers = (user.followers || []).map((u) => toPublicUser(u));

        return res.json({
            success: true,
            count: followers.length,
            followers,
        });
    } catch (err) {
        console.error("❌ GET /users/:id/followers error:", err);
        return res.status(500).json({ error: "Failed to load followers" });
    }
});

// GET /api/users/:id/following
router.get("/:id/following", async (req, res) => {
    try {
        const userId = toObjectId(req.params.id);
        if (!userId) {
            return res.status(400).json({ error: "Invalid user id" });
        }

        const user = await User.findById(userId).populate(
            "following",
            "username displayName avatar isVerified followers followersCount following followingCount"
        );

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const following = (user.following || []).map((u) => toPublicUser(u));

        return res.json({
            success: true,
            count: following.length,
            following,
        });
    } catch (err) {
        console.error("❌ GET /users/:id/following error:", err);
        return res.status(500).json({ error: "Failed to load following" });
    }
});

// =======================================================
// EXPORT
// =======================================================
module.exports = router;
