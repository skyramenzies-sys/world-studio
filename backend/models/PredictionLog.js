// backend/models/PredictionLog.js
const mongoose = require("mongoose");

const predictionLogSchema = new mongoose.Schema({
    symbol: { type: String, required: true },
    currentPrice: { type: Number, required: true },
    predictedPrice: { type: Number, required: true },
    change: { type: Number, required: true },
    changePercent: { type: Number, required: true },
    confidence: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PredictionLog", predictionLogSchema);
