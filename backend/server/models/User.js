const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: [
                'creator',
                'designer',
                'videographer',
                'musician',
                'streamer',
                'admin',
            ],
            default: 'creator',
        },
        avatar: {
            // 🧠 Nu volledig compatibel met upload route
            type: String,
            default: '/uploads/default-avatar.png', // standaard profielfoto
        },
        bio: {
            type: String,
            default: 'New creator on World-Studio ✨',
        },
        followers: {
            type: [String], // lijst van userId's
            default: [],
        },
        following: {
            type: [String], // lijst van userId's
            default: [],
        },
        totalViews: {
            type: Number,
            default: 0,
        },
        totalLikes: {
            type: Number,
            default: 0,
        },
        earnings: {
            type: Number,
            default: 0,
        },
        notifications: [
            {
                message: String,
                type: String, // 'like', 'comment', 'follow'
                fromUser: String,
                postId: String,
                createdAt: { type: Date, default: Date.now },
                read: { type: Boolean, default: false },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// 🔐 Password hashing
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 🔍 Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// 🧩 Helper: Add notification
userSchema.methods.addNotification = async function (data) {
    this.notifications.push(data);
    await this.save();
};

module.exports = mongoose.model('User', userSchema);
