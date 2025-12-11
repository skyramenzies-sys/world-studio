const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const LiveStream = require("../models/LiveStream");
const User = require("../models/User");
const auth = require("../middleware/auth");
const checkBan = require("../middleware/checkBan");

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

// POST /api/live/start
router.post("/start", auth, checkBan, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, kind, type } = req.body || {};
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        await LiveStream.updateMany({ user: userId, isLive: true }, { isLive: false, endedAt: new Date() });

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

        user.isLive = true;
        user.currentStreamId = stream._id;
        await user.save();

        const populated = await LiveStream.findById(stream._id).populate("user", "username avatar");
        res.json({ success: true, stream: toPublicStream(populated) });
    } catch (err) {
        console.error("POST /live/start error:", err);
        res.status(500).json({ error: "Failed to start stream" });
    }
});

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
router.post("/stop/:id", auth, checkBan, async (req, res) => {
    try {
        const stream = await LiveStream.findById(req.params.id);
        if (!stream) return res.status(404).json({ error: "Stream not found" });
        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();
        await User.findByIdAndUpdate(stream.user, { isLive: false, currentStreamId: null });
        res.json({ success: true, stream: toPublicStream(stream) });
    } catch (err) {
        res.status(500).json({ error: "Failed to stop stream" });
    }
});

// GET /api/live
router.get("/", async (req, res) => {
    try {
        const { isLive, limit = 20 } = req.query;
        const filter = {};
        if (isLive === "true") filter.isLive = true;
        const streams = await LiveStream.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit)).populate("user", "username avatar");
        res.json({ success: true, streams: streams.map(toPublicStream) });
    } catch (err) {
        res.status(500).json({ error: "Failed to load streams" });
    }
});

// GET /api/live/:id - zoekt op _id OF roomId
router.get("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        let stream = null;

        if (mongoose.Types.ObjectId.isValid(id)) {
            stream = await LiveStream.findById(id).populate("user", "username avatar");
        }
        if (!stream) {
            stream = await LiveStream.findOne({ roomId: id }).populate("user", "username avatar");
        }
        if (!stream) {
            return res.status(404).json({ error: "Stream not found" });
        }

        res.json({ success: true, stream: toPublicStream(stream) });
    } catch (err) {
        res.status(500).json({ error: "Failed to load stream" });
    }
});

module.exports = router;
