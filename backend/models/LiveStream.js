const mongoose = require("mongoose");
const liveStreamSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    roomId: { type: String, index: true },
    title: { type: String, default: "Live on World-Studio" },
    description: { type: String, default: "" },
    isLive: { type: Boolean, default: true },
    viewerCount: { type: Number, default: 0 },
    kind: { type: String, default: "camera" },
    type: { type: String, default: "solo" },
    createdAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.models.LiveStream || mongoose.model("LiveStream", liveStreamSchema);
