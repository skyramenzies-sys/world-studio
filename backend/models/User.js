const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const walletTransactionSchema = new mongoose.Schema({
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: "" },
    date: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        avatar: { type: String, default: "" },
        bio: { type: String, default: "New creator on World-Studio" },
        role: { type: String, enum: ["creator", "admin"], default: "creator" },

        followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        wallet: {
            balance: { type: Number, default: 0 },
            transactions: [walletTransactionSchema],
        },

        totalViews: { type: Number, default: 0 },
        totalLikes: { type: Number, default: 0 },
        earnings: { type: Number, default: 0 },

        notifications: [
            {
                type: { type: String, enum: ["like", "comment", "follow", "support", "gift"] },
                message: String,
                timestamp: { type: Date, default: Date.now },
                read: { type: Boolean, default: false },
                fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                giftId: { type: mongoose.Schema.Types.ObjectId, ref: "Gift" },
            },
        ],
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = function (pw) {
    return bcrypt.compare(pw, this.password);
};

userSchema.methods.addNotification = async function (payload) {
    this.notifications.push({
        ...payload,
        timestamp: payload.timestamp || new Date(),
    });
    await this.save();
};

module.exports = mongoose.model("User", userSchema);
