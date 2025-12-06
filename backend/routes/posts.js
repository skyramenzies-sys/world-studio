// backend/routes/posts.js
// World-Studio.live - Post/Content Routes (UNIVERSE EDITION 🚀)
// Handles posts, likes, comments, purchases, and content monetization

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");
const Post = require("../models/Post");
const User = require("../models/User");
const PlatformWallet = require("../models/PlatformWallet");

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Safe ObjectId creation
 */
const safeId = (id) => {
    if (!id) return null;
    return mongoose.Types.ObjectId.isValid(id)
        ? new mongoose.Types.ObjectId(id)
        : null;
};

/**
 * Format post for response
 */
const formatPost = (post, user = null, currentUserId = null) => {
    return {
        _id: post._id,
        id: post._id,
        userId: post.userId,
        username: post.username || user?.username || "Unknown",
        avatar: post.avatar || user?.avatar || "/defaults/default-avatar.png",
        isVerified: user?.isVerified || post.isVerified || false,
        title: post.title,
        description: post.description,
        type: post.type,
        category: post.category,
        tags: post.tags || [],
        fileUrl: post.fileUrl,
        fileName: post.fileName,
        filePublicId: post.filePublicId,
        fileSize: post.fileSize,
        thumbnail: post.thumbnail,
        blurredThumbnail: post.blurredThumbnail,
        duration: post.duration,
        likes: post.likes || 0,
        likedBy: post.likedBy || [],
        isLiked: currentUserId
            ? post.likedBy?.some((id) => id.toString() === currentUserId.toString())
            : false,
        views: post.views || 0,
        comments: post.comments || [],
        commentCount: post.comments?.length || 0,
        shares: post.shares || 0,
        saves: post.saves || 0,
        isFree: post.isFree !== false,
        price: post.price || 0,
        isPremium: post.isPremium || false,
        isExclusive: post.isExclusive || false,
        purchasedBy: post.purchasedBy || [],
        purchaseCount: post.purchasedBy?.length || 0,
        hasPurchased: currentUserId
            ? post.purchasedBy?.some((id) => id.toString() === currentUserId.toString())
            : false,
        isOwner: currentUserId
            ? post.userId?.toString() === currentUserId.toString()
            : false,
        status: post.status || "published",
        visibility: post.visibility || "public",
        allowComments: post.allowComments !== false,
        allowDownload: post.allowDownload || false,
        timestamp: post.createdAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
    };
};

/**
 * Check content access
 */
const canAccessContent = (post, userId) => {
    if (post.userId?.toString() === userId?.toString()) return true;
    if (post.isFree !== false && !post.price) return true;
    if (post.purchasedBy?.some((id) => id.toString() === userId?.toString())) return true;
    return false;
};

// ===========================================
// GET ALL POSTS
// ===========================================

/**
 * GET /api/posts
 * Get all posts with filtering
 */
