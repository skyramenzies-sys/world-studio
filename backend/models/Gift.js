// backend/models/Gift.js
const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderUsername: String,
    senderAvatar: String,
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientUsername: String,
    item: { type: String, default: "Coins" },
    icon: { type: String, default: "💰" },
    amount: { type: Number, required: true, min: 1 },
    message: { type: String, maxLength: 200 },
    streamId: { type: mongoose.Schema.Types.ObjectId, ref: "Stream" },
    createdAt: { type: Date, default: Date.now },
});

giftSchema.index({ senderId: 1, createdAt: -1 });
giftSchema.index({ recipientId: 1, createdAt: -1 });
giftSchema.index({ streamId: 1 });

module.exports = mongoose.model("Gift", giftSchema);