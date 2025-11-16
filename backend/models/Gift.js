// backend/models/Gift.js
"use strict";

const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Sender is required"],
            index: true
        },

        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Recipient is required"],
            index: true
        },

        amount: {
            type: Number,
            min: [1, "Amount must be at least 1"],
            default: 1,
            validate: {
                validator: Number.isFinite,
                message: "Amount must be a number"
            }
        },

        item: {
            type: String,
            required: [true, "Gift item name is required"],
            trim: true,
            maxlength: [100, "Item name too long"]
        },

        itemIcon: {
            type: String,
            default: "",
            trim: true
        },

        itemImage: {
            type: String,
            default: "",
            trim: true
        },

        message: {
            type: String,
            default: "",
            trim: true,
            maxlength: [200, "Message too long"]
        }
    },
    {
        timestamps: true,
        versionKey: false // cleaner documents
    }
);

// Add compound index for analytics (most common query)
giftSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Gift", giftSchema);
