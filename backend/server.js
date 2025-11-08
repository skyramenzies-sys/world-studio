// server.js - World-Studio Backend Core
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/stocks", require("./routes/stocks"));
app.use("/api/admin", require("./routes/admin"));

// ✅ MongoDB Connect
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Socket.io – realtime feed + notifications
io.on("connection", (socket) => {
    console.log("🛰️ User connected:", socket.id);

    socket.on("likePost", (data) => {
        io.emit("postLiked", data);
        io.emit("notification", {
            type: "like",
            message: `${data.username} liked ${data.postTitle}`,
            timestamp: new Date(),
        });
    });

    socket.on("newComment", (data) => {
        io.emit("commentAdded", data);
        io.emit("notification", {
            type: "comment",
            message: `${data.username} commented on ${data.postTitle}`,
            timestamp: new Date(),
        });
    });

    socket.on("followUser", (data) => {
        io.emit("notification", {
            type: "follow",
            message: `${data.username} started following you`,
            timestamp: new Date(),
        });
    });

    socket.on("supportUser", (data) => {
        io.emit("notification", {
            type: "support",
            message: `${data.username} sent $${data.amount} to ${data.targetUsername}`,
            timestamp: new Date(),
        });
    });

    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
    });
});

// ✅ Test route
app.get("/", (req, res) => {
    res.json({ message: "🌐 World-Studio API Online 🚀" });
});

// ✅ Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () =>
    console.log(`🚀 World-Studio Backend running on port ${PORT}`)
);
