// backend/models/Stream.js
"use strict";

const mongoose = require("mongoose");

const streamSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Stream title is required"],
            trim: true,
            maxlength: 150
        },

        streamerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        streamerName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        category: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "General"
        },

        coverImage: {
            type: String,
            trim: true,
            default: ""
        },

        viewers: {
            type: Number,
            default: 0,
            min: [0, "Viewers cannot be negative"],
            index: true
        },

        isLive: {
            type: Boolean,
            default: true,
            index: true
        },

        startedAt: {
            type: Date,
            default: Date.now,
            index: true
        },

        endedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Trending sort: live first, then by viewers
streamSchema.index({ isLive: 1, viewers: -1 });

// Fetch streamer history efficiently
streamSchema.index({ streamerId: 1, startedAt: -1 });

module.exports = mongoose.model("Stream", streamSchema);
