// src/api/socket.js
// World-Studio.live - Socket Client (UNIVERSE EDITION 🌌)
// Handles all real-time communication

import { io } from "socket.io-client";

// Get API URL and convert to socket URL
const RAW_API_URL =
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

// Remove /api suffix for socket connection
const SOCKET_URL = RAW_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

// Create socket instance
const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ["websocket", "polling"],
});

// Connection status logging
socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
    console.error("🔌 Socket connection error:", error.message);
});

socket.on("reconnect", (attemptNumber) => {
    console.log("🔌 Socket reconnected after", attemptNumber, "attempts");
});

// ===========================================
// USER ROOM HELPERS (for notifications)
// ===========================================

/**
 * Join user's personal room for receiving notifications
 * Call this after login
 */
export const joinUserRoom = (userId) => {
    if (!userId) {
        console.warn("joinUserRoom: No userId provided");
        return;
    }
    socket.emit("join_user_room", userId);
    console.log("🔔 Joined user room:", userId);
};

/**
 * Leave user's personal room
 * Call this on logout
 */
export const leaveUserRoom = (userId) => {
    if (!userId) return;
    socket.emit("leave_user_room", userId);
    console.log("🔕 Left user room:", userId);
};

// ===========================================
// LIVE STREAMING HELPERS
// ===========================================

/**
 * Host starts a broadcast
 */
export const startBroadcast = (data) => {
    socket.emit("start_broadcast", {
        roomId: data.roomId || data.streamId,
        hostId: data.hostId || data.userId,
        hostUsername: data.username || data.hostUsername,
        ...data,
    });
};

/**
 * Viewer joins a stream
 */
export const joinStream = (data) => {
    socket.emit("join_stream", {
        roomId: data.roomId || data.streamId,
        userId: data.userId,
        username: data.username,
        ...data,
    });
};

/**
 * Leave a stream
 */
export const leaveStream = (roomId) => {
    socket.emit("leave_stream", { roomId });
};

/**
 * Stop broadcasting
 */
export const stopBroadcast = (roomId) => {

    socket.emit("stop_broadcast", { roomId });
};

// ===========================================
// WEBRTC SIGNALING HELPERS
// ===========================================

/**
 * Send WebRTC offer (host -> viewer)
 */
export const sendOffer = (data) => {
    socket.emit("offer", data);
};

/**
 * Send WebRTC answer (viewer -> host)
 */
export const sendAnswer = (data) => {
    socket.emit("answer", data);
};

/**
 * Send ICE candidate
 */
export const sendCandidate = (data) => {
    socket.emit("candidate", data);
};



// ===========================================
// CHAT HELPERS
// ===========================================

/**
 * Send chat message
 */
export const sendChatMessage = (data) => {
    socket.emit("chat_message", {
        roomId: data.roomId,
        userId: data.userId,
        username: data.username,
        avatar: data.avatar,
        message: data.message,
        ...data,
    });
};

// ===========================================
// GIFT HELPERS
// ===========================================

/**
 * Send gift to streamer
 */
export const sendGift = (data) => {
    socket.emit("gift_sent", {
        roomId: data.roomId,
        fromUserId: data.fromUserId,
        fromUsername: data.fromUsername,
        fromAvatar: data.fromAvatar,
        toUserId: data.toUserId || data.streamerId,
        giftId: data.giftId,
        giftName: data.giftName,
        giftIcon: data.giftIcon,
        coins: data.coins || data.amount,
        ...data,
    });
};

// ===========================================
// MULTI-GUEST HELPERS
// ===========================================

/**
 * Request to join as guest
 */
export const requestSeat = (data) => {
    socket.emit("request_seat", data);
};

/**
 * Approve guest request (host only)
 */
export const approveSeat = (data) => {
    socket.emit("approve_seat", data);
};

/**
 * Reject guest request (host only)
 */
export const rejectSeat = (data) => {
    socket.emit("reject_seat", data);
};

/**
 * Guest is ready to stream
 */
export const guestReady = (data) => {
    socket.emit("guest_ready", data);
};



// ===========================================
// UTILITY EXPORTS
// ===========================================

export const getSocketId = () => socket.id;
export const isConnected = () => socket.connected;

// Reconnect manually if needed
export const reconnect = () => {
    if (!socket.connected) {
        socket.connect();
    }
};

// Disconnect (for cleanup)
export const disconnect = () => {
    socket.disconnect();
};

// Export socket instance as default
export default socket;
