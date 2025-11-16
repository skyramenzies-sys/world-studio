// backend/routes/users.js
"use strict";

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// -------------------------------------------------------------
// 1. Search Users (Public + Pagination)
// -------------------------------------------------------------
router.get("/", async (req, res) => {
    try {
        const q = req.query.q || "";
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const filter = q.trim()
            ? { username: new RegExp(q, "i") }
            : {};

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("-password")
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ createdAt: -1 }),

            User.countDocuments(filter)
        ]);

        return res.json({
            users,
            total,
            page,
            pages: Math.ceil(total / limit)
        });

    } catch (err) {
        console.error("Users search error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// -------------------------------------------------------------
// 2. Suggested Users to Follow (Protected)
// -------------------------------------------------------------
router.get("/suggested", authMiddleware, async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const me = await User.findById(req.userId).select("following");
        if (!me) return res.status(404).json({ error: "User not found" });

        const exclude = [req.userId, ...me.following];

        const [suggestions, total] = await Promise.all([
            User.find({ _id: { $nin: exclude } })
                .select("-password")
                .skip((page - 1) * limit)
                .limit(limit)
                .sort({ createdAt: -1 }),

            User.countDocuments({ _id: { $nin: exclude } })
        ]);

        return res.json({
            suggestions,
            total,
            page,
            pages: Math.ceil(total / limit)
        });

    } catch (err) {
        console.error("Suggested users error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// -------------------------------------------------------------
// 3. Get Public Profile (Public)
// -------------------------------------------------------------
router.get("/:id", async (req, res) => {
    try {
        const profile = await User.findById(req.params.id).select("-password");
        if (!profile) return res.status(404).json({ error: "User not found" });

        return res.json(profile);

    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// -------------------------------------------------------------
// 4. Update User (Protected)
// -------------------------------------------------------------
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const targetId = req.params.id;
        const isOwner = req.userId.toString() === targetId;
        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin)
            return res.status(403).json({ error: "Forbidden" });

        const allowedUpdates = ["username", "bio"];
        const updates = {};

        for (const key of allowedUpdates) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        const updated = await User.findByIdAndUpdate(
            targetId,
            updates,
            { new: true }
        ).select("-password");

        if (!updated)
            return res.status(404).json({ error: "User not found" });

        return res.json(updated);

    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// -------------------------------------------------------------
// 5. Follow / Unfollow (Protected + Toggle)
// -------------------------------------------------------------
router.post("/:id/follow", authMiddleware, async (req, res) => {
    try {
        const targetId = req.params.id;

        if (targetId === String(req.userId))
            return res.status(400).json({ error: "You cannot follow yourself" });

        const me = await User.findById(req.userId);
        const target = await User.findById(targetId);

        if (!me || !target)
            return res.status(404).json({ error: "User not found" });

        const alreadyFollowing = me.following.some(
            (id) => String(id) === targetId
        );

        if (alreadyFollowing) {
            // Unfollow
            me.following = me.following.filter((id) => String(id) !== targetId);
            target.followers = target.followers.filter(
                (id) => String(id) !== String(req.userId)
            );
        } else {
            // Follow
            me.following.push(targetId);
            target.followers.push(req.userId);

            if (typeof target.addNotification === "function") {
                await target.addNotification({
                    message: `${me.username} started following you`,
                    type: "follow",
                    fromUser: me._id
                });
            }
        }

        await me.save();
        await target.save();

        return res.json({
            following: me.following,
            followers: target.followers
        });

    } catch (err) {
        console.error("Follow toggle error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
