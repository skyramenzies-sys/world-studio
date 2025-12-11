const rooms = new Map();

module.exports = function registerLiveSocket(io, socket) {
    
    // ============ SOLO BROADCAST ============
    socket.on("start_broadcast", (data) => {
        const roomId = data.roomId;
        const oderId = data.oderId || data.userId || data.streamerId || data.hostId || socket.id;
        const username = data.odername || data.username || data.streamer || data.hostUsername || "Host";
        
        rooms.set(roomId, { host: socket.id, oderId, username, viewers: new Map(), seats: new Map() });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;
        socket.oderId = oderId;
        
        console.log("📺 Broadcast:", roomId, "by", username);
        io.to(roomId).emit("host_started", { roomId, hostSocketId: socket.id });
    });

    // ============ MULTI-GUEST LIVE ============
    socket.on("start_multi_live", (data) => {
        const { roomId, streamId, host, title, maxSeats, audioOnly } = data;
        const oderId = host?._id || host?.id || socket.id;
        
        rooms.set(roomId, { 
            host: socket.id, 
            oderId, 
            username: host?.username,
            viewers: new Map(), 
            seats: new Map(),
            maxSeats: maxSeats || 12,
            title,
            audioOnly
        });
        
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;
        socket.oderId = oderId;
        
        console.log("📺 Multi-Live:", roomId, "by", host?.username);
    });

    socket.on("join_multi_live", (data) => {
        const { roomId, user, isHost } = data;
        const oderId = user?._id || user?.id || socket.id;
        
        let room = rooms.get(roomId);
        if (!room) {
            room = { host: null, viewers: new Map(), seats: new Map() };
            rooms.set(roomId, room);
        }
        
        room.viewers.set(oderId, { socketId: socket.id, username: user?.username, avatar: user?.avatar });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.oderId = oderId;
        socket.isHost = isHost;
        
        io.to(roomId).emit("viewer_count", { count: room.viewers.size });
        console.log("👁 Multi joined:", user?.username, "->", roomId);
    });

    socket.on("end_multi_live", (data) => {
        const { roomId } = data;
        io.to(roomId).emit("multi_live_ended", { roomId });
        rooms.delete(roomId);
        console.log("🛑 Multi-Live ended:", roomId);
    });

    socket.on("leave_multi_live", (data) => {
        const { roomId, oderId } = data;
        const room = rooms.get(roomId);
        if (room) {
            room.viewers.delete(oderId);
            room.seats.delete(oderId);
            io.to(roomId).emit("viewer_count", { count: room.viewers.size });
            io.to(roomId).emit("user_left_seat", { oderId, roomId });
        }
    });

    // ============ SEAT MANAGEMENT ============
    socket.on("request_seat", (data) => {
        const { roomId, seatId, user, oderId } = data;
        const room = rooms.get(roomId);
        if (room && room.host) {
            io.to(room.host).emit("seat_request", { roomId, seatId, user, oderId });
        }
    });

    socket.on("approve_seat", (data) => {
        const { roomId, seatId, user, oderId } = data;
        const room = rooms.get(roomId);
        if (room) {
            room.seats.set(oderId, { seatId, user });
            const viewer = room.viewers.get(oderId);
            if (viewer) {
                io.to(viewer.socketId).emit("seat_approved", { roomId, seatId, user });
            }
            io.to(roomId).emit("seat_approved", { roomId, seatId, user });
        }
    });

    socket.on("reject_seat", (data) => {
        const { roomId, oderId } = data;
        const room = rooms.get(roomId);
        if (room) {
            const viewer = room.viewers.get(oderId);
            if (viewer) {
                io.to(viewer.socketId).emit("seat_rejected", { roomId, oderId });
            }
        }
    });

    socket.on("kick_from_seat", (data) => {
        const { roomId, oderId } = data;
        const room = rooms.get(roomId);
        if (room) {
            room.seats.delete(oderId);
            const viewer = room.viewers.get(oderId);
            if (viewer) {
                io.to(viewer.socketId).emit("kicked_from_seat", { roomId });
            }
            io.to(roomId).emit("user_left_seat", { roomId, oderId });
        }
    });

    socket.on("mute_user", (data) => {
        const { roomId, oderId } = data;
        io.to(roomId).emit("user_muted", { roomId, oderId });
    });

    socket.on("leave_seat", (data) => {
        const { roomId, oderId } = data;
        const room = rooms.get(roomId);
        if (room) {
            room.seats.delete(oderId);
            io.to(roomId).emit("user_left_seat", { roomId, oderId });
        }
    });

    socket.on("guest_ready", (data) => {
        const { roomId, oderId, seatId } = data;
        io.to(roomId).emit("guest_ready", { roomId, oderId, seatId });
    });

    // ============ WEBRTC SIGNALING ============
    const joinRoom = (data) => {
        const roomId = data.roomId;
        if (!roomId) return;
        
        const oderId = data.oderId || data.userId || data.streamerId || socket.id;
        let room = rooms.get(roomId);
        if (!room) {
            room = { host: null, viewers: new Map(), seats: new Map() };
            rooms.set(roomId, room);
        }
        
        room.viewers.set(oderId, socket.id);
        socket.join(roomId);
        socket.roomId = roomId;
        socket.oderId = oderId;
        
        io.to(roomId).emit("viewerCount", room.viewers.size);
        if (room.host) io.to(room.host).emit("watcher", { watcherId: socket.id, socketId: socket.id });
        console.log("👁 Joined:", roomId, "viewers:", room.viewers.size);
    };
    socket.on("join_room", joinRoom);
    socket.on("join_stream", joinRoom);
    socket.on("watcher", joinRoom);

    socket.on("offer", (data) => {
        const room = rooms.get(socket.roomId);
        const target = data.broadcaster || data.targetSocketId || (room && room.host);
        if (target) io.to(target).emit("offer", { offer: data.offer, broadcaster: socket.id });
    });

    socket.on("multi_offer", (data) => {
        const { roomId, targetId, sdp, fromId } = data;
        const room = rooms.get(roomId);
        if (room) {
            const viewer = room.viewers.get(targetId);
            const targetSocket = viewer?.socketId || targetId;
            if (targetSocket) {
                io.to(targetSocket).emit("multi_offer", { roomId, sdp, fromId });
            }
        }
    });

    socket.on("answer", (data) => {
        if (data.broadcaster) io.to(data.broadcaster).emit("answer", { answer: data.answer });
    });

    socket.on("multi_answer", (data) => {
        const { roomId, targetId, sdp, fromId } = data;
        const room = rooms.get(roomId);
        if (room) {
            const viewer = room.viewers.get(targetId);
            const targetSocket = viewer?.socketId || targetId;
            if (targetSocket) {
                io.to(targetSocket).emit("multi_answer", { roomId, sdp, fromId });
            }
        }
    });

    socket.on("candidate", (data) => {
        if (data.broadcaster) {
            io.to(data.broadcaster).emit("candidate", { candidate: data.candidate });
        } else {
            socket.to(socket.roomId).emit("candidate", { candidate: data.candidate, broadcaster: socket.id });
        }
    });

    socket.on("multi_ice_candidate", (data) => {
        const { roomId, targetId, candidate, fromId } = data;
        const room = rooms.get(roomId);
        if (room) {
            const viewer = room.viewers.get(targetId);
            const targetSocket = viewer?.socketId || targetId;
            if (targetSocket) {
                io.to(targetSocket).emit("multi_ice_candidate", { roomId, candidate, fromId });
            }
        }
    });

    // ============ CHAT & GIFTS ============
    socket.on("chat_message", (data) => {
        io.to(data.roomId || socket.roomId).emit("chat_message", { ...data, ts: Date.now() });
    });

    socket.on("gift_sent", (data) => {
        io.to(data.roomId || socket.roomId).emit("gift_received", { ...data, timestamp: Date.now() });
    });

    socket.on("stop_broadcast", (data) => {
        io.to(data.roomId).emit("broadcaster_disconnected");
        rooms.delete(data.roomId);
    });

    socket.on("leave_stream", (data) => {
        const room = rooms.get(data.roomId || socket.roomId);
        if (room) {
            room.viewers.delete(socket.oderId);
            io.to(data.roomId || socket.roomId).emit("viewerCount", room.viewers.size);
            if (room.host) io.to(room.host).emit("disconnectPeer", socket.id);
        }
    });

    // ============ DISCONNECT ============
    socket.on("disconnect", () => {
        const room = rooms.get(socket.roomId);
        if (!room) return;
        if (socket.isHost) {
            io.to(socket.roomId).emit("broadcaster_disconnected");
            io.to(socket.roomId).emit("multi_live_ended", { roomId: socket.roomId });
            rooms.delete(socket.roomId);
        } else {
            room.viewers.delete(socket.oderId);
            room.seats.delete(socket.oderId);
            io.to(socket.roomId).emit("viewerCount", room.viewers.size);
            io.to(socket.roomId).emit("user_left_seat", { roomId: socket.roomId, oderId: socket.oderId });
        }
    });
};
