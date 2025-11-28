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
    roomId: s.roomId || s._id?.toString(), // Include roomId for WebRTC
    title: s.title,
    category: s.category,
    coverImage: s.coverImage,
    streamerId: s.streamerId,
    streamerName: s.streamerName,
    streamerAvatar: s.streamerAvatar,
    viewers: s.viewers,
    isLive: s.isLive,
    startedAt: s.startedAt,
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
            count: result.modifiedCount
        });
    } catch (err) {
        console.error("Cleanup error:", err);
        res.status(500).json({ error: "Cleanup failed" });
    }
});

// =========================
// POST: Admin Cleanup - Stop ALL zombie streams (older than 24h)
// /api/live/admin/cleanup
// =========================
router.post("/admin/cleanup", authMiddleware, async (req, res) => {
    try {
        // Only allow admin
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Admin only" });
        }

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const result = await Stream.updateMany(
            {
                isLive: true,
                startedAt: { $lt: twentyFourHoursAgo }
            },
            { isLive: false, endedAt: new Date() }
        );

        res.json({
            message: "Cleaned up zombie streams",
            count: result.modifiedCount
        });
    } catch (err) {
        console.error("Admin cleanup error:", err);
        res.status(500).json({ error: "Admin cleanup failed" });
    }
});

// =========================
// GET: All live streams
// /api/live
// =========================
router.get("/", async (req, res) => {
    try {
        const { category, search } = req.query;
        const query = { isLive: true };

        if (category && category !== "All") {
            query.category = category;
        }

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
        const { title, category, coverImage, roomId } = req.body;
        const user = req.user;

        if (!title) return res.status(400).json({ error: "Title required" });

        // Check if user already has an active stream
        const existingStream = await Stream.findOne({
            streamerId: user._id,
            isLive: true,
        });

        if (existingStream) {
            // End the old stream first
            existingStream.isLive = false;
            await existingStream.save();
        }

        // Create new stream
        const stream = await Stream.create({
            title,
            category: category || "General",
            coverImage: coverImage || null,
            streamerId: user._id,
            streamerName: user.username,
            streamerAvatar: user.avatar || "",
            roomId: roomId || `stream_${user._id}_${Date.now()}`,
            viewers: 0,
            isLive: true,
            startedAt: new Date(),
        });

        const io = req.app.get("io");

        // Notify ALL clients that a new stream started
        if (io) {
            io.emit("stream_started", formatStream(stream));
            io.emit("live_started", formatStream(stream));
        }

        // Notify followers that this user went live
        if (user.followers && user.followers.length > 0) {
            const followers = await User.find({
                _id: { $in: user.followers }
            }).select("_id");

            for (const follower of followers) {
                // Add notification to follower
                await User.findByIdAndUpdate(follower._id, {
                    $push: {
                        notifications: {
                            message: `${user.username} is now live: "${title}"`,
                            type: "live",
                            fromUser: user._id,
                            streamId: stream._id,
                            read: false,
                            createdAt: new Date(),
                        }
                    }
                });

                // Send realtime notification via socket
                if (io) {
                    io.to(`user_${follower._id}`).emit("followed_user_live", {
                        streamId: stream._id,
                        username: user.username,
                        avatar: user.avatar,
                        title: title,
                    });

                    io.to(`user_${follower._id}`).emit("notification", {
                        type: "live",
                        message: `${user.username} is now live!`,
                    });
                }
            }

            console.log(`📢 Notified ${followers.length} followers that ${user.username} is live`);
        }

        res.status(201).json(formatStream(stream));
    } catch (err) {
        console.error("Stream start error:", err);
        res.status(500).json({ error: "Failed to start stream." });
    }
});

