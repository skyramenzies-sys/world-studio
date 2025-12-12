// backend/sockets/liveSocket.js
// World-Studio.live - Live Socket Handler (UNIVERSE EDITION 🌌)
// Handles: Live streaming, WebRTC, Chat, Gifts, Multi-guest, AND User Notifications

const rooms = new Map();
const userRooms = new Map(); // Track user rooms for notifications

module.exports = function registerLiveSocket(io, socket) {

    // ============================================================
    // USER ROOM FOR NOTIFICATIONS (NEW!)
    // ============================================================

    /**
     * Join user's personal room for receiving notifications
     * Frontend calls: socket.emit("join_user_room", userId)
     */
    socket.on("join_user_room", (userId) => {
        if (!userId) return;

        const roomName = `user_${userId}`;
        socket.join(roomName);
        socket.userId = userId;

        // Track user's socket for direct messaging
        userRooms.set(userId, socket.id);

        console.log(`🔔 User ${userId} joined notification room`);
    });

    /**
     * Leave user room (cleanup)
     */
    socket.on("leave_user_room", (userId) => {
        if (!userId) return;

        const roomName = `user_${userId}`;
        socket.leave(roomName);
        userRooms.delete(userId);

        console.log(`🔕 User ${userId} left notification room`);
    });

    // ============================================================
    // HOST START BROADCAST
    // ============================================================

    socket.on("start_broadcast", (data) => {
        const roomId = data.roomId || data.streamId;
        const oderId = data.hostId || data.streamerId || socket.id;
        const username = data.hostUsername || data.streamer || "Host";

        rooms.set(roomId, {
            host: socket.id,
            oderId,
            username,
            viewers: new Map(),
            seats: new Map()
        });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;

        console.log("📺 Broadcast:", roomId, "by", username);

        // Notify followers that user went live (if userId is available)
        if (data.hostId) {
            io.emit("user_went_live", {
                userId: data.hostId,
                username,
                roomId,
                streamId: roomId,
            });
        }
    });

    // ============================================================
    // MULTI-GUEST START
    // ============================================================

    socket.on("start_multi_live", (data) => {
        const { roomId, host } = data;
        rooms.set(roomId, {
            host: socket.id,
            oderId: host?._id,
            username: host?.username,
            viewers: new Map(),
            seats: new Map()
        });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;
        console.log("👥 Multi-Live:", roomId, "by", host?.username);
    });

    socket.on("join_multi_live", (data) => {
        const { roomId, user } = data;
        let room = rooms.get(roomId);
        if (!room) {
            room = { host: null, viewers: new Map(), seats: new Map() };
            rooms.set(roomId, room);
        }
        room.viewers.set(user?._id || socket.id, {
            socketId: socket.id,
            username: user?.username
        });
        socket.join(roomId);
        socket.roomId = roomId;
        io.to(roomId).emit("viewer_count", { count: room.viewers.size });
        console.log("👁 Multi joined:", user?.username, "->", roomId);
    });

    // ============================================================
    // VIEWER JOIN
    // ============================================================

    const joinRoom = (data) => {
        const roomId = data.roomId || data.streamId;
        if (!roomId) return;

        let room = rooms.get(roomId);
        if (!room) {
            room = { host: null, viewers: new Map(), seats: new Map() };
            rooms.set(roomId, room);
        }

        const viewerData = {
            socketId: socket.id,
            oderId: data.oderId || data.userId,
            username: data.username,
        };

        room.viewers.set(socket.id, viewerData);
        socket.join(roomId);
        socket.roomId = roomId;

        io.to(roomId).emit("viewerCount", room.viewers.size);
        io.to(roomId).emit("viewer_count", { count: room.viewers.size });

        // BELANGRIJK: Stuur watcher naar host met WATCHERID
        if (room.host) {
            io.to(room.host).emit("watcher", {
                watcherId: socket.id,
                socketId: socket.id
            });
        }

        console.log("👁 Joined:", roomId, "viewers:", room.viewers.size);
    };

    socket.on("join_room", joinRoom);
    socket.on("join_stream", joinRoom);
    socket.on("watcher", joinRoom);

    // ============================================================
    // WEBRTC SIGNALING
    // ============================================================

    // OFFER (host -> viewer)
    socket.on("offer", (data) => {
        const target = data.watcherId || data.targetSocketId || data.broadcaster;
        if (target) {
            io.to(target).emit("offer", {
                sdp: data.sdp || data.offer,
                offer: data.sdp || data.offer,
                broadcaster: socket.id
            });
            console.log("📡 Offer:", socket.id, "->", target);
        }
    });

    // ANSWER (viewer -> host)
    socket.on("answer", (data) => {
        const target = data.broadcaster || data.targetSocketId;
        if (target) {
            io.to(target).emit("answer", {
                sdp: data.sdp || data.answer,
                answer: data.sdp || data.answer,
                watcherId: socket.id
            });
            console.log("📡 Answer:", socket.id, "->", target);
        }
    });

    // ICE CANDIDATE
    socket.on("candidate", (data) => {
        const target = data.broadcaster || data.watcherId || data.targetSocketId;
        if (target) {
            io.to(target).emit("candidate", {
                candidate: data.candidate,
                from: socket.id
            });
        }
    });

    // ============================================================
    // CHAT
    // ============================================================

    socket.on("chat_message", (data) => {
        const roomId = data.roomId || socket.roomId;
        io.to(roomId).emit("chat_message", {
            ...data,
            ts: Date.now()
        });
    });

    // ============================================================
    // GIFTS
    // ============================================================

    socket.on("gift_sent", (data) => {
        const roomId = data.roomId || socket.roomId;

        // Broadcast to stream room
        io.to(roomId).emit("gift_received", {
            ...data,
            timestamp: Date.now()
        });

        // Also send notification to streamer's user room
        if (data.streamerId || data.toUserId) {
            const targetUserId = data.streamerId || data.toUserId;
            io.to(`user_${targetUserId}`).emit("new_notification", {
                type: "gift",
                message: `${data.fromUsername || "Someone"} sent you a ${data.giftName || "gift"}!`,
                fromUsername: data.fromUsername,
                fromAvatar: data.fromAvatar,
                amount: data.coins || data.amount,
                icon: "🎁",
                createdAt: new Date(),
            });
        }
    });

    // ============================================================
    // STOP BROADCAST
    // ============================================================

    socket.on("stop_broadcast", (data) => {
        const roomId = data.roomId || socket.roomId;
        io.to(roomId).emit("broadcaster_disconnected");
        io.to(roomId).emit("stream_ended", { roomId });
        rooms.delete(roomId);
        console.log("🛑 Broadcast ended:", roomId);
    });

    socket.on("end_multi_live", (data) => {
        io.to(data.roomId).emit("multi_live_ended", { roomId: data.roomId });
        rooms.delete(data.roomId);
        console.log("🛑 Multi-Live ended:", data.roomId);
    });

    // ============================================================
    // LEAVE STREAM
    // ============================================================

    socket.on("leave_stream", (data) => {
        const roomId = data.roomId || socket.roomId;
        const room = rooms.get(roomId);
        if (room) {
            room.viewers.delete(socket.id);
            io.to(roomId).emit("viewerCount", room.viewers.size);
            io.to(roomId).emit("viewer_count", { count: room.viewers.size });
            if (room.host) {
                io.to(room.host).emit("remove_watcher", { watcherId: socket.id });
            }
        }
    });

    // ============================================================
    // MULTI-GUEST SEATS
    // ============================================================

    socket.on("request_seat", (data) => {
        const room = rooms.get(data.roomId);
        if (room?.host) {
            io.to(room.host).emit("seat_request", {
                ...data,
                socketId: socket.id
            });
        }
    });

    socket.on("approve_seat", (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            const viewer = room.viewers.get(data.oderId);
            if (viewer) {
                io.to(viewer.socketId).emit("seat_approved", data);
            }
            io.to(data.roomId).emit("seat_approved", data);
        }
    });

    socket.on("reject_seat", (data) => {
        const room = rooms.get(data.roomId);
        const viewer = room?.viewers.get(data.oderId);
        if (viewer) {
            io.to(viewer.socketId).emit("seat_rejected", data);
        }
    });

    socket.on("guest_ready", (data) => {
        io.to(data.roomId).emit("guest_ready", data);
    });

    // ============================================================
    // MULTI-GUEST WEBRTC
    // ============================================================

    socket.on("multi_offer", (data) => {
        const room = rooms.get(data.roomId);
        const viewer = room?.viewers.get(data.targetId);
        if (viewer) {
            io.to(viewer.socketId).emit("multi_offer", data);
        }
    });

    socket.on("multi_answer", (data) => {
        const room = rooms.get(data.roomId);
        const viewer = room?.viewers.get(data.targetId);
        if (viewer) {
            io.to(viewer.socketId).emit("multi_answer", data);
        }
    });

    socket.on("multi_ice_candidate", (data) => {
        const room = rooms.get(data.roomId);
        const viewer = room?.viewers.get(data.targetId);
        if (viewer) {
            io.to(viewer.socketId).emit("multi_ice_candidate", data);
        }
    });

    // ============================================================
    // DISCONNECT
    // ============================================================

    socket.on("disconnect", () => {
        // Clean up user notification room
        if (socket.userId) {
            userRooms.delete(socket.userId);
            console.log(`🔕 User ${socket.userId} disconnected from notifications`);
        }

        // Clean up stream room
        const room = rooms.get(socket.roomId);
        if (!room) return;

        if (socket.isHost) {
            io.to(socket.roomId).emit("broadcaster_disconnected");
            io.to(socket.roomId).emit("stream_ended", { roomId: socket.roomId });
            rooms.delete(socket.roomId);
            console.log("🛑 Host disconnected:", socket.roomId);
        } else {
            room.viewers.delete(socket.id);
            io.to(socket.roomId).emit("viewerCount", room.viewers.size);
            io.to(socket.roomId).emit("viewer_count", { count: room.viewers.size });
            if (room.host) {
                io.to(room.host).emit("remove_watcher", { watcherId: socket.id });
            }
        }
    });

    // ============================================================
    // UTILITY: Send notification to specific user
    // Can be called from anywhere: io.to(`user_${userId}`).emit("new_notification", {...})
    // ============================================================
};

// Export helper to send notifications from other parts of the app
module.exports.sendNotificationToUser = (io, userId, notification) => {
    if (!io || !userId) return false;

    io.to(`user_${userId}`).emit("new_notification", {
        ...notification,
        createdAt: notification.createdAt || new Date(),
    });

    return true;
};

// Export helper to check if user is online
module.exports.isUserOnline = (userId) => {
    return userRooms.has(userId);
};

// Export helper to get online user count
module.exports.getOnlineUserCount = () => {
    return userRooms.size;
};