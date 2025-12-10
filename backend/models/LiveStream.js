// backend/models/LiveStream.js
const mongoose = require("mongoose");

const LiveStreamSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        roomId: { type: String, unique: true, sparse: true },
        title: { type: String, default: "" },
        category: { type: String, default: "general" },
        mode: { type: String, enum: ["solo", "multi", "audio"], default: "solo" },
        
        isLive: { type: Boolean, default: true },
        viewerCount: { type: Number, default: 0 },
        
        seatCount: { type: Number, default: 12 },
        
        thumbnail: { type: String, default: "" },
        background: { type: String, default: "" },
        
        allowGifts: { type: Boolean, default: true },
        allowComments: { type: Boolean, default: true },
        
        totalGifts: { type: Number, default: 0 },
        totalCoins: { type: Number, default: 0 },
        
        startedAt: { type: Date, default: Date.now },
        endedAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model("LiveStream", LiveStreamSchema);
