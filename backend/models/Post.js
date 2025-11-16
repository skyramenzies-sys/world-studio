// backend/models/Post.js
"use strict";

const mongoose = require("mongoose");

// ------------------------------
// COMMENT SUB-SCHEMA
// ------------------------------
const commentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        username: {
            type: String,
            trim: true,
            maxlength: 100,
            required: true
        },

        avatar: {
            type: String,
            trim: true,
            default: ""
        },

        text: {
            type: String,
            trim: true,
            maxlength: 500,
            required: true
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

// ------------------------------
// POST MAIN SCHEMA
// ------------------------------
const postSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        username: {
            type: String,
            trim: true,
            maxlength: 100
        },

        avatar: {
            type: String,
            trim: true,
            default: ""
        },

        title: {
            type: String,
            trim: true,
            maxlength: 120,
            default: ""
        },

        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
        },

        type: {
            type: String,
            enum: ["image", "video", "audio"],
            default: "image"
        },

        fileUrl: {
            type: String,
            trim: true,
            required: true
        },

        thumbnail: {
            type: String,
            trim: true,
            default: ""
        },

        likes: {
            type: Number,
            default: 0,
            min: 0
        },

        likedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        views: {
            type: Number,
            default: 0,
            min: 0
        },

        comments: {
            type: [commentSchema],
            default: []
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Indexes for speed
postSchema.index({ createdAt: -1 });
postSchema.index({ type: 1 });
postSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
