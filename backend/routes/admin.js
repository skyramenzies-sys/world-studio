// backend/routes/admin.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Prediction = require("../models/Prediction");
const PredictionLog = require("../models/PredictionLog");
const authMiddleware = require("../middleware/authMiddleware");

// Admin dashboard stats
router.get("/stats", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Access denied" });
        }

        const [users, posts, predictions] = await Promise.all([
            User.find().select("username createdAt"),
            Post.find().select("title views likes createdAt"),
            Prediction.find().select("symbol predictedPrice confidence createdAt").limit(20),
        ]);

        const latestUsers = users.slice(-10).reverse();
        const latestPosts = posts.slice(-10).reverse();
        const latestPredictions = predictions.slice(-10).reverse();

        const totalUsers = users.length;
        const totalPosts = posts.length;
        const totalPredictions = predictions.length;
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);

        res.json({
            totalUsers,
            totalPosts,
            totalPredictions,
            totalLikes,
            totalViews,
            latestUsers,
            latestPosts,
            latestPredictions,
            timestamp: new Date(),
        });
    } catch (err) {
        console.error("Admin stats error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Log prediction
router.post("/log-prediction", async (req, res) => {
    try {
        const { symbol, predictedPrice, confidence, user } = req.body;

        const log = new PredictionLog({
            symbol,
            predictedPrice,
            confidence,
            user: user || "system",
        });

        await log.save();
        res.json({ message: "Prediction logged successfully", log });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
