// backend/sockets/pkSocket.js
// World-Studio.live - PK Battle Socket Handlers
// Handles real-time PK battles, voting, gifts, and notifications

const PK = require("../models/PK");
const User = require("../models/User");

module.exports = (io, socket) => {
    // ===========================================
    // ROOM MANAGEMENT
    // ===========================================

    /**
     * Join user's personal room for notifications
     */
    socket.on("pk:joinUserRoom", (userId) => {
        if (!userId) return;
        socket.join(`user:${userId}`);
        socket.userId = userId;
        console.log(`👤 User ${userId} joined notification room`);
    });

    /**
     * Join stream room for PK updates
     */
    socket.on("pk:joinStream", (streamId) => {
        if (!streamId) return;
        socket.join(`stream:${streamId}`);
        socket.streamId = streamId;
        console.log(`📺 Socket ${socket.id} joined stream: ${streamId}`);
    });

    /**
     * Leave stream room
     */
    socket.on("pk:leaveStream", (streamId) => {
        if (!streamId) return;
        socket.leave(`stream:${streamId}`);
        console.log(`📺 Socket ${socket.id} left stream: ${streamId}`);
    });

    /**
     * Join PK room for battle updates
     */
    socket.on("pk:join", (pkId) => {
        if (!pkId) return;
        socket.join(`pk:${pkId}`);
        console.log(`⚔️ Socket ${socket.id} joined PK: ${pkId}`);
    });

    /**
     * Leave PK room
     */
    socket.on("pk:leave", (pkId) => {
        if (!pkId) return;
        socket.leave(`pk:${pkId}`);
        console.log(`⚔️ Socket ${socket.id} left PK: ${pkId}`);
    });

    // ===========================================
    // PK BATTLE EVENTS
    // ===========================================

    /**
     * Check if PK timer has expired and end if needed
     */
    socket.on("pk:checkTimer", async (pkId) => {
        try {
            const pk = await PK.findById(pkId);

            if (!pk) {
                socket.emit("pk:error", { message: "PK not found" });
                return;
            }

            if (pk.status === "active" && new Date() >= pk.endTime) {
                // Determine winner
                pk.determineWinner();
                pk.status = "finished";
                pk.finishedAt = new Date();
                await pk.save();

                // Populate user data
                await pk.populate([
                    { path: "challenger.user", select: "username avatar isVerified" },
                    { path: "opponent.user", select: "username avatar isVerified" },
                    { path: "winner", select: "username avatar isVerified" }
                ]);

                const resultData = {
                    pkId: pk._id,
                    winner: pk.winner,
                    isDraw: pk.isDraw,
                    challenger: {
                        user: pk.challenger.user,
                        score: pk.challenger.score,
                        streamId: pk.challenger.streamId
                    },
                    opponent: {
                        user: pk.opponent.user,
                        score: pk.opponent.score,
                        streamId: pk.opponent.streamId
                    },
                    duration: pk.duration,
                    totalGifts: (pk.challenger.gifts?.length || 0) + (pk.opponent.gifts?.length || 0)
                };

                // Emit to both streams
                io.to(`stream:${pk.challenger.streamId}`).emit("pk:ended", resultData);
                io.to(`stream:${pk.opponent.streamId}`).emit("pk:ended", resultData);
                io.to(`pk:${pkId}`).emit("pk:ended", resultData);

                // Notify both users
                io.to(`user:${pk.challenger.user._id}`).emit("pk:result", resultData);
                io.to(`user:${pk.opponent.user._id}`).emit("pk:result", resultData);

                console.log(`⚔️ PK ${pkId} ended - Winner: ${pk.isDraw ? "DRAW" : pk.winner?.username}`);
            }
        } catch (err) {
            console.error("❌ PK timer check error:", err);
            socket.emit("pk:error", { message: "Failed to check PK timer" });
        }
    });

    /**
     * Send gift to PK participant
     */
    socket.on("pk:gift", async (data) => {
        try {
            const { pkId, recipientId, giftType, giftValue, senderId, senderName } = data;

            if (!pkId || !recipientId || !giftType || !giftValue) {
                socket.emit("pk:error", { message: "Invalid gift data" });
                return;
            }

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "active") {
                socket.emit("pk:error", { message: "PK not active" });
                return;
            }

            // Determine which side received the gift
            const isChallenger = pk.challenger.user.toString() === recipientId;
            const isOpponent = pk.opponent.user.toString() === recipientId;

            if (!isChallenger && !isOpponent) {
                socket.emit("pk:error", { message: "Invalid recipient" });
                return;
            }

            // Add gift and update score
            const giftData = {
                sender: senderId,
                senderName,
                giftType,
                value: giftValue,
                timestamp: new Date()
            };

            if (isChallenger) {
                pk.challenger.gifts = pk.challenger.gifts || [];
                pk.challenger.gifts.push(giftData);
                pk.challenger.score += giftValue;
            } else {
                pk.opponent.gifts = pk.opponent.gifts || [];
                pk.opponent.gifts.push(giftData);
                pk.opponent.score += giftValue;
            }

            await pk.save();

            // Broadcast score update
            const scoreUpdate = {
                pkId: pk._id,
                challengerScore: pk.challenger.score,
                opponentScore: pk.opponent.score,
                gift: {
                    ...giftData,
                    recipient: recipientId,
                    recipientSide: isChallenger ? "challenger" : "opponent"
                }
            };

            io.to(`stream:${pk.challenger.streamId}`).emit("pk:scoreUpdate", scoreUpdate);
            io.to(`stream:${pk.opponent.streamId}`).emit("pk:scoreUpdate", scoreUpdate);
            io.to(`pk:${pkId}`).emit("pk:scoreUpdate", scoreUpdate);

            // Gift animation event
            io.to(`stream:${pk.challenger.streamId}`).emit("pk:giftReceived", scoreUpdate.gift);
            io.to(`stream:${pk.opponent.streamId}`).emit("pk:giftReceived", scoreUpdate.gift);

            console.log(`🎁 PK gift: ${giftType} (${giftValue}) to ${isChallenger ? "challenger" : "opponent"}`);

        } catch (err) {
            console.error("❌ PK gift error:", err);
            socket.emit("pk:error", { message: "Failed to send gift" });
        }
    });

    /**
     * Vote for a PK participant
     */
    socket.on("pk:vote", async (data) => {
        try {
            const { pkId, recipientId, voterId } = data;

            if (!pkId || !recipientId) {
                socket.emit("pk:error", { message: "Invalid vote data" });
                return;
            }

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "active") {
                socket.emit("pk:error", { message: "PK not active" });
                return;
            }

            // Check if user already voted
            const hasVoted = pk.votes?.some(v => v.voter.toString() === voterId);
            if (hasVoted) {
                socket.emit("pk:error", { message: "Already voted" });
                return;
            }

            // Determine vote side
            const isChallenger = pk.challenger.user.toString() === recipientId;
            const isOpponent = pk.opponent.user.toString() === recipientId;

            if (!isChallenger && !isOpponent) {
                socket.emit("pk:error", { message: "Invalid vote recipient" });
                return;
            }

            // Add vote
            pk.votes = pk.votes || [];
            pk.votes.push({
                voter: voterId,
                for: recipientId,
                side: isChallenger ? "challenger" : "opponent",
                timestamp: new Date()
            });

            // Update vote counts
            if (isChallenger) {
                pk.challenger.voteCount = (pk.challenger.voteCount || 0) + 1;
            } else {
                pk.opponent.voteCount = (pk.opponent.voteCount || 0) + 1;
            }

            await pk.save();

            // Broadcast vote update
            const voteUpdate = {
                pkId: pk._id,
                challengerVotes: pk.challenger.voteCount || 0,
                opponentVotes: pk.opponent.voteCount || 0,
                totalVotes: pk.votes.length
            };

            io.to(`pk:${pkId}`).emit("pk:voteUpdate", voteUpdate);
            io.to(`stream:${pk.challenger.streamId}`).emit("pk:voteUpdate", voteUpdate);
            io.to(`stream:${pk.opponent.streamId}`).emit("pk:voteUpdate", voteUpdate);

            socket.emit("pk:voted", { success: true, side: isChallenger ? "challenger" : "opponent" });

        } catch (err) {
            console.error("❌ PK vote error:", err);
            socket.emit("pk:error", { message: "Failed to vote" });
        }
    });

    /**
     * Request current PK status
     */
    socket.on("pk:getStatus", async (pkId) => {
        try {
            const pk = await PK.findById(pkId).populate([
                { path: "challenger.user", select: "username avatar isVerified" },
                { path: "opponent.user", select: "username avatar isVerified" },
                { path: "winner", select: "username avatar" }
            ]);

            if (!pk) {
                socket.emit("pk:error", { message: "PK not found" });
                return;
            }

            const timeRemaining = pk.status === "active"
                ? Math.max(0, Math.floor((pk.endTime - new Date()) / 1000))
                : 0;

            socket.emit("pk:status", {
                pkId: pk._id,
                status: pk.status,
                challenger: {
                    user: pk.challenger.user,
                    score: pk.challenger.score,
                    voteCount: pk.challenger.voteCount || 0,
                    streamId: pk.challenger.streamId
                },
                opponent: {
                    user: pk.opponent.user,
                    score: pk.opponent.score,
                    voteCount: pk.opponent.voteCount || 0,
                    streamId: pk.opponent.streamId
                },
                winner: pk.winner,
                isDraw: pk.isDraw,
                duration: pk.duration,
                timeRemaining,
                startedAt: pk.startedAt,
                endTime: pk.endTime
            });

        } catch (err) {
            console.error("❌ PK get status error:", err);
            socket.emit("pk:error", { message: "Failed to get PK status" });
        }
    });

    /**
     * Streamer accepts PK challenge
     */
    socket.on("pk:accept", async (data) => {
        try {
            const { pkId, userId } = data;

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "pending") {
                socket.emit("pk:error", { message: "Invalid PK or already started" });
                return;
            }

            if (pk.opponent.user.toString() !== userId) {
                socket.emit("pk:error", { message: "Not authorized to accept" });
                return;
            }

            pk.status = "active";
            pk.startedAt = new Date();
            pk.endTime = new Date(Date.now() + pk.duration * 1000);
            await pk.save();

            await pk.populate([
                { path: "challenger.user", select: "username avatar isVerified" },
                { path: "opponent.user", select: "username avatar isVerified" }
            ]);

            const startData = {
                pkId: pk._id,
                status: "active",
                challenger: pk.challenger,
                opponent: pk.opponent,
                duration: pk.duration,
                endTime: pk.endTime,
                startedAt: pk.startedAt
            };

            // Notify both streams
            io.to(`stream:${pk.challenger.streamId}`).emit("pk:started", startData);
            io.to(`stream:${pk.opponent.streamId}`).emit("pk:started", startData);
            io.to(`user:${pk.challenger.user._id}`).emit("pk:started", startData);
            io.to(`user:${pk.opponent.user._id}`).emit("pk:started", startData);

            console.log(`⚔️ PK ${pkId} started!`);

        } catch (err) {
            console.error("❌ PK accept error:", err);
            socket.emit("pk:error", { message: "Failed to accept PK" });
        }
    });

    /**
     * Streamer declines PK challenge
     */
    socket.on("pk:decline", async (data) => {
        try {
            const { pkId, userId } = data;

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "pending") {
                socket.emit("pk:error", { message: "Invalid PK" });
                return;
            }

            if (pk.opponent.user.toString() !== userId) {
                socket.emit("pk:error", { message: "Not authorized to decline" });
                return;
            }

            pk.status = "declined";
            pk.finishedAt = new Date();
            await pk.save();

            // Notify challenger
            io.to(`user:${pk.challenger.user}`).emit("pk:declined", {
                pkId: pk._id,
                declinedBy: userId
            });

            console.log(`⚔️ PK ${pkId} declined`);

        } catch (err) {
            console.error("❌ PK decline error:", err);
            socket.emit("pk:error", { message: "Failed to decline PK" });
        }
    });

    /**
     * Cancel PK (by challenger before acceptance)
     */
    socket.on("pk:cancel", async (data) => {
        try {
            const { pkId, userId } = data;

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "pending") {
                socket.emit("pk:error", { message: "Invalid PK" });
                return;
            }

            if (pk.challenger.user.toString() !== userId) {
                socket.emit("pk:error", { message: "Not authorized to cancel" });
                return;
            }

            pk.status = "cancelled";
            pk.finishedAt = new Date();
            await pk.save();

            // Notify opponent
            io.to(`user:${pk.opponent.user}`).emit("pk:cancelled", {
                pkId: pk._id,
                cancelledBy: userId
            });

            console.log(`⚔️ PK ${pkId} cancelled`);

        } catch (err) {
            console.error("❌ PK cancel error:", err);
            socket.emit("pk:error", { message: "Failed to cancel PK" });
        }
    });

    // ===========================================
    // CLEANUP ON DISCONNECT
    // ===========================================

    socket.on("disconnect", () => {
        if (socket.userId) {
            console.log(`👤 User ${socket.userId} disconnected from PK`);
        }
    });
};

// ============================================
// INTEGRATION EXAMPLE
// ============================================
/*
// In your server.js or socket setup file:

const { Server } = require("socket.io");
const pkSocket = require("./sockets/pkSocket");

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "https://world-studio.live",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Make io available in routes
app.set("io", io);

io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);
    
    // Initialize PK socket handlers
    pkSocket(io, socket);
    
    // ... your other socket handlers
    
    socket.on("disconnect", () => {
        console.log("🔌 User disconnected:", socket.id);
    });
});

// ============================================
// EMIT EVENTS FROM ROUTES
// ============================================

// In your routes, emit events like:

// When a new PK challenge is created:
const io = req.app.get("io");
io.to(`user:${opponentId}`).emit("pk:challenge", {
    pkId: pk._id,
    challenger: { username, avatar },
    duration: pk.duration
});

// When a gift is sent during PK:
io.to(`pk:${pkId}`).emit("pk:giftReceived", {
    sender: username,
    giftType: "rose",
    value: 10,
    recipient: "challenger"
});

*/