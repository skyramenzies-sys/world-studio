// =======================================================
// World-Studio.live - Main Server Entry Point (U.E.)
// Engineered for Commander Sandro Menzies
// by AIRPATH (Ultimate Edition)
// Stack: Express + Socket.io + MongoDB + Mongoose
// =======================================================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Middleware
const auth = require("./middleware/auth");
const checkBan = require("./middleware/checkBan");
const requireAdmin = require("./middleware/requireAdmin");

// Sockets
const pkSocket = require("./sockets/pkSocket");

const isProduction = process.env.NODE_ENV === "production";

// ============================================
// 1. LOAD MODELS
// ============================================
const User = require("./models/User");
let Stream = null;
try {
    Stream = require("./models/Stream");
    console.log("✅ Stream model loaded");
} catch (err) {
    console.warn("⚠️ Stream model not loaded:", err.message);
}

// ============================================
// 2. EXPRESS SETUP
// ============================================
const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

// Security headers
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);

// ============================================
// 2a. RATE LIMITING (health endpoints uitgesloten)
// ============================================
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 500 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
    skip: (req) => {
        // Geen rate limit op health endpoints
        if (req.path === "/health" || req.path === "/healthz") return true;
        return false;
    },
});

app.use(apiLimiter);

// ============================================
// 2b. CORS CONFIGURATION (U.E.)
// ============================================

// Basis origins
let allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://world-studio.live",
    "https://www.world-studio.live",
    "https://world-studio.vercel.app", // 🔥 Vercel frontend
];

// Extra origins uit env
if (process.env.CORS_ORIGINS) {
    allowedOrigins = allowedOrigins.concat(
        process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    );
}

// FRONTEND_URL uit .env meenemen
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.trim());
}

// Uniek maken
allowedOrigins = [...new Set(allowedOrigins)];

console.log("🌍 Allowed CORS origins:", allowedOrigins);

app.use(
    cors({
        origin: (origin, callback) => {
            // Geen origin bij tools / health / server-side calls
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.warn("🚫 Blocked CORS origin:", origin);
            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

// Body parsing
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// ============================================
// 3. SOCKET.IO SETUP
// ============================================
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
});

// Make io available in routes
app.set("io", io);

// Socket state management
io.broadcasters = new Map(); // roomId -> socketId
io.viewerCounts = new Map(); // roomId -> count

io.userSockets = new Map();  // userId -> socketId

// ============================================
// 4. HEALTH & BASIC ROUTES
// ============================================
app.get("/healthz", (req, res) =>
    res.status(200).json({ status: "ok" })
);
app.get("/health", (req, res) =>
    res
        .status(200)
        .json({ status: "ok", timestamp: new Date().toISOString() })
);
app.get("/", (req, res) =>
    res.json({
        message: "🚀 World-Studio API",
        status: "online",
        version: "1.0.0",
        docs: "https://world-studio.live/api-docs",
    })
);

// ============================================
// 5. API ROUTES
// ============================================

// Auth & Users (publiek / eigen auth-check binnen routes)
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));

// Content
app.use("/api/posts", require("./routes/posts"));
app.use("/api/upload", require("./routes/upload"));

// Wallet & Payments
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/platform-wallet", require("./routes/platformWallet"));
app.use("/api/admin-wallet", require("./routes/adminWallet"));
app.use("/api/gifts", require("./routes/gifts.route"));

// Live Streaming + PK
app.use("/api/live", require("./routes/Live"));
app.use("/api/live-analytics", require("./routes/LiveAnalytics"));
app.use("/api/pk", require("./routes/pk"));

// Admin & Utilities
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);
// Compat voor frontend-calls zoals /admin/users, /admin/stats, etc.
app.use("/admin", adminRoutes);

// Moderation / ban robot admin-panel
try {
    const adminModerationRoutes = require("./routes/adminModeration");
    app.use(
        "/api/admin/moderation",
        auth,
        requireAdmin,
        adminModerationRoutes
    );
} catch (e) {
    console.log(
        "ℹ️ Optional route /api/admin/moderation not loaded:",
        e.message
    );
}

// Vanaf hier: /api/* achter auth + checkBan (extra beveiligd)
app.use("/api", auth, checkBan);

// Protected API routes (achter auth + checkBan)
app.use("/api/stocks", require("./routes/stocks"));
app.use("/api/cleanup", require("./routes/cleanupRoutes"));

