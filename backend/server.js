// backend/server.js - WORLD-STUDIO ULTIMATE EDITION 🌌
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

// --------------------------------------------------
// GLOBAL CORS FIX (PRODUCTION + SOCKET READY)
// --------------------------------------------------

const allowedOrigins = [
    "https://www.world-studio.live",
    "https://world-studio.live",
    "http://localhost:5173",
    "http://localhost:3000",
];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn("❌ BLOCKED ORIGIN:", origin);
                callback(new Error("CORS blocked: " + origin));
            }
        },
        methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        allowedHeaders: "Content-Type,Authorization",
        credentials: true,
    })
);

// Preflight
app.options("*", cors());

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
const uploadsDir = process.env.UPLOADS_DIR || "uploads";
app.use("/uploads", express.static(path.join(__dirname, uploadsDir)));

// --------------------------------------------------
// DATABASE
// --------------------------------------------------

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
const adminRoutes = require("./routes/admin");

// LIVE routes optioneel, geen crash als file mist
let liveRoutes = null;
try {
    liveRoutes = require("./routes/live");
    console.log("🎥 Live routes loaded");
} catch (err) {
    console.warn("⚠️ ./routes/live niet gevonden – live API uitgeschakeld.");
}

// Base
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "World-Studio Backend is running",
    });
});

// API root
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

if (liveRoutes) {
    app.use("/api/live", liveRoutes);
}

app.use("/api/admin", adminRoutes);

// --------------------------------------------------
// EXPRESS 5 SAFE 404 HANDLER
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

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------
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
