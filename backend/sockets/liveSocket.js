// backend/sockets/liveSocket.js - WebRTC Signaling for Live Streams

const rooms = new Map();

module.exports = function registerLiveSocket(io, socket) {
    
    socket.on("start_broadcast", (data) => {
        const { roomId, userId, username, streamId } = data;
        console.log(`📺 Broadcast started: ${roomId} by ${username}`);
        
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                host: socket.id,
                hostUserId: userId,
                hostUsername: username,
                streamId,
                viewers: new Map(),
                createdAt: Date.now()
            });
        } else {
            const room = rooms.get(roomId);
            room.host = socket.id;
            room.hostUserId = userId;
            room.hostUsername = username;
        }
        
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;
        
        io.to(roomId).emit("host_started", {
            roomId, hostId: userId, hostUsername: username, hostSocketId: socket.id
        });
    });

    socket.on("join_room", (data) => {
        const { roomId, userId, username } = data;
        console.log(`👁 Viewer joining: ${username} -> ${roomId}`);
        
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit("room_error", { message: "Room not found" });
            return;
        }
        
        room.viewers.set(userId, { socketId: socket.id, username });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.userId = userId;
        socket.isHost = false;
        
        const viewerCount = room.viewers.size;
        io.to(roomId).emit("viewer_count", { count: viewerCount });
        
        if (room.host) {
            io.to(room.host).emit("viewer_joined", { userId, username, viewerSocketId: socket.id });
        }
        
        socket.emit("room_joined", {
            roomId, hostSocketId: room.host, hostUsername: room.hostUsername, viewerCount
        });
    });

    socket.on("webrtc_offer", (data) => {
        const { targetSocketId, offer, roomId } = data;
        io.to(targetSocketId).emit("webrtc_offer", { offer, senderSocketId: socket.id, roomId });
    });

    socket.on("webrtc_answer", (data) => {
        const { targetSocketId, answer, roomId } = data;
        io.to(targetSocketId).emit("webrtc_answer", { answer, senderSocketId: socket.id, roomId });
    });

    socket.on("webrtc_ice_candidate", (data) => {
        const { targetSocketId, candidate, roomId } = data;
        io.to(targetSocketId).emit("webrtc_ice_candidate", { candidate, senderSocketId: socket.id, roomId });
    });

    socket.on("chat_message", (data) => {
        const { roomId, message, userId, username, avatar } = data;
        io.to(roomId).emit("chat_message", { userId, username, avatar, message, timestamp: Date.now() });
    });

    socket.on("gift_sent", (data) => {
        const { roomId, gift, senderId, senderName, senderAvatar } = data;
        io.to(roomId).emit("gift_received", { gift, senderId, senderName, senderAvatar, timestamp: Date.now() });
    });

    socket.on("stop_broadcast", (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (room && room.host === socket.id) {
            io.to(roomId).emit("stream_ended", { roomId });
            rooms.delete(roomId);
        }
    });

    socket.on("leave_room", (data) => {
        const { roomId, userId } = data;
        const room = rooms.get(roomId);
        if (room) {
            room.viewers.delete(userId);
            io.to(roomId).emit("viewer_count", { count: room.viewers.size });
            if (room.host) io.to(room.host).emit("viewer_left", { userId });
        }
        socket.leave(roomId);
    });

    socket.on("request_seat", (data) => {
        const { roomId, userId, username, avatar } = data;
        const room = rooms.get(roomId);
        if (room && room.host) {
            io.to(room.host).emit("seat_request", { userId, username, avatar, socketId: socket.id });
        }
    });

    socket.on("accept_guest", (data) => {
        const { roomId, userId, seatIndex } = data;
        const room = rooms.get(roomId);
        if (room) {
            const viewer = room.viewers.get(userId);
            if (viewer) {
                io.to(viewer.socketId).emit("seat_accepted", { seatIndex, roomId });
                io.to(roomId).emit("guest_joined_seat", { userId, username: viewer.username, seatIndex });
            }
        }
    });

    socket.on("reject_guest", (data) => {
        const { roomId, userId } = data;
        const room = rooms.get(roomId);
        if (room) {
            const viewer = room.viewers.get(userId);
            if (viewer) io.to(viewer.socketId).emit("seat_rejected", { roomId });
        }
    });

    socket.on("leave_seat", (data) => {
        const { roomId, userId, seatIndex } = data;
        io.to(roomId).emit("guest_left_seat", { userId, seatIndex });
    });

    socket.on("disconnect", () => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        const room = rooms.get(roomId);
        if (!room) return;
        
        if (socket.isHost) {
            io.to(roomId).emit("stream_ended", { roomId, reason: "host_disconnected" });
            rooms.delete(roomId);
        } else if (socket.userId) {
            room.viewers.delete(socket.userId);
            io.to(roomId).emit("viewer_count", { count: room.viewers.size });
            if (room.host) io.to(room.host).emit("viewer_left", { userId: socket.userId });
        }
    });
};
