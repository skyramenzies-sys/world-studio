// backend/routes/live.js
// World-Studio.live - LIVE ROUTES (UNIVERSE EDITION 🌌)

const express = require("express");
const router = express.Router();

const LiveStream = require("../models/LiveStream");
const User = require("../models/User");
const auth = require("../middleware/auth");
const checkBan = require("../middleware/checkBan");

// ---------------------------------------------
// HELPERS
// ---------------------------------------------
const toPublicStream = (stream) => {
    if (!stream) return null;
    return {
        _id: stream._id,
        title: stream.title,
        description: stream.description,
        isLive: stream.isLive,
        viewerCount: stream.viewerCount || 0,
        kind: stream.kind || "camera",
        user: stream.user && stream.user._id ? {
            _id: stream.user._id,
            username: stream.user.username,
            displayName: stream.user.displayName,
            avatar: stream.user.avatar,
            isVerified: stream.user.isVerified,
        } : stream.user,
        createdAt: stream.createdAt,
        endedAt: stream.endedAt,
    };
};

// ---------------------------------------------
// START STREAM
// POST /api/live/start
// ---------------------------------------------
router.post("/start", auth, checkBan, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, kind } = req.body || {};

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        // Als er nog een oude live sessie open staat, sluit hem
        await LiveStream.updateMany(
            { user: userId, isLive: true },
            { isLive: false, endedAt: new Date() }
        );

        const stream = await LiveStream.create({
            user: userId,
            title: title || "Live on World-Studio",
            description: description || "",
            kind: kind || "camera",
            isLive: true,
        });

        user.isLive = true;
        user.currentStreamId = stream._id;
        await user.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("live:started", {
                streamId: stream._id.toString(),
                userId: userId.toString(),
            });
        }

        res.json({
            success: true,
            stream: toPublicStream(stream),
        });
    } catch (err) {
        console.error("❌ POST /live/start error:", err);
        res.status(500).json({ success: false, error: "Failed to start stream" });
    }
});

// ---------------------------------------------
// STOP STREAM
// POST /api/live/:id/end
router.post("/:id/end", auth, checkBan, async (req, res) => {
    try {
        const stream = await LiveStream.findById(req.params.id);
        if (!stream) return res.status(404).json({ error: "Stream not found" });
        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();
        await User.findByIdAndUpdate(stream.user, { isLive: false, currentStreamId: null });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to end stream" });
    }
});

// POST /api/live/stop/:id
// ---------------------------------------------
// POST /api/live/:id/end (alias voor stop)
router.post("/:id/end", auth, checkBan, async (req, res) => {
    try {
        const stream = await LiveStream.findById(req.params.id);
        if (!stream) return res.status(404).json({ error: "Stream not found" });
        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();
        await User.findByIdAndUpdate(stream.user, { isLive: false, currentStreamId: null });
        res.json({ success: true });
    } catch (err) {
        console.error("❌ POST /live/:id/end error:", err);
        res.status(500).json({ error: "Failed to end stream" });
    }
});
router.post("/stop/:id", auth, checkBan, async (req, res) => {
    try {
        const userId = req.user.id;
        const streamId = req.params.id;

        const stream = await LiveStream.findById(streamId);
        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }

        if (stream.user.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, error: "Not your stream" });
        }

        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();

        const user = await User.findById(userId);
        if (user) {
            user.isLive = false;
            user.currentStreamId = null;
            await user.save();
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("live:stopped", {
                streamId: streamId.toString(),
                userId: userId.toString(),
            });
        }

        res.json({
            success: true,
            stream: toPublicStream(stream),
        });
    } catch (err) {
        console.error("❌ POST /live/stop/:id error:", err);
        res.status(500).json({ success: false, error: "Failed to stop stream" });
    }
});

// ---------------------------------------------
// LIST LIVE STREAMS
// GET /api/live?isLive=true
// ---------------------------------------------
router.get("/", async (req, res) => {
    try {
        const { isLive, limit = 20 } = req.query;

        const filter = {};
        if (isLive === "true") {
            filter.isLive = true;
        }

        const streams = await LiveStream.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit, 10) || 20)
            .populate("user", "username displayName avatar isVerified");

        res.json({
            success: true,
            streams: streams.map(toPublicStream),
        });
    } catch (err) {
        console.error("❌ GET /live error:", err);
        res.status(500).json({ success: false, error: "Failed to load streams" });
    }
});

// ---------------------------------------------
// SINGLE STREAM
// GET /api/live/:id
// ---------------------------------------------
router.get("/:id", async (req, res) => {
    try {
        const stream = await LiveStream.findById(req.params.id).populate(
            "user",
            "username displayName avatar isVerified"
        );

        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }

        res.json({
            success: true,
            stream: toPublicStream(stream),
        });
    } catch (err) {
        console.error("❌ GET /live/:id error:", err);
        res.status(500).json({ success: false, error: "Failed to load stream" });
    }
});

// ---------------------------------------------
// USER STATUS
// GET /api/live/user/:userId/status
// ---------------------------------------------
router.get("/user/:userId/status", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select(
            "isLive currentStreamId username avatar displayName"
        );
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        res.json({
            success: true,
            isLive: !!user.isLive,
            currentStreamId: user.currentStreamId || null,
            user: {
                _id: user._id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
            },
        });
    } catch (err) {
        console.error("❌ GET /live/user/:userId/status error:", err);
        res.status(500).json({ success: false, error: "Failed to load status" });
    }
});

// ---------------------------------------------
// USER HISTORY
// GET /api/live/user/:userId/history
// ---------------------------------------------
router.get("/user/:userId/history", async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const streams = await LiveStream.find({
            user: req.params.userId,
        })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit, 10) || 20);

        res.json({
            success: true,
            streams: streams.map(toPublicStream),
        });
    } catch (err) {
        console.error("❌ GET /live/user/:userId/history error:", err);
        res.status(500).json({ success: false, error: "Failed to load history" });
    }
});

module.exports = router;