// =========================
// POST: Create stream (alternative route)
// /api/live
// =========================
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { title, category, coverImage, roomId } = req.body;
        const user = req.user;

        if (!title) return res.status(400).json({ error: "Title required" });

        // Check if user already has an active stream
        const existingStream = await Stream.findOne({
            streamerId: user._id,
            isLive: true,
        });

        if (existingStream) {
            existingStream.isLive = false;
            await existingStream.save();
        }

        const stream = await Stream.create({
            title,
            category: category || "General",
            coverImage: coverImage || null,
            streamerId: user._id,
            streamerName: user.username,
            streamerAvatar: user.avatar || "",
            roomId: roomId || `stream_${user._id}_${Date.now()}`,
            viewers: 0,
            isLive: true,
            startedAt: new Date(),
        });

        const io = req.app.get("io");

        if (io) {
            io.emit("stream_started", formatStream(stream));
            io.emit("live_started", formatStream(stream));
        }

        // Notify followers
        if (user.followers && user.followers.length > 0) {
            const followers = await User.find({
                _id: { $in: user.followers }
            }).select("_id");

            for (const follower of followers) {
                await User.findByIdAndUpdate(follower._id, {
                    $push: {
                        notifications: {
                            message: `${user.username} is now live: "${title}"`,
                            type: "live",
                            fromUser: user._id,
                            streamId: stream._id,
                            read: false,
                            createdAt: new Date(),
                        }
                    }
                });

                if (io) {
                    io.to(`user_${follower._id}`).emit("followed_user_live", {
                        streamId: stream._id,
                        username: user.username,
                        avatar: user.avatar,
                        title: title,
                    });

                    io.to(`user_${follower._id}`).emit("notification", {
                        type: "live",
                        message: `${user.username} is now live!`,
                    });
                }
            }
        }

        res.status(201).json(formatStream(stream));
    } catch (err) {
        console.error("Stream start error:", err);
        res.status(500).json({ error: "Failed to start stream." });
    }
});

// =========================
// POST: Stop stream
// /api/live/stop/:id
// =========================
router.post("/stop/:id", authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const stream = await Stream.findByIdAndUpdate(
            id,
            { isLive: false, endedAt: new Date() },
            { new: true }
        );

        if (!stream) return res.status(404).json({ error: "Stream not found" });

        const io = req.app.get("io");
        if (io) {
            io.emit("stream_stopped", { id });
            io.emit("live_stopped", { _id: id, id });
        }

        res.json({ message: "Stream stopped", stream: formatStream(stream) });
    } catch (err) {
        console.error("Stream stop error:", err);
        res.status(500).json({ error: "Failed to stop stream." });
    }
});

// =========================
// POST: End stream (alternative)
// /api/live/:id/end
// =========================
router.post("/:id/end", authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const stream = await Stream.findByIdAndUpdate(
            id,
            { isLive: false, endedAt: new Date() },
            { new: true }
        );

        if (!stream) return res.status(404).json({ error: "Stream not found" });

        const io = req.app.get("io");
        if (io) {
            io.emit("stream_stopped", { id });
            io.emit("live_stopped", { _id: id, id });
        }

        res.json({ message: "Stream ended", stream: formatStream(stream) });
    } catch (err) {
        console.error("Stream end error:", err);
        res.status(500).json({ error: "Failed to end stream." });
    }
});

// =========================
// POST: Increment viewers
// /api/live/:id/view
// =========================
router.post("/:id/view", async (req, res) => {
    try {
        const id = req.params.id;
        const stream = await Stream.findByIdAndUpdate(
            id,
            { $inc: { viewers: 1 } },
            { new: true }
        ).lean();

        if (!stream) return res.status(404).json({ error: "Stream not found" });

        const io = req.app.get("io");
        if (io) {
            io.emit("viewer_count_update", { streamId: id, viewers: stream.viewers });
        }

        res.json({ viewers: stream.viewers });
    } catch (err) {
        console.error("View increment error:", err);
        res.status(500).json({ error: "Failed to update viewers." });
    }
});

// =========================
// POST: Join stream
// /api/live/:id/join
// =========================
router.post("/:id/join", async (req, res) => {
    try {
        const id = req.params.id;
        const stream = await Stream.findByIdAndUpdate(
            id,
            { $inc: { viewers: 1 } },
            { new: true }
        ).lean();

        if (!stream) return res.status(404).json({ error: "Stream not found" });

        const io = req.app.get("io");
        if (io) {
            io.emit("viewer_count_update", { streamId: id, viewers: stream.viewers });
        }

        res.json(formatStream(stream));
    } catch (err) {
        console.error("Join stream error:", err);
        res.status(500).json({ error: "Failed to join stream." });
    }
});

// =========================
// POST: Leave stream
// /api/live/:id/leave
// =========================
router.post("/:id/leave", async (req, res) => {
    try {
        const id = req.params.id;
        const stream = await Stream.findByIdAndUpdate(
            id,
            { $inc: { viewers: -1 } },
            { new: true }
        ).lean();

        if (!stream) return res.status(404).json({ error: "Stream not found" });

        // Ensure viewers doesn't go negative
        if (stream.viewers < 0) {
            await Stream.findByIdAndUpdate(id, { viewers: 0 });
            stream.viewers = 0;
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("viewer_count_update", { streamId: id, viewers: Math.max(0, stream.viewers) });
        }

        res.json({ viewers: Math.max(0, stream.viewers) });
    } catch (err) {
        console.error("Leave stream error:", err);
        res.status(500).json({ error: "Failed to leave stream." });
    }
});

module.exports = router;