// backend/models/LiveStream.js
const mongoose = require("mongoose");

const GiftSchema = new mongoose.Schema({
    senderId: String,
    senderName: String,
    amount: Number,
    icon: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
});

const ChatSchema = new mongoose.Schema({
    userId: String,
    username: String,
    text: String,
    timestamp: { type: Date, default: Date.now },
});

const LiveStreamSchema = new mongoose.Schema({
    streamerId: { type: String, required: true },
    streamerName: String,
    title: String,
    category: String,
    coverImage: String,
    isLive: { type: Boolean, default: false },
    viewers: { type: Number, default: 0 },
    gifts: [GiftSchema],
    chat: [ChatSchema],
    startedAt: { type: Date },
    endedAt: { type: Date },
});

module.exports = mongoose.model("LiveStream", LiveStreamSchema);
