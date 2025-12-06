// backend/sockets/pkSocket.js
// World-Studio.live - PK Battle Socket Handlers (UNIVERSE EDITION 🌌)
// Handles real-time PK battles, voting, gifts, moderation and notifications

const PK = require("../models/PK");
const User = require("../models/User");
const {
    computeBanStatus,
    applyViolation,
} = require("../utils/moderation");

module.exports = (io, socket) => {
    // ===========================================
    // HELPERS
    // ===========================================

    const emitPkError = (socket, message, code = "PK_ERROR") => {
        socket.emit("pk:error", { message, code });
    };

    const ensureUserNotBanned = async (userId, actionLabel = "action") => {
        if (!userId) {
            throw new Error("USER_ID_REQUIRED");
        }
        const user = await User.findById(userId);
        if (!user) {
            const err = new Error("USER_NOT_FOUND");
            err.code = "USER_NOT_FOUND";
            throw err;
        }

        const ban = computeBanStatus(user);
        if (ban.banned) {
            const err = new Error("USER_BANNED");
            err.code = "USER_BANNED";
            err.ban = ban;
            err.user = user;
            throw err;
        }

        return user;
    };

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
        console.log(`👤 User ${userId} joined PK notification room`);
    });

    /**
     * Join stream room for PK updates
     */
    socket.on("pk:joinStream", (streamId) => {
        if (!streamId) return;
        socket.join(`stream:${streamId}`);
        socket.streamId = streamId;
        console.log(`📺 Socket ${socket.id} joined PK stream: ${streamId}`);
    });

    /**
     * Leave stream room
     */
    socket.on("pk:leaveStream", (streamId) => {
        if (!streamId) return;
        socket.leave(`stream:${streamId}`);
        console.log(`📺 Socket ${socket.id} left PK stream: ${streamId}`);
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
                emitPkError(socket, "PK not found", "PK_NOT_FOUND");
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
                    { path: "winner", select: "username avatar isVerified" },
                ]);

                const resultData = {
                    pkId: pk._id,
                    winner: pk.winner,
                    isDraw: pk.isDraw,
                    challenger: {
                        user: pk.challenger.user,
                        score: pk.challenger.score,
                        streamId: pk.challenger.streamId,
                    },
                    opponent: {
                        user: pk.opponent.user,
                        score: pk.opponent.score,
                        streamId: pk.opponent.streamId,
                    },
                    duration: pk.duration,
                    totalGifts:
                        (pk.challenger.giftsReceived?.length || 0) +
                        (pk.opponent.giftsReceived?.length || 0),
                };

                // Emit to both streams
                io.to(`stream:${pk.challenger.streamId}`).emit("pk:ended", resultData);
                io.to(`stream:${pk.opponent.streamId}`).emit("pk:ended", resultData);
                io.to(`pk:${pkId}`).emit("pk:ended", resultData);

                // Notify both users
                io.to(`user:${pk.challenger.user._id}`).emit("pk:result", resultData);
                io.to(`user:${pk.opponent.user._id}`).emit("pk:result", resultData);

                console.log(
                    `⚔️ PK ${pkId} ended - Winner: ${pk.isDraw ? "DRAW" : pk.winner?.username
                    }`
                );
            }
        } catch (err) {
            console.error("❌ PK timer check error:", err);
            emitPkError(socket, "Failed to check PK timer", "PK_TIMER_ERROR");
        }
    });

    /**
     * Send gift to PK participant
     */
    socket.on("pk:gift", async (data = {}) => {
        try {
            const { pkId, recipientId, giftType, giftValue, senderId, senderName } =
                data;

            if (!pkId || !recipientId || !giftType || !giftValue || !senderId) {
                emitPkError(socket, "Invalid gift data", "PK_GIFT_INVALID");
                return;
            }

            // Check of sender geband is
            try {
                await ensureUserNotBanned(senderId, "pk_gift");
            } catch (banErr) {
                if (banErr.code === "USER_BANNED") {
                    socket.emit("pk:banned", {
                        message: "You are banned from sending gifts",
                        ban: banErr.ban,
                    });
                    return;
                }
                throw banErr;
            }

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "active") {
                emitPkError(socket, "PK not active", "PK_NOT_ACTIVE");
                return;
            }


            const isChallenger = pk.challenger.user.toString() === recipientId;
            const isOpponent = pk.opponent.user.toString() === recipientId;

            if (!isChallenger && !isOpponent) {
                emitPkError(socket, "Invalid recipient", "PK_INVALID_RECIPIENT");
                return;
            }


            const giftData = {
                from: senderId,
                fromUsername: senderName,
                fromAvatar: null,
                to: isChallenger ? "challenger" : "opponent",
                giftType,
                giftName: giftType,
                icon: "💰",
                amount: 1,
                coins: giftValue,
                message: null,
                animation: "float",
                timestamp: new Date(),
            };

            if (isChallenger) {
                pk.challenger.giftsReceived = pk.challenger.giftsReceived || [];
                pk.challenger.giftsReceived.push(giftData);
                pk.challenger.score += giftValue;
                pk.challenger.giftsCount =
                    (pk.challenger.giftsCount || 0) + 1;
            } else {
                pk.opponent.giftsReceived = pk.opponent.giftsReceived || [];
                pk.opponent.giftsReceived.push(giftData);
                pk.opponent.score += giftValue;
                pk.opponent.giftsCount =
                    (pk.opponent.giftsCount || 0) + 1;
            }

            await pk.save();


            const scoreUpdate = {
                pkId: pk._id,
                challengerScore: pk.challenger.score,
                opponentScore: pk.opponent.score,
                gift: {
                    ...giftData,
                    recipient: recipientId,
                    recipientSide: isChallenger ? "challenger" : "opponent",
                },
            };

            io.to(`stream:${pk.challenger.streamId}`).emit(
                "pk:scoreUpdate",
                scoreUpdate
            );
            io.to(`stream:${pk.opponent.streamId}`).emit(
                "pk:scoreUpdate",
                scoreUpdate
            );
            io.to(`pk:${pkId}`).emit("pk:scoreUpdate", scoreUpdate);

            io.to(`stream:${pk.challenger.streamId}`).emit(
                "pk:giftReceived",
                scoreUpdate.gift
            );
            io.to(`stream:${pk.opponent.streamId}`).emit(
                "pk:giftReceived",
                scoreUpdate.gift
            );

            console.log(
                `🎁 PK gift: ${giftType} (${giftValue}) to ${isChallenger ? "challenger" : "opponent"
                }`
            );
        } catch (err) {
            console.error("❌ PK gift error:", err);
            emitPkError(socket, "Failed to send gift", "PK_GIFT_ERROR");
        }
    });

    /**
     * Vote for a PK participant
     */
    socket.on("pk:vote", async (data = {}) => {
        try {
            const { pkId, recipientId, voterId } = data;

            if (!pkId || !recipientId || !voterId) {
                emitPkError(socket, "Invalid vote data", "PK_VOTE_INVALID");
                return;
            }

            // check ban
            try {
                await ensureUserNotBanned(voterId, "pk_vote");
            } catch (banErr) {
                if (banErr.code === "USER_BANNED") {
                    socket.emit("pk:banned", {
                        message: "You are banned from voting",
                        ban: banErr.ban,
                    });
                    return;
                }
                throw banErr;
            }

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "active") {
                emitPkError(socket, "PK not active", "PK_NOT_ACTIVE");
                return;
            }

            const hasVoted = pk.votes?.some(
                (v) => v.voter.toString() === voterId
            );
            if (hasVoted) {
                emitPkError(socket, "Already voted", "PK_ALREADY_VOTED");
                return;
            }


            const isChallenger = pk.challenger.user.toString() === recipientId;
            const isOpponent = pk.opponent.user.toString() === recipientId;

            if (!isChallenger && !isOpponent) {
                emitPkError(socket, "Invalid vote recipient", "PK_INVALID_RECIPIENT");
                return;
            }


            pk.votes = pk.votes || [];
            pk.votes.push({
                voter: voterId,
                for: recipientId,
                side: isChallenger ? "challenger" : "opponent",
                timestamp: new Date(),
            });


            if (isChallenger) {
                pk.challenger.voteCount = (pk.challenger.voteCount || 0) + 1;
            } else {
                pk.opponent.voteCount = (pk.opponent.voteCount || 0) + 1;
            }

            await pk.save();


            const voteUpdate = {
                pkId: pk._id,
                challengerVotes: pk.challenger.voteCount || 0,
                opponentVotes: pk.opponent.voteCount || 0,
                totalVotes: pk.votes.length,
            };

            io.to(`pk:${pkId}`).emit("pk:voteUpdate", voteUpdate);
            io.to(`stream:${pk.challenger.streamId}`).emit(
                "pk:voteUpdate",
                voteUpdate
            );
            io.to(`stream:${pk.opponent.streamId}`).emit(
                "pk:voteUpdate",
                voteUpdate
            );

            socket.emit("pk:voted", {
                success: true,
                side: isChallenger ? "challenger" : "opponent",
            });
        } catch (err) {
            console.error("❌ PK vote error:", err);
            emitPkError(socket, "Failed to vote", "PK_VOTE_ERROR");
        }
    });

    /**
     * Request current PK status
     */
    socket.on("pk:getStatus", async (pkId) => {
        try {
            const pk = await PK.findById(pkId).populate([
                {
                    path: "challenger.user",
                    select: "username avatar isVerified",
                },
                {
                    path: "opponent.user",
                    select: "username avatar isVerified",
                },
                {
                    path: "winner",
                    select: "username avatar",
                },
            ]);

            if (!pk) {
                emitPkError(socket, "PK not found", "PK_NOT_FOUND");
                return;
            }

            const timeRemaining =
                pk.status === "active"
                    ? Math.max(
                        0,
                        Math.floor((pk.endTime - new Date()) / 1000)
                    )
                    : 0;

            socket.emit("pk:status", {
                pkId: pk._id,
                status: pk.status,
                challenger: {
                    user: pk.challenger.user,
                    score: pk.challenger.score,
                    voteCount: pk.challenger.voteCount || 0,
                    streamId: pk.challenger.streamId,
                },
                opponent: {
                    user: pk.opponent.user,
                    score: pk.opponent.score,
                    voteCount: pk.opponent.voteCount || 0,
                    streamId: pk.opponent.streamId,
                },
                winner: pk.winner,
                isDraw: pk.isDraw,
                duration: pk.duration,
                timeRemaining,
                startedAt: pk.startTime,
                endTime: pk.endTime,
            });

        } catch (err) {
            console.error("❌ PK get status error:", err);
            emitPkError(socket, "Failed to get PK status", "PK_STATUS_ERROR");
        }
    });

    /**
     * Streamer accepts PK challenge
     */
    socket.on("pk:accept", async (data = {}) => {
        try {
            const { pkId, userId } = data;

            // check ban
            try {
                await ensureUserNotBanned(userId, "pk_accept");
            } catch (banErr) {
                if (banErr.code === "USER_BANNED") {
                    socket.emit("pk:banned", {
                        message: "You are banned from PK battles",
                        ban: banErr.ban,
                    });
                    return;
                }
                throw banErr;
            }

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "pending") {
                emitPkError(
                    socket,
                    "Invalid PK or already started",
                    "PK_INVALID_STATE"
                );
                return;
            }

            if (pk.opponent.user.toString() !== userId) {
                emitPkError(socket, "Not authorized to accept", "PK_NOT_AUTH");
                return;
            }

            pk.status = "active";
            pk.startTime = new Date();
            pk.endTime = new Date(
                pk.startTime.getTime() + pk.duration * 1000
            );
            await pk.save();

            await pk.populate([
                {
                    path: "challenger.user",
                    select: "username avatar isVerified",
                },
                {
                    path: "opponent.user",
                    select: "username avatar isVerified",
                },
            ]);

            const startData = {
                pkId: pk._id,
                status: "active",
                challenger: pk.challenger,
                opponent: pk.opponent,
                duration: pk.duration,
                endTime: pk.endTime,
                startedAt: pk.startTime,
            };


            io.to(`stream:${pk.challenger.streamId}`).emit("pk:started", startData);
            io.to(`stream:${pk.opponent.streamId}`).emit("pk:started", startData);
            io.to(`user:${pk.challenger.user._id}`).emit("pk:started", startData);
            io.to(`user:${pk.opponent.user._id}`).emit("pk:started", startData);

            console.log(`⚔️ PK ${pkId} started!`);

        } catch (err) {
            console.error("❌ PK accept error:", err);
            emitPkError(socket, "Failed to accept PK", "PK_ACCEPT_ERROR");
        }
    });

    /**
     * Streamer declines PK challenge
     */
    socket.on("pk:decline", async (data = {}) => {
        try {
            const { pkId, userId } = data;

            // check ban
            try {
                await ensureUserNotBanned(userId, "pk_decline");
            } catch (banErr) {
                if (banErr.code === "USER_BANNED") {
                    socket.emit("pk:banned", {
                        message: "You are banned from PK actions",
                        ban: banErr.ban,
                    });
                    return;
                }
                throw banErr;
            }

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "pending") {
                emitPkError(socket, "Invalid PK", "PK_INVALID_STATE");
                return;
            }

            if (pk.opponent.user.toString() !== userId) {
                emitPkError(socket, "Not authorized to decline", "PK_NOT_AUTH");
                return;
            }

            pk.status = "declined";
            pk.finishedAt = new Date();
            await pk.save();


            io.to(`user:${pk.challenger.user}`).emit("pk:declined", {
                pkId: pk._id,
                declinedBy: userId,
            });

            console.log(`⚔️ PK ${pkId} declined`);

        } catch (err) {
            console.error("❌ PK decline error:", err);
            emitPkError(socket, "Failed to decline PK", "PK_DECLINE_ERROR");
        }
    });

    /**
     * Cancel PK (by challenger before acceptance)
     */
    socket.on("pk:cancel", async (data = {}) => {
        try {
            const { pkId, userId } = data;

            // check ban
            try {
                await ensureUserNotBanned(userId, "pk_cancel");
            } catch (banErr) {
                if (banErr.code === "USER_BANNED") {
                    socket.emit("pk:banned", {
                        message: "You are banned from PK actions",
                        ban: banErr.ban,
                    });
                    return;
                }
                throw banErr;
            }

            const pk = await PK.findById(pkId);

            if (!pk || pk.status !== "pending") {
                emitPkError(socket, "Invalid PK", "PK_INVALID_STATE");
                return;
            }

            if (pk.challenger.user.toString() !== userId) {
                emitPkError(socket, "Not authorized to cancel", "PK_NOT_AUTH");
                return;
            }

            pk.status = "cancelled";
            pk.finishedAt = new Date();
            await pk.save();


            io.to(`user:${pk.opponent.user}`).emit("pk:cancelled", {
                pkId: pk._id,
                cancelledBy: userId,
            });

            console.log(`⚔️ PK ${pkId} cancelled`);

        } catch (err) {
            console.error("❌ PK cancel error:", err);
            emitPkError(socket, "Failed to cancel PK", "PK_CANCEL_ERROR");
        }
    });

    // ===========================================
    // MODERATION EVENT (robot / admin)
    // ===========================================

    /**
     * pk:moderationStrike
     * Data: { targetUserId, reason }
     * → geeft strike + ban volgens ladder
     * Deze moet je aanroepen vanuit admin UI of je robot / AI.
     */
    socket.on("pk:moderationStrike", async (data = {}) => {
        try {
            const { targetUserId, reason } = data;

            if (!targetUserId) {
                emitPkError(socket, "Target user required", "PK_MOD_TARGET_REQUIRED");
                return;
            }

            // optioneel: hier kun je checken of socket.userId admin/mod is
            // Voor nu: gewoon toepassen
            const result = await applyViolation(
                targetUserId,
                reason || "pk_violation"
            );

            io.to(`user:${targetUserId}`).emit("pk:moderation", {
                type: "strike",
                action: result.action,
                strikeCount: result.strikeCount,
                durationSeconds: result.durationSeconds,
                permanent: result.permanent,
                reason: reason || "pk_violation",
            });

            console.log(
                `🛡️ Moderation strike: user=${targetUserId} action=${result.action} strikes=${result.strikeCount}`
            );
        } catch (err) {
            console.error("❌ PK moderationStrike error:", err);
            emitPkError(
                socket,
                "Failed to apply moderation strike",
                "PK_MOD_ERROR"
            );
        }
    });

    // ===========================================
    // CLEANUP ON DISCONNECT
    // ===========================================

    socket.on("disconnect", () => {
        if (socket.userId) {
            console.log(`👤 User ${socket.userId} disconnected from PK`);
        } else {
            console.log(`🔌 Socket ${socket.id} disconnected from PK`);
        }
    });
};

