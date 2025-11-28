// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// Register (public)
router.post("/register", async (req, res) => {
    try {
        const { email, username, password, avatar, bio } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ error: "Missing fields" });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ error: "Email already registered" });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ error: "Username already taken" });
        }

        // Create user with initial wallet balance (welcome bonus)
        const user = new User({
            email,
            username,
            password,
            avatar: avatar || "",
            bio: bio || "",
            wallet: {
                balance: 100, // Welcome bonus!
                totalReceived: 0,
                totalSpent: 0,
            }
        });

        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d",
        });

        res.status(201).json({
            _id: user._id,
            userId: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            followers: user.followers || [],
            following: user.following || [],
            totalViews: user.totalViews || 0,
            totalLikes: user.totalLikes || 0,
            earnings: user.earnings || 0,
            wallet: user.wallet || { balance: 100 },
            notifications: user.notifications || [],
            role: user.role || "user",
            createdAt: user.createdAt,
            token,
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Missing fields" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const match = await user.comparePassword(password);
        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "30d",
        });

        res.json({
            _id: user._id,
            userId: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio || "",
            followers: user.followers || [],
            following: user.following || [],
            totalViews: user.totalViews || 0,
            totalLikes: user.totalLikes || 0,
            earnings: user.earnings || 0,
            wallet: user.wallet || { balance: 0 },
            notifications: user.notifications || [],
            role: user.role || "user",
            createdAt: user.createdAt,
            token,
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update profile
router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const { username, bio, avatar } = req.body;

        const updateData = {};
        if (username) updateData.username = username;
        if (bio !== undefined) updateData.bio = bio;
        if (avatar) updateData.avatar = avatar;

        const user = await User.findByIdAndUpdate(
            req.userId,
            updateData,
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Change password
router.put("/password", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Missing fields" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const match = await user.comparePassword(currentPassword);
        if (!match) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: "Password updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;