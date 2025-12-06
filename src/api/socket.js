// src/api/socket.js - World Studio Live Socket Configuration (Universe Edition)
import { io } from "socket.io-client";

// ============================================
// SOCKET BASE URL (Vite + Railway compatible)
// ============================================

// Prefer dedicated socket URL, fallback to API URL, dan Railway URL
let baseUrl = "https://world-studio-production.up.railway.app";

if (typeof import.meta !== "undefined" && import.meta.env) {
    baseUrl =
        import.meta.env.VITE_SOCKET_URL ||
        import.meta.env.VITE_API_URL ||
        baseUrl;
}

// Als VITE_API_URL eindigt op /api of /api/ → strippen voor socket
baseUrl = baseUrl.replace(/\/api\/?$/, "");
// Trailing slash weghalen
baseUrl = baseUrl.replace(/\/$/, "");

// Alleen hard loggen in development
const isDev =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.MODE !== "production";

if (isDev) {
    console.log("🔗 [WS] Socket connecting to:", baseUrl);
}

// ============================================
// SOCKET INSTANCE (singleton)
// ============================================
const socket = io(baseUrl, {
    transports: ["websocket", "polling"], // WebSocket eerst, daarna fallback
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    // withCredentials: true, // 👉 aanzetten als je cookies/CORS nodig hebt
});

// ============================================
// CONNECTION EVENTS (LOGGING)
// ============================================
socket.on("connect", () => {
    if (!isDev) {
        console.log("✅ Connected to World Studio Live");
    } else {
        console.log("✅ Connected to World Studio Live");
        console.log("   Socket ID:", socket.id);
    }
});

socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected from World Studio Live:", reason);

    // Als server expliciet disconnect → opnieuw proberen
    if (reason === "io server disconnect") {
        // Manuele reconnect
        socket.connect();
    }
});

socket.on("connect_error", (error) => {
    console.error("🔴 Socket connect error:", error?.message || error);
});

socket.on("reconnect", (attemptNumber) => {
    console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
});

socket.on("reconnect_attempt", (attemptNumber) => {
    if (isDev) {
        console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    }
});

socket.on("reconnect_error", (error) => {
    console.error("🔴 Reconnection error:", error?.message || error);
});

socket.on("reconnect_failed", () => {
    console.error("🔴 Failed to reconnect after all attempts");
});

// ============================================
// AUTHENTICATION HELPER (future-proof)
// ============================================
export const authenticateSocket = (token) => {
    // Werkt als je later auth in de handshake gebruikt (server-side: socket.handshake.auth.token)
    socket.auth = { token };
    // Forceer nieuwe connect
    socket.disconnect().connect();
};

// ============================================
// USER ROOMS (matcht server: join_user_room / leave_user_room)
// ============================================
export const joinUserRoom = (userId) => {
    if (!userId) return;
    socket.emit("join_user_room", userId);
};

export const leaveUserRoom = (userId) => {
    if (!userId) return;
    socket.emit("leave_user_room", userId);
};

// ============================================
// LIVE STREAM (SOLO) – matcht server events
// server.js: join_stream, leave_stream, watcher, leave_watcher
// ============================================

/**
 * Join een live stream als viewer
 * - joint stream room
 * - telt viewer op via 'watcher'
 */
export const joinLiveStream = (streamId, userData) => {
    if (!streamId) return;

    // Join de stream rooms
    socket.emit("join_stream", streamId);

    // Viewer tellen
    socket.emit("watcher", {
        roomId: streamId,
        // user is optioneel, server gebruikt alleen roomId nu,
        // maar future-proof meegestuurd:
        user: userData || null,
    });
};

/**
 * Leave live stream als viewer
 */
export const leaveLiveStream = (streamId, userId) => {
    if (!streamId) return;

    socket.emit("leave_watcher", { roomId: streamId, userId });
    socket.emit("leave_stream", streamId);
};

/**
 * Start live broadcast (solo live)
 * → matcht server: start_broadcast
 */
