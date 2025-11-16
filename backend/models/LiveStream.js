// backend/models/LiveStream.js
"use strict";

const mongoose = require("mongoose");

// ---------------------------
// GIFT SUB-SCHEMA
// ---------------------------
const GiftSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        senderName: {
            type: String,
            trim: true,
            maxlength: 100
        },
        amount: {
            type: Number,
            min: 1,
            default: 1
        },
        icon: {
            type: String,
            trim: true,
            default: ""
        },
        message: {
            type: String,
            trim: true,
            maxlength: 200,
            default: ""
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    {
        _id: false
    }
);

// ---------------------------
// CHAT SUB-SCHEMA
// ---------------------------
const ChatSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        username: {
            type: String,
            trim: true,
            maxlength: 100
        },
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    },
    {
        _id: false
    }
);

// ---------------------------
// LIVE STREAM MAIN SCHEMA
// ---------------------------
const LiveStreamSchema = new mongoose.Schema(
    {
        streamerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        streamerName: {
            type: String,
            trim: true,
            maxlength: 100
        },

        title: {
            type: String,
            trim: true,
            maxlength: 150,
            default: ""
        },

        category: {
            type: String,
            trim: true,
            maxlength: 80,
            default: "General"
        },

        coverImage: {
            type: String,
            trim: true,
            default: ""
        },

        isLive: {
            type: Boolean,
            default: false,
            index: true
        },

        viewers: {
            type: Number,
            default: 0,
            min: 0,
            index: true
        },

        gifts: {
            type: [GiftSchema],
            default: []
        },

        chat: {
            type: [ChatSchema],
            default: []
        },

        startedAt: { type: Date, index: true },
        endedAt: { type: Date }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Performance indexes
LiveStreamSchema.index({ isLive: 1, viewers: -1 });
LiveStreamSchema.index({ streamerId: 1, startedAt: -1 });

module.exports = mongoose.model("LiveStream", LiveStreamSchema);
