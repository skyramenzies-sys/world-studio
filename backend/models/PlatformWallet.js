// backend/models/PlatformWallet.js
"use strict";

const mongoose = require("mongoose");

// -------------------------
// TRANSACTION SUB-SCHEMA
// -------------------------
const TransactionSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            required: [true, "Transaction amount is required"],
            validate: {
                validator: Number.isFinite,
                message: "Amount must be a valid number"
            }
        },

        fromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        reason: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "Transaction"
        },

        date: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        _id: false // saves storage, improves performance
    }
);

// -------------------------
// PLATFORM WALLET MAIN SCHEMA
// -------------------------
const PlatformWalletSchema = new mongoose.Schema(
    {
        balance: {
            type: Number,
            default: 0,
            min: [0, "Platform balance cannot be negative"],
            validate: {
                validator: Number.isFinite,
                message: "Balance must be a valid number"
            }
        },

        history: {
            type: [TransactionSchema],
            default: []
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Index for analytics (largest queries)
PlatformWalletSchema.index({ balance: 1 });

module.exports = mongoose.model("PlatformWallet", PlatformWalletSchema);