export const startBroadcast = ({ roomId, streamer, title, category, streamerId }) => {
    if (!roomId || !streamerId) return;

    socket.emit("start_broadcast", {
        roomId,
        streamer,
        title,
        category,
        streamerId,
    });
};

/**
 * Stop live broadcast (solo live)
 * → matcht server: stop_broadcast
 */
export const stopBroadcast = (roomId) => {
    if (!roomId) return;
    socket.emit("stop_broadcast", { roomId });
};

// ============================================
// MULTI-LIVE / CO-STREAMING – matcht server
// join_multi_live, start_multi_live, request_seat, approve_seat, etc.
// ============================================

export const joinMultiLive = (roomId, user) => {
    if (!roomId || !user) return;
    socket.emit("join_multi_live", { roomId, user });
};

export const startMultiLive = ({ roomId, streamId, host, title, maxSeats }) => {
    if (!roomId || !host) return;
    socket.emit("start_multi_live", {
        roomId,
        streamId,
        host,
        title,
        maxSeats,
    });
};

export const requestSeat = ({ roomId, seatId, user, odId }) => {
    if (!roomId || !user) return;
    socket.emit("request_seat", { roomId, seatId, user, odId });
};

export const approveSeat = ({ roomId, seatId, user, socketId }) => {
    if (!roomId || !user) return;
    socket.emit("approve_seat", { roomId, seatId, user, socketId });
};

export const rejectSeat = ({ roomId, odId }) => {
    if (!roomId || !odId) return;
    socket.emit("reject_seat", { roomId, odId });
};

export const guestReady = ({ roomId, odId, seatId }) => {
    if (!roomId || !odId) return;
    socket.emit("guest_ready", { roomId, odId, seatId });
};

export const leaveSeat = ({ roomId, odId }) => {
    if (!roomId || !odId) return;
    socket.emit("leave_seat", { roomId, odId });
};

export const kickFromSeat = ({ roomId, odId }) => {
    if (!roomId || !odId) return;
    socket.emit("kick_from_seat", { roomId, odId });
};

export const muteUserInMultiLive = ({ roomId, odId }) => {
    if (!roomId || !odId) return;
    socket.emit("mute_user", { roomId, odId });
};

export const unmuteUserInMultiLive = ({ roomId, odId }) => {
    if (!roomId || !odId) return;
    socket.emit("unmute_user", { roomId, odId });
};

export const endMultiLive = (roomId) => {
    if (!roomId) return;
    socket.emit("end_multi_live", { roomId });
};

export const leaveMultiLive = ({ roomId, odId }) => {
    if (!roomId) return;
    socket.emit("leave_multi_live", { roomId, odId });
};

// ============================================
// CHAT & GIFTS – matcht server: chat_message, chat_gift
// ============================================

export const sendChatMessage = (roomId, message, userData) => {
    if (!roomId || !message) return;

    socket.emit("chat_message", {
        roomId,
        text: message,
        username: userData?.username,
        userId: userData?._id,
        avatar: userData?.avatar,
        timestamp: new Date().toISOString(),
    });
};

export const sendChatGift = (roomId, giftData, userData) => {
    if (!roomId || !giftData) return;

    socket.emit("chat_gift", {
        roomId,
        ...giftData,
        fromUserId: userData?._id,
        fromUsername: userData?.username,
        fromAvatar: userData?.avatar,
        timestamp: new Date().toISOString(),
    });
};






// ============================================
// NOTIFICATIONS (future-proof – server events later)
// ============================================
export const subscribeToNotifications = (userId) => {
    if (!userId) return;
    socket.emit("subscribe_notifications", { userId });
};

export const unsubscribeFromNotifications = (userId) => {
    if (!userId) return;
    socket.emit("unsubscribe_notifications", { userId });
};

// ============================================
// STATUS HELPERS
// ============================================
export const getConnectionStatus = () => ({
    connected: socket.connected,
    id: socket.id,
});

export const isConnected = () => socket.connected;

// ============================================
// EXPORT DEFAULT SOCKET
// ============================================
export default socket;
