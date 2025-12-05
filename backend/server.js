// =======================================================
// World-Studio.live - Main Server Entry Point
// Engineered for Commander Sandro Menzies
// by AIRPATH
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

const isProduction = process.env.NODE_ENV === "production";

// ============================================
// 1. LOAD MODELS
// ============================================
const { User, Stream } = require("./models");
console.log("✅ Models loaded via ./models");

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

// Rate limiting (iets strenger in productie)
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,     // 15 minutes
        max: isProduction ? 500 : 2000,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Too many requests, please try again later" },
    })
);

// CORS configuration
const allowedOrigins = (
    process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(",")
        : [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://world-studio.live",
            "https://www.world-studio.live",
        ]
).map((o) => o.trim());

console.log("🌍 Allowed CORS origins:", allowedOrigins);

app.use(
    cors({
        origin: allowedOrigins,
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
io.broadcasters = new Map();     // roomId -> socketId
io.viewerCounts = new Map();     // roomId -> count
io.multiRooms = new Map();       // roomId -> room data
io.userSockets = new Map();      // userId -> socketId

// ============================================
// 4. HEALTH & BASIC ROUTES
// ============================================
app.get("/healthz", (req, res) =>
    res.status(200).json({ status: "ok" })
);
app.get("/health", (req, res) =>
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
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

// Auth & Users
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

// Live Streaming
app.use("/api/live", require("./routes/Live"));
app.use("/api/live-analytics", require("./routes/LiveAnalytics"));
app.use("/api/pk", require("./routes/pk"));

// Admin & Utilities
app.use("/api/admin", require("./routes/admin"));
app.use("/api/stocks", require("./routes/stocks"));
app.use("/api/cleanup", require("./routes/cleanupRoutes"));

// Optional routes (wrap in try-catch for missing files)
try { app.use("/api/stream-cleanup", require("./routes/streamCleanupRoutes")); } catch (e) { }
try { app.use("/api/admin-dashboard", require("./routes/adminDashboard")); } catch (e) { }
try { app.use("/api/notifications", require("./routes/notifications")); } catch (e) { }
try { app.use("/api/search", require("./routes/search")); } catch (e) { }
try { app.use("/api/predictions", require("./routes/predictions")); } catch (e) { }

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
 */
const endStreamInDB = async (streamId) => {
    if (!streamId || !Stream) return;
    try {
        const query = mongoose.Types.ObjectId.isValid(streamId)
            ? { $or: [{ _id: streamId }, { roomId: streamId }] }
            : { roomId: streamId };

        await Stream.updateOne(
            { ...query, isLive: true },
            {
                $set: {
                    isLive: false,
                    status: "ended",
                    endedAt: new Date(),
                },
            }
        );
    } catch (err) {
        console.error("❌ End stream error:", err);
    }
};

/**
 * Get room by ID from any collection
 */
const getRoom = (roomId) => io.multiRooms.get(roomId); // (nu nog niet gebruikt, maar netjes gehouden)

// ============================================
// 7. SOCKET HANDLERS
// ============================================
io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // ========== USER ROOMS ==========

    socket.on("join_user_room", (userId) => {
        if (!userId) return;
        socket.join(`user_${userId}`);
        io.userSockets.set(userId, socket.id);
        socket.userId = userId;
        console.log(`👤 User ${userId} joined personal room`);
    });

    socket.on("leave_user_room", (userId) => {
        if (!userId) return;
        socket.leave(`user_${userId}`);
        io.userSockets.delete(userId);
    });

    // ========== STREAM ROOMS ==========

    socket.on("join_stream", (streamId) => {
        if (!streamId) return;
        socket.join(`stream_${streamId}`);
        socket.join(streamId);
    });

    socket.on("leave_stream", (streamId) => {
        if (!streamId) return;
        socket.leave(`stream_${streamId}`);
        socket.leave(streamId);
    });

    // ========== BROADCASTING ==========

    socket.on("start_broadcast", async ({ roomId, streamer, title, category, streamerId }) => {
        if (!roomId) return;

        io.broadcasters.set(roomId, socket.id);
        socket.join(roomId);
        socket.currentStreamId = roomId;
        io.viewerCounts.set(roomId, 0);

        console.log(`📺 Broadcast started: ${title} by ${streamer}`);

        try {
            if (streamerId) {
                const user = await User.findById(streamerId)
                    .select("followers username avatar")
                    .lean();

                if (user?.followers?.length > 0) {
                    // Notify followers
                    user.followers.forEach((fid) => {
                        io.to(`user_${fid}`).emit("followed_user_live", {
                            streamId: roomId,
                            username: streamer,
                            avatar: user.avatar,
                            title,
                            category,
                            streamerId,
                        });
                    });
                }

                // Broadcast to all
                io.emit("live_started", {
                    _id: roomId,
                    roomId,
                    title,
                    category,
                    streamerId,
                    streamerName: streamer,
                    host: { _id: streamerId, username: streamer, avatar: user?.avatar },
                    viewers: 0,
                    isLive: true,
                });
            }
        } catch (err) {
            console.error("❌ Notify followers error:", err);
        }
    });

    socket.on("stop_broadcast", async ({ roomId }) => {
        if (!roomId) return;

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

        const broadcasterId = io.broadcasters.get(roomId);
        if (broadcasterId) {
            socket.join(roomId);
            const count = (io.viewerCounts.get(roomId) || 0) + 1;
            io.viewerCounts.set(roomId, count);
            io.to(roomId).emit("viewer_count", { viewers: count, count });
            io.to(broadcasterId).emit("watcher", { watcherId: socket.id });
        }
    });

    socket.on("leave_watcher", ({ roomId }) => {
        if (!roomId) return;

        socket.leave(roomId);
        const count = Math.max(0, (io.viewerCounts.get(roomId) || 1) - 1);
        io.viewerCounts.set(roomId, count);
        io.to(roomId).emit("viewer_count", { viewers: count, count });
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

    // ========== MULTI-LIVE / CO-STREAMING ==========

    socket.on("join_multi_live", ({ roomId, user }) => {
        if (!roomId || !user) return;

        socket.join(roomId);
        socket.roomId = roomId;
        socket.userData = user;

        if (!io.multiRooms.has(roomId)) {
            io.multiRooms.set(roomId, { viewers: [], seats: [] });
        }

        const room = io.multiRooms.get(roomId);

        if (!room.viewers.some((v) => v._id === user._id)) {
            room.viewers.push({
                _id: user._id,
                username: user.username,
                avatar: user.avatar,
            });
        }

        const count = (io.viewerCounts.get(roomId) || 0) + 1;
        io.viewerCounts.set(roomId, count);
        io.to(roomId).emit("viewer_count", { count, viewers: count });
        io.to(roomId).emit("viewers_list", { viewers: room.viewers });
    });

    socket.on("start_multi_live", ({ roomId, streamId, host, title, maxSeats }) => {
        if (!roomId) return;

        io.multiRooms.set(roomId, {
            hostId: socket.id,
            host,
            title,
            maxSeats: maxSeats || 6,
            seats: [
                {
                    seatId: 0,
                    user: host,
                    socketId: socket.id,
                },
            ],
            streamId,
            viewers: [
                {
                    _id: host._id,
                    username: host.username,
                    avatar: host.avatar,
                },
            ],
        });

        socket.join(roomId);
        socket.roomId = roomId;
        socket.userData = host;
        socket.currentStreamId = streamId;
        io.viewerCounts.set(roomId, 1);

        io.to(roomId).emit("viewers_list", { viewers: [host] });
        console.log(`🎭 Multi-live started: ${title} by ${host.username}`);
    });

    socket.on("request_seat", ({ roomId, seatId, user, odId }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            io.to(room.hostId).emit("seat_request", {
                roomId,
                seatId,
                user,
                odId,
                socketId: socket.id,
            });
        }
    });

    socket.on("approve_seat", ({ roomId, seatId, user, socketId }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            room.seats.push({
                seatId,
                user,
                socketId: socketId || socket.id,
            });
            io.to(roomId).emit("seat_approved", { roomId, seatId, user });
            io.to(roomId).emit("seats_update", { seats: room.seats });
        }
    });

    socket.on("reject_seat", ({ roomId, odId }) => {
        io.to(roomId).emit("seat_rejected", { roomId, odId });
    });

    socket.on("guest_ready", ({ roomId, odId, seatId }) => {
        io.to(roomId).emit("guest_ready", { roomId, odId, seatId });
    });

    socket.on("leave_seat", ({ roomId, odId }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            room.seats = room.seats.filter((s) => s.user?._id !== odId);
            io.to(roomId).emit("user_left_seat", { roomId, odId });
            io.to(roomId).emit("seats_update", { seats: room.seats });
        }
    });

    socket.on("kick_from_seat", ({ roomId, odId }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            room.seats = room.seats.filter((s) => s.user?._id !== odId);
            io.to(roomId).emit("user_left_seat", { roomId, odId });

            for (const [, s] of io.sockets.sockets) {
                if (s.userData?._id === odId) {
                    s.emit("kicked_from_seat", { roomId });
                    break;
                }
            }
        }
    });

    socket.on("mute_user", ({ roomId, odId }) => {
        if (roomId && odId) {
            io.to(roomId).emit("user_muted", { roomId, odId });
        }
    });

    socket.on("unmute_user", ({ roomId, odId }) => {
        if (roomId && odId) {
            io.to(roomId).emit("user_unmuted", { roomId, odId });
        }
    });

    // Multi-live WebRTC signaling
    socket.on("multi_offer", ({ roomId, targetId, sdp, fromId }) => {
        for (const [, s] of io.sockets.sockets) {
            if (s.userData?._id === targetId) {
                s.emit("multi_offer", { roomId, sdp, fromId });
                break;
            }
        }
    });

    socket.on("multi_answer", ({ roomId, targetId, sdp, fromId }) => {
        for (const [, s] of io.sockets.sockets) {
            if (s.userData?._id === targetId) {
                s.emit("multi_answer", { roomId, sdp, fromId });
                break;
            }
        }
    });

    socket.on("multi_ice_candidate", ({ roomId, targetId, candidate, fromId }) => {
        for (const [, s] of io.sockets.sockets) {
            if (s.userData?._id === targetId) {
                s.emit("multi_ice_candidate", { roomId, candidate, fromId });
                break;
            }
        }
    });

    socket.on("end_multi_live", async ({ roomId }) => {
        const room = io.multiRooms.get(roomId);
        if (room?.streamId) {
            await endStreamInDB(room.streamId);
        }
        io.to(roomId).emit("multi_live_ended", { roomId });
        io.multiRooms.delete(roomId);
        io.viewerCounts.delete(roomId);

        console.log(`🎭 Multi-live ended: ${roomId}`);
    });

    socket.on("leave_multi_live", ({ roomId, odId }) => {
        if (!roomId) return;

        socket.leave(roomId);
        const count = Math.max(0, (io.viewerCounts.get(roomId) || 1) - 1);
        io.viewerCounts.set(roomId, count);
        io.to(roomId).emit("viewer_count", { count });

        const room = io.multiRooms.get(roomId);
        if (room) {
            if (room.viewers && odId) {
                room.viewers = room.viewers.filter((v) => v._id !== odId);
                io.to(roomId).emit("viewers_list", { viewers: room.viewers });
            }
            if (odId && room.seats?.some((s) => s.user?._id === odId)) {
                room.seats = room.seats.filter((s) => s.user?._id !== odId);
                io.to(roomId).emit("user_left_seat", { roomId, odId });
            }
        }
    });

    // ========== CHAT ==========

    socket.on("chat_message", (data) => {
        if (!data) return;

        const roomId = data.roomId || data.streamId;
        if (roomId) {
            const message = {
                ...data,
                timestamp: new Date(),
            };
            io.to(roomId).emit("chat_message", message);
            io.to(`stream_${roomId}`).emit("chat_message", message);
        }
    });

    socket.on("chat_gift", (data) => {
        if (!data) return;

        const roomId = data.roomId || data.streamId;
        if (roomId) {
            io.to(roomId).emit("chat_gift", {
                ...data,
                timestamp: new Date(),
            });
        }
    });

    // ========== ADMIN ACTIONS ==========

    socket.on("admin_stop_stream", async (streamId) => {
        if (streamId) {
            await endStreamInDB(streamId);
            io.emit("admin_stream_stopped", streamId);
            io.to(streamId).emit("stream_ended", { reason: "admin" });
            console.log(`🛑 Admin stopped stream: ${streamId}`);
        }
    });

    socket.on("admin_message", ({ streamId, message }) => {
        if (streamId && message) {
            io.to(streamId).emit("admin_message", {
                message,
                timestamp: new Date(),
            });
        }
    });

    // ========== DISCONNECT ==========

    socket.on("disconnect", async () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);

        // Clean up broadcaster
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

        // Clean up multi-live
        if (socket.roomId && socket.userData) {
            const room = io.multiRooms.get(socket.roomId);
            if (room) {
                // Remove from viewers
                if (room.viewers) {
                    room.viewers = room.viewers.filter(
                        (v) => v._id !== socket.userData._id
                    );
                    io.to(socket.roomId).emit("viewers_list", {
                        viewers: room.viewers,
                    });
                }

                // If host disconnected, end the multi-live
                if (room.hostId === socket.id) {
                    if (room.streamId) {
                        await endStreamInDB(room.streamId);
                    }
                    io.to(socket.roomId).emit("multi_live_ended", {
                        roomId: socket.roomId,
                    });
                    io.multiRooms.delete(socket.roomId);
                    io.viewerCounts.delete(socket.roomId);
                } else {
                    // Remove from seats
                    if (room.seats) {
                        room.seats = room.seats.filter(
                            (s) => s.socketId !== socket.id
                        );
                        io.to(socket.roomId).emit("seats_update", {
                            seats: room.seats,
                        });
                    }
                    const count = Math.max(
                        0,
                        (io.viewerCounts.get(socket.roomId) || 1) - 1
                    );
                    io.viewerCounts.set(socket.roomId, count);
                    io.to(socket.roomId).emit("viewer_count", { count });
                }
            }
        }

        // Clean up stream
        if (socket.currentStreamId) {
            await endStreamInDB(socket.currentStreamId);
        }

        // Clean up user socket mapping
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
            console.log("║  🚀 WORLD-STUDIO SERVER                ║");
            console.log("╠════════════════════════════════════════╣");
            console.log(`║  Port: ${PORT}                            ║`);
            console.log(`║  Mode: ${process.env.NODE_ENV || "development"}                   ║`);
            console.log("║  URL:  https://world-studio.live       ║");
            console.log("╚════════════════════════════════════════╝");
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    });

// ============================================
// 9. GRACEFUL SHUTDOWN (Mongoose v7/v8 compatible)
// ============================================
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
        // 1️⃣ Stop accepting new HTTP connections
        await new Promise((resolve) => {
            server.close(() => {
                console.log("✅ HTTP server closed");
                resolve();
            });
        });

        // 2️⃣ Close Socket.io
        await new Promise((resolve) => {
            io.close(() => {
                console.log("✅ Socket.io closed");
                resolve();
            });
        });

        // 3️⃣ Close MongoDB (NO CALLBACK — NEW STYLE)
        await mongoose.connection.close();
        console.log("✅ MongoDB connection closed");

        console.log("🚀 Graceful shutdown complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error during graceful shutdown:", err);
        process.exit(1);
    }

    // Safety timeout
    setTimeout(() => {
        console.error("❌ Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection:", reason);
});

module.exports = { app, server, io };
