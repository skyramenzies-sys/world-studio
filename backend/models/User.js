// backend/models/User.js
"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// -------------------------------------
// USER SCHEMA
// -------------------------------------
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
            index: true
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 100,
            match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
            index: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false // security: never return password by default
        },

        avatar: {
            type: String,
            trim: true,
            default: ""
        },

        bio: {
            type: String,
            trim: true,
            maxlength: 300,
            default: "New creator on World-Studio"
        },

        role: {
            type: String,
            enum: ["creator", "admin"],
            default: "creator",
            index: true
        },

        followers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        following: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        notifications: [
            {
                type: {
                    type: String,
                    enum: ["like", "comment", "follow", "support"],
                    required: true
                },
                message: {
                    type: String,
                    trim: true,
                    maxlength: 200
                },
                timestamp: {
                    type: Date,
                    default: Date.now
                },
                read: {
                    type: Boolean,
                    default: false
                }
            }
        ]
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// -------------------------------------
// PASSWORD HASHING
// -------------------------------------
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(12); // stronger security
    this.password = await bcrypt.hash(this.password, salt);

    next();
});

// -------------------------------------
// PASSWORD COMPARE
// -------------------------------------
userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

// -------------------------------------
// UNIQUE INDEXES
// -------------------------------------
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });

module.exports = mongoose.model("User", userSchema);
