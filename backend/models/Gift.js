const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema(
    {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        amount: {
            type: Number,
            default: 1,
            min: [1, "Amount must be at least 1"],
        },
        item: { type: String, required: true },
        itemIcon: { type: String, default: "" },
        itemImage: { type: String, default: "" },
        message: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Gift", giftSchema);

