// backend/routes/notifications.js
// World-Studio.live - Notification Routes (UNIVERSE EDITION 🚀)
// Werkt met EMBEDDED notifications in User model

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const authMiddleware = require("../middleware/auth");
const User = require("../models/User");

// ===========================================
// ALL ROUTES REQUIRE AUTH
// ===========================================

/**
 * GET /api/notifications
 * Get current user's notifications
 */
router.get("/", authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 50, unreadOnly = false } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const user = await User.findById(req.userId)
            .select("notifications unreadNotifications")
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        let notifications = user.notifications || [];

        // Filter unread only if requested
        if (unreadOnly === "true") {
            notifications = notifications.filter((n) => !n.read);
        }

        // Sort by createdAt descending (newest first)
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Paginate
        const total = notifications.length;
        const paginatedNotifications = notifications.slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            notifications: paginatedNotifications,
            unreadCount: user.unreadNotifications || 0,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (err) {
        console.error("Get notifications error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get notifications",
            details: err.message,
        });
    }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get("/unread-count", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("unreadNotifications")
            .lean();

        res.json({
            success: true,
            unreadCount: user?.unreadNotifications || 0,
        });
    } catch (err) {
        console.error("Get unread count error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get unread count",
            details: err.message,
        });
    }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put("/read-all", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Use the instance method from User model
        await user.markNotificationsRead();

        console.log(`✅ All notifications marked as read for user ${user.username}`);

        res.json({
            success: true,
            message: "All notifications marked as read",
            unreadCount: 0,
        });
    } catch (err) {
        console.error("Mark all read error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to mark notifications as read",
            details: err.message,
        });
    }
});

/**
 * PUT /api/notifications/:notificationId/read
 * Mark single notification as read
 */
router.put("/:notificationId/read", authMiddleware, async (req, res) => {
    try {
        const { notificationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid notification ID",
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Use instance method with specific ID
        await user.markNotificationsRead([notificationId]);

        res.json({
            success: true,
            message: "Notification marked as read",
            unreadCount: user.unreadNotifications,
        });
    } catch (err) {
        console.error("Mark read error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to mark notification as read",
            details: err.message,
        });
    }
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete a single notification
 */
router.delete("/:notificationId", authMiddleware, async (req, res) => {
    try {
        const { notificationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid notification ID",
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Find and remove the notification
        const notificationIndex = user.notifications.findIndex(
            (n) => n._id.toString() === notificationId
        );

        if (notificationIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "Notification not found",
            });
        }

        // Remove notification
        user.notifications.splice(notificationIndex, 1);

        // Update unread count
        user.unreadNotifications = user.notifications.filter((n) => !n.read).length;

        await user.save();

        res.json({
            success: true,
            message: "Notification deleted",
            unreadCount: user.unreadNotifications,
        });
    } catch (err) {
        console.error("Delete notification error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete notification",
            details: err.message,
        });
    }
});

/**
 * DELETE /api/notifications
 * Delete all notifications (or only read ones)
 */
router.delete("/", authMiddleware, async (req, res) => {
    try {
        const { readOnly = "false" } = req.query;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        let deletedCount = 0;

        if (readOnly === "true") {
            // Only delete read notifications
            const originalLength = user.notifications.length;
            user.notifications = user.notifications.filter((n) => !n.read);
            deletedCount = originalLength - user.notifications.length;
        } else {
            // Delete all notifications
            deletedCount = user.notifications.length;
            user.notifications = [];
        }

        // Update unread count
        user.unreadNotifications = user.notifications.filter((n) => !n.read).length;

        await user.save();

        console.log(`🗑️ Deleted ${deletedCount} notifications for user ${user.username}`);

        res.json({
            success: true,
            message: `Deleted ${deletedCount} notifications`,
            deletedCount,
            unreadCount: user.unreadNotifications,
        });
    } catch (err) {
        console.error("Delete all notifications error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to delete notifications",
            details: err.message,
        });
    }
});

/**
 * POST /api/notifications/test
 * Create a test notification (for debugging)
 */
router.post("/test", authMiddleware, async (req, res) => {
    try {
        const { type = "system", message = "This is a test notification" } = req.body;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Use the addNotification instance method
        await user.addNotification({
            type,
            message,
            icon: "🔔",
        });

        // Emit socket event
        const io = global.io || req.app.get("io");
        if (io) {
            io.to(`user_${req.userId}`).emit("new_notification", {
                type,
                message,
                icon: "🔔",
                createdAt: new Date(),
            });
        }

        res.json({
            success: true,
            message: "Test notification created",
            unreadCount: user.unreadNotifications,
        });
    } catch (err) {
        console.error("Create test notification error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to create notification",
            details: err.message,
        });
    }
});

module.exports = router;