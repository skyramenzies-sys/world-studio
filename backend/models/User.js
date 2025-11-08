const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
        notifications: [
            {
                type: {
                    type: String,
                    enum: ["like", "comment", "follow", "support"],
                },
                message: String,
                timestamp: Date,
                read: { type: Boolean, default: false },
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

userSchema.methods.comparePassword = async function (pw) {
    return await bcrypt.compare(pw, this.password);
};

module.exports = mongoose.model("User", userSchema);
