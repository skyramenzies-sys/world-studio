// backend/models/PredictionLog.js
"use strict";

const mongoose = require("mongoose");

const predictionLogSchema = new mongoose.Schema(
    {
        symbol: {
            type: String,
            required: [true, "Symbol is required"],
            uppercase: true,
            trim: true,
            maxlength: 10,
            index: true
        },

        currentPrice: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isFinite,
                message: "currentPrice must be a valid number"
            }
        },

        predictedPrice: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isFinite,
                message: "predictedPrice must be a valid number"
            }
        },

        change: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isFinite,
                message: "change must be a valid number"
            }
        },

        changePercent: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isFinite,
                message: "changePercent must be a valid number"
            }
        },

        confidence: {
            type: Number,
            required: true,
            min: [0, "Confidence must be >= 0"],
            max: [100, "Confidence must be <= 100"]
        },

        createdAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: false,
        versionKey: false
    }
);

// Optimized for historical lookups and AI training
predictionLogSchema.index({ symbol: 1, createdAt: -1 });

module.exports = mongoose.model("PredictionLog", predictionLogSchema);
