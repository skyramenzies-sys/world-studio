// backend/routes/live.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const LiveStream = require("../models/LiveStream");
const User = require("../models/User");
const auth = require("../middleware/auth");

// Helper: find stream by ID or roomId
const findStream = async (idOrRoomId) => {
    if (mongoose.Types.ObjectId.isValid(idOrRoomId)) {
        const stream = await LiveStream.findById(idOrRoomId).populate("user", "username avatar");
        if (stream) return stream;
    }
    return await LiveStream.findOne({ roomId: idOrRoomId }).populate("user", "username avatar");
};

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

// ============ GET STREAM BY ID OR ROOMID ============
router.get("/:id", async (req, res) => {
    try {
        const stream = await findStream(req.params.id);
        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }
        res.json({ success: true, stream });
    } catch (err) {
        console.error("❌ Get stream error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

// ============ START STREAM ============
router.post("/start", auth, async (req, res) => {
    try {
        const { title, category, mode, roomId, seatCount, background } = req.body;
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        // End any existing live streams for this user
        await LiveStream.updateMany(
            { user: req.userId, isLive: true },
            { isLive: false, endedAt: new Date() }
        );

        // Generate roomId if not provided
        // roomId wordt gezet na create

        const stream = await LiveStream.create({
            user: req.userId,
            // roomId wordt later gezet als _id
            title: title || `${user.username}'s Live`,
            category: category || "Chat",
            mode: mode || "solo",
            seatCount: seatCount || 12,
            background: background || "",
            isLive: true,
            startedAt: new Date(),
        });

        // Set roomId to _id
        await LiveStream.findByIdAndUpdate(stream._id, { roomId: stream._id.toString() });
        // Update user status
        await User.findByIdAndUpdate(req.userId, {
            isLive: true,
            currentStreamId: stream._id
        });

        const populatedStream = await LiveStream.findById(stream._id).populate("user", "username avatar");
        
        res.json({ success: true, stream: populatedStream });
    } catch (err) {
        console.error("❌ Start stream error:", err);
        res.status(500).json({ success: false, error: "Could not start stream" });
    }
});

// ============ UPDATE STREAM ============
router.put("/:id", auth, async (req, res) => {
    try {
        const stream = await findStream(req.params.id);
        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }
        
        if (stream.user._id.toString() !== req.userId.toString()) {
            return res.status(403).json({ success: false, error: "Not authorized" });
        }

        const updates = {};
        if (req.body.title) updates.title = req.body.title;
        if (req.body.category) updates.category = req.body.category;
        if (req.body.background) updates.background = req.body.background;
        if (req.body.viewerCount !== undefined) updates.viewerCount = req.body.viewerCount;

        const updated = await LiveStream.findByIdAndUpdate(stream._id, updates, { new: true })
            .populate("user", "username avatar");
        
        res.json({ success: true, stream: updated });
    } catch (err) {
        console.error("❌ Update stream error:", err);
        res.status(500).json({ success: false, error: "Failed to update stream" });
    }
});

// ============ STOP STREAM ============
router.post("/stop/:id", auth, async (req, res) => {
    try {
        const stream = await findStream(req.params.id);
        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }

        if (stream.user._id.toString() !== req.userId.toString()) {
            return res.status(403).json({ success: false, error: "Not your stream" });
        }

        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();

        await User.findByIdAndUpdate(stream.user._id, { isLive: false, currentStreamId: null });

        res.json({ success: true, message: "Stream stopped", stream });
    } catch (err) {
        console.error("❌ Stop error:", err);
        res.status(500).json({ success: false, error: "Failed to stop stream" });
    }
});

// ============ END STREAM ============
router.post("/:id/end", auth, async (req, res) => {
    try {
        const stream = await findStream(req.params.id);
        if (!stream) {
            // If no stream found, just return success (already ended)
            return res.json({ success: true, message: "Stream already ended" });
        }

        const isOwner = stream.user._id.toString() === req.userId.toString();
        const user = await User.findById(req.userId);
        const isAdmin = user?.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, error: "Not authorized" });
        }

        stream.isLive = false;
        stream.endedAt = new Date();
        await stream.save();

        await User.findByIdAndUpdate(stream.user._id, { isLive: false, currentStreamId: null });

        res.json({ success: true, message: "Stream ended", stream });
    } catch (err) {
        console.error("❌ End stream error:", err);
        res.status(500).json({ success: false, error: "Failed to end stream" });
    }
});

// ============ JOIN STREAM (VIEWER) ============
router.post("/:id/join", auth, async (req, res) => {
    try {
        const stream = await findStream(req.params.id);
        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }

        // Add viewer if not already in list
        if (!stream.viewers.includes(req.userId)) {
            stream.viewers.push(req.userId);
            stream.viewerCount = stream.viewers.length;
            await stream.save();
        }

        res.json({ success: true, stream });
    } catch (err) {
        console.error("❌ Join stream error:", err);
        res.status(500).json({ success: false, error: "Failed to join stream" });
    }
});

// ============ LEAVE STREAM (VIEWER) ============
router.post("/:id/leave", auth, async (req, res) => {
    try {
        const stream = await findStream(req.params.id);
        if (!stream) {
            return res.json({ success: true });
        }

        stream.viewers = stream.viewers.filter(v => v.toString() !== req.userId.toString());
        stream.viewerCount = stream.viewers.length;
        await stream.save();

        res.json({ success: true });
    } catch (err) {
        console.error("❌ Leave stream error:", err);
        res.status(500).json({ success: false, error: "Failed to leave stream" });
    }
});

// ============ REQUEST SEAT (MULTI-GUEST) ============
router.post("/:id/request-seat", auth, async (req, res) => {
    try {
        const stream = await findStream(req.params.id);
        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }

        const user = await User.findById(req.userId);
        
        res.json({ 
            success: true, 
            message: "Seat request sent",
            user: { _id: user._id, username: user.username, avatar: user.avatar }
        });
    } catch (err) {
        console.error("❌ Request seat error:", err);
        res.status(500).json({ success: false, error: "Failed to request seat" });
    }
});

// ============ ACCEPT GUEST (HOST ONLY) ============
router.post("/:id/accept-guest", auth, async (req, res) => {
    try {
        const { oderId, seatIndex } = req.body;
        const stream = await findStream(req.params.id);
        
        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }

        if (stream.user._id.toString() !== req.userId.toString()) {
            return res.status(403).json({ success: false, error: "Only host can accept guests" });
        }

        const guest = await User.findById(oderId);
        if (!guest) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        // Add guest to stream
        stream.guests.push({
            oderId: guest._id,
            odername: guest.username,
            seatIndex,
            joinedAt: new Date()
        });
        await stream.save();

        res.json({ success: true, stream });
    } catch (err) {
        console.error("❌ Accept guest error:", err);
        res.status(500).json({ success: false, error: "Failed to accept guest" });
    }
});

// ============ REMOVE GUEST (HOST ONLY) ============
router.post("/:id/remove-guest", auth, async (req, res) => {
    try {
        const { oderId } = req.body;
        const stream = await findStream(req.params.id);
        
        if (!stream) {
            return res.status(404).json({ success: false, error: "Stream not found" });
        }

        if (stream.user._id.toString() !== req.userId.toString()) {
            return res.status(403).json({ success: false, error: "Only host can remove guests" });
        }

        stream.guests = stream.guests.filter(g => g.oderId.toString() !== oderId);
        await stream.save();

        res.json({ success: true, stream });
    } catch (err) {
        console.error("❌ Remove guest error:", err);
        res.status(500).json({ success: false, error: "Failed to remove guest" });
    }
});

module.exports = router;
