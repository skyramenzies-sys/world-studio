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
        viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        
        seatCount: { type: Number, default: 12 },
        guests: [{
            oderId: mongoose.Schema.Types.ObjectId,
            odername: String,
            seatIndex: Number,
            joinedAt: Date
        }],
        
        streamKey: { type: String },
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

// Index for faster lookups
LiveStreamSchema.index({ roomId: 1 });
LiveStreamSchema.index({ user: 1, isLive: 1 });

module.exports = mongoose.model("LiveStream", LiveStreamSchema);
