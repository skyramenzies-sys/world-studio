const rooms = new Map();

module.exports = function registerLiveSocket(io, socket) {
    
    // HOST START BROADCAST
    socket.on("start_broadcast", (data) => {
        const roomId = data.roomId || data.streamId;
        const oderId = data.hostId || data.streamerId || socket.id;
        const username = data.hostUsername || data.streamer || "Host";
        
        rooms.set(roomId, { host: socket.id, oderId, username, viewers: new Map(), seats: new Map() });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;
        
        console.log("📺 Broadcast:", roomId, "by", username);
    });

    // MULTI-GUEST START
    socket.on("start_multi_live", (data) => {
        const { roomId, host } = data;
        rooms.set(roomId, { host: socket.id, oderId: host?._id, username: host?.username, viewers: new Map(), seats: new Map() });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;
        console.log("�� Multi-Live:", roomId, "by", host?.username);
    });

    socket.on("join_multi_live", (data) => {
        const { roomId, user } = data;
        let room = rooms.get(roomId);
        if (!room) {
            room = { host: null, viewers: new Map(), seats: new Map() };
            rooms.set(roomId, room);
        }
        room.viewers.set(user?._id || socket.id, { socketId: socket.id, username: user?.username });
        socket.join(roomId);
        socket.roomId = roomId;
        io.to(roomId).emit("viewer_count", { count: room.viewers.size });
        console.log("👁 Multi joined:", user?.username, "->", roomId);
    });

    // VIEWER JOIN
    const joinRoom = (data) => {
        const roomId = data.roomId || data.streamId;
        if (!roomId) return;
        
        let room = rooms.get(roomId);
        if (!room) {
            room = { host: null, viewers: new Map(), seats: new Map() };
            rooms.set(roomId, room);
        }
        
        room.viewers.set(socket.id, { socketId: socket.id });
        socket.join(roomId);
        socket.roomId = roomId;
        
        io.to(roomId).emit("viewerCount", room.viewers.size);
        io.to(roomId).emit("viewer_count", { count: room.viewers.size });
        
        // BELANGRIJK: Stuur watcher naar host met WATCHERID
        if (room.host) {
            io.to(room.host).emit("watcher", { watcherId: socket.id, socketId: socket.id });
        }
        
        console.log("👁 Joined:", roomId, "viewers:", room.viewers.size);
    };
    
    socket.on("join_room", joinRoom);
    socket.on("join_stream", joinRoom);
    socket.on("watcher", joinRoom);

    // WEBRTC: OFFER (host -> viewer)
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

    // WEBRTC: ANSWER (viewer -> host)
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

    // WEBRTC: ICE CANDIDATE
    socket.on("candidate", (data) => {
        const target = data.broadcaster || data.watcherId || data.targetSocketId;
        if (target) {
            io.to(target).emit("candidate", { 
                candidate: data.candidate, 
                from: socket.id 
            });
        }
    });

    // CHAT
    socket.on("chat_message", (data) => {
        io.to(data.roomId || socket.roomId).emit("chat_message", { ...data, ts: Date.now() });
    });

    // GIFTS
    socket.on("gift_sent", (data) => {
        io.to(data.roomId || socket.roomId).emit("gift_received", { ...data, timestamp: Date.now() });
    });

    // STOP BROADCAST
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

    // LEAVE
    socket.on("leave_stream", (data) => {
        const roomId = data.roomId || socket.roomId;
        const room = rooms.get(roomId);
        if (room) {
            room.viewers.delete(socket.id);
            io.to(roomId).emit("viewerCount", room.viewers.size);
            if (room.host) io.to(room.host).emit("remove_watcher", { watcherId: socket.id });
        }
    });

    // MULTI-GUEST SEATS
    socket.on("request_seat", (data) => {
        const room = rooms.get(data.roomId);
        if (room?.host) io.to(room.host).emit("seat_request", { ...data, socketId: socket.id });
    });

    socket.on("approve_seat", (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            const viewer = room.viewers.get(data.oderId);
            if (viewer) io.to(viewer.socketId).emit("seat_approved", data);
            io.to(data.roomId).emit("seat_approved", data);
        }
    });

    socket.on("reject_seat", (data) => {
        const room = rooms.get(data.roomId);
        const viewer = room?.viewers.get(data.oderId);
        if (viewer) io.to(viewer.socketId).emit("seat_rejected", data);
    });

    socket.on("guest_ready", (data) => {
        io.to(data.roomId).emit("guest_ready", data);
    });

    // MULTI WEBRTC
    socket.on("multi_offer", (data) => {
        const room = rooms.get(data.roomId);
        const viewer = room?.viewers.get(data.targetId);
        if (viewer) io.to(viewer.socketId).emit("multi_offer", data);
    });

    socket.on("multi_answer", (data) => {
        const room = rooms.get(data.roomId);
        const viewer = room?.viewers.get(data.targetId);
        if (viewer) io.to(viewer.socketId).emit("multi_answer", data);
    });

    socket.on("multi_ice_candidate", (data) => {
        const room = rooms.get(data.roomId);
        const viewer = room?.viewers.get(data.targetId);
        if (viewer) io.to(viewer.socketId).emit("multi_ice_candidate", data);
    });

    // DISCONNECT
    socket.on("disconnect", () => {
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
            if (room.host) io.to(room.host).emit("remove_watcher", { watcherId: socket.id });
        }
    });
};
