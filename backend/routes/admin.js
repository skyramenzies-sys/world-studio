// backend/routes/admin.js
"use strict";

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const User = require("../models/User");
const Post = require("../models/Post");
const Prediction = require("../models/Prediction");
const PredictionLog = require("../models/PredictionLog");

// ----------------------------
// ADMIN-ONLY PROTECTION
// ----------------------------
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied. Admins only." });
    }
    next();
}

// ----------------------------
// ADMIN DASHBOARD STATISTICS
// ----------------------------
router.get("/stats", authMiddleware, requireAdmin, async (req, res) => {
    try {
        // PARALLEL QUERIES FOR MAX SPEED
        const [users, posts, predictions] = await Promise.all([
            User.find().sort({ createdAt: -1 }).limit(500).select("username createdAt"),
            Post.find().sort({ createdAt: -1 }).limit(500).select("title views likes createdAt"),
            Prediction.find().sort({ createdAt: -1 }).limit(50).select("symbol predictedPrice confidence createdAt")
        ]);

        const totalUsers = await User.countDocuments();
        const totalPosts = await Post.countDocuments();
        const totalPredictions = await Prediction.countDocuments();

        const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);

        res.json({
            totals: {
                users: totalUsers,
                posts: totalPosts,
                predictions: totalPredictions,
                likes: totalLikes,
                views: totalViews
            },
            latestUsers: users.slice(0, 10),
            latestPosts: posts.slice(0, 10),
            latestPredictions: predictions.slice(0, 10),
            timestamp: new Date()
        });

    } catch (err) {
        console.error("🔥 Admin stats error:", err);
        res.status(500).json({ error: "Failed to load admin statistics" });
    }
});

// ----------------------------
// LOG A NEW AI PREDICTION
// ----------------------------
router.post("/log-prediction", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { symbol, currentPrice, predictedPrice, change, changePercent, confidence } = req.body;

        if (!symbol || !predictedPrice || confidence === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const log = await PredictionLog.create({
            symbol,
            currentPrice: currentPrice || 0,
            predictedPrice,
            change: change || (predictedPrice - currentPrice),
            changePercent: changePercent || 0,
            confidence
        });

        res.json({
            message: "Prediction logged successfully",
            log
        });

    } catch (err) {
        console.error("🔥 Log prediction error:", err);
        res.status(500).json({ error: "Failed to log prediction" });
    }
});

module.exports = router;
