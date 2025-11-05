// server.js
const express = require("express");
const http = require('http');
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT"] },
});
app.set("io", io); // maak io beschikbaar in routes via req.app.get('io')

// Middleware
app.use(
    cors({
        origin: "*", // laat alle domeinen toe (kan je later beperken)
    })
);
app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ limit: "1000mb", extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/users", require("./routes/users"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/stocks", require("./routes/stocks"));

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test route
app.get("/", (req, res) => {
    res.json({ message: "🌍 World-Studio API is running perfectly! 🚀" });
});

// MongoDB Connection (met automatische retry)
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        console.log("🔁 Retrying connection in 5 seconds...");
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// Socket.io events (optional logging)
io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("🔌 Socket disconnected:", socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Ready on Railway or http://localhost:${PORT}`);
});
