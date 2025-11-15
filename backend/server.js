require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet"); // For security headers
const rateLimit = require("express-rate-limit"); // To prevent abuse

// ROUTE IMPORTS
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const uploadRoutes = require("./routes/upload");
const stockRoutes = require("./routes/stocks");
const adminRoutes = require("./routes/admin");
const walletRoutes = require("./routes/wallet");
const platformWalletRoutes = require("./routes/platformWallet");
const adminWalletRoutes = require("./routes/adminWallet");
const giftRoutes = require("./routes/gifts.route");
const liveRoutes = require("./routes/live");

const app = express();
const server = http.createServer(app);

// --------- MIDDLEWARES ---------

// Security headers
app.use(helmet());

// Rate limiter (customize as needed)
app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500, // Limit each IP to 500 requests per windowMs
        message: "Too many requests, please try again later.",
    })
);

// CORS setup - Use env var or fallback to known allowed origins
const allowedOrigins = (process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
    : [
        "http://localhost:5173",
        "https://world-studio.vercel.app",
        // Add your frontend domains here
    ]
).map(origin => origin.trim());

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    })
);

// JSON/body parser
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// --------- ROUTES ---------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/gifts", giftRoutes);
app.use("/api/platform-wallet", platformWalletRoutes);
app.use("/api/admin-wallet", adminWalletRoutes);
app.use("/api/live", liveRoutes);

app.get("/", (req, res) => {
    res.json({ message: "🚀 World-Studio API is running!" });
});

// --------- GLOBAL ERROR HANDLER ---------
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.stack || err);
    res.status(500).json({ error: "Server error" });
});

// --------- MONGODB CONNECTION ---------
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
    console.error("❌ MONGODB_URI is not set in your environment variables.");
    process.exit(1);
}
mongoose
    .connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => {
        console.error("❌ MongoDB Error:", err);
        process.exit(1);
    });

// --------- SOCKET.IO ---------
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    // Validate streamId/userId as strings for safety
    socket.on("join_stream", (streamId) => {
        if (typeof streamId === "string") socket.join(`stream_${streamId}`);
    });
    socket.on("leave_stream", (streamId) => {
        if (typeof streamId === "string") socket.leave(`stream_${streamId}`);
    });
    socket.on("chat_message", ({ streamId, user, text }) => {
        if (
            typeof streamId === "string" &&
            typeof user === "object" &&
            typeof text === "string"
        ) {
            io.to(`stream_${streamId}`).emit("chat_message", {
                user,
                text,
                timestamp: new Date(),
            });
        }
    });
    socket.on("admin_stop_stream", (streamId) => {
        if (typeof streamId === "string") io.emit("admin_stream_stopped", streamId);
    });
    socket.on("admin_ban_user", (userId) => {
        if (typeof userId === "string") io.emit("admin_user_banned", userId);
    });
    socket.on("disconnect", () => {
        // Optional: clean up resources here
    });
});

app.set("io", io);

// --------- GRACEFUL SHUTDOWN ---------
process.on("SIGTERM", () => {
    server.close(() => {
        console.log("🔒 Server terminated");
        mongoose.connection.close();
    });
});
process.on("SIGINT", () => {
    server.close(() => {
        console.log("🔒 Server interrupted (Ctrl+C)");
        mongoose.connection.close();
    });
});

// --------- START SERVER ---------
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});