const mongoose = require("mongoose");

const PlatformWalletSchema = new mongoose.Schema({
    balance: {
        type: Number,
        default: 0,
    },
    history: [
        {
            amount: Number,
            fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            reason: String,
            date: {
                type: Date,
                default: Date.now,
            },
        },
    ],
});

module.exports = mongoose.model("PlatformWallet", PlatformWalletSchema);
