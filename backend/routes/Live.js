// backend/routes/live.js
// World-Studio.live – Live Streaming API (Universe Edition)

const express = require("express");
const router = express.Router();

const LiveStream = require("../models/LiveStream");
const User = require("../models/User");
const auth = require("../middleware/auth");

// ============ GET ALL LIVE STREAMS ============
router.get("/", async (req, res) => {
    try {
        const streams = await LiveStream.find({ isLive: true })
            .populate("user", "username avatar")
            .sort({ startedAt: -1 });

        res.json({ success: true, streams });
    } catch (err) {
        console.error("❌ Live fetch error:", err);
        res.status(500).json({ success: false, error: "Failed to load streams" });
    }
});

// ============ GET STREAM BY ID ============
router.get("/:id", async (req, res) => {
    try {
        const stream = await LiveStream.findById(req.params.id)
            .populate("user", "username avatar");

        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }

        res.json({ success: true, stream });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

// ============ START STREAM ============
router.post("/start", auth, async (req, res) => {
    try {
        const { title, category } = req.body;

        const stream = await LiveStream.create({
            user: req.userId,
            title,
            category,
            isLive: true,
            startedAt: new Date(),
        });

        res.json({ success: true, stream });
    } catch (err) {
        console.error("❌ Start stream error:", err);
        res.status(500).json({ success: false, error: "Could not start stream" });
    }
});

// ============ STOP STREAM ============
router.post("/stop/:id", auth, async (req, res) => {
    try {
        const stream = await LiveStream.findById(req.params.id);

        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }

        if (stream.user.toString() !== req.userId.toString()) {
            return res.status(403).json({ success: false, error: "Not your stream" });
        }

        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();

        res.json({ success: true, message: "Stream stopped", stream });
    } catch (err) {
        console.error("❌ Stop error:", err);
        res.status(500).json({ success: false, error: "Failed to stop stream" });
    }
});


// ============ END STREAM (ALIAS FOR /stop) ============
router.post("/:id/end", auth, async (req, res) => {
    try {
        const stream = await LiveStream.findById(req.params.id);
        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }
        // Allow owner or admin
        const isOwner = stream.user.toString() === req.userId.toString();
        const user = await User.findById(req.userId);
        const isAdmin = user?.role === "admin";
        
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: "Not authorized" });
        }
        
        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();
        
        // Update user status
        await User.findByIdAndUpdate(stream.user, { isLive: false, currentStreamId: null });
        
        res.json({ success: true, message: "Stream ended", stream });
    } catch (err) {
        console.error("❌ End stream error:", err);
        res.status(500).json({ success: false, error: "Failed to end stream" });
    }
});

module.exports = router;