// Optional routes (misschien nog niet aanwezig)
try {
    app.use(
        "/api/stream-cleanup",
        require("./routes/streamCleanupRoutes")
    );
} catch (e) {
    console.log("ℹ️ Optional route /api/stream-cleanup not loaded:", e.message);
}
try {
    app.use(
        "/api/admin-dashboard",
        require("./routes/adminDashboard")
    );
} catch (e) {
    console.log("ℹ️ Optional route /api/admin-dashboard not loaded:", e.message);
}
try {
    app.use("/api/notifications", require("./routes/notifications"));
} catch (e) {
    console.log("ℹ️ Optional route /api/notifications not loaded:", e.message);
}
try {
    app.use("/api/search", require("./routes/search"));
} catch (e) {
    console.log("ℹ️ Optional route /api/search not loaded:", e.message);
}
try {
    app.use("/api/predictions", require("./routes/predictions"));
} catch (e) {
    console.log("ℹ️ Optional route /api/predictions not loaded:", e.message);
}

// 404 handler for API routes
app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "Endpoint not found" });
    }
    next();
});

// Error handler
app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err);
    res.status(err.status || 500).json({
        error: isProduction ? "Internal server error" : err.message,
    });
});

// ============================================
// 6. HELPER FUNCTIONS
// ============================================

/**
 * End a stream in the database
 * - Mark stream as ended
 * - Mark streamer user as offline (isLive=false, currentStreamId=null)
 */
const endStreamInDB = async (streamId) => {
    if (!streamId || !Stream) return;

    try {
        const baseQuery = mongoose.Types.ObjectId.isValid(streamId)
            ? { $or: [{ _id: streamId }, { roomId: streamId }] }
            : { roomId: streamId };


        const stream = await Stream.findOne({
            ...baseQuery,
            isLive: true,
            status: { $in: ["live", "scheduled"] },
        });

        if (!stream) return;


        stream.isLive = false;
        stream.status = "ended";
        stream.endedAt = new Date();
        await stream.save();


        if (User && stream.streamerId) {
            await User.updateOne(
                { _id: stream.streamerId },
                {
                    $set: {
                        isLive: false,
                        currentStreamId: null,
                        lastStreamedAt: new Date(),
                    },
                }
            );
        }
    } catch (err) {
        console.error("❌ End stream error:", err);
    }
};



