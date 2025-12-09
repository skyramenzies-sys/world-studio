// src/api/socket.js - World Studio Live Socket Configuration (Universe Edition)
import { io } from "socket.io-client";
import { API_ORIGIN } from "./api";

// ============================================
// TOKEN HELPER (zelfde logica als api.js)
// ============================================
const getToken = () => {
    try {
        if (typeof window === "undefined") return null;
        return (
            window.localStorage.getItem("ws_token") ||
            window.localStorage.getItem("token") ||
            window.sessionStorage.getItem("ws_token") ||
            window.sessionStorage.getItem("token")
        );
    } catch {
        return null;
    }
};

// ============================================
// SOCKET BASE URL (Vite + Railway compatible)
// ============================================

// Basis: backend origin uit api.js
let baseUrl = API_ORIGIN || "https://world-studio-production.up.railway.app";

// VITE_SOCKET_URL heeft hoogste prioriteit
if (typeof import.meta !== "undefined" && import.meta.env) {
    const { VITE_SOCKET_URL } = import.meta.env;
    if (VITE_SOCKET_URL) {
        baseUrl = VITE_SOCKET_URL;
    }
}

// Als URL eindigt op /api of /api/ → strippen voor socket
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
    // Initieel meteen token meesturen (als beschikbaar)
    auth: {
        token: getToken() || undefined,
    },
});

// ============================================
// CONNECTION EVENTS
// ============================================
socket.on("connect", () => {
    console.log("✅ Connected to World Studio Live (ID:", socket.id, ")");
});

socket.on("disconnect", (reason) => {
    console.log("❌ Disconnected:", reason);
    if (reason === "io server disconnect") {
        socket.connect();
    }
});

socket.on("connect_error", (error) => {
    console.error("🔴 Socket connect error:", error?.message || error);
});



// ============================================
// AUTH HELPERS
// ============================================
/**
 * Her-auth socket met verse token (na login / refresh)
 */
export const authenticateSocket = (token) => {
    const nextToken = token || getToken() || undefined;
    socket.auth = { token: nextToken };

    // Forceer nieuwe connectie met nieuwe auth
    if (socket.connected) {
        socket.disconnect();
    }
    socket.connect();
};

// ============================================
// USER ROOMS
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
// LIVE STREAM (SOLO)
// ============================================


export const joinLiveStream = (streamId, userData) => {
    if (!streamId) return;

    socket.emit("join_stream", streamId);
    socket.emit("watcher", { roomId: streamId, user: userData || null });
};


export const leaveLiveStream = (streamId, userId) => {
    if (!streamId) return;

    socket.emit("leave_watcher", { roomId: streamId, userId });
    socket.emit("leave_stream", streamId);
};

export const startBroadcast = ({
    roomId,
    streamer,
    title,
    category,
    streamerId,
}) => {
    if (!roomId || !streamerId) return;

    socket.emit("start_broadcast", {
        roomId,
        streamer,
        title,
        category,
        streamerId,
    });
};


export const stopBroadcast = (roomId) => {
    if (!roomId) return;
    socket.emit("stop_broadcast", { roomId });
};

// ============================================
// MULTI-LIVE
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



// ============================================
// CHAT
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
// NOTIFICATIONS
// ============================================
export const subscribeToNotifications = (userId) => {
    if (!userId) return;
    socket.emit("subscribe_notifications", { userId });
};



// ============================================
// SOCKET STATUS
// ============================================
export const getConnectionStatus = () => ({
    connected: socket.connected,
    id: socket.id,
});

export const isConnected = () => socket.connected;

// Universe helper: altijd dezelfde instance terug
export const getSocket = () => socket;

// ============================================
// DEFAULT EXPORT
// ============================================
export default socket;
