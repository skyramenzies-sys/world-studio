// src/api/socket.js
import { io } from "socket.io-client";

// -------------------------------------------
// Unified backend URL (zelfde als API logic)
// -------------------------------------------
let baseUrl =
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

// Zorg dat er GEEN /api achter zit
baseUrl = baseUrl.replace(/\/api\/?$/, "");

console.log("🔗 Socket connecting to:", baseUrl);

// -------------------------------------------
// Create socket instance
// -------------------------------------------
const socket = io(baseUrl, {
    transports: ["websocket"],         // puur WebSocket, snelste
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1500,
    path: "/socket.io",                // verplicht voor Railway/Vercel
});

// Debug
socket.on("connect", () => console.log("🟢 Socket connected:", socket.id));
socket.on("disconnect", () => console.log("🔴 Socket disconnected"));
socket.on("connect_error", (err) =>
    console.error("❌ Socket connect error:", err?.message || err)
);

export default socket;
