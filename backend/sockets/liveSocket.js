const rooms = new Map();

module.exports = function registerLiveSocket(io, socket) {
    
    socket.on("start_broadcast", (data) => {
        const roomId = data.roomId;
        const oderId = data.oderId || data.userId || data.streamerId || socket.id;
        const username = data.odername || data.username || data.streamer || "Host";
        
        rooms.set(roomId, { host: socket.id, oderId: oderId, viewers: new Map() });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;
        socket.oderId = oderId;
        
        console.log("📺 Broadcast:", roomId, "by", username);
    });

    const joinRoom = (data) => {
        const roomId = data.roomId;
        if (!roomId) return;
        
        const oderId = data.oderId || data.userId || data.streamerId || socket.id;
        let room = rooms.get(roomId);
        if (!room) {
            room = { host: null, viewers: new Map() };
            rooms.set(roomId, room);
        }
        
        room.viewers.set(oderId, socket.id);
        socket.join(roomId);
        socket.roomId = roomId;
        socket.oderId = oderId;
        
        io.to(roomId).emit("viewerCount", room.viewers.size);
        if (room.host) io.to(room.host).emit("watcher", { socketId: socket.id });
        console.log("👁 Joined:", roomId, "viewers:", room.viewers.size);
    };
    
    socket.on("join_room", joinRoom);
    socket.on("join_stream", joinRoom);
    socket.on("watcher", joinRoom);

    socket.on("offer", (data) => {
        const room = rooms.get(socket.roomId);
        const target = data.broadcaster || (room && room.host);
        if (target) io.to(target).emit("offer", { offer: data.offer, broadcaster: socket.id });
    });

    socket.on("answer", (data) => {
        if (data.broadcaster) io.to(data.broadcaster).emit("answer", { answer: data.answer });
    });

    socket.on("candidate", (data) => {
        if (data.broadcaster) {
            io.to(data.broadcaster).emit("candidate", { candidate: data.candidate });
        } else {
            socket.to(socket.roomId).emit("candidate", { candidate: data.candidate, broadcaster: socket.id });
        }
    });

    socket.on("chat_message", (data) => {
        io.to(data.roomId || socket.roomId).emit("chat_message", { ...data, ts: Date.now() });
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

    socket.on("request_seat", (data) => {
        const room = rooms.get(data.roomId);
        if (room && room.host) io.to(room.host).emit("seat_request", { ...data, socketId: socket.id });
    });

    socket.on("accept_guest", (data) => {
        const room = rooms.get(data.roomId);
        if (room) {
            const viewerSocket = room.viewers.get(data.oderId);
            if (viewerSocket) {
                io.to(viewerSocket).emit("seat_accepted", data);
                io.to(data.roomId).emit("guest_joined_seat", data);
            }
        }
    });

    socket.on("disconnect", () => {
        const room = rooms.get(socket.roomId);
        if (!room) return;
        if (socket.isHost) {
            io.to(socket.roomId).emit("broadcaster_disconnected");
            rooms.delete(socket.roomId);
        } else {
            room.viewers.delete(socket.oderId);
            io.to(socket.roomId).emit("viewerCount", room.viewers.size);
        }
    });
};