router.get("/", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            type,
            userId,
            sortBy = "recent",
            search,
            free,
            premium,
        } = req.query;

        const query = {
            status: { $ne: "deleted" },
            visibility: "public",
        };

        if (category && category !== "all") query.category = category;
        if (type && type !== "all") query.type = type;
        if (userId) query.userId = safeId(userId);
        if (free === "true")
            query.$or = [{ isFree: true }, { price: { $lte: 0 } }];
        if (premium === "true") query.isPremium = true;

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { tags: { $in: [new RegExp(search, "i")] } },
            ];
        }

        const sortOptions = {
            recent: { createdAt: -1 },
            popular: { likes: -1, views: -1 },
            views: { views: -1 },
            trending: { views: -1, likes: -1, createdAt: -1 },
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort(sortOptions[sortBy] || sortOptions.recent)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Post.countDocuments(query),
        ]);

        // Get user data
        const userIds = [
            ...new Set(posts.map((p) => p.userId?.toString()).filter(Boolean)),
        ];
        const users = await User.find({ _id: { $in: userIds } })
            .select("username avatar isVerified")
            .lean();

        const userMap = {};
        users.forEach((u) => {
            userMap[u._id.toString()] = u;
        });

        const formatted = posts.map((post) => {
            const user = userMap[post.userId?.toString()];
            return formatPost(post, user);
        });

        res.json({
            success: true,
            posts: formatted,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
                hasMore: skip + posts.length < total,
            },
        });
    } catch (err) {
        console.error("❌ Fetch posts error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// SAVED POSTS
// ===========================================

/**
 * GET /api/posts/saved
 */
router.get("/saved", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("savedPosts");
        const savedIds = user?.savedPosts || [];

        if (savedIds.length === 0) {
            return res.json({ success: true, posts: [], count: 0 });
        }

        const posts = await Post.find({
            _id: { $in: savedIds },
            status: { $ne: "deleted" },
        })
            .sort({ createdAt: -1 })
            .lean();

        const userIds = [
            ...new Set(posts.map((p) => p.userId?.toString()).filter(Boolean)),
        ];
        const users = await User.find({ _id: { $in: userIds } })
            .select("username avatar isVerified")
            .lean();
        const userMap = {};
        users.forEach((u) => {
            userMap[u._id.toString()] = u;
        });

        const formatted = posts.map((post) =>
            formatPost(post, userMap[post.userId?.toString()], req.userId)
        );

        res.json({ success: true, posts: formatted, count: formatted.length });
    } catch (err) {
        console.error("❌ Saved posts error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// TRENDING POSTS
// ===========================================

/**
 * GET /api/posts/trending
 */
router.get("/trending", async (req, res) => {
    try {
        const { limit = 20, category } = req.query;

        const query = {
            status: "published",
            visibility: "public",
            createdAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
        };
        if (category && category !== "all") query.category = category;

        const posts = await Post.find(query)
            .sort({ views: -1, likes: -1, createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        const userIds = [
            ...new Set(posts.map((p) => p.userId?.toString()).filter(Boolean)),
        ];
        const users = await User.find({ _id: { $in: userIds } })
            .select("username avatar isVerified")
            .lean();
        const userMap = {};
        users.forEach((u) => {
            userMap[u._id.toString()] = u;
        });

        const formatted = posts.map((post) =>
            formatPost(post, userMap[post.userId?.toString()])
        );

        res.json({ success: true, posts: formatted });
    } catch (err) {
        console.error("❌ Trending posts error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// USER'S POSTS
// ===========================================

/**
 * GET /api/posts/user/:userId
 */
router.get("/user/:userId", async (req, res) => {
    try {
        const { limit = 20, skip = 0, type } = req.query;

        const query = {
            userId: safeId(req.params.userId),
            status: { $ne: "deleted" },
        };
        if (type && type !== "all") query.type = type;

        const [posts, total, user] = await Promise.all([
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .lean(),
            Post.countDocuments(query),
            User.findById(req.params.userId)
                .select("username avatar isVerified")
                .lean(),
        ]);

        const formatted = posts.map((post) => formatPost(post, user));

        res.json({
            success: true,
            posts: formatted,
            user,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: parseInt(skip) + posts.length < total,
            },
        });
    } catch (err) {
        console.error("❌ User posts error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// GET SINGLE POST
// ===========================================

/**
 * GET /api/posts/:id
 */
router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id).lean();

        if (!post || post.status === "deleted") {
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });
        }

        let user = null;
        if (post.userId) {
            user = await User.findById(post.userId)
                .select("username avatar isVerified followersCount bio")
                .lean();
        }

        // Get current user from token
        let currentUserId = null;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
            try {
                const jwt = require("jsonwebtoken");
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                currentUserId = decoded.userId || decoded.id;
            } catch (e) { }
        }

        const formatted = formatPost(post, user, currentUserId);

        // Lock paid content
        if (
            post.price > 0 &&
            !post.isFree &&
            !canAccessContent(post, currentUserId)
        ) {
            formatted.fileUrl = null;
            formatted.isLocked = true;
        }

        res.json({
            success: true,
            post: formatted,
            creator: user,
        });
    } catch (err) {
        console.error("❌ Fetch post error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// CREATE POST
// ===========================================

/**
 * POST /api/posts
 */
router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            title,
            description,
            type = "image",
            category = "General",
            tags = [],
            fileUrl,
            fileName,
            filePublicId,
            fileSize,
            thumbnail,
            blurredThumbnail,
            duration,
            isFree = true,
            price = 0,
            isPremium = false,
            isExclusive = false,
            visibility = "public",
            allowComments = true,
            allowDownload = false,
        } = req.body;

        if (!title?.trim()) {
            return res
                .status(400)
                .json({ success: false, error: "Title is required" });
        }

        if (!fileUrl) {
            return res
                .status(400)
                .json({ success: false, error: "File URL is required" });
        }

        const user = await User.findById(req.userId).select(
            "username avatar isVerified"
        );
        if (!user) {
            return res
                .status(404)
                .json({ success: false, error: "User not found" });
        }

        const post = await Post.create({
            userId: req.userId,
            username: user.username,
            avatar: user.avatar,
            isVerified: user.isVerified,
            title: title.trim().substring(0, 200),
            description: description?.trim().substring(0, 2000) || "",
            type,
            category,
            tags: tags.slice(0, 10),
            fileUrl,
            fileName,
            filePublicId,
            fileSize,
            thumbnail,
            blurredThumbnail,
            duration,
            isFree: isFree && price <= 0,
            price: Math.max(0, price),
            isPremium,
            isExclusive,
            visibility,
            allowComments,
            allowDownload,
            status: "published",
            likes: 0,
            likedBy: [],
            views: 0,
            comments: [],
            shares: 0,
            saves: 0,
            purchasedBy: [],
        });

        await User.findByIdAndUpdate(req.userId, {
            $inc: { "stats.totalPosts": 1 },
        });

        const io = req.app.get("io");
        if (io) {
            io.emit("new_post", {
                postId: post._id,
                userId: req.userId,
                username: user.username,
                title: post.title,
            });
        }

        console.log(`📝 New post: "${title}" by ${user.username}`);

        res.status(201).json({
            success: true,
            message: "Post created",
            post: formatPost(post, user, req.userId),
        });
    } catch (err) {
        console.error("❌ Create post error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// UPDATE POST
// ===========================================

/**
 * PUT /api/posts/:id
 */
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });

        if (post.userId.toString() !== req.userId.toString()) {
            return res
                .status(403)
                .json({ success: false, error: "Not authorized" });
        }

        const {
            title,
            description,
            category,
            tags,
            isFree,
            price,
            isPremium,
            visibility,
            allowComments,
            allowDownload,
        } = req.body;

        if (title) post.title = title.trim().substring(0, 200);
        if (description !== undefined)
            post.description = description.trim().substring(0, 2000);
        if (category) post.category = category;
        if (tags) post.tags = tags.slice(0, 10);
        if (isFree !== undefined) post.isFree = isFree;
        if (price !== undefined) post.price = Math.max(0, price);
        if (isPremium !== undefined) post.isPremium = isPremium;
        if (visibility) post.visibility = visibility;
        if (allowComments !== undefined) post.allowComments = allowComments;
        if (allowDownload !== undefined) post.allowDownload = allowDownload;

        post.updatedAt = new Date();
        await post.save();

        res.json({
            success: true,
            message: "Post updated",
            post: formatPost(post, null, req.userId),
        });
    } catch (err) {
        console.error("❌ Update post error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// DELETE POST
// ===========================================

/**
 * DELETE /api/posts/:id
 */
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });

        const user = await User.findById(req.userId);
        const isOwner = post.userId?.toString() === req.userId?.toString();
        const isAdmin =
            user?.role === "admin" || user?.email === "menziesalm@gmail.com";

        if (!isOwner && !isAdmin) {
            return res
                .status(403)
                .json({ success: false, error: "Not authorized" });
        }

        // Delete from Cloudinary
        if (post.filePublicId) {
            try {
                const cloudinary = require("cloudinary").v2;
                await cloudinary.uploader.destroy(post.filePublicId);
            } catch (e) { }
        }

        if (req.query.hard === "true" && isAdmin) {
            await Post.findByIdAndDelete(req.params.id);
        } else {
            post.status = "deleted";
            post.deletedAt = new Date();
            await post.save();
        }

        if (post.userId) {
            await User.findByIdAndUpdate(post.userId, {
                $inc: { "stats.totalPosts": -1 },
            });
        }

        res.json({ success: true, message: "Post deleted" });
    } catch (err) {
        console.error("❌ Delete post error:", err);
        res
            .status(500)
            .json({ success: false, error: "Failed to delete post" });
    }
});

// ===========================================
// LIKE / UNLIKE
// ===========================================

/**
 * POST /api/posts/:id/like
 */
router.post("/:id/like", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });

        const alreadyLiked = post.likedBy.some(
            (id) => id.toString() === req.userId.toString()
        );

        if (alreadyLiked) {
            post.likedBy = post.likedBy.filter(
                (id) => id.toString() !== req.userId.toString()
            );
            post.likes = Math.max(0, (post.likes || 0) - 1);
        } else {
            post.likedBy.push(req.userId);
            post.likes = (post.likes || 0) + 1;

            // Notify owner
            if (post.userId.toString() !== req.userId.toString()) {
                const liker = await User.findById(req.userId).select(
                    "username avatar"
                );

                await User.findByIdAndUpdate(post.userId, {
                    $push: {
                        notifications: {
                            $each: [
                                {
                                    message: `${liker?.username || "Someone"
                                        } liked your post`,
                                    type: "like",
                                    fromUser: req.userId,
                                    fromUsername: liker?.username,
                                    postId: post._id,
                                    read: false,
                                    createdAt: new Date(),
                                },
                            ],
                            $slice: -100,
                        },
                    },
                    $inc: { unreadNotifications: 1 },
                });

                const io = req.app.get("io");
                if (io)
                    io.to(`user_${post.userId}`).emit("notification", {
                        type: "like",
                        postId: post._id,
                    });
            }
        }

        await post.save();
        res.json({
            success: true,
            liked: !alreadyLiked,
            likes: post.likes,
            likedBy: post.likedBy,
        });
    } catch (err) {
        console.error("❌ Like error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// COMMENTS
// ===========================================

/**
 * POST /api/posts/:id/comment
 */
router.post("/:id/comment", authMiddleware, async (req, res) => {
    try {
        const { text, replyTo } = req.body;
        if (!text?.trim())
            return res
                .status(400)
                .json({ success: false, error: "Text required" });

        const post = await Post.findById(req.params.id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });
        if (!post.allowComments)
            return res.status(403).json({
                success: false,
                error: "Comments disabled",
            });

        const user = await User.findById(req.userId).select(
            "username avatar isVerified"
        );

        const comment = {
            _id: new mongoose.Types.ObjectId(),
            userId: req.userId,
            username: user?.username || "Unknown",
            avatar: user?.avatar || "",
            isVerified: user?.isVerified || false,
            text: text.trim().substring(0, 1000),
            replyTo: replyTo || null,
            likes: 0,
            likedBy: [],
            createdAt: new Date(),
        };

        post.comments.push(comment);
        await post.save();

        // Notify owner
        if (post.userId.toString() !== req.userId.toString()) {
            await User.findByIdAndUpdate(post.userId, {
                $push: {
                    notifications: {
                        $each: [
                            {
                                message: `${user?.username} commented on your post`,
                                type: "comment",
                                fromUser: req.userId,
                                postId: post._id,
                                text: text.substring(0, 100),
                                read: false,
                                createdAt: new Date(),
                            },
                        ],
                        $slice: -100,
                    },
                },
                $inc: { unreadNotifications: 1 },
            });
        }

        res.status(201).json({ success: true, comment });
    } catch (err) {
        console.error("❌ Comment error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/posts/:id/comment/:commentId
 */
router.delete("/:id/comment/:commentId", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });

        const commentIndex = post.comments.findIndex(
            (c) => c._id.toString() === req.params.commentId
        );
        if (commentIndex === -1)
            return res
                .status(404)
                .json({ success: false, error: "Comment not found" });

        const comment = post.comments[commentIndex];
        const isCommentOwner =
            comment.userId.toString() === req.userId.toString();
        const isPostOwner =
            post.userId.toString() === req.userId.toString();

        if (!isCommentOwner && !isPostOwner) {
            return res
                .status(403)
                .json({ success: false, error: "Not authorized" });
        }

        post.comments.splice(commentIndex, 1);
        await post.save();

        res.json({ success: true, message: "Comment deleted" });
    } catch (err) {
        console.error("❌ Delete comment error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// VIEW COUNTER
// ===========================================

/**
 * POST /api/posts/:id/view
 */
router.post("/:id/view", async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });
        res.json({ success: true, views: post.views });
    } catch (err) {
        console.error("❌ View error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// PURCHASE CONTENT (UNIVERSE EDITION 💰)
// ===========================================

/**
 * POST /api/posts/:id/purchase
 */
router.post("/:id/purchase", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });

        if (post.isFree || !post.price || post.price <= 0) {
            return res.status(400).json({
                success: false,
                error: "This content is free",
            });
        }

        if (
            post.purchasedBy.some(
                (id) => id.toString() === req.userId.toString()
            )
        ) {
            return res.status(400).json({
                success: false,
                error: "Already purchased",
            });
        }

        if (post.userId.toString() === req.userId.toString()) {
            return res.status(400).json({
                success: false,
                error: "Cannot purchase own content",
            });
        }

        const buyer = await User.findById(req.userId);
        if (!buyer) {
            return res
                .status(404)
                .json({ success: false, error: "Buyer not found" });
        }

        buyer.wallet = buyer.wallet || {
            balance: 0,
            totalSpent: 0,
            totalReceived: 0,
            transactions: [],
        };

        const buyerBalance = buyer.wallet.balance || 0;

        if (buyerBalance < post.price) {
            return res.status(400).json({
                success: false,
                error: "Insufficient balance",
                balance: buyerBalance,
                required: post.price,
            });
        }

        // === PLATFORM WALLET & SPLIT (Universe Edition) ===
        // Gebruik feeConfig.contentFeePercent i.p.v. hard-coded 15%
        let platformFee = 0;
        let creatorShare = 0;

        try {
            const wallet = await PlatformWallet.getWallet();
            const feePercent =
                wallet.feeConfig?.contentFeePercent ?? 15;

            platformFee = Math.floor(post.price * (feePercent / 100));
            creatorShare = post.price - platformFee;

            // Safety
            if (creatorShare < 0) {
                creatorShare = 0;
            }

            // Log fee in platform wallet (revenue)
            await wallet.addTransaction({
                amount: platformFee,
                type: "content_fee",
                reason: `Content sale fee (${feePercent}%): ${post.title}`,
                fromUserId: req.userId,
                fromUsername: buyer.username,
                postId: post._id,
                isRevenue: true,
                metadata: {
                    originalAmount: post.price,
                    feePercent,
                    creatorReceived: creatorShare,
                    postId: post._id,
                },
            });
        } catch (walletErr) {
            console.log(
                "PlatformWallet content fee recording skipped:",
                walletErr.message
            );
            // fallback: 85/15 lokale split
            if (platformFee === 0 && creatorShare === 0) {
                platformFee = Math.floor(post.price * 0.15);
                creatorShare = post.price - platformFee;
            }
        }

        // Als door een error hierboven nog steeds 0/0 is,
        // fallback naar 85/15 zodat de flow nooit breekt.
        if (platformFee === 0 && creatorShare === 0) {
            platformFee = Math.floor(post.price * 0.15);
            creatorShare = post.price - platformFee;
        }

        // ========== BUYER: DEDUCT BALANCE ==========
        buyer.wallet.balance -= post.price;
        buyer.wallet.totalSpent =
            (buyer.wallet.totalSpent || 0) + post.price;
        buyer.wallet.transactions = buyer.wallet.transactions || [];
        buyer.wallet.transactions.unshift({
            type: "content_purchase",
            amount: -post.price,
            description: `Purchased: ${post.title}`,
            postId: post._id,
            status: "completed",
            createdAt: new Date(),
        });
        if (buyer.wallet.transactions.length > 500) {
            buyer.wallet.transactions = buyer.wallet.transactions.slice(0, 500);
        }

        // Stats voor buyer
        buyer.stats = buyer.stats || {};
        buyer.stats.totalContentPurchases =
            (buyer.stats.totalContentPurchases || 0) + 1;

        await buyer.save();

        // ========== CREATOR: ADD BALANCE ==========
        const creator = await User.findById(post.userId);
        if (creator) {
            creator.wallet = creator.wallet || {
                balance: 0,
                totalReceived: 0,
                totalSpent: 0,
                transactions: [],
            };

            creator.wallet.balance += creatorShare;
            creator.wallet.totalReceived =
                (creator.wallet.totalReceived || 0) + creatorShare;
            creator.wallet.transactions.unshift({
                type: "content_sale",
                amount: creatorShare,
                description: `Sold: ${post.title}`,
                postId: post._id,
                relatedUsername: buyer.username,
                status: "completed",
                createdAt: new Date(),
            });
            if (creator.wallet.transactions.length > 500) {
                creator.wallet.transactions = creator.wallet.transactions.slice(
                    0,
                    500
                );
            }

            // Creator stats
            creator.stats = creator.stats || {};
            creator.stats.totalContentSales =
                (creator.stats.totalContentSales || 0) + 1;
            creator.stats.totalContentRevenue =
                (creator.stats.totalContentRevenue || 0) + creatorShare;

            // Notify creator
            creator.notifications = creator.notifications || [];
            creator.notifications.unshift({
                message: `${buyer.username} purchased "${post.title}" for ${post.price} coins`,
                type: "sale",
                fromUser: req.userId,
                postId: post._id,
                amount: creatorShare,
                read: false,
                createdAt: new Date(),
            });
            creator.unreadNotifications =
                (creator.unreadNotifications || 0) + 1;
            await creator.save();
        }

        // ========== POST: REGISTER PURCHASE ==========
        post.purchasedBy = post.purchasedBy || [];
        post.purchasedBy.push(req.userId);
        post.salesCount = (post.salesCount || 0) + 1;
        await post.save();

        const io = req.app.get("io");
        if (io) {
            io.to(`user_${post.userId}`).emit("content_sold", {
                postId: post._id,
                buyerUsername: buyer.username,
                amount: post.price,
            });
        }

        console.log(
            `💰 Content purchased: "${post.title}" by ${buyer.username} | price=${post.price}, creator=${creatorShare}, platform=${platformFee}`
        );

        res.json({
            success: true,
            message: "Content purchased",
            fileUrl: post.fileUrl,
            newBalance: buyer.wallet.balance,
        });
    } catch (err) {
        console.error("❌ Purchase error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// SAVE / BOOKMARK
// ===========================================

/**
 * POST /api/posts/:id/save
 */
router.post("/:id/save", authMiddleware, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });

        const user = await User.findById(req.userId);
        user.savedPosts = user.savedPosts || [];

        const alreadySaved = user.savedPosts.some(
            (id) => id.toString() === req.params.id
        );

        if (alreadySaved) {
            user.savedPosts = user.savedPosts.filter(
                (id) => id.toString() !== req.params.id
            );
            post.saves = Math.max(0, (post.saves || 0) - 1);
        } else {
            user.savedPosts.push(req.params.id);
            post.saves = (post.saves || 0) + 1;
        }

        await Promise.all([user.save(), post.save()]);
        res.json({ success: true, saved: !alreadySaved, saves: post.saves });
    } catch (err) {
        console.error("❌ Save error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// SHARE
// ===========================================

/**
 * POST /api/posts/:id/share
 */
router.post("/:id/share", async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { shares: 1 } },
            { new: true }
        );
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });
        res.json({ success: true, shares: post.shares });
    } catch (err) {
        console.error("❌ Share error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===========================================
// REPORT POST
// ===========================================

/**
 * POST /api/posts/:id/report
 */
router.post("/:id/report", authMiddleware, async (req, res) => {
    try {
        const { reason, details } = req.body;
        if (!reason)
            return res
                .status(400)
                .json({ success: false, error: "Reason required" });

        const post = await Post.findById(req.params.id);
        if (!post)
            return res
                .status(404)
                .json({ success: false, error: "Post not found" });

        post.reports = post.reports || [];
        if (
            post.reports.some(
                (r) => r.userId.toString() === req.userId.toString()
            )
        ) {
            return res
                .status(400)
                .json({ success: false, error: "Already reported" });
        }

        post.reports.push({
            userId: req.userId,
            reason,
            details: details?.substring(0, 500) || "",
            createdAt: new Date(),
        });

        post.reportCount = post.reports.length;
        post.isReported = true;
        if (post.reportCount >= 5) post.status = "under_review";

        await post.save();
        res.json({ success: true, message: "Post reported" });
    } catch (err) {
        console.error("❌ Report error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});



module.exports = router;
