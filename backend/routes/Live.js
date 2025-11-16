// backend/routes/Live.js
const express = require("express");
const router = express.Router();
const Stream = require("../models/Stream");
const authMiddleware = require("../middleware/authMiddleware");

// =========================
// HELPER: format response
// =========================
const formatStream = (s) => ({
    id: s._id,
    title: s.title,
    category: s.category,
    coverImage: s.coverImage,
    streamerId: s.streamerId,
    streamerName: s.streamerName,
    viewers: s.viewers,
    isLive: s.isLive,
    startedAt: s.startedAt,
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
            .sort({ viewers: -1 })
            .lean();

        res.json(streams.map(formatStream));

    } catch (err) {
        console.error("Live stream fetch error:", err);
        res.status(500).json({ error: "Failed to fetch live streams." });
    }
});

// =========================
// POST: Start a stream
// /api/live/start
// =========================
router.post("/start", authMiddleware, async (req, res) => {
    try {
        const { title, category, coverImage } = req.body;
        const user = req.user;

        if (!title) return res.status(400).json({ error: "Title required" });

        const stream = await Stream.create({
            title,
            category: category || "General",
            coverImage: coverImage || null,
            streamerId: user._id,
            streamerName: user.username,
            viewers: 0,
            isLive: true,
            startedAt: new Date(),
        });

        // notify clients
        const io = req.app.get("io");
        if (io) io.emit("stream_started", formatStream(stream));

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
            { isLive: false },
            { new: true }
        );

        if (!stream) return res.status(404).json({ error: "Stream not found" });

        const io = req.app.get("io");
        if (io) io.emit("stream_stopped", { id });

        res.json({ message: "Stream stopped", stream: formatStream(stream) });

    } catch (err) {
        console.error("Stream stop error:", err);
        res.status(500).json({ error: "Failed to stop stream." });
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

        res.json({ viewers: stream.viewers });

    } catch (err) {
        console.error("View increment error:", err);
        res.status(500).json({ error: "Failed to update viewers." });
    }
});

module.exports = router;
