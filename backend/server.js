// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// App + HTTP server
const app = express();
const server = http.createServer(app);

// ======= CORS SETTINGS =======
app.use(
    cors({
        origin: [
            "http://localhost:5173", // lokale dev
            "https://world-studio.vercel.app", // productie
        ],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    })
);
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// ======= ROUTES =======
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/stocks", require("./routes/stocks"));
app.use("/api/admin", require("./routes/admin"));

// ======= TEST ROUTE =======
app.get("/", (req, res) => {
    res.json({ message: "🚀 World-Studio API is running!" });
});

// ======= DATABASE CONNECT =======
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Error:", err));

// ======= SOCKET.IO =======
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://world-studio.vercel.app",
        ],
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log(`📡 New client connected: ${socket.id}`);

    // 🔥 Real-time post updates
    socket.on("new_post", (data) => {
        console.log("🆕 New Post Broadcast:", data.title);
        io.emit("update_feed", data);
    });

    // ❤️ Real-time like updates
    socket.on("like_post", (data) => {
        console.log("❤️ Like Broadcast:", data.postId);
        io.emit("update_likes", data);
    });

    // 💬 Real-time comment updates
    socket.on("comment_post", (data) => {
        console.log("💬 Comment Broadcast:", data.postId);
        io.emit("update_comments", data);
    });

    socket.on("disconnect", () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// --- WEBRTC SIGNALING (LIVE STREAM) ---
const liveViewers = new Map(); // roomId -> Set<socketId>

io.on("connection", (socket) => {
    // Streamer start
    socket.on("start_broadcast", ({ roomId }) => {
        socket.join(roomId);
        socket.data.role = "broadcaster";
        socket.data.roomId = roomId;

        if (!liveViewers.has(roomId)) liveViewers.set(roomId, new Set());
        io.to(roomId).emit("stream_status", { roomId, isLive: true, viewers: liveViewers.get(roomId).size });
    });

    // Viewer join
    socket.on("watcher", ({ roomId }) => {
        socket.join(roomId);
        socket.data.role = "watcher";
        socket.data.roomId = roomId;

        if (!liveViewers.has(roomId)) liveViewers.set(roomId, new Set());
        liveViewers.get(roomId).add(socket.id);

        // Laat de broadcaster weten dat er een watcher is
        socket.to(roomId).emit("watcher", { watcherId: socket.id });

        io.to(roomId).emit("viewer_count", { roomId, viewers: liveViewers.get(roomId).size });
    });

    // Broadcaster → bepaalde watcher: WebRTC offer
    socket.on("offer", ({ watcherId, sdp }) => {
        io.to(watcherId).emit("offer", { broadcasterId: socket.id, sdp });
    });

    // Watcher → terug naar broadcaster: answer
    socket.on("answer", ({ broadcasterId, sdp }) => {
        io.to(broadcasterId).emit("answer", { watcherId: socket.id, sdp });
    });

    // ICE candidates relays
    socket.on("candidate", ({ target, candidate }) => {
        io.to(target).emit("candidate", { from: socket.id, candidate });
    });

    // Streamer stopt
    socket.on("stop_broadcast", () => {
        const roomId = socket.data.roomId;
        if (roomId) {
            io.to(roomId).emit("stream_ended", { roomId });
            // viewers blijven in room, maar UI schakelt uit
        }
    });

    // Disconnect / leave
    socket.on("disconnect", () => {
        const roomId = socket.data.roomId;
        const role = socket.data.role;

        if (roomId && role === "watcher" && liveViewers.has(roomId)) {
            liveViewers.get(roomId).delete(socket.id);
            io.to(roomId).emit("viewer_count", { roomId, viewers: liveViewers.get(roomId).size });
        }

        if (roomId && role === "broadcaster") {
            io.to(roomId).emit("stream_ended", { roomId });
        }
    });
});

// na const io = new Server(server, {...})
app.set("io", io);


// ======= START SERVER =======
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
