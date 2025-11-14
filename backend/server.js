require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// ROUTES
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

// EXPRESS APP + HTTP
const app = express();
const server = http.createServer(app);

// CORS
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://world-studio.vercel.app",
            // Add your frontend production domain here as needed
        ],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    })
);
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// ROUTES
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

// MONGODB CONNECT
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

// SOCKET.IO
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://world-studio.vercel.app",
            // Add your frontend production domain here as needed
        ],
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    // Stream chat, joining, and moderation actions
    socket.on("join_stream", (streamId) => {
        socket.join(`stream_${streamId}`);
    });
    socket.on("leave_stream", (streamId) => {
        socket.leave(`stream_${streamId}`);
    });
    socket.on("chat_message", ({ streamId, user, text }) => {
        io.to(`stream_${streamId}`).emit("chat_message", { user, text, timestamp: new Date() });
    });

    // Admin actions (emit events for frontend to update in real-time)
    socket.on("admin_stop_stream", (streamId) => {
        io.emit("admin_stream_stopped", streamId);
    });
    socket.on("admin_ban_user", (userId) => {
        io.emit("admin_user_banned", userId);
    });
});

app.set("io", io);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
