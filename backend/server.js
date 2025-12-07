// backend/server.js - WORLD-STUDIO ULTIMATE EDITION 🌌
require("dotenv").config();
const express = require("express");

const cors = require("cors");
const path = require("path");

const app = express();

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const FRONTEND_URL =
    process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
    cors({
        origin: [FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
        credentials: false,
    })
);

// Static uploads
const uploadsDir = process.env.UPLOADS_DIR || "uploads";
app.use("/uploads", express.static(path.join(__dirname, uploadsDir)));

// --------------------------------------------------
// DATABASE
// --------------------------------------------------
const mongoose = require("mongoose");
const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/world-studio";

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1);
    });

// --------------------------------------------------
// ROUTES
// --------------------------------------------------
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const liveRoutes = require("./routes/live");
const adminRoutes = require("./routes/admin");

// Base check
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "World-Studio Backend is running",
    });
});

// API root
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/live", liveRoutes);

// 🚨 CORRECT MOUNT FOR ADMIN
app.use("/api/admin", adminRoutes);

// --------------------------------------------------
// Express 5-safe Fallback for unknown /api routes
// --------------------------------------------------
app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            error: "API route not found",
            path: req.originalUrl,
        });
    }
    next();
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("🔥 Global error:", err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || "Internal server error",
    });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 World-Studio backend running on port ${PORT}`);
});

module.exports = app;
