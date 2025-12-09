// backend/models/LiveStream.js
const mongoose = require("mongoose");

const LiveStreamSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, default: "" },
        category: { type: String, default: "general" },

        isLive: { type: Boolean, default: true },
        viewerCount: { type: Number, default: 0 },

        streamKey: { type: String, required: false },
        thumbnail: { type: String, default: "" },

        startedAt: { type: Date, default: Date.now },
        endedAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model("LiveStream", LiveStreamSchema);
