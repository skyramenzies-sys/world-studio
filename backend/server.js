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
const server = http.createServer(app);

// Security
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 400,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

// CORS
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

// Body parsing
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Health
app.get("/healthz", (req, res) => res.status(200).json({ status: "ok" }));

// Routes
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
app.use("/api/live-analytics", require("./routes/LiveAnalystics"));

app.get("/", (req, res) => {
    res.json({ message: "🚀 World-Studio API running in production mode" });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("❌ Unhandled Error:", err);
    res.status(500).json({ error: "Internal server error" });
});

// MongoDB
if (!process.env.MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI");
    process.exit(1);
}

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    });

// Socket.io
const io = new Server(server, {
    cors: { origin: allowedOrigins },
});

io.on("connection", (socket) => {
    socket.on("join_stream", (id) => socket.join(`stream_${id}`));
    socket.on("leave_stream", (id) => socket.leave(`stream_${id}`));

    socket.on("chat_message", (data) => {
        if (!data || !data.streamId) return;
        io.to(`stream_${data.streamId}`).emit("chat_message", {
            ...data,
            timestamp: new Date(),
        });
    });

    socket.on("admin_stop_stream", (id) => io.emit("admin_stream_stopped", id));
    socket.on("admin_ban_user", (id) => io.emit("admin_user_banned", id));
});

app.set("io", io);

// Shutdown
const shutdown = () => {
    server.close(() => {
        mongoose.connection.close(false);
        console.log("🔒 Clean shutdown.");
    });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Start
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Production server running on port ${PORT}`));
