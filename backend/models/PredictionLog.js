// backend/models/PredictionLog.js
const mongoose = require("mongoose");

const predictionLogSchema = new mongoose.Schema({
    symbol: { type: String, required: true },
    currentPrice: { type: Number },
    predictedPrice: { type: Number, required: true },
    change: { type: Number },
    changePercent: { type: Number },
    confidence: { type: Number, required: true },
    user: { type: String, default: "system" },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PredictionLog", predictionLogSchema);
