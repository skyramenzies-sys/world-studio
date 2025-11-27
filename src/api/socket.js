// src/api/socket.js
import { io } from "socket.io-client";

// -------------------------------------------
// Get backend URL (same logic as api.js)
// -------------------------------------------
let baseUrl =
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

// Remove /api suffix if present (socket connects to root)
baseUrl = baseUrl.replace(/\/api\/?$/, "");

// Also handle trailing slash
baseUrl = baseUrl.replace(/\/$/, "");

console.log("🔗 Socket connecting to:", baseUrl);

// -------------------------------------------
// Create socket instance
// -------------------------------------------
const socket = io(baseUrl, {
    // Connection options
    transports: ["websocket", "polling"], // Try websocket first, fallback to polling
    upgrade: true,                         // Allow upgrade from polling to websocket

    // Reconnection options
    reconnection: true,
    reconnectionAttempts: 50,              // More attempts
    reconnectionDelay: 1000,               // Start with 1 second
    reconnectionDelayMax: 10000,           // Max 10 seconds between attempts
    randomizationFactor: 0.5,              // Add randomization to prevent thundering herd

    // Timeout options
    timeout: 20000,                        // 20 second connection timeout

    // Path (required for reverse proxies like Railway/Vercel)
    path: "/socket.io",

    // Auth - send token if available
    auth: (cb) => {
        const token = localStorage.getItem("token");
        cb({ token });
    },
});

// -------------------------------------------
// Connection event handlers
// -------------------------------------------
socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket.id);

    // Re-authenticate after reconnection
    const token = localStorage.getItem("token");
    if (token) {
        socket.emit("authenticate", { token });
    }
});

socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);

    // If server disconnected us, try to reconnect
    if (reason === "io server disconnect") {
        socket.connect();
    }
});

socket.on("connect_error", (err) => {
    console.error("❌ Socket connect error:", err?.message || err);

    // If authentication error, might need to re-login
    if (err.message?.includes("auth") || err.message?.includes("unauthorized")) {
        console.warn("⚠️ Socket auth error - token may be invalid");
    }
});

socket.on("reconnect", (attemptNumber) => {
    console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
});

socket.on("reconnect_attempt", (attemptNumber) => {
    console.log("🔄 Socket reconnection attempt:", attemptNumber);
});

socket.on("reconnect_error", (err) => {
    console.error("❌ Socket reconnection error:", err?.message || err);
});

socket.on("reconnect_failed", () => {
    console.error("❌ Socket reconnection failed after all attempts");
});

// -------------------------------------------
// Error handler for any socket errors
// -------------------------------------------
socket.on("error", (err) => {
    console.error("❌ Socket error:", err);
});

// -------------------------------------------
// Helper functions
// -------------------------------------------

/**
 * Emit with acknowledgment and timeout
 * @param {string} event - Event name
 * @param {any} data - Data to send
 * @param {number} timeout - Timeout in ms (default 5000)
 * @returns {Promise}
 */
socket.emitWithAck = (event, data, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Socket emit timeout for event: ${event}`));
        }, timeout);

        socket.emit(event, data, (response) => {
            clearTimeout(timer);
            if (response?.error) {
                reject(new Error(response.error));
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Check if socket is connected
 * @returns {boolean}
 */
socket.isConnected = () => {
    return socket.connected;
};

/**
 * Reconnect socket manually
 */
socket.reconnect = () => {
    if (!socket.connected) {
        socket.connect();
    }
};

/**
 * Join a room (e.g., stream room, chat room)
 * @param {string} roomId
 */
socket.joinRoom = (roomId) => {
    if (roomId) {
        socket.emit("join_room", roomId);
        console.log("📥 Joined room:", roomId);
    }
};

/**
 * Leave a room
 * @param {string} roomId
 */
socket.leaveRoom = (roomId) => {
    if (roomId) {
        socket.emit("leave_room", roomId);
        console.log("📤 Left room:", roomId);
    }
};

// -------------------------------------------
// Export socket instance
// -------------------------------------------
export default socket;