// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// ✅ IMPORTANT: Trust proxy - Required for Railway/Vercel/Heroku
// This fixes the X-Forwarded-For header error with express-rate-limit
app.set("trust proxy", 1);

const server = http.createServer(app);

// Security Middleware
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);

// Rate Limiting
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 400, // limit each IP to 400 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
    })
);

// CORS Configuration
const allowedOrigins = (process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:5173", "https://world-studio.vercel.app"]
).map((o) => o.trim());

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

// Body Parsing Middleware
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Health Check Endpoint
app.get("/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/stocks", require("./routes/stocks"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/platform-wallet", require("./routes/platformWallet"));
app.use("/api/admin-wallet", require("./routes/adminWallet"));
app.use("/api/gifts", require("./routes/gifts.route"));
app.use("/api/live", require("./routes/Live"));
app.use("/api/live-analytics", require("./routes/LiveAnalytics"));

// Root Endpoint
app.get("/", (req, res) => {
    res.json({
        message: "🚀 World-Studio API running in production mode",
        version: "1.0.0",
        status: "online"
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("❌ Unhandled Error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});

// MongoDB Connection
if (!process.env.MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI in environment variables");
    process.exit(1);
}

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ MongoDB connected successfully");
    })
    .catch((err) => {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    });

// Socket.io Configuration
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Socket.io Event Handlers
io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // Join user's personal room for notifications
    socket.on("join_user_room", (userId) => {
        if (userId) {
            socket.join(`user_${userId}`);
            console.log(`User ${socket.id} joined personal room: user_${userId}`);
        }
    });

    // Leave user's personal room
    socket.on("leave_user_room", (userId) => {
        if (userId) {
            socket.leave(`user_${userId}`);
            console.log(`User ${socket.id} left personal room: user_${userId}`);
        }
    });

    // Join a livestream room
    socket.on("join_stream", (streamId) => {
        if (streamId) {
            socket.join(`stream_${streamId}`);
            console.log(`User ${socket.id} joined stream ${streamId}`);
        }
    });

    // Leave a livestream room
    socket.on("leave_stream", (streamId) => {
        if (streamId) {
            socket.leave(`stream_${streamId}`);
            console.log(`User ${socket.id} left stream ${streamId}`);
        }
    });

    // Handle chat messages
    socket.on("chat_message", (data) => {
        if (!data || !data.streamId) {
            console.warn("Invalid chat message data");
            return;
        }

        const messageData = {
            ...data,
            timestamp: new Date(),
            socketId: socket.id
        };

        io.to(`stream_${data.streamId}`).emit("chat_message", messageData);
    });

    // Admin actions
    socket.on("admin_stop_stream", (streamId) => {
        if (streamId) {
            io.emit("admin_stream_stopped", streamId);
            console.log(`Admin stopped stream ${streamId}`);
        }
    });

    socket.on("admin_ban_user", (userId) => {
        if (userId) {
            io.emit("admin_user_banned", userId);
            console.log(`Admin banned user ${userId}`);
        }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
    });
});

// Make io accessible to routes
app.set("io", io);

// Graceful Shutdown Handler
const shutdown = () => {
    console.log("🔄 Shutting down gracefully...");
    server.close(() => {
        console.log("✅ HTTP server closed");
        mongoose.connection.close(false, () => {
            console.log("✅ MongoDB connection closed");
            console.log("🔒 Clean shutdown completed");
            process.exit(0);
        });
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error("⚠️ Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
    shutdown();
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
    shutdown();
});

// Start Server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Production server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🌐 CORS enabled for: ${allowedOrigins.join(", ")}`);
});

module.exports = { app, server, io };