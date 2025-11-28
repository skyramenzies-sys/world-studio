// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const User = require("./models/User");

const app = express();

app.set("trust proxy", 1);

const server = http.createServer(app);

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
}));

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : ["http://localhost:5173", "https://world-studio.vercel.app"]
).map((o) => o.trim());

app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Health Check
app.get("/healthz", (req, res) => res.status(200).json({ status: "ok" }));

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

app.get("/", (req, res) => {
    res.json({ message: "🚀 World-Studio API running", version: "1.0.0", status: "online" });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// MongoDB
if (!process.env.MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI");
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => { console.error("❌ MongoDB failed:", err); process.exit(1); });

// Socket.io
const io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Store maps
if (!io.broadcasters) io.broadcasters = new Map();
if (!io.viewerCounts) io.viewerCounts = new Map();
if (!io.multiRooms) io.multiRooms = new Map();
if (!io.userSockets) io.userSockets = new Map(); // Map odId -> socket.id

io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // User joins their personal room for notifications
    socket.on("join_user_room", (userId) => {
        if (userId) {
            socket.join(`user_${userId}`);
            io.userSockets.set(userId, socket.id);
            socket.userId = userId;
            console.log(`User ${socket.id} joined room user_${userId}`);
        }
    });

    socket.on("leave_user_room", (userId) => {
        if (userId) {
            socket.leave(`user_${userId}`);
            io.userSockets.delete(userId);
        }
    });

    // Join stream room
    socket.on("join_stream", (streamId) => {
        if (streamId) {
            socket.join(`stream_${streamId}`);
            console.log(`User ${socket.id} joined stream ${streamId}`);
        }
    });

    socket.on("leave_stream", (streamId) => {
        if (streamId) socket.leave(`stream_${streamId}`);
    });

    // ========== WebRTC Signaling ==========

    // Broadcaster starts - NOTIFY FOLLOWERS
    socket.on("start_broadcast", async ({ roomId, streamer, title, category, streamerId }) => {
        if (!roomId) return;

        io.broadcasters.set(roomId, socket.id);
        socket.join(roomId);
        io.viewerCounts.set(roomId, 0);
        console.log(`📺 ${streamer} started stream in ${roomId}`);

        // Notify all followers that this user is live
        try {
            if (streamerId) {
                const user = await User.findById(streamerId).select("followers username").lean();
                if (user && user.followers?.length > 0) {
                    console.log(`📢 Notifying ${user.followers.length} followers that ${user.username} is live`);

                    user.followers.forEach(followerId => {
                        io.to(`user_${followerId}`).emit("followed_user_live", {
                            streamId: roomId,
                            username: streamer || user.username,
                            title: title || "Untitled Stream",
                            category,
                            streamerId,
                        });
                    });

                    // Also broadcast to all clients for discover page update
                    io.emit("live_started", {
                        _id: roomId,
                        roomId,
                        title,
                        category,
                        streamerId,
                        streamerName: streamer,
                        host: { _id: streamerId, username: streamer },
                        viewers: 0,
                        isLive: true,
                    });
                }
            }
        } catch (err) {
            console.error("Failed to notify followers:", err);
        }
    });

    socket.on("stop_broadcast", ({ roomId }) => {
        if (roomId) {
            io.broadcasters.delete(roomId);
            io.viewerCounts.delete(roomId);
            io.to(roomId).emit("stream_ended");
            io.emit("live_stopped", { _id: roomId });
            console.log(`📺 Stream ended: ${roomId}`);
        }
    });

    // Viewer watching
    socket.on("watcher", ({ roomId }) => {
        if (!roomId) return;

        const broadcasterId = io.broadcasters.get(roomId);
        if (broadcasterId) {
            socket.join(roomId);
            const count = (io.viewerCounts.get(roomId) || 0) + 1;
            io.viewerCounts.set(roomId, count);
            io.to(roomId).emit("viewer_count", { viewers: count });
            io.to(broadcasterId).emit("watcher", { watcherId: socket.id });
            console.log(`👁 Viewer joined ${roomId} (${count} viewers)`);
        } else {
            socket.emit("error", { message: "Stream not found" });
        }
    });

    // WebRTC signaling
    socket.on("offer", ({ watcherId, sdp }) => {
        if (watcherId && sdp) io.to(watcherId).emit("offer", { sdp });
    });

    socket.on("answer", ({ roomId, sdp }) => {
        const broadcasterId = io.broadcasters.get(roomId);
        if (broadcasterId && sdp) io.to(broadcasterId).emit("answer", { watcherId: socket.id, sdp });
    });

    socket.on("candidate", ({ target, candidate }) => {
        if (target && candidate) io.to(target).emit("candidate", { from: socket.id, candidate });
    });

    // ========== Multi-Guest Live ==========

    socket.on("start_multi_live", ({ roomId, host, title, maxSeats }) => {
        if (!roomId) return;
        io.multiRooms.set(roomId, {
            hostId: socket.id,
            host,
            title,
            maxSeats,
            seats: [{ seatId: 0, user: host, oderId: socket.id }],
            viewers: new Set(),
        });
        socket.join(roomId);
        console.log(`👥 Multi-guest started: ${roomId}`);
    });

    socket.on("join_multi_live", ({ roomId, user }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            room.viewers.add(socket.id);
            socket.join(roomId);
            io.to(roomId).emit("viewer_count", { count: room.viewers.size });
        }
    });

    socket.on("request_seat", ({ roomId, seatId, user }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            io.to(room.hostId).emit("seat_request", { seatId, user, socketId: socket.id });
        }
    });

    socket.on("approve_seat", ({ roomId, seatId, user, socketId }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            room.seats.push({ seatId, user, socketId });
            io.to(roomId).emit("seat_approved", { seatId, user });
        }
    });

    socket.on("leave_seat", ({ roomId, odId }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            room.seats = room.seats.filter(s => s.user?._id !== odId);
            io.to(roomId).emit("user_left_seat", { odId });
        }
    });

    socket.on("kick_from_seat", ({ roomId, socketId, odId }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            room.seats = room.seats.filter(s => s.socketId !== socketId);
            io.to(roomId).emit("user_left_seat", { odId });
            io.to(socketId).emit("kicked_from_seat");
        }
    });

    socket.on("end_multi_live", ({ roomId }) => {
        io.to(roomId).emit("multi_live_ended");
        io.multiRooms.delete(roomId);
    });

    socket.on("leave_multi_live", ({ roomId }) => {
        const room = io.multiRooms.get(roomId);
        if (room) {
            room.viewers.delete(socket.id);
            io.to(roomId).emit("viewer_count", { count: room.viewers.size });
        }
    });

    // ========== Audio Live ==========

    socket.on("start_audio_live", ({ roomId }) => {
        if (roomId) socket.join(roomId);
    });

    socket.on("join_audio_live", ({ roomId }) => {
        if (roomId) socket.join(roomId);
    });

    socket.on("end_audio_live", ({ roomId }) => {
        io.to(roomId).emit("audio_live_ended");
    });

    socket.on("leave_audio_live", ({ roomId }) => {
        socket.leave(roomId);
    });

    // ========== Chat ==========

    socket.on("chat_message", (data) => {
        if (!data) return;
        const roomId = data.roomId || data.streamId;
        if (!roomId) return;

        const messageData = { ...data, timestamp: new Date(), socketId: socket.id };
        io.to(roomId).emit("chat_message", messageData);
        io.to(`stream_${roomId}`).emit("chat_message", messageData);
    });

    // ========== Admin ==========

    socket.on("admin_stop_stream", (streamId) => {
        if (streamId) io.emit("admin_stream_stopped", streamId);
    });

    socket.on("admin_ban_user", (userId) => {
        if (userId) io.emit("admin_user_banned", userId);
    });

    // ========== Disconnect ==========

    socket.on("disconnect", () => {
        console.log(`❌ Disconnected: ${socket.id}`);

        // Clean up broadcaster
        for (const [roomId, broadcasterId] of io.broadcasters.entries()) {
            if (broadcasterId === socket.id) {
                io.broadcasters.delete(roomId);
                io.viewerCounts.delete(roomId);
                io.to(roomId).emit("stream_ended");
                io.emit("live_stopped", { _id: roomId });
                break;
            }
        }

        // Update viewer counts
        for (const [roomId, broadcasterId] of io.broadcasters.entries()) {
            io.to(broadcasterId).emit("remove_watcher", { watcherId: socket.id });
            if (io.viewerCounts.has(roomId)) {
                const count = Math.max(0, (io.viewerCounts.get(roomId) || 1) - 1);
                io.viewerCounts.set(roomId, count);
                io.to(roomId).emit("viewer_count", { viewers: count });
            }
        }

        // Clean up user socket mapping
        if (socket.userId) {
            io.userSockets.delete(socket.userId);
        }
    });
});

app.set("io", io);

// Shutdown
const shutdown = async () => {
    console.log("🔄 Shutting down...");
    try {
        server.close();
        await mongoose.connection.close();
        console.log("✅ Clean shutdown");
        process.exit(0);
    } catch (err) {
        console.error("Shutdown error:", err);
        process.exit(1);
    }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("uncaughtException", (err) => { console.error("❌ Uncaught:", err); shutdown(); });
process.on("unhandledRejection", (reason) => { console.error("❌ Unhandled:", reason); shutdown(); });

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 CORS: ${allowedOrigins.join(", ")}`);
});

module.exports = { app, server, io };