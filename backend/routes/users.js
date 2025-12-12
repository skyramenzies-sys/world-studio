// backend/routes/users.js
// World-Studio.live - User Routes (UNIVERSE EDITION 🚀)
// Werkt met bestaand User model dat followers/following/notifications embedded heeft

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const authMiddleware = require("../middleware/auth");
const User = require("../models/User");

// ===========================================
// HELPER FUNCTIONS
// ===========================================

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ===========================================
// PUBLIC ROUTES
// ===========================================

/**
 * GET /api/users/search
 * Search users - MOET VOOR /:userId staan!
 */
router.get("/search", async (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: "Search query must be at least 2 characters",
            });
        }

        // Gebruik de ingebouwde static method
        const users = await User.searchUsers(q.trim(), { limit: parseInt(limit) });

        res.json({
            success: true,
            users,
            total: users.length,
            page: parseInt(page),
        });
    } catch (err) {
        console.error("Search users error:", err);
        res.status(500).json({
            success: false,
            error: "Search failed",
            details: err.message,
        });
    }
});

/**
 * GET /api/users/suggested
 * Get suggested users to follow
 */
router.get("/suggested", authMiddleware, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const users = await User.getSuggested(req.userId, parseInt(limit));

        res.json({
            success: true,
            users,
        });
    } catch (err) {
        console.error("Get suggested error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get suggestions",
        });
    }
});

/**
 * GET /api/users/top-creators
 * Get top creators
 */
router.get("/top-creators", async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const creators = await User.getTopCreators(parseInt(limit));

        res.json({
            success: true,
            creators,
        });
    } catch (err) {
        console.error("Get top creators error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get top creators",
        });
    }
});

/**
 * GET /api/users/live
 * Get currently live users
 */
router.get("/live", async (req, res) => {
    try {
        const liveUsers = await User.getLiveUsers();

        res.json({
            success: true,
            users: liveUsers,
            count: liveUsers.length,
        });
    } catch (err) {
        console.error("Get live users error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get live users",
        });
    }
});

/**
 * GET /api/users/:userId
 * Get user profile (public)
 */
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid user ID",
            });
        }

        const user = await User.findById(userId)
            .select("-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret -emailVerificationToken")
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Don't expose full notifications/transactions to public
        if (user.notifications) {
            delete user.notifications;
        }
        if (user.wallet?.transactions) {
            user.wallet = {
                balance: user.wallet.balance,
                totalReceived: user.wallet.totalReceived,
                totalSpent: user.wallet.totalSpent,
                totalEarned: user.wallet.totalEarned,
            };
        }

        res.json(user);
    } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get user",
            details: err.message,
        });
    }
});

/**
 * GET /api/users/:userId/followers
 * Get user's followers list
 */
router.get("/:userId/followers", async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid user ID",
            });
        }

        const user = await User.findById(userId).select("followers followersCount").lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        const followerIds = user.followers || [];
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get follower details with pagination
        const followers = await User.find({
            _id: { $in: followerIds },
        })
            .select("_id username avatar bio isVerified followersCount")
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            followers,
            total: user.followersCount || followerIds.length,
            page: parseInt(page),
            totalPages: Math.ceil(followerIds.length / parseInt(limit)),
        });
    } catch (err) {
        console.error("Get followers error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get followers",
            details: err.message,
        });
    }
});

/**
 * GET /api/users/:userId/following
 * Get user's following list
 */
router.get("/:userId/following", async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid user ID",
            });
        }

        const user = await User.findById(userId).select("following followingCount").lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        const followingIds = user.following || [];
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get following details with pagination
        const following = await User.find({
            _id: { $in: followingIds },
        })
            .select("_id username avatar bio isVerified followersCount")
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            following,
            total: user.followingCount || followingIds.length,
            page: parseInt(page),
            totalPages: Math.ceil(followingIds.length / parseInt(limit)),
        });
    } catch (err) {
        console.error("Get following error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get following",
            details: err.message,
        });
    }
});

// ===========================================
// PROTECTED ROUTES (require auth)
// ===========================================

/**
 * GET /api/users/me/profile
 * Get current user's full profile
 */
router.get("/me/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret -emailVerificationToken")
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        res.json({
            success: true,
            user,
        });
    } catch (err) {
        console.error("Get my profile error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get profile",
            details: err.message,
        });
    }
});

/**
 * PUT /api/users/me/profile
 * Update current user's profile
 */
router.put("/me/profile", authMiddleware, async (req, res) => {
    try {
        const { username, bio, displayName, location, website, gender } = req.body;

        const updateData = {};

        if (username !== undefined) {
            // Check username availability
            const existingUser = await User.findOne({
                username: { $regex: new RegExp(`^${username}$`, "i") },
                _id: { $ne: req.userId },
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: "Username already taken",
                });
            }
            updateData.username = username.trim().substring(0, 30);
        }

        if (bio !== undefined) {
            updateData.bio = bio.trim().substring(0, 500);
        }

        if (displayName !== undefined) {
            updateData.displayName = displayName.trim().substring(0, 50);
        }

        if (location !== undefined) {
            updateData.location = location.trim().substring(0, 100);
        }

        if (website !== undefined) {
            updateData.website = website.trim().substring(0, 200);
        }

        if (gender !== undefined && ["male", "female", "other", "prefer_not_to_say"].includes(gender)) {
            updateData.gender = gender;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.userId,
            { $set: updateData },
            { new: true }
        ).select("-password -resetPasswordToken -resetPasswordExpires -twoFactorSecret");

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        console.log(`✏️ Profile updated: ${updatedUser.username}`);

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (err) {
        console.error("Update profile error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to update profile",
            details: err.message,
        });
    }
});

