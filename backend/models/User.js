// backend/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const notificationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ["follow", "like", "comment", "gift", "live", "mention", "system"],
        default: "system"
    },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    streamId: { type: mongoose.Schema.Types.ObjectId, ref: "Stream" },
    amount: { type: Number },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

const walletSchema = new mongoose.Schema({
    balance: { type: Number, default: 0 },
    totalReceived: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
});

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minLength: 2,
        maxLength: 30,
    },
    password: {
        type: String,
        required: true,
        minLength: 6,
    },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "", maxLength: 500 },

    // Social
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Stats
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalPosts: { type: Number, default: 0 },
    totalStreams: { type: Number, default: 0 },

    // Monetization
    wallet: { type: walletSchema, default: () => ({ balance: 0, totalReceived: 0, totalSpent: 0 }) },
    earnings: { type: Number, default: 0 },

    // Notifications
    notifications: [notificationSchema],

    // Settings
    role: { type: String, enum: ["user", "creator", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    // Streaming
    isLive: { type: Boolean, default: false },
    currentStreamId: { type: mongoose.Schema.Types.ObjectId, ref: "Stream" },

}, { timestamps: true });

// Indexes
userSchema.index({ username: "text", email: "text" });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Add notification helper
userSchema.methods.addNotification = async function (notification) {
    this.notifications.push({
        ...notification,
        createdAt: new Date(),
    });

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(-100);
    }

    return this.save();
};

// Virtual for follower count
userSchema.virtual("followerCount").get(function () {
    return this.followers?.length || 0;
});

userSchema.virtual("followingCount").get(function () {
    return this.following?.length || 0;
});

// Ensure virtuals are included in JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("User", userSchema);