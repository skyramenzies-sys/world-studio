// backend/server.js - WORLD-STUDIO ULTIMATE EDITION 🌌
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

// --------------------------------------------------
// GLOBAL CORS (API + SOCKET.IO)
// --------------------------------------------------

const allowedOrigins = [
    "https://www.world-studio.live",
    "https://world-studio.live",

    "https://world-studio.vercel.app",
    "https://world-studio.vercel.app", // dubbel maar geen probleem
    "http://localhost:5173",
    "http://localhost:3000",
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Toestaan voor tools (curl, Postman) zonder origin
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn("❌ [CORS] BLOCKED ORIGIN:", origin);
                callback(new Error("CORS blocked: " + origin));
            }
        },
        methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        allowedHeaders: "Content-Type,Authorization",
        credentials: true,
    })
);

// Preflight - Express 5 compatible
app.options("/{*splat}", cors());

// --------------------------------------------------
// BODY PARSERS
// (Stripe webhook heeft RAW body nodig → skip /api/wallet/webhook)
// --------------------------------------------------

// JSON
app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api/wallet/webhook")) {
        return next();
    }
    express.json({ limit: "10mb" })(req, res, next);
});

// URL-encoded
app.use((req, res, next) => {
    if (req.originalUrl.startsWith("/api/wallet/webhook")) {
        return next();
    }
    express.urlencoded({ extended: true })(req, res, next);
});

// Static uploads
const uploadsDir = process.env.UPLOADS_DIR || "uploads";
app.use("/uploads", express.static(path.join(__dirname, uploadsDir)));

// --------------------------------------------------
// DATABASE
// --------------------------------------------------

const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/world-studio";

mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1);
    });

// --------------------------------------------------
// ROUTES (CORE)
// --------------------------------------------------
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/upload");
const walletRoutes = require("./routes/wallet");
const streamCleanupRoutes = require("./routes/streamCleanupRoutes");

// Optionele LIVE routes (geen crash als file mist)
let liveRoutes = null;
try {
    liveRoutes = require("./routes/Live");
    console.log("🎥 Live routes loaded");
} catch (err) {
    console.warn("⚠️ ./routes/live niet gevonden – live API uitgeschakeld.");
}

// Optionele Crypto proxy (CoinGecko)
let cryptoRoutes = null;
try {
    cryptoRoutes = require("./routes/crypto");
    console.log("💰 Crypto routes loaded");
} catch (err) {
    console.warn("⚠️ ./routes/crypto niet gevonden – crypto API uitgeschakeld.");
}

// --------------------------------------------------
// BASE ENDPOINT
// --------------------------------------------------
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "World-Studio Backend is running 🌌",
    });
});

// --------------------------------------------------
// API ROOT MAPPINGS
// --------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);

// Posts routes
const postsRoutes = require("./routes/posts");
app.use("/api/posts", postsRoutes);
console.log("📝 Posts routes loaded");
app.use("/api/wallet", walletRoutes);
app.use("/api/stream-cleanup", streamCleanupRoutes);

if (liveRoutes) {
    app.use("/api/live", liveRoutes);
}

if (cryptoRoutes) {
    app.use("/api/crypto", cryptoRoutes);
}

// --------------------------------------------------
// EXPRESS 5 SAFE 404 HANDLER (ALLEEN VOOR /api/*)
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
// HTTP SERVER + SOCKET.IO (PK, LIVE, WALLET, ETC.)
// --------------------------------------------------
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn("❌ [SOCKET CORS] BLOCKED ORIGIN:", origin);
                callback(new Error("CORS blocked: " + origin));
            }
        },
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Maak io beschikbaar in alle routes → req.app.get("io")
app.set("io", io);

// SOCKET HANDLERS
const registerPkSocket = require("./sockets/pkSocket");
// (Als je later liveSocket/chatSocket hebt kun je die hier ook registreren)

io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // PK Battle events
    registerPkSocket(io, socket);

    socket.on("disconnect", () => {
        console.log("🔌 Socket disconnected:", socket.id);
    });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 World-Studio backend running on port ${PORT}`);
});

// Hoofd-export blijft app (compatibel), maar server/io hangen eraan
module.exports = app;
module.exports.server = server;
module.exports.io = io;
