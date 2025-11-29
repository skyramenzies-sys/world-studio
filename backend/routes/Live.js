// backend/routes/Live.js
const express = require("express");
const router = express.Router();
const Stream = require("../models/Stream");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// =========================
// HELPER: format response
// =========================
const formatStream = (s) => ({
    _id: s._id,
    id: s._id,
    roomId: s.roomId || s._id?.toString(),
    title: s.title,
    category: s.category,
    coverImage: s.coverImage,
    streamerId: s.streamerId,
    streamerName: s.streamerName,
    streamerAvatar: s.streamerAvatar,
    viewers: s.viewers,
    isLive: s.isLive,
    startedAt: s.startedAt,
    type: s.type || "solo",
    maxSeats: s.maxSeats || 1,
    host: {
        _id: s.streamerId,
        username: s.streamerName,
        avatar: s.streamerAvatar,
    }
});

// =========================
// POST: Cleanup - Stop all my streams
// /api/live/cleanup
// =========================
router.post("/cleanup", authMiddleware, async (req, res) => {
    try {
        const result = await Stream.updateMany(
            { streamerId: req.userId, isLive: true },
            { isLive: false, endedAt: new Date() }
        );

        const io = req.app.get("io");
        if (io) {
            io.emit("streams_cleaned", { userId: req.userId });
        }

        res.json({
            message: "Cleaned up all your streams",
            count: result.modifiedCount || 0,
        });
    } catch (err) {
        console.error("Cleanup error:", err);
        res.status(500).json({ error: "Failed to cleanup streams." });
    }
});

// =========================
// GET: All live streams
// /api/live
// Query params: category, search, userId, isLive
// =========================
router.get("/", async (req, res) => {
    try {
        const { category, search, userId, isLive } = req.query;

        // Build query - default to isLive: true unless explicitly set to false
        const query = {};

        // Handle isLive filter
        if (isLive === "false") {
            query.isLive = false;
        } else if (isLive === "true" || isLive === undefined) {
            query.isLive = true;
        }
        // If isLive is "all", don't filter by isLive

        // Filter by userId if provided
        if (userId) {
            query.streamerId = userId;
        }

        // Filter by category
        if (category && category !== "All") {
            query.category = category;
        }

        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { streamerName: { $regex: search, $options: "i" } },
            ];
        }

        const streams = await Stream.find(query)
            .sort({ viewers: -1, startedAt: -1 })
            .lean();

        res.json(streams.map(formatStream));
    } catch (err) {
        console.error("Live stream fetch error:", err);
        res.status(500).json({ error: "Failed to fetch live streams." });
    }
});

// =========================
// GET: Check if user is currently live
// /api/live/user/:userId/status
// =========================
router.get("/user/:userId/status", async (req, res) => {
    try {
        const stream = await Stream.findOne({
            streamerId: req.params.userId,
            isLive: true
        }).lean();

        res.json({
            isLive: !!stream,
            stream: stream ? formatStream(stream) : null
        });
    } catch (err) {
        console.error("Check live status error:", err);
        res.status(500).json({ error: "Failed to check live status." });
    }
});

// =========================
// GET: Single stream by ID or roomId
// /api/live/:id
// =========================
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        let stream;

        // Try finding by MongoDB _id first
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            stream = await Stream.findById(id).lean();
        }

        // If not found, try by roomId
        if (!stream) {
            stream = await Stream.findOne({ roomId: id, isLive: true }).lean();
        }

        if (!stream) {
            return res.status(404).json({ error: "Stream not found" });
        }

        res.json(formatStream(stream));
    } catch (err) {
        console.error("Stream fetch error:", err);
        res.status(500).json({ error: "Failed to fetch stream." });
    }
});

// =========================
// POST: Start a stream
// /api/live/start
// =========================
router.post("/start", authMiddleware, async (req, res) => {
    try {
        const { title, category, coverImage, type, maxSeats } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        // End any existing live streams for this user
        await Stream.updateMany(
            { streamerId: req.userId, isLive: true },
            { isLive: false, endedAt: new Date() }
        );

        const user = await User.findById(req.userId).select("username avatar");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const stream = new Stream({
            title,
            category: category || "Other",
            coverImage: coverImage || "",
            streamerId: req.userId,
            streamerName: user.username,
            streamerAvatar: user.avatar || "",
            isLive: true,
            viewers: 0,
            startedAt: new Date(),
            type: type || "solo",
            maxSeats: maxSeats || 1,
        });

        await stream.save();

        // Notify followers
        const io = req.app.get("io");
        if (io) {
            io.emit("new_stream", formatStream(stream));

            // Send notification to followers
            const streamer = await User.findById(req.userId).populate("followers");
            if (streamer?.followers) {
                streamer.followers.forEach(followerId => {
                    io.to(`user_${followerId}`).emit("followed_user_live", {
                        streamId: stream._id,
                        streamerName: user.username,
                        title: stream.title,
                    });
                });
            }
        }

        res.status(201).json(formatStream(stream));
    } catch (err) {
        console.error("Start stream error:", err);
        res.status(500).json({ error: "Failed to start stream." });
    }
});

// =========================
// POST: End a stream
// /api/live/:id/end
// =========================
router.post("/:id/end", authMiddleware, async (req, res) => {
    try {
        const stream = await Stream.findById(req.params.id);

        if (!stream) {
            return res.status(404).json({ error: "Stream not found" });
        }

        if (stream.streamerId.toString() !== req.userId.toString()) {
            return res.status(403).json({ error: "Not authorized to end this stream" });
        }

        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("stream_ended", { streamId: stream._id });
            io.to(`stream_${stream._id}`).emit("stream_ended", { streamId: stream._id });
        }

        res.json({ message: "Stream ended", stream: formatStream(stream) });
    } catch (err) {
        console.error("End stream error:", err);
        res.status(500).json({ error: "Failed to end stream." });
    }
});

// =========================
// POST: Join a stream (increment viewers)
// /api/live/:id/join
// =========================
router.post("/:id/join", async (req, res) => {
    try {
        const stream = await Stream.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewers: 1 } },
            { new: true }
        );

        if (!stream) {
            return res.status(404).json({ error: "Stream not found" });
        }

        const io = req.app.get("io");
        if (io) {
            io.to(`stream_${stream._id}`).emit("viewer_count", { count: stream.viewers });
        }

        res.json(formatStream(stream));
    } catch (err) {
        console.error("Join stream error:", err);
        res.status(500).json({ error: "Failed to join stream." });
    }
});

// =========================
// POST: Leave a stream (decrement viewers)
// /api/live/:id/leave
// =========================
router.post("/:id/leave", async (req, res) => {
    try {
        const stream = await Stream.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewers: -1 } },
            { new: true }
        );

        if (!stream) {
            return res.status(404).json({ error: "Stream not found" });
        }

        // Ensure viewers doesn't go below 0
        if (stream.viewers < 0) {
            stream.viewers = 0;
            await stream.save();
        }

        const io = req.app.get("io");
        if (io) {
            io.to(`stream_${stream._id}`).emit("viewer_count", { count: stream.viewers });
        }

        res.json(formatStream(stream));
    } catch (err) {
        console.error("Leave stream error:", err);
        res.status(500).json({ error: "Failed to leave stream." });
    }
});

module.exports = router;