// ============================================
// 7. SOCKET HANDLERS
// ============================================
io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // ========== USER ROOMS (voor notificaties / moderation) ==========
    socket.on("join_user_room", (userId) => {
        if (!userId) return;
        socket.join(`user_${userId}`);
        io.userSockets.set(userId.toString(), socket.id);
        socket.userId = userId.toString();
        console.log(`👤 User ${userId} joined personal room`);
    });

    socket.on("leave_user_room", (userId) => {
        if (!userId) return;
        socket.leave(`user_${userId}`);
        io.userSockets.delete(userId.toString());
    });

    // ========== STREAM ROOMS ==========

    socket.on("join_stream", (streamId) => {
        if (!streamId) return;
        socket.join(`stream_${streamId}`);
        socket.join(streamId.toString());
        console.log(`📺 Socket ${socket.id} joined stream ${streamId}`);
    });

    socket.on("leave_stream", (streamId) => {
        if (!streamId) return;
        socket.leave(`stream_${streamId}`);
        socket.leave(streamId.toString());
        console.log(`📺 Socket ${socket.id} left stream ${streamId}`);
    });

    // ========== BROADCASTING (WebRTC Publisher) ==========
    socket.on(
        "start_broadcast",
        async ({ roomId, streamer, title, category, streamerId }) => {
            if (!roomId) return;

            roomId = roomId.toString();
            io.broadcasters.set(roomId, socket.id);
            socket.join(roomId);
            socket.currentStreamId = roomId;
            io.viewerCounts.set(roomId, 0);

            console.log(`📺 Broadcast started: ${title} by ${streamer} (${roomId})`);

            try {
                if (streamerId && User) {
                    const user = await User.findById(streamerId)
                        .select("followers username avatar")
                        .lean();

                    // Notify followers
                    if (user?.followers?.length > 0) {

                        user.followers.forEach((fid) => {
                            io.to(`user_${fid}`).emit(
                                "followed_user_live",
                                {
                                    streamId: roomId,
                                    username: streamer,
                                    avatar: user.avatar,
                                    title,
                                    category,
                                    streamerId,
                                }
                            );
                        });
                    }

                    // Update LiveDiscover
                    io.emit("live_started", {
                        _id: roomId,
                        roomId,
                        title,
                        category,
                        streamerId,
                        streamerName: streamer,
                        host: {
                            _id: streamerId,
                            username: streamer,
                            avatar: user?.avatar,
                        },
                        viewers: 0,
                        isLive: true,
                    });
                }
            } catch (err) {
                console.error("❌ Notify followers error:", err);
            }
        }
    );

    socket.on("stop_broadcast", async ({ roomId }) => {
        if (!roomId) return;
        roomId = roomId.toString();

        await endStreamInDB(roomId);
        io.broadcasters.delete(roomId);
        io.viewerCounts.delete(roomId);
        io.to(roomId).emit("stream_ended");
        io.emit("live_stopped", { _id: roomId, roomId });

        console.log(`📺 Broadcast ended: ${roomId}`);
    });

    // ========== VIEWER HANDLING ==========

    socket.on("watcher", ({ roomId }) => {
        if (!roomId) return;
        roomId = roomId.toString();

        const broadcasterId = io.broadcasters.get(roomId);
        if (broadcasterId) {
            socket.join(roomId);
            const count = (io.viewerCounts.get(roomId) || 0) + 1;
            io.viewerCounts.set(roomId, count);

            io.to(roomId).emit("viewer_count", { viewers: count, count });
            io.to(broadcasterId).emit("watcher", { watcherId: socket.id });

            console.log(`👀 watcher joined room ${roomId} → ${count} viewers`);
        }
    });

    socket.on("leave_watcher", ({ roomId }) => {
        if (!roomId) return;
        roomId = roomId.toString();

        socket.leave(roomId);
        const count = Math.max(0, (io.viewerCounts.get(roomId) || 1) - 1);
        io.viewerCounts.set(roomId, count);
        io.to(roomId).emit("viewer_count", { viewers: count, count });

        console.log(`👀 watcher left room ${roomId} → ${count} viewers`);
    });

    // ========== WEBRTC SIGNALING ==========

    socket.on("offer", ({ watcherId, sdp }) => {
        if (watcherId && sdp) {
            io.to(watcherId).emit("offer", {
                sdp,
                broadcasterId: socket.id,
            });
        }
    });

    socket.on("answer", ({ roomId, sdp }) => {
        roomId = roomId?.toString();
        const broadcasterId = io.broadcasters.get(roomId);
        if (broadcasterId && sdp) {
            io.to(broadcasterId).emit("answer", {
                watcherId: socket.id,
                sdp,
            });
        }
    });

    socket.on("candidate", ({ target, candidate }) => {
        if (target && candidate) {
            io.to(target).emit("candidate", {
                from: socket.id,
                candidate,
            });
        }
    });

    // ===========================================
    // PK BATTLES SOCKET HANDLERS
    // ===========================================
    pkSocket(io, socket);

    // ===========================================
    // DISCONNECT
    // ===========================================
    socket.on("disconnect", async () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);

        // Als socket de broadcaster van een room is → stream beëindigen
        for (const [roomId, broadcasterId] of io.broadcasters.entries()) {
            if (broadcasterId === socket.id) {
                await endStreamInDB(roomId);
                io.broadcasters.delete(roomId);
                io.viewerCounts.delete(roomId);
                io.to(roomId).emit("stream_ended");
                io.emit("live_stopped", { _id: roomId, roomId });
                break;
            }
        }

        // Extra safety voor direct gekoppelde stream
        if (socket.currentStreamId) {
            await endStreamInDB(socket.currentStreamId);
            io.viewerCounts.delete(socket.currentStreamId);
            io.emit("live_stopped", {
                _id: socket.currentStreamId,
                roomId: socket.currentStreamId,
            });
        }

        // User socket cleanup
        if (socket.userId) {
            io.userSockets.delete(socket.userId);
        }
    });
});

// ============================================
// 8. MONGODB CONNECTION & SERVER START
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI environment variable");
    process.exit(1);
}

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log("✅ MongoDB connected");

        const PORT = process.env.PORT || 8080;
        server.listen(PORT, () => {
            console.log("╔════════════════════════════════════════╗");
            console.log("║  🚀 WORLD-STUDIO SERVER (U.E.)        ║");
            console.log("╠════════════════════════════════════════╣");
            console.log(`║  Port: ${PORT.toString().padEnd(28)}║`);
            console.log(
                `║  Mode: ${(process.env.NODE_ENV || "development").padEnd(
                    28
                )}║`
            );
            console.log("║  URL:  https://world-studio.live       ║");
            console.log("╚════════════════════════════════════════╝");
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    });

// ============================================
// 9. GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    const forceTimeout = setTimeout(() => {
        console.error("❌ Forced shutdown after timeout");
        process.exit(1);
    }, 10000);

    try {

        await new Promise((resolve) => {
            server.close(() => {
                console.log("✅ HTTP server closed");
                resolve();
            });
        });


        await new Promise((resolve) => {
            io.close(() => {
                console.log("✅ Socket.io closed");
                resolve();
            });
        });


        await mongoose.connection.close();
        console.log("✅ MongoDB connection closed");

        clearTimeout(forceTimeout);
        console.log("🚀 Graceful shutdown complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error during graceful shutdown:", err);
        clearTimeout(forceTimeout);
        process.exit(1);
    }


};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Rejection:", reason);
});

module.exports = { app, server, io };
