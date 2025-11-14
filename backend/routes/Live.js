// backend/routes/live.js
const express = require("express");
const router = express.Router();
const Stream = require("../models/Stream");
const authMiddleware = require("../middleware/authmiddleware");

// Get all live streams (for discover, supports search and filter)
router.get("/", async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = { isLive: true };
        if (category && category !== "All") query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { streamerName: { $regex: search, $options: "i" } }
            ];
        }
        const streams = await Stream.find(query).sort({ viewers: -1 }); // trending = most viewers
        res.json(streams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start a stream
router.post("/start", authMiddleware, async (req, res) => {
    try {
        const { title, category, coverImage } = req.body;
        const user = req.user;
        const stream = await Stream.create({
            title,
            streamerId: user._id,
            streamerName: user.username,
            category,
            coverImage,
            viewers: 0,
            isLive: true,
            startedAt: new Date(),
        });
        // Notify via socket.io
        req.app.get("io").emit("start_stream");
        res.status(201).json(stream);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Stop a stream
router.post("/stop/:id", authMiddleware, async (req, res) => {
    try {
        const stream = await Stream.findByIdAndUpdate(
            req.params.id,
            { isLive: false },
            { new: true }
        );
        req.app.get("io").emit("stop_stream");
        res.json({ message: "Stream stopped", stream });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Increment viewers
router.post("/:id/view", async (req, res) => {
    try {
        const stream = await Stream.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewers: 1 } },
            { new: true }
        );
        res.json({ viewers: stream.viewers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
