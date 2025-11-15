// src/api/socket.js
import { io } from "socket.io-client";

// Remove any trailing slash or "/api" in env variable if present
let baseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    "https://world-studio-production.up.railway.app";
baseUrl = baseUrl.replace(/\/api\/?$/, ""); // Removes '/api' at the end if present

const socket = io(baseUrl, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
});

// Optional: For debugging connection errors
socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message || err);
});

export default socket;
