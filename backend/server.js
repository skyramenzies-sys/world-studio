// ----------------------------------------
//  ENVIRONMENT
// ----------------------------------------
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");


// ----------------------------------------
//  INITIALIZE
// ----------------------------------------
const app = express();
const server = http.createServer(app);


// ----------------------------------------
//  SECURITY MIDDLEWARE
// ----------------------------------------
app.use(
    helmet({
        contentSecurityPolicy: false,        // Required for Socket.io
        crossOriginEmbedderPolicy: false,
    })
);

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 500,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Too many requests. Please wait." },
    })
);


// ----------------------------------------
//  CORS
// ----------------------------------------
const allowedOrigins = (process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : [
        "http://localhost:5173",
        "https://world-studio.vercel.app"
    ]
).map((o) => o.trim());

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);


// ----------------------------------------
//  BODY PARSING
// ----------------------------------------
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));


// ----------------------------------------
//  HEALTH CHECK
// ----------------------------------------
app.get("/healthz", (req, res) => {
    res.status(200).json({ status: "ok", time: new Date() });
});


// ----------------------------------------
//  ROUTES
// ----------------------------------------
try {
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
} catch (err) {
    console.error("❌ Route loading error:", err);
}


app.get("/", (req, res) => {
    res.json({ message: "🚀 World-Studio API running in production mode" });
});


// ----------------------------------------
//  GLOBAL ERROR HANDLER
// ----------------------------------------
app.use((err, req, res, next) => {
    console.error("❌ GLOBAL ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
});


// ----------------------------------------
//  MONGODB CONNECTION
// ----------------------------------------
if (!process.env.MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI environment variable.");
    process.exit(1);
}

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => {
        console.error("❌ MongoDB Error:", err);
        process.exit(1);
    });


// ----------------------------------------
//  SOCKET.IO SETUP
// ----------------------------------------
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    // Join/Leave stream rooms
    socket.on("join_stream", (streamId) => {
        if (!streamId) return;
        socket.join(`stream_${streamId}`);
    });

    socket.on("leave_stream", (streamId) => {
        if (!streamId) return;
        socket.leave(`stream_${streamId}`);
    });

    // Chat messaging
    socket.on("chat_message", ({ streamId, user, text }) => {
        if (!streamId || !text || !user) return;
        io.to(`stream_${streamId}`).emit("chat_message", {
            user,
            text,
            timestamp: new Date(),
        });
    });

    // Admin controls
    socket.on("admin_stop_stream", (streamId) => {
        if (streamId) io.emit("admin_stream_stopped", streamId);
    });

    socket.on("admin_ban_user", (userId) => {
        if (userId) io.emit("admin_user_banned", userId);
    });
});

// Give routes access to io
app.set("io", io);


// ----------------------------------------
//  GRACEFUL SHUTDOWN
// ----------------------------------------
const shutdown = () => {
    console.log("\n🛑 Shutting down gracefully...");

    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log("🔒 Shutdown complete.");
            process.exit(0);
        });
    });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);


// ----------------------------------------
//  START SERVER
// ----------------------------------------
const PORT = process.env.PORT || 8080;
server.listen(PORT, () =>
    console.log(`🚀 Production server running on port ${PORT}`)
);