/**
 * POST /api/users/:userId/follow
 * Follow a user
 */
router.post("/:userId/follow", authMiddleware, async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const currentUserId = req.userId;

        if (!isValidObjectId(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid user ID",
            });
        }

        // Can't follow yourself
        if (targetUserId === currentUserId) {
            return res.status(400).json({
                success: false,
                error: "You cannot follow yourself",
            });
        }

        const [currentUser, targetUser] = await Promise.all([
            User.findById(currentUserId),
            User.findById(targetUserId),
        ]);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Check if already following using instance method
        if (currentUser.isFollowing(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: "Already following this user",
            });
        }

        // Check if blocked
        if (targetUser.hasBlocked(currentUserId)) {
            return res.status(403).json({
                success: false,
                error: "You cannot follow this user",
            });
        }

        // Use instance methods from User model
        await currentUser.follow(targetUserId);

        // Add to target's followers
        if (!targetUser.followers.some(id => id.toString() === currentUserId)) {
            targetUser.followers.push(currentUserId);
            targetUser.followersCount = targetUser.followers.length;
        }

        // Add notification to target user using instance method
        await targetUser.addNotification({
            type: "follow",
            message: `${currentUser.username} started following you`,
            fromUser: currentUserId,
            fromUsername: currentUser.username,
            fromAvatar: currentUser.avatar,
            actionUrl: `/profile/${currentUserId}`,
        });

        await targetUser.save();

        // Emit socket events
        const io = global.io || req.app.get("io");
        if (io) {
            io.to(`user_${targetUserId}`).emit("new_follower", {
                userId: currentUserId,
                username: currentUser.username,
                avatar: currentUser.avatar,
            });

            io.to(`user_${targetUserId}`).emit("new_notification", {
                type: "follow",
                message: `${currentUser.username} started following you`,
                fromUsername: currentUser.username,
                fromAvatar: currentUser.avatar,
            });
        }

        console.log(`👥 ${currentUser.username} followed ${targetUser.username}`);

        res.json({
            success: true,
            message: `Now following ${targetUser.username}`,
            isFollowing: true,
            followersCount: targetUser.followersCount,
        });
    } catch (err) {
        console.error("Follow error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to follow user",
            details: err.message,
        });
    }
});

/**
 * POST /api/users/:userId/unfollow
 * Unfollow a user
 */
router.post("/:userId/unfollow", authMiddleware, async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const currentUserId = req.userId;

        if (!isValidObjectId(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid user ID",
            });
        }

        // Can't unfollow yourself
        if (targetUserId === currentUserId) {
            return res.status(400).json({
                success: false,
                error: "You cannot unfollow yourself",
            });
        }

        const [currentUser, targetUser] = await Promise.all([
            User.findById(currentUserId),
            User.findById(targetUserId),
        ]);

        if (!currentUser || !targetUser) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Check if actually following
        if (!currentUser.isFollowing(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: "Not following this user",
            });
        }

        // Use instance method to unfollow
        await currentUser.unfollow(targetUserId);

        // Remove from target's followers
        targetUser.followers = targetUser.followers.filter(
            id => id.toString() !== currentUserId
        );
        targetUser.followersCount = targetUser.followers.length;
        await targetUser.save();

        console.log(`👥 ${currentUser.username} unfollowed ${targetUser.username}`);

        res.json({
            success: true,
            message: `Unfollowed ${targetUser.username}`,
            isFollowing: false,
            followersCount: targetUser.followersCount,
        });
    } catch (err) {
        console.error("Unfollow error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to unfollow user",
            details: err.message,
        });
    }
});

/**
 * POST /api/users/:userId/block
 * Block a user
 */
router.post("/:userId/block", authMiddleware, async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const currentUserId = req.userId;

        if (!isValidObjectId(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid user ID",
            });
        }

        if (targetUserId === currentUserId) {
            return res.status(400).json({
                success: false,
                error: "You cannot block yourself",
            });
        }

        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Use instance method
        await currentUser.blockUser(targetUserId);

        // Also remove from target's following if they follow you
        await User.findByIdAndUpdate(targetUserId, {
            $pull: { following: currentUserId },
            $inc: { followingCount: -1 },
        });

        // Remove from your followers
        await User.findByIdAndUpdate(currentUserId, {
            $pull: { followers: targetUserId },
            $inc: { followersCount: -1 },
        });

        res.json({
            success: true,
            message: "User blocked",
        });
    } catch (err) {
        console.error("Block error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to block user",
        });
    }
});

/**
 * POST /api/users/:userId/unblock
 * Unblock a user
 */
router.post("/:userId/unblock", authMiddleware, async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;

        if (!isValidObjectId(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid user ID",
            });
        }

        await User.findByIdAndUpdate(req.userId, {
            $pull: { blockedUsers: targetUserId },
        });

        res.json({
            success: true,
            message: "User unblocked",
        });
    } catch (err) {
        console.error("Unblock error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to unblock user",
        });
    }
});

/**
 * GET /api/users/me/blocked
 * Get blocked users list
 */
router.get("/me/blocked", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("blockedUsers")
            .populate("blockedUsers", "username avatar")
            .lean();

        res.json({
            success: true,
            blockedUsers: user?.blockedUsers || [],
        });
    } catch (err) {
        console.error("Get blocked users error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get blocked users",
        });
    }
});

module.exports = router;