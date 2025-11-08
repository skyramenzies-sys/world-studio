// backend/routes/live.js
const express = require("express");
const router = express.Router();
const LiveStream = require("../models/LiveStream");
const auth = require("../middleware/auth");

// 🔴 Start a new live stream
router.post("/start", auth, async (req, res) => {
    try {
        const { title, category, coverImage } = req.body;
        const stream = new LiveStream({
            streamerId: req.userId,
            streamerName: req.user.username,
            title,
            category,
            coverImage,
            isLive: true,
            startedAt: new Date(),
        });
        await stream.save();
        req.io.emit("start_stream", stream); // realtime notify
        res.status(201).json(stream);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🟢 Stop stream
router.post("/:id/stop", auth, async (req, res) => {
    try {
        const stream = await LiveStream.findById(req.params.id);
        if (!stream) return res.status(404).json({ error: "Stream not found" });
        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();
        req.io.emit("stop_stream", stream);
        res.json({ message: "Stream ended", stream });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 💬 Chat message
router.post("/:id/chat", auth, async (req, res) => {
    try {
        const { text } = req.body;
        const stream = await LiveStream.findById(req.params.id);
        if (!stream) return res.status(404).json({ error: "Stream not found" });
        const message = {
            userId: req.userId,
            username: req.user.username,
            text,
        };
        stream.chat.push(message);
        await stream.save();
        req.io.emit("chat_message", { streamId: stream._id, message });
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🎁 Send gift
router.post("/:id/gift", auth, async (req, res) => {
    try {
        const { amount, icon, message } = req.body;
        const stream = await LiveStream.findById(req.params.id);
        if (!stream) return res.status(404).json({ error: "Stream not found" });
        const gift = {
            senderId: req.userId,
            senderName: req.user.username,
            amount,
            icon,
            message,
        };
        stream.gifts.push(gift);
        await stream.save();
        req.io.emit("send_gift", { streamId: stream._id, gift });
        res.json(gift);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🧭 Get all live streams
router.get("/", async (req, res) => {
    const streams = await LiveStream.find({ isLive: true }).sort({ startedAt: -1 });
    res.json(streams);
});

module.exports = router;
