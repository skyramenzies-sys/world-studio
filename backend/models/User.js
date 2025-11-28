const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");

// Search users
router.get("/", async (req, res) => {
    try {
        const { q = "", page = 1, limit = 10 } = req.query;
        const regex = new RegExp(q, "i");

        const users = await User.find({ username: regex })
            .select("-password")
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await User.countDocuments({ username: regex });

        res.json({
            users,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Suggested
router.get("/suggested", authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const me = await User.findById(req.userId);

        if (!me) return res.status(404).json({ error: "Current user not found" });

        const excludeIds = [me._id, ...me.following];

        const suggestions = await User.find({ _id: { $nin: excludeIds } })
            .select("-password")
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments({ _id: { $nin: excludeIds } });

        res.json({
            suggestions,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload avatar
router.post("/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const avatarUrl = req.file.path;

        // Update user's avatar in database
        const user = await User.findByIdAndUpdate(
            req.userId,
            { avatar: avatarUrl },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            message: "Avatar updated successfully",
            avatar: avatarUrl,
            user,
        });
    } catch (err) {
        console.error("Avatar upload error:", err);
        res.status(500).json({ error: "Failed to upload avatar" });
    }
});

// Public profile
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update profile
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        if (!req.userId || !req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (req.userId.toString() !== req.params.id && req.user.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }

        const { username, bio, avatar } = req.body;
        const updates = {};
        if (username) updates.username = username;
        if (bio !== undefined) updates.bio = bio;
        if (avatar) updates.avatar = avatar;

        const user = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
        }).select("-password");
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Follow / unfollow
router.post("/:id/follow", authMiddleware, async (req, res) => {
    try {
        const targetId = req.params.id;
        if (targetId === req.userId.toString()) {
            return res.status(400).json({ error: "Cannot follow yourself" });
        }

        const me = await User.findById(req.userId);
        const target = await User.findById(targetId);
        if (!me || !target) return res.status(404).json({ error: "User not found" });

        const isFollowing = me.following.some((id) => id.toString() === targetId);

        if (isFollowing) {
            me.following = me.following.filter((id) => id.toString() !== targetId);
            target.followers = target.followers.filter(
                (id) => id.toString() !== req.userId.toString()
            );
        } else {
            me.following.push(targetId);
            target.followers.push(req.userId);

            if (typeof target.addNotification === "function") {
                await target.addNotification({
                    message: `${me.username} started following you`,
                    type: "follow",
                    fromUser: me._id,
                });
            }
        }

        await me.save();
        await target.save();

        res.json({ following: me.following, followers: target.followers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================
// POST: Mark all notifications as read
// /api/users/notifications/read-all
// =========================
router.post("/notifications/read-all", authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userId, {
            $set: { "notifications.$[].read": true }
        });
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =========================
// DELETE: Clear all notifications
// /api/users/notifications
// =========================
router.delete("/notifications", authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.userId, {
            $set: { notifications: [] }
        });
        res.json({ message: "All notifications cleared" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;