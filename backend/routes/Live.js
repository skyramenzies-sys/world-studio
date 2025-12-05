// backend/routes/Live.js
// World-Studio.live - Live Streaming Routes (MASTER)
// Handles stream creation, discovery, management and analytics

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Stream = require("../models/Stream");
const User = require("../models/User");
const Gift = require("../models/Gift");
const auth = require("../middleware/authMiddleware");

// ===========================================
// HELPERS
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
 * Generate unique room ID
 */
const generateRoomId = () => {
    return `stream_${new mongoose.Types.ObjectId().toString()}_${Date.now()}`;
};

/**
 * Generate stream key
 */
const generateStreamKey = (userId) => {
    const random = Math.random().toString(36).substring(2, 15);
    return `sk_live_${userId}_${random}`;
};

// ===========================================
// DISCOVER / LIST LIVE STREAMS
// ===========================================

/**
 * NEW DISCOVER ENDPOINT
 * GET /api/live?isLive=true&category=Music&sortBy=viewers
 */
router.get("/", async (req, res) => {
    try {
        const { isLive, category, sortBy } = req.query;

        const query = {};
        if (isLive === "true") {
            query.isLive = true;
            query.status = "live";
        }

        if (category && category !== "All") {
            query.category = category;
        }

        const sortOptions = {
            viewers: { viewers: -1 },
            recent: { startedAt: -1 },
            gifts: { totalGifts: -1 },
        };

        const sort = sortOptions[sortBy] || { viewers: -1 };

        const streams = await Stream.find(query)
            // virtual "host" → komt uit StreamSchema.virtual('host')
            .populate("host", "username avatar isVerified")
            .select("-viewerList -bannedUsers -blockedWords")
            .sort(sort);

        return res.json(Array.isArray(streams) ? streams : []);
    } catch (err) {
        console.error("❌ DISCOVERY ERROR /api/live:", err);
        return res
            .status(500)
            .json({ error: "Failed to load streams" });
    }
});

/**
 * BACKWARDS COMPAT ENDPOINT
 * GET /api/live/streams
 * Voor oude frontend / oude bundles die nog /streams gebruiken
 */
router.get("/streams", async (req, res) => {
    try {
        const streams = await Stream.find({
            isLive: true,
            status: "live",
        })
            .populate("host", "username avatar isVerified")
            .select("-viewerList -bannedUsers -blockedWords")
            .sort({ viewers: -1 });

        return res.json(Array.isArray(streams) ? streams : []);
    } catch (err) {
        console.error("❌ DISCOVERY ERROR /api/live/streams:", err);
        return res
            .status(500)
            .json({ error: "Failed to load streams" });
    }
});

// ===========================================
// START LIVE STREAM
// ===========================================

/**
 * POST /api/live/start
 * Start a new stream for the authenticated user
 */
router.post("/start", auth, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const {
            title,
            description,
            category,
            tags,
            language,
            type,
            mode,
            coverImage,
        } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res
                .status(404)
                .json({ error: "User not found" });
        }

        // Check if user already has an active live
        const existing = await Stream.findOne({
            streamerId: user._id,
            isLive: true,
            status: "live",
        });

        if (existing) {
            return res.json(existing);
        }

        const stream = new Stream({
            title: title || `${user.username}'s live`,
            description: description || "",
            streamerId: user._id,
            streamerName: user.username,
            streamerAvatar: user.avatar || "",
            isVerifiedStreamer: !!user.isVerified,

            roomId: generateRoomId(),
            streamKey: generateStreamKey(user._id),

            category: category || "General",
            tags: Array.isArray(tags) ? tags : [],
            language: language || "en",

            type: type || "solo",
            mode: mode || "video",

            coverImage: coverImage || "",
            isLive: true,
            status: "live",
            startedAt: new Date(),
        });

        await stream.save();

        return res.status(201).json(stream);
    } catch (err) {
        console.error("❌ ERROR STARTING STREAM:", err);
        return res
            .status(500)
            .json({ error: "Failed to start stream" });
    }
});

// ===========================================
// GET SINGLE STREAM
// ===========================================

/**
 * GET /api/live/:id
 * Get stream details
 */
