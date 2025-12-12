const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const LiveStream = require("../models/LiveStream");
const User = require("../models/User");
const auth = require("../middleware/auth");
const checkBan = require("../middleware/checkBan");

// ============================================
// HELPER: Public stream object
// ============================================
const toPublicStream = (stream) => {
    if (!stream) return null;
    return {
        _id: stream._id,
        roomId: stream.roomId || stream._id.toString(),
        title: stream.title,
        description: stream.description,
        isLive: stream.isLive,
        viewerCount: stream.viewerCount || 0,
        kind: stream.kind || "camera",
        type: stream.type || "solo",
        user: stream.user,
        createdAt: stream.createdAt,
        endedAt: stream.endedAt,
    };
};

// ============================================
// POST /api/live/start - Start a new stream
// ============================================
router.post("/start", auth, checkBan, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, kind, type } = req.body || {};

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // End any existing live streams for this user
        await LiveStream.updateMany(
            { user: userId, isLive: true },
            { isLive: false, endedAt: new Date() }
        );

        // Create new stream
        const stream = await LiveStream.create({
            user: userId,
            title: title || "Live on World-Studio",
            description: description || "",
            kind: kind || "camera",
            type: type || "solo",
            isLive: true,
        });

        stream.roomId = stream._id.toString();
        await stream.save();

        // Update user status
        user.isLive = true;
        user.currentStreamId = stream._id;
        await user.save();

        const populated = await LiveStream.findById(stream._id).populate(
            "user",
            "username avatar"
        );

        console.log(`🎬 Stream started: ${stream._id} by user ${userId}`);

        res.json({ success: true, stream: toPublicStream(populated) });
    } catch (err) {
        console.error("POST /live/start error:", err);
        res.status(500).json({ error: "Failed to start stream" });
    }
});

// ============================================
// POST /api/live/:id/end - End a stream (owner only)
// ============================================
router.post("/:id/end", auth, checkBan, async (req, res) => {
    try {
        const streamId = req.params.id;
        const userId = req.user.id;

        const stream = await LiveStream.findById(streamId);
        if (!stream) {
            return res.status(404).json({ error: "Stream not found" });
        }

        // ✅ OWNERSHIP CHECK - only stream owner can end their stream
        if (stream.user.toString() !== userId) {
            console.warn(`⚠️ Unauthorized end attempt: user ${userId} tried to end stream ${streamId}`);
            return res.status(403).json({ error: "Not authorized to end this stream" });
        }

        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();

        await User.findByIdAndUpdate(stream.user, {
            isLive: false,
            currentStreamId: null,
        });

        console.log(`🛑 Stream ended: ${streamId} by owner ${userId}`);

        res.json({ success: true });
    } catch (err) {
        console.error("POST /live/:id/end error:", err);
        res.status(500).json({ error: "Failed to end stream" });
    }
});

// ============================================
// POST /api/live/stop/:id - Stop a stream (owner or admin)
// ============================================
router.post("/stop/:id", auth, checkBan, async (req, res) => {
    try {
        const streamId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        const stream = await LiveStream.findById(streamId);
        if (!stream) {
            return res.status(404).json({ error: "Stream not found" });
        }

        // ✅ OWNERSHIP CHECK - owner OR admin can stop
        const isOwner = stream.user.toString() === userId;
        const isAdmin = userRole === "admin";

        if (!isOwner && !isAdmin) {
            console.warn(`⚠️ Unauthorized stop attempt: user ${userId} tried to stop stream ${streamId}`);
            return res.status(403).json({ error: "Not authorized to stop this stream" });
        }

        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();

        await User.findByIdAndUpdate(stream.user, {
            isLive: false,
            currentStreamId: null,
        });

        const action = isAdmin && !isOwner ? "admin" : "owner";
        console.log(`🛑 Stream stopped: ${streamId} by ${action} ${userId}`);

        res.json({ success: true, stream: toPublicStream(stream) });
    } catch (err) {
        console.error("POST /live/stop/:id error:", err);
        res.status(500).json({ error: "Failed to stop stream" });
    }
});

// ============================================
// GET /api/live - List streams
// ============================================
router.get("/", async (req, res) => {
    try {
        const { isLive, limit = 20, skip = 0, kind, type } = req.query;

        const filter = {};
        if (isLive === "true") filter.isLive = true;
        if (isLive === "false") filter.isLive = false;
        if (kind) filter.kind = kind;
        if (type) filter.type = type;

        const streams = await LiveStream.find(filter)
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate("user", "username avatar");

        res.json({
            success: true,
            streams: streams.map(toPublicStream),
            count: streams.length,
        });
    } catch (err) {
        console.error("GET /live error:", err);
        res.status(500).json({ error: "Failed to load streams" });
    }
});

// ============================================
// GET /api/live/:id - Get single stream (by _id or roomId)
// ============================================
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        let stream = null;

        // Try to find by ObjectId first
        if (mongoose.Types.ObjectId.isValid(id)) {
            stream = await LiveStream.findById(id).populate(
                "user",
                "username avatar"
            );
        }

        // Fallback: find by roomId
        if (!stream) {
            stream = await LiveStream.findOne({ roomId: id }).populate(
                "user",
                "username avatar"
            );
        }

        if (!stream) {
            return res.status(404).json({ error: "Stream not found" });
        }

        res.json({ success: true, stream: toPublicStream(stream) });
    } catch (err) {
        console.error("GET /live/:id error:", err);
        res.status(500).json({ error: "Failed to load stream" });
    }
});

// ============================================
// GET /api/live/user/:userId/status - Get user's live status
// ============================================
router.get("/user/:userId/status", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const stream = await LiveStream.findOne({
            user: userId,
            isLive: true,
        }).populate("user", "username avatar");

        res.json({
            success: true,
            isLive: !!stream,
            stream: stream ? toPublicStream(stream) : null,
        });
    } catch (err) {
        console.error("GET /live/user/:userId/status error:", err);
        res.status(500).json({ error: "Failed to get user status" });
    }
});

// ============================================
// GET /api/live/user/:userId/history - Get user's stream history
// ============================================
router.get("/user/:userId/history", async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 10, skip = 0 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const streams = await LiveStream.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate("user", "username avatar");

        res.json({
            success: true,
            streams: streams.map(toPublicStream),
            count: streams.length,
        });
    } catch (err) {
        console.error("GET /live/user/:userId/history error:", err);
        res.status(500).json({ error: "Failed to get stream history" });
    }
});

module.exports = router;