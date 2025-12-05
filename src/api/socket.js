// src/api/socket.js - World Studio Live Socket Configuration
import { io } from "socket.io-client";

// ============================================
// SOCKET URL CONFIGURATION
// ============================================
const SOCKET_URL =
    process.env.REACT_APP_SOCKET_URL ||
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    "https://world-studio.live";

// ============================================
// SOCKET INSTANCE
// ============================================
const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

// ============================================
// CONNECTION EVENTS
// ============================================
socket.on("connect", () => {
    console.log("✅ Connected to World Studio Live");
    console.log("   Socket ID:", socket.id);
});

socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected:", reason);

    if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        socket.connect();
    }
});

socket.on("connect_error", (error) => {
    console.error("🔴 Connection error:", error.message);
});

socket.on("reconnect", (attemptNumber) => {
    console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
});

socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
});

socket.on("reconnect_error", (error) => {
    console.error("🔴 Reconnection error:", error.message);
});

socket.on("reconnect_failed", () => {
    console.error("🔴 Failed to reconnect after all attempts");
});

// ============================================
// AUTHENTICATION HELPER
// ============================================
export const authenticateSocket = (token) => {
    socket.auth = { token };
    socket.disconnect().connect();
};

// ============================================
// ROOM HELPERS
// ============================================
export const joinRoom = (roomId, userData) => {
    socket.emit("join_room", { roomId, user: userData });
};

export const leaveRoom = (roomId) => {
    socket.emit("leave_room", { roomId });
};

// ============================================
// LIVE STREAM HELPERS
// ============================================
export const joinLiveStream = (streamId, userData) => {
    socket.emit("join_live", { streamId, user: userData });
};

export const leaveLiveStream = (streamId) => {
    socket.emit("leave_live", { streamId });
};

export const sendGift = (streamId, giftData) => {
    socket.emit("send_gift", { streamId, ...giftData });
};

export const sendChatMessage = (roomId, message, userData) => {
    socket.emit("chat_message", {
        roomId,
        text: message,
        username: userData?.username,
        userId: userData?._id,
        timestamp: new Date().toISOString(),
    });
};

// ============================================
// AUDIO LIVE HELPERS
// ============================================
export const joinAudioLive = (roomId, userData) => {
    socket.emit("join_audio_live", { roomId, user: userData });
};

export const leaveAudioLive = (roomId, userId) => {
    socket.emit("leave_audio_live", { roomId, userId });
};

export const startAudioLive = (roomId, hostData, title, category) => {
    socket.emit("start_audio_live", {
        roomId,
        host: hostData,
        title,
        category,
    });
};

export const endAudioLive = (roomId) => {
    socket.emit("end_audio_live", { roomId });
};

export const emitAudioLevel = (roomId, speakerId, level) => {
    socket.emit("audio_level", { roomId, speakerId, level });
};

// ============================================
// NOTIFICATION HELPERS
// ============================================
export const subscribeToNotifications = (userId) => {
    socket.emit("subscribe_notifications", { userId });
};

export const unsubscribeFromNotifications = (userId) => {
    socket.emit("unsubscribe_notifications", { userId });
};

// ============================================
// STATUS HELPERS
// ============================================
export const getConnectionStatus = () => {
    return {
        connected: socket.connected,
        id: socket.id,
    };
};

export const isConnected = () => socket.connected;

// ============================================
// EXPORT DEFAULT SOCKET
// ============================================
export default socket;