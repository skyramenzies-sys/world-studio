const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema({
    title: { type: String, required: true },
    streamerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    streamerName: { type: String, required: true },
    category: { type: String, default: "General" },
    coverImage: { type: String, default: "" },
    viewers: { type: Number, default: 0 },
    isLive: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Stream", streamSchema);
