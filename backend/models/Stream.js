// backend/models/Stream.js
const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
    title: { type: String, required: true },
    streamerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    streamerName: { type: String, required: true },
    streamerAvatar: { type: String, default: "" },
    roomId: { type: String, default: "" },
    category: { type: String, default: "General" },
    coverImage: { type: String, default: "" },
    viewers: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    isLive: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    totalGifts: { type: Number, default: 0 },
    tags: [{ type: String }],
}, { timestamps: true });

// Index for faster queries
streamSchema.index({ isLive: 1, viewers: -1 });
streamSchema.index({ streamerId: 1, isLive: 1 });
streamSchema.index({ category: 1, isLive: 1 });

module.exports = mongoose.model("Stream", streamSchema);