// backend/sockets/liveSocket.js - WebRTC Signaling for Live Streams
const LiveStream = require("../models/LiveStream");
const User = require("../models/User");

// Track active rooms and their participants
const rooms = new Map(); // roomId -> { host: socketId, viewers: Set<socketId>, hostStream: MediaStream info }

module.exports = function registerLiveSocket(io, socket) {
    
    // ============ HOST: Start Broadcasting ============
    socket.on("start_broadcast", async (data) => {
        const { roomId, oderId, odername, streamId } = data;
        console.log(`📺 Broadcast started: ${roomId} by ${odername}`);
        
        // Create room
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                host: socket.id,
                hostUserId: oderId,
                hostUsername: odername,
                streamId,
                viewers: new Map(), // oderId -> { socketId, username }
                createdAt: Date.now()
            });
        } else {
            rooms.get(roomId).host = socket.id;
            rooms.get(roomId).hostUserId: oderId;
            rooms.get(roomId).hostUsername = odername;
        }
        
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;
        
        // Notify room
        io.to(roomId).emit("host_started", {
            roomId,
            hostId: oderId,
            hostUsername: odername,
            hostSocketId: socket.id
        });
        
        console.log(`✅ Room ${roomId} created, host: ${socket.id}`);
    });

    // ============ VIEWER: Join Room ============
    socket.on("join_room", async (data) => {
        const { roomId, oderId, odername } = data;
        console.log(`👁 Viewer joining: ${odername} -> ${roomId}`);
        
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit("room_error", { message: "Room not found or stream ended" });
            return;
        }
        
        // Add viewer
        room.viewers.set(oderId, { socketId: socket.id, username: odername });
        
        socket.join(roomId);
        socket.roomId = roomId;
        socket.oderId = oderId;
        socket.isHost = false;
        
        // Update viewer count
        const viewerCount = room.viewers.size;
        io.to(roomId).emit("viewer_count", { count: viewerCount });
        
        // Notify host about new viewer (for WebRTC connection)
        if (room.host) {
            io.to(room.host).emit("viewer_joined", {
                oderId,
                odername,
                viewerSocketId: socket.id
            });
        }
        
        // Send room info to viewer
        socket.emit("room_joined", {
            roomId,
            hostSocketId: room.host,
            hostUsername: room.hostUsername,
            viewerCount
        });
        
        console.log(`✅ ${odername} joined room ${roomId}, viewers: ${viewerCount}`);
    });

    // ============ WebRTC Signaling: Offer ============
    socket.on("webrtc_offer", (data) => {
        const { targetSocketId, offer, roomId } = data;
        console.log(`📡 WebRTC offer: ${socket.id} -> ${targetSocketId}`);
        
        io.to(targetSocketId).emit("webrtc_offer", {
            offer,
            senderSocketId: socket.id,
            roomId
        });
    });

    // ============ WebRTC Signaling: Answer ============
    socket.on("webrtc_answer", (data) => {
        const { targetSocketId, answer, roomId } = data;
        console.log(`📡 WebRTC answer: ${socket.id} -> ${targetSocketId}`);
        
        io.to(targetSocketId).emit("webrtc_answer", {
            answer,
            senderSocketId: socket.id,
            roomId
        });
    });

    // ============ WebRTC Signaling: ICE Candidate ============
    socket.on("webrtc_ice_candidate", (data) => {
        const { targetSocketId, candidate, roomId } = data;
        
        io.to(targetSocketId).emit("webrtc_ice_candidate", {
            candidate,
            senderSocketId: socket.id,
            roomId
        });
    });

    // ============ Chat Message ============
    socket.on("chat_message", (data) => {
        const { roomId, message, oderId, odername, avatar } = data;
        
        io.to(roomId).emit("chat_message", {
            oderId,
            odername,
            avatar,
            message,
            timestamp: Date.now()
        });
    });

    // ============ Gift Sent ============
    socket.on("gift_sent", (data) => {
        const { roomId, gift, senderId, senderName, senderAvatar } = data;
        
        io.to(roomId).emit("gift_received", {
            gift,
            senderId,
            senderName,
            senderAvatar,
            timestamp: Date.now()
        });
    });

    // ============ Stop Broadcast ============
    socket.on("stop_broadcast", (data) => {
        const { roomId, streamId } = data;
        console.log(`🛑 Broadcast stopped: ${roomId}`);
        
        const room = rooms.get(roomId);
        if (room && room.host === socket.id) {
            // Notify all viewers
            io.to(roomId).emit("stream_ended", { roomId });
            
            // Clean up room
            rooms.delete(roomId);
        }
    });

    // ============ Leave Room ============
    socket.on("leave_room", (data) => {
        const { roomId, oderId } = data;
        
        const room = rooms.get(roomId);
        if (room) {
            room.viewers.delete(oderId);
            const viewerCount = room.viewers.size;
            io.to(roomId).emit("viewer_count", { count: viewerCount });
            
            // Notify host
            if (room.host) {
                io.to(room.host).emit("viewer_left", { oderId });
            }
        }
        
        socket.leave(roomId);
    });

    // ============ Multi-Guest: Request Seat ============
    socket.on("request_seat", (data) => {
        const { roomId, oderId, odername, avatar } = data;
        console.log(`🪑 Seat request: ${odername} in ${roomId}`);
        
        const room = rooms.get(roomId);
        if (room && room.host) {
            io.to(room.host).emit("seat_request", {
                oderId,
                odername,
                avatar,
                socketId: socket.id
            });
        }
    });

    // ============ Multi-Guest: Accept Guest ============
    socket.on("accept_guest", (data) => {
        const { roomId, oderId, seatIndex } = data;
        console.log(`✅ Guest accepted: ${oderId} at seat ${seatIndex}`);
        
        const room = rooms.get(roomId);
        if (room) {
            const viewer = room.viewers.get(oderId);
            if (viewer) {
                io.to(viewer.socketId).emit("seat_accepted", {
                    seatIndex,
                    roomId
                });
                
                // Notify all in room
                io.to(roomId).emit("guest_joined_seat", {
                    oderId,
                    odername: viewer.username,
                    seatIndex
                });
            }
        }
    });

    // ============ Multi-Guest: Reject Guest ============
    socket.on("reject_guest", (data) => {
        const { roomId, oderId } = data;
        
        const room = rooms.get(roomId);
        if (room) {
            const viewer = room.viewers.get(oderId);
            if (viewer) {
                io.to(viewer.socketId).emit("seat_rejected", { roomId });
            }
        }
    });

    // ============ Multi-Guest: Leave Seat ============
    socket.on("leave_seat", (data) => {
        const { roomId, oderId, seatIndex } = data;
        
        io.to(roomId).emit("guest_left_seat", {
            oderId,
            seatIndex
        });
    });

    // ============ Handle Disconnect ============
    socket.on("disconnect", () => {
        const roomId = socket.roomId;
        if (!roomId) return;
        
        const room = rooms.get(roomId);
        if (!room) return;
        
        if (socket.isHost) {
            // Host disconnected - end stream
            console.log(`🛑 Host disconnected, ending room: ${roomId}`);
            io.to(roomId).emit("stream_ended", { roomId, reason: "host_disconnected" });
            rooms.delete(roomId);
        } else if (socket.oderId) {
            // Viewer disconnected
            room.viewers.delete(socket.oderId);
            const viewerCount = room.viewers.size;
            io.to(roomId).emit("viewer_count", { count: viewerCount });
            
            if (room.host) {
                io.to(room.host).emit("viewer_left", { oderId: socket.oderId });
            }
        }
    });
};
