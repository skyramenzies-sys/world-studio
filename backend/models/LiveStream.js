// backend/models/LiveStream.js
// World-Studio.live - Simple Live Stream Model (UNIVERSE EDITION 🌌)

const mongoose = require("mongoose");

const liveStreamSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: { type: String, default: "Live on World-Studio" },
        description: { type: String, default: "" },

        isLive: { type: Boolean, default: true },

        viewerCount: { type: Number, default: 0 },

        // Optioneel: stream type (camera, screen, etc.)
        kind: { type: String, default: "camera" },
        roomId: { type: String, index: true },

        // Handige velden
        createdAt: { type: Date, default: Date.now },
        endedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

module.exports =
    mongoose.models.LiveStream ||
    mongoose.model("LiveStream", liveStreamSchema);
