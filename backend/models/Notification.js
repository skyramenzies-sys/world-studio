// backend/models/Notification.js
// World-Studio.live - Notification Model (UNIVERSE EDITION 🚀)

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        // Who receives this notification
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Who triggered this notification (optional - e.g., system notifications)
        fromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Type of notification
        type: {
            type: String,
            enum: [
                "follow",       // Someone followed you
                "unfollow",     // Someone unfollowed you
                "like",         // Someone liked your post/stream
                "comment",      // Someone commented
                "gift",         // Someone sent you a gift
                "stream",       // Someone you follow went live
                "mention",      // Someone mentioned you
                "purchase",     // Someone purchased your content
                "payout",       // Payout processed
                "system",       // System notification
                "achievement",  // Achievement unlocked
                "message",      // New message
                "other",        // Other
            ],
            default: "other",
            index: true,
        },

        // Notification message
        message: {
            type: String,
            required: true,
            maxlength: 500,
        },

        // Optional link to navigate to
        link: {
            type: String,
            default: null,
        },

        // Related entity (post, stream, etc.)
        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        relatedType: {
            type: String,
            enum: ["post", "stream", "comment", "gift", "user", "transaction", null],
            default: null,
        },

        // Additional data (JSON)
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        // Read status
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
            default: null,
        },

        // For grouping similar notifications
        groupKey: {
            type: String,
            default: null,
        },

        // Priority (for sorting)
        priority: {
            type: Number,
            default: 0, // Higher = more important
        },

        // Expiry (optional - auto-delete after this date)
        expiresAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

// TTL index for auto-expiring notifications (if expiresAt is set)
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method: Create notification with socket emit
notificationSchema.statics.createAndEmit = async function (data, io) {
    try {
        const notification = new this(data);
        await notification.save();

        // Populate fromUser if exists
        if (notification.fromUserId) {
            await notification.populate("fromUserId", "username avatar");
        }

        // Emit via socket
        if (io) {
            io.to(`user_${data.userId}`).emit("new_notification", notification.toObject());
        }

        return notification;
    } catch (err) {
        console.error("Failed to create notification:", err);
        throw err;
    }
};

// Static method: Get unread count for user
notificationSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({ userId, read: false });
};

// Static method: Mark all as read for user
notificationSchema.statics.markAllRead = async function (userId) {
    return this.updateMany(
        { userId, read: false },
        { $set: { read: true, readAt: new Date() } }
    );
};

// Static method: Delete old read notifications (cleanup)
notificationSchema.statics.cleanupOld = async function (daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.deleteMany({
        read: true,
        createdAt: { $lt: cutoffDate },
    });
};

// Instance method: Mark as read
notificationSchema.methods.markAsRead = async function () {
    if (!this.read) {
        this.read = true;
        this.readAt = new Date();
        await this.save();
    }
    return this;
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;