router.get("/:id", async (req, res) => {
    try {
        const id = safeId(req.params.id);
        if (!id) {
            return res
                .status(400)
                .json({ error: "Invalid stream id" });
        }

        const stream = await Stream.findById(id)
            .populate("host", "username avatar isVerified")
            .populate("seats.userId", "username avatar");

        if (!stream) {
            return res
                .status(404)
                .json({ error: "Stream not found" });
        }

        return res.json(stream);
    } catch (err) {
        console.error("❌ ERROR GET STREAM:", err);
        return res
            .status(500)
            .json({ error: "Failed to fetch stream" });
    }
});

// ===========================================
// END LIVE STREAM
// ===========================================

/**
 * POST /api/live/:id/end
 * End a stream (owner or admin)
 */
router.post("/:id/end", auth, async (req, res) => {
    try {
        const id = safeId(req.params.id);
        if (!id) {
            return res
                .status(400)
                .json({ error: "Invalid stream id" });
        }

        const stream = await Stream.findById(id);
        if (!stream) {
            return res
                .status(404)
                .json({ error: "Stream not found" });
        }

        const userId = String(req.user.id || req.user._id);

        const isOwner =
            String(stream.streamerId) === userId;
        const isAdmin =
            req.user.role === "admin" ||
            req.user.email === "menziesalm@gmail.com";

        if (!isOwner && !isAdmin) {
            return res
                .status(403)
                .json({ error: "Not allowed to end this stream" });
        }

        await Stream.endStream(stream._id);

        return res.json({ success: true });
    } catch (err) {
        console.error("❌ ERROR END STREAM:", err);
        return res
            .status(500)
            .json({ error: "Failed to end stream" });
    }
});

// ===========================================
// VIEWER TRACKING (OPTIONAL BASIC VERSION)
// ===========================================

/**
 * POST /api/live/:id/viewer-join
 */
router.post("/:id/viewer-join", async (req, res) => {
    try {
        const id = safeId(req.params.id);
        if (!id) {
            return res
                .status(400)
                .json({ error: "Invalid stream id" });
        }

        const { count } = req.body;
        const stream = await Stream.updateViewers(
            id,
            typeof count === "number" ? count : 0
        );

        if (!stream) {
            return res
                .status(404)
                .json({ error: "Stream not found" });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error("❌ ERROR VIEWER JOIN:", err);
        return res
            .status(500)
            .json({ error: "Failed to update viewers" });
    }
});

/**
 * POST /api/live/:id/viewer-leave
 */
router.post("/:id/viewer-leave", async (req, res) => {
    try {
        const id = safeId(req.params.id);
        if (!id) {
            return res
                .status(400)
                .json({ error: "Invalid stream id" });
        }

        const stream = await Stream.findById(id);
        if (!stream) {
            return res
                .status(404)
                .json({ error: "Stream not found" });
        }

        const newCount =
            stream.viewers > 0 ? stream.viewers - 1 : 0;
        await Stream.updateViewers(id, newCount);

        return res.json({ success: true });
    } catch (err) {
        console.error("❌ ERROR VIEWER LEAVE:", err);
        return res
            .status(500)
            .json({ error: "Failed to update viewers" });
    }
});

// ===========================================
// GIFTS (BASIC)
// ===========================================

/**
 * POST /api/live/:id/gift
 * Attach a gift to a stream + update totals
 */
router.post("/:id/gift", auth, async (req, res) => {
    try {
        const id = safeId(req.params.id);
        if (!id) {
            return res
                .status(400)
                .json({ error: "Invalid stream id" });
        }

        const { giftType, icon, amount, coins } = req.body;

        const userId = req.user.id || req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res
                .status(404)
                .json({ error: "User not found" });
        }

        const gift = {
            userId,
            username: user.username,
            giftType,
            icon,
            amount,
            coins,
            timestamp: new Date(),
        };

        await Stream.addGift(id, gift);

        // Optional: opslaan in Gift-collection
        try {
            await Gift.create({
                fromUser: userId,
                streamId: id,
                type: giftType,
                icon,
                amount: amount || coins,
            });
        } catch (e) {
            console.warn(
                "Gift save failed (non-blocking):",
                e.message
            );
        }

        return res.json({ success: true });
    } catch (err) {
        console.error("❌ ERROR ADD GIFT:", err);
        return res
            .status(500)
            .json({ error: "Failed to send gift" });
    }
});

// ===========================================
// EXPORT
// ===========================================
module.exports = router;
