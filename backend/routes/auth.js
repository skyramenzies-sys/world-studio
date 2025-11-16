// backend/routes/auth.js
"use strict";

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// ---------------------------------------------
// Helper: Create JWT
// ---------------------------------------------
function generateToken(userId) {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        {
            expiresIn: "30d",
            algorithm: "HS256"
        }
    );
}

// ---------------------------------------------
// REGISTER (Public)
// ---------------------------------------------
router.post("/register", async (req, res) => {
    try {
        const { email, username, password, avatar = "", bio = "" } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Basic validations
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res.status(400).json({ error: "Username already taken" });
        }

        const user = new User({
            email: email.toLowerCase().trim(),
            username: username.trim(),
            password,
            avatar,
            bio
        });

        await user.save();

        const token = generateToken(user._id);

        res.status(201).json({
            message: "Account created successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar
            },
            token
        });

    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Registration failed" });
    }
});

// ---------------------------------------------
// LOGIN (Public)
// ---------------------------------------------
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ error: "Missing fields" });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user)
            return res.status(401).json({ error: "Invalid credentials" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch)
            return res.status(401).json({ error: "Invalid credentials" });

        const token = generateToken(user._id);

        res.json({
            message: "Login successful",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                followers: user.followers,
                following: user.following,
                notifications: user.notifications || [],
            },
            token
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Login failed" });
    }
});

// ---------------------------------------------
// GET CURRENT USER (Protected)
// ---------------------------------------------
router.get("/me", authMiddleware, async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await User.findById(req.userId).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);

    } catch (err) {
        console.error("Me route error:", err);
        res.status(500).json({ error: "Failed to load user" });
    }
});

module.exports = router;
