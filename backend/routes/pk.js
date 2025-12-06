// backend/routes/pk.js
// World-Studio.live - PK Battle Routes (UNIVERSE EDITION 🚀)
// Handles PK challenges, battles, gifts, and scoring

const express = require("express");
const router = express.Router();
const PK = require("../models/PK");
const User = require("../models/User");

const Stream = require("../models/Stream");

// Gift is OPTIONAL
let Gift = null;
try {
    Gift = require("../models/Gift");
} catch (err) {
    console.warn("⚠️ Optional model 'Gift' not found in PK routes:", err.message);
}

// PlatformWallet is OPTIONAL
let PlatformWallet = null;
try {
    PlatformWallet = require("../models/PlatformWallet");
} catch (err) {
    console.warn(
        "⚠️ Optional model 'PlatformWallet' not found in PK routes:",
        err.message
    );
}

const authMiddleware = require("../middleware/authMiddleware");

// ===========================================
// SOCKET ROOM HELPERS
// ===========================================

/**
 * Get user-specific socket room
 */
const getUserRoom = (userId) => `user_${userId}`;

/**
 * Get stream-specific socket room
 */
const getStreamRoom = (streamId) => `stream_${streamId}`;

/**
 * Get PK-specific socket room
 */
const getPKRoom = (pkId) => `pk_${pkId}`;

// ===========================================
// AUTH HELPER
// ===========================================

const getAuthUserId = (req) => {
    if (req.user && (req.user.id || req.user._id)) {
        return req.user.id || req.user._id;
    }
    if (req.userId) return req.userId;
    return null;
};

// ===========================================
// CONSTANTS
// ===========================================

const PK_DURATIONS = {
    SHORT: 180, // 3 minutes
    MEDIUM: 300, // 5 minutes (default)
    LONG: 600, // 10 minutes
    EXTENDED: 900, // 15 minutes
};

const PLATFORM_FEE_PERCENT = 15;
const CREATOR_SHARE_PERCENT = 85;

// ===========================================
// SEND PK CHALLENGE
// ===========================================

/**
 * POST /api/pk/challenge
 * Send a PK challenge to another streamer
 */
router.post("/challenge", authMiddleware, async (req, res) => {
    try {
        const { opponentId, duration = PK_DURATIONS.MEDIUM, message } = req.body;
        const challengerId = getAuthUserId(req);

        if (!challengerId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        // Validation
        if (!opponentId) {
            return res.status(400).json({
                success: false,
                error: "Opponent is required",
            });
        }

        if (String(challengerId) === String(opponentId)) {
            return res.status(400).json({
                success: false,
                error: "Cannot challenge yourself",
            });
        }

        // Check if challenger is live
        const challenger = await User.findById(challengerId).select(
            "username avatar isLive currentStreamId isVerified"
        );

        if (!challenger?.isLive || !challenger.currentStreamId) {
            return res.status(400).json({
                success: false,
                error: "You must be live to start a PK battle",
            });
        }

        // Check if opponent is live
        const opponent = await User.findById(opponentId).select(
            "username avatar isLive currentStreamId isVerified"
        );

        if (!opponent?.isLive || !opponent.currentStreamId) {
            return res.status(400).json({
                success: false,
                error: "Opponent is not currently live",
            });
        }

        // Check for existing active PK
        const existingPK = await PK.findOne({
            status: { $in: ["pending", "active"] },
            $or: [
                { "challenger.user": challengerId },
                { "opponent.user": challengerId },
                { "challenger.user": opponentId },
                { "opponent.user": opponentId },
            ],
        });

        if (existingPK) {
            return res.status(400).json({
                success: false,
                error: "One of the users is already in a PK battle",
                existingPK: existingPK._id,
            });
        }

        // Validate and clamp duration (1-15 minutes)
        const clampedDuration = Math.min(Math.max(duration, 60), 900);

        // Create PK challenge
        const pk = new PK({
            challenger: {
                user: challengerId,
                username: challenger.username,
                avatar: challenger.avatar,
                streamId: challenger.currentStreamId,
                score: 0,
                giftsReceived: [],
                isVerified: challenger.isVerified,
            },
            opponent: {
                user: opponentId,
                username: opponent.username,
                avatar: opponent.avatar,
                streamId: opponent.currentStreamId,
                score: 0,
                giftsReceived: [],
                isVerified: opponent.isVerified,
            },
            duration: clampedDuration,
            status: "pending",
            challengeMessage: message?.slice(0, 200) || "",
            challengeExpiresAt: new Date(Date.now() + 60 * 1000), // 60 seconds to respond
        });

        await pk.save();

        // Populate for response
        await pk.populate([
            {
                path: "challenger.user",
                select: "username avatar isVerified followersCount",
            },
            {
                path: "opponent.user",
                select: "username avatar isVerified followersCount",
            },
        ]);

        // Emit socket event to opponent
        const io = req.app.get("io");
        if (io) {
            io.to(getUserRoom(opponentId)).emit("pk:challenge", {
                pkId: pk._id,
                challenger: {
                    id: challenger._id,
                    username: challenger.username,
                    avatar: challenger.avatar,
                    isVerified: challenger.isVerified,
                },
                duration: pk.duration,
                message: pk.challengeMessage,
                expiresAt: pk.challengeExpiresAt,
            });

            // Also notify opponent's stream viewers
            io.to(getStreamRoom(opponent.currentStreamId)).emit(
                "pk:challenge_received",
                {
                    pkId: pk._id,
                    challengerUsername: challenger.username,
                }
            );
        }

        console.log(
            `⚔️ PK Challenge: ${challenger.username} → ${opponent.username}`
        );

        res.json({
            success: true,
            message: "PK challenge sent!",
            pk: {
                _id: pk._id,
                challenger: pk.challenger,
                opponent: pk.opponent,
                duration: pk.duration,
                status: pk.status,
                expiresAt: pk.challengeExpiresAt,
            },
        });
    } catch (err) {
        console.error("❌ PK challenge error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// ACCEPT PK CHALLENGE
// ===========================================

/**
 * POST /api/pk/:pkId/accept
 * Accept a PK challenge
 */
router.post("/:pkId/accept", authMiddleware, async (req, res) => {
    try {
        const authUserId = getAuthUserId(req);
        if (!authUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const pk = await PK.findById(req.params.pkId);

        if (!pk) {
            return res.status(404).json({
                success: false,
                error: "PK challenge not found",
            });
        }

        // Verify it's the opponent accepting
        if (String(pk.opponent.user) !== String(authUserId)) {
            return res.status(403).json({
                success: false,
                error: "Not authorized to accept this challenge",
            });
        }

        if (pk.status !== "pending") {
            return res.status(400).json({
                success: false,
                error: "PK is no longer pending",
            });
        }

        // Check if challenge expired
        if (pk.challengeExpiresAt && new Date() > pk.challengeExpiresAt) {
            pk.status = "expired";
            await pk.save();
            return res.status(400).json({
                success: false,
                error: "Challenge has expired",
            });
        }

        // Start the PK
        const now = new Date();
        pk.status = "active";
        pk.startTime = now;
        pk.endTime = new Date(now.getTime() + pk.duration * 1000);
        await pk.save();

        // Populate for response
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

        // Update both users' PK status
        await User.findByIdAndUpdate(pk.challenger.user._id, {
            $set: {
                "pkBattle.isInPK": true,
                "pkBattle.pkId": pk._id,
                "pkBattle.opponentId": pk.opponent.user._id,
            },
        });

        await User.findByIdAndUpdate(pk.opponent.user._id, {
            $set: {
                "pkBattle.isInPK": true,
                "pkBattle.pkId": pk._id,
                "pkBattle.opponentId": pk.challenger.user._id,
            },
        });

        // Update both streams
        if (Stream) {
            try {
                await Stream.updateMany(
                    {
                        _id: {
                            $in: [pk.challenger.streamId, pk.opponent.streamId],
                        },
                    },
                    {
                        $set: {
                            "pkBattle.isInPK": true,
                            "pkBattle.pkId": pk._id,
                        },
                    }
                );
            } catch (err) {
                console.log("Stream PK update skipped:", err.message);
            }
        }

        // Emit socket events to both streams
        const io = req.app.get("io");
        if (io) {
            const pkData = {
                pkId: pk._id,
                challenger: {
                    user: pk.challenger.user,
                    username: pk.challenger.username,
                    avatar: pk.challenger.avatar,
                    streamId: pk.challenger.streamId,
                    score: 0,
                },
                opponent: {
                    user: pk.opponent.user,
                    username: pk.opponent.username,
                    avatar: pk.opponent.avatar,
                    streamId: pk.opponent.streamId,
                    score: 0,
                },
                duration: pk.duration,
                startTime: pk.startTime,
                endTime: pk.endTime,
                status: "active",
            };

            // Notify both streams
            if (pk.challenger.streamId) {
                io.to(getStreamRoom(pk.challenger.streamId)).emit(
                    "pk:started",
                    pkData
                );
            }
            if (pk.opponent.streamId) {
                io.to(getStreamRoom(pk.opponent.streamId)).emit(
                    "pk:started",
                    pkData
                );
            }

            // Notify both users
            io.to(getUserRoom(pk.challenger.user._id)).emit(
                "pk:started",
                pkData
            );
            io.to(getUserRoom(pk.opponent.user._id)).emit("pk:started", pkData);

            // PK room
            io.to(getPKRoom(pk._id)).emit("pk:started", pkData);
        }

        console.log(
            `⚔️ PK Started: ${pk.challenger.username} vs ${pk.opponent.username} (${pk.duration}s)`
        );

        res.json({
            success: true,
            message: "PK battle started!",
            pk,
        });
    } catch (err) {
        console.error("❌ PK accept error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// DECLINE PK CHALLENGE
// ===========================================

/**
 * POST /api/pk/:pkId/decline
 * Decline a PK challenge
 */
router.post("/:pkId/decline", authMiddleware, async (req, res) => {
    try {
        const authUserId = getAuthUserId(req);
        if (!authUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const pk = await PK.findById(req.params.pkId);

        if (!pk) {
            return res.status(404).json({
                success: false,
                error: "PK challenge not found",
            });
        }

        if (String(pk.opponent.user) !== String(authUserId)) {
            return res.status(403).json({
                success: false,
                error: "Not authorized",
            });
        }

        if (pk.status !== "pending") {
            return res.status(400).json({
                success: false,
                error: "PK is no longer pending",
            });
        }

        pk.status = "declined";
        pk.declinedAt = new Date();
        await pk.save();

        // Notify challenger
        const io = req.app.get("io");
        if (io) {
            io.to(getUserRoom(pk.challenger.user.toString())).emit(
                "pk:declined",
                {
                    pkId: pk._id,
                    opponentUsername: pk.opponent.username,
                }
            );
        }

        console.log(
            `❌ PK Declined: ${pk.opponent.username} declined ${pk.challenger.username}'s challenge`
        );

        res.json({
            success: true,
            message: "PK challenge declined",
        });
    } catch (err) {
        console.error("❌ PK decline error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// SEND GIFT DURING PK
// ===========================================

/**
 * POST /api/pk/:pkId/gift
 * Send a gift during PK battle
 */
router.post("/:pkId/gift", authMiddleware, async (req, res) => {
    try {
        const authUserId = getAuthUserId(req);
        if (!authUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const {
            targetUserId,
            giftType = "Coins",
            amount = 1,
            coins,
            message,
        } = req.body;

        const pk = await PK.findById(req.params.pkId);

        if (!pk) {
            return res.status(404).json({
                success: false,
                error: "PK not found",
            });
        }

        if (pk.status !== "active") {
            return res.status(400).json({
                success: false,
                error: "PK is not active",
            });
        }

        // Check time remaining
        if (pk.endTime && new Date() > pk.endTime) {
            return res.status(400).json({
                success: false,
                error: "PK has ended",
            });
        }

        // Get sender
        const sender = await User.findById(authUserId);
        if (!sender) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        const totalCost = coins || amount;

        // Check balance
        if (!sender.wallet || sender.wallet.balance < totalCost) {
            return res.status(400).json({
                success: false,
                error: "Insufficient coins",
                balance: sender.wallet?.balance || 0,
                required: totalCost,
            });
        }

        // Validate target is in this PK
        const isChallenger =
            String(pk.challenger.user) === String(targetUserId);
        const isOpponent =
            String(pk.opponent.user) === String(targetUserId);

        if (!isChallenger && !isOpponent) {
            return res.status(400).json({
                success: false,
                error: "Invalid target user - not in this PK",
            });
        }

        // Deduct from sender
        sender.wallet.balance -= totalCost;
        sender.wallet.totalSpent =
            (sender.wallet.totalSpent || 0) + totalCost;
        sender.wallet.transactions = sender.wallet.transactions || [];
        sender.wallet.transactions.unshift({
            type: "gift_sent",
            amount: -totalCost,
            description: `PK Gift: ${giftType} x${amount} to ${isChallenger
                    ? pk.challenger.username
                    : pk.opponent.username
                }`,
            relatedUserId: targetUserId,
            pkId: pk._id,
            status: "completed",
            createdAt: new Date(),
        });

        // Keep only last 500 transactions
        if (sender.wallet.transactions.length > 500) {
            sender.wallet.transactions =
                sender.wallet.transactions.slice(0, 500);
        }

        await sender.save();

        // Create gift record (embedded in PK)
        const giftData = {
            from: authUserId,
            fromUsername: sender.username,
            fromAvatar: sender.avatar,
            giftType,
            amount,
            coins: totalCost,
            message: message?.slice(0, 100) || "",
            timestamp: new Date(),
        };

        // Add to target's score and gifts
        if (isChallenger) {
            pk.challenger.giftsReceived =
                pk.challenger.giftsReceived || [];
            pk.challenger.giftsReceived.push(giftData);
            pk.challenger.score =
                (pk.challenger.score || 0) + totalCost;
        } else {
            pk.opponent.giftsReceived = pk.opponent.giftsReceived || [];
            pk.opponent.giftsReceived.push(giftData);
            pk.opponent.score =
                (pk.opponent.score || 0) + totalCost;
        }

        await pk.save();

        // Give coins to streamer (85% of gift value)
        const creatorShare = Math.floor(
            totalCost * (CREATOR_SHARE_PERCENT / 100)
        );
        const platformFee = totalCost - creatorShare;

        const streamer = await User.findById(targetUserId);
        if (streamer) {
            streamer.wallet = streamer.wallet || {
                balance: 0,
                totalReceived: 0,
                totalSpent: 0,
                transactions: [],
            };
            streamer.wallet.balance += creatorShare;
            streamer.wallet.totalReceived =
                (streamer.wallet.totalReceived || 0) +
                creatorShare;
            streamer.wallet.totalEarned =
                (streamer.wallet.totalEarned || 0) + creatorShare;
            streamer.wallet.transactions.unshift({
                type: "gift_received",
                amount: creatorShare,
                description: `PK Gift from ${sender.username}: ${giftType} x${amount}`,
                relatedUserId: sender._id,
                relatedUsername: sender.username,
                pkId: pk._id,
                meta: { originalAmount: totalCost, platformFee },
                status: "completed",
                createdAt: new Date(),
            });

            // Update stats
            streamer.stats = streamer.stats || {};
            streamer.stats.totalGiftsReceived =
                (streamer.stats.totalGiftsReceived || 0) + 1;
            streamer.stats.totalGiftsReceivedValue =
                (streamer.stats.totalGiftsReceivedValue || 0) +
                totalCost;

            if (streamer.wallet.transactions.length > 500) {
                streamer.wallet.transactions =
                    streamer.wallet.transactions.slice(0, 500);
            }

            await streamer.save();
        }

        // Record platform fee
        try {
            if (PlatformWallet && platformFee > 0) {
                const wallet = await PlatformWallet.getWallet();
                if (wallet) {
                    await wallet.addTransaction({
                        amount: platformFee,
                        type: "pk_gift_fee",
                        reason: `PK gift fee: ${sender.username} → ${isChallenger
                                ? pk.challenger.username
                                : pk.opponent.username
                            }`,
                        fromUserId: sender._id,
                        fromUsername: sender.username,
                        isRevenue: true,
                        metadata: { pkId: pk._id, giftType },
                    });
                }
            }
        } catch (err) {
            console.log(
                "Platform fee recording skipped:",
                err.message
            );
        }

        // Create gift record in Gift collection
        try {
            if (Gift) {
                await Gift.create({
                    senderId: sender._id,
                    senderUsername: sender.username,
                    senderAvatar: sender.avatar,
                    recipientId: targetUserId,
                    recipientUsername: isChallenger
                        ? pk.challenger.username
                        : pk.opponent.username,
                    item: giftType,
                    itemName: giftType,
                    amount: totalCost,
                    coinValue: totalCost,
                    message,
                    context: "pk_battle",
                    pkBattleId: pk._id,
                    streamId: isChallenger
                        ? pk.challenger.streamId
                        : pk.opponent.streamId,
                    platformFee: PLATFORM_FEE_PERCENT,
                    recipientReceives: creatorShare,
                    status: "completed",
                });
            }
        } catch (err) {
            console.log(
                "Gift record creation skipped:",
                err.message
            );
        }

        // Emit score update to both streams
        const io = req.app.get("io");
        if (io) {
            const scoreUpdate = {
                pkId: pk._id,
                challengerScore: pk.challenger.score,
                opponentScore: pk.opponent.score,
                lastGift: {
                    from: sender.username,
                    fromAvatar: sender.avatar,
                    to: targetUserId,
                    toUsername: isChallenger
                        ? pk.challenger.username
                        : pk.opponent.username,
                    giftType,
                    amount,
                    coins: totalCost,
                    side: isChallenger ? "challenger" : "opponent",
                },
            };

            // Notify both streams
            if (pk.challenger.streamId) {
                io.to(
                    getStreamRoom(pk.challenger.streamId)
                ).emit("pk:scoreUpdate", scoreUpdate);
                io.to(
                    getStreamRoom(pk.challenger.streamId)
                ).emit("pk:gift", scoreUpdate.lastGift);
            }
            if (pk.opponent.streamId) {
                io.to(
                    getStreamRoom(pk.opponent.streamId)
                ).emit("pk:scoreUpdate", scoreUpdate);
                io.to(
                    getStreamRoom(pk.opponent.streamId)
                ).emit("pk:gift", scoreUpdate.lastGift);
            }

            // Notify PK room
            io.to(getPKRoom(pk._id)).emit("pk:scoreUpdate", scoreUpdate);

            // Notify recipient
            io.to(getUserRoom(targetUserId)).emit(
                "gift_received",
                {
                    from: sender.username,
                    giftType,
                    amount: totalCost,
                    creatorShare,
                    context: "pk_battle",
                }
            );
        }

        console.log(
            `🎁 PK Gift: ${sender.username} → ${isChallenger
                ? pk.challenger.username
                : pk.opponent.username
            }: ${totalCost} coins`
        );

        res.json({
            success: true,
            message: "Gift sent!",
            newScore: isChallenger
                ? pk.challenger.score
                : pk.opponent.score,
            scores: {
                challenger: pk.challenger.score,
                opponent: pk.opponent.score,
            },
            newBalance: sender.wallet.balance,
        });
    } catch (err) {
        console.error("❌ PK gift error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// END PK BATTLE
// ===========================================

/**
 * POST /api/pk/:pkId/end
 * End a PK battle (manual or timer)
 */
router.post("/:pkId/end", authMiddleware, async (req, res) => {
    try {
        const authUserId = getAuthUserId(req);
        if (!authUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const pk = await PK.findById(req.params.pkId);

        if (!pk) {
            return res.status(404).json({
                success: false,
                error: "PK not found",
            });
        }

        if (pk.status !== "active") {
            return res.status(400).json({
                success: false,
                error: "PK is not active",
            });
        }

        // Verify user is participant
        const isParticipant =
            String(pk.challenger.user) === String(authUserId) ||
            String(pk.opponent.user) === String(authUserId);

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                error: "Not authorized to end this PK",
            });
        }

        // Determine winner
        const cScore = pk.challenger.score || 0;
        const oScore = pk.opponent.score || 0;

        if (cScore === oScore) {
            pk.isDraw = true;
            pk.winner = null;
        } else if (cScore > oScore) {
            pk.isDraw = false;
            pk.winner = pk.challenger.user;
        } else {
            pk.isDraw = false;
            pk.winner = pk.opponent.user;
        }

        pk.status = "finished";
        pk.actualEndTime = new Date();
        pk.totalGifts = cScore + oScore;
        await pk.save();

        // Populate winner
        await pk.populate([
            {
                path: "challenger.user",
                select: "username avatar isVerified",
            },
            {
                path: "opponent.user",
                select: "username avatar isVerified",
            },
            { path: "winner", select: "username avatar isVerified" },
        ]);

        const challengerId =
            pk.challenger.user._id || pk.challenger.user;
        const opponentId =
            pk.opponent.user._id || pk.opponent.user;

        if (!pk.isDraw && pk.winner) {
            const winnerId = pk.winner._id || pk.winner;
            const loserId =
                String(winnerId) === String(challengerId)
                    ? opponentId
                    : challengerId;

            // Update winner
            const winner = await User.findById(winnerId);
            if (winner) {
                winner.stats = winner.stats || {};
                winner.stats.pkWins =
                    (winner.stats.pkWins || 0) + 1;
                winner.stats.pkStreak =
                    (winner.stats.pkStreak || 0) + 1;
                winner.stats.pkTotalBattles =
                    (winner.stats.pkTotalBattles || 0) + 1;

                // Update best streak
                if (
                    winner.stats.pkStreak >
                    (winner.stats.pkBestStreak || 0)
                ) {
                    winner.stats.pkBestStreak =
                        winner.stats.pkStreak;
                }

                // Calculate win rate
                const totalBattles =
                    (winner.stats.pkWins || 0) +
                    (winner.stats.pkLosses || 0);
                winner.stats.pkWinRate =
                    totalBattles > 0
                        ? Math.round(
                            (winner.stats.pkWins /
                                totalBattles) *
                            100
                        )
                        : 0;

                await winner.save();

                // Notify winner
                if (winner.addNotification) {
                    await winner.addNotification({
                        message: `🏆 You won the PK battle against ${String(winnerId) ===
                                String(challengerId)
                                ? pk.opponent.username
                                : pk.challenger.username
                            }!`,
                        type: "pk_result",
                        pkId: pk._id,
                        amount:
                            String(winnerId) ===
                                String(challengerId)
                                ? cScore
                                : oScore,
                    });
                }
            }

            // Update loser
            const loser = await User.findById(loserId);
            if (loser) {
                loser.stats = loser.stats || {};
                loser.stats.pkLosses =
                    (loser.stats.pkLosses || 0) + 1;
                loser.stats.pkStreak = 0;
                loser.stats.pkTotalBattles =
                    (loser.stats.pkTotalBattles || 0) + 1;

                // Calculate win rate
                const totalBattles =
                    (loser.stats.pkWins || 0) +
                    (loser.stats.pkLosses || 0);
                loser.stats.pkWinRate =
                    totalBattles > 0
                        ? Math.round(
                            (loser.stats.pkWins /
                                totalBattles) *
                            100
                        )
                        : 0;

                await loser.save();
            }
        } else {
            // Draw - update both
            await User.updateMany(
                { _id: { $in: [challengerId, opponentId] } },
                {
                    $inc: {
                        "stats.pkDraws": 1,
                        "stats.pkTotalBattles": 1,
                    },
                }
            );
        }

        // Clear PK status from users
        await User.updateMany(
            { _id: { $in: [challengerId, opponentId] } },
            {
                $set: {
                    "pkBattle.isInPK": false,
                    "pkBattle.pkId": null,
                    "pkBattle.opponentId": null,
                },
            }
        );

        // Clear PK status from streams
        if (Stream) {
            try {
                await Stream.updateMany(
                    {
                        _id: {
                            $in: [
                                pk.challenger.streamId,
                                pk.opponent.streamId,
                            ],
                        },
                    },
                    {
                        $set: {
                            "pkBattle.isInPK": false,
                            "pkBattle.pkId": null,
                        },
                    }
                );
            } catch (err) {
                console.log("Stream PK clear skipped:", err.message);
            }
        }

        // Emit results to both streams
        const io = req.app.get("io");
        if (io) {
            const resultData = {
                pkId: pk._id,
                winner: pk.winner,
                isDraw: pk.isDraw,
                challengerScore: pk.challenger.score,
                opponentScore: pk.opponent.score,
                challenger: {
                    user: pk.challenger.user,
                    username: pk.challenger.username,
                    avatar: pk.challenger.avatar,
                    score: pk.challenger.score,
                },
                opponent: {
                    user: pk.opponent.user,
                    username: pk.opponent.username,
                    avatar: pk.opponent.avatar,
                    score: pk.opponent.score,
                },
                totalGifts: pk.totalGifts,
                duration: pk.duration,
            };

            if (pk.challenger.streamId) {
                io.to(
                    getStreamRoom(pk.challenger.streamId)
                ).emit("pk:ended", resultData);
            }
            if (pk.opponent.streamId) {
                io.to(
                    getStreamRoom(pk.opponent.streamId)
                ).emit("pk:ended", resultData);
            }

            io.to(getPKRoom(pk._id)).emit("pk:ended", resultData);
        }

        const winnerName = pk.isDraw
            ? "DRAW"
            : pk.winner?.username || "unknown";

        console.log(
            `⚔️ PK Ended: ${pk.challenger.username} (${cScore}) vs ${pk.opponent.username} (${oScore}) - ${pk.isDraw ? "DRAW" : `Winner: ${winnerName}`
            }`
        );

        res.json({
            success: true,
            message: pk.isDraw
                ? "PK ended in a draw!"
                : `${winnerName} wins!`,
            winner: pk.winner,
            isDraw: pk.isDraw,
            scores: {
                challenger: pk.challenger.score,
                opponent: pk.opponent.score,
            },
            totalGifts: pk.totalGifts,
        });
    } catch (err) {
        console.error("❌ PK end error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// GET ACTIVE PK
// ===========================================

/**
 * GET /api/pk/active
 * Get user's active PK
 */
router.get("/active", authMiddleware, async (req, res) => {
    try {
        const authUserId = getAuthUserId(req);
        if (!authUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const pk = await PK.findOne({
            status: "active",
            $or: [
                { "challenger.user": authUserId },
                { "opponent.user": authUserId },
            ],
        }).populate([
            {
                path: "challenger.user",
                select: "username avatar isVerified",
            },
            {
                path: "opponent.user",
                select: "username avatar isVerified",
            },
        ]);

        res.json({
            success: true,
            pk,
            isInPK: !!pk,
        });
    } catch (err) {
        console.error("❌ Get active PK error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// GET PENDING CHALLENGES
// ===========================================

/**
 * GET /api/pk/pending
 * Get pending challenges for current user
 */
router.get("/pending", authMiddleware, async (req, res) => {
    try {
        const authUserId = getAuthUserId(req);
        if (!authUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const challenges = await PK.find({
            status: "pending",
            "opponent.user": authUserId,
            challengeExpiresAt: { $gt: new Date() },
        }).populate(
            "challenger.user",
            "username avatar isVerified followersCount"
        );

        res.json({
            success: true,
            challenges,
            count: challenges.length,
        });
    } catch (err) {
        console.error("❌ Get pending PKs error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// GET LIVE STREAMERS FOR PK
// ===========================================

/**
 * GET /api/pk/live-streamers
 * Get available streamers for PK battle
 */
router.get("/live-streamers", authMiddleware, async (req, res) => {
    try {
        const authUserId = getAuthUserId(req);
        if (!authUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        // Find users currently in a PK
        const activePKs = await PK.find({
            status: { $in: ["pending", "active"] },
        });

        const usersInPK = new Set();
        activePKs.forEach((pk) => {
            usersInPK.add(String(pk.challenger.user));
            usersInPK.add(String(pk.opponent.user));
        });

        // Find live streamers not in PK and not the requester
        const liveStreamers = await User.find({
            isLive: true,
            _id: {
                $ne: authUserId,
                $nin: Array.from(usersInPK),
            },
            isBanned: { $ne: true },
        })
            .select(
                "username avatar currentStreamId followersCount isVerified stats.pkWins stats.pkWinRate"
            )
            .sort({ followersCount: -1 })
            .limit(50)
            .lean();

        res.json({
            success: true,
            streamers: liveStreamers,

        });
    } catch (err) {
        console.error("❌ Get live streamers error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// GET PK HISTORY
// ===========================================

/**
 * GET /api/pk/history
 * Get user's PK history
 */
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const authUserId = getAuthUserId(req);
        if (!authUserId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const { limit = 20, skip = 0 } = req.query;

        const [history, total] = await Promise.all([
            PK.find({
                status: "finished",
                $or: [
                    { "challenger.user": authUserId },
                    { "opponent.user": authUserId },
                ],
            })
                .sort({ createdAt: -1 })
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .populate([
                    {
                        path: "challenger.user",
                        select: "username avatar",
                    },
                    {
                        path: "opponent.user",
                        select: "username avatar",
                    },
                    { path: "winner", select: "username" },
                ])
                .lean(),
            PK.countDocuments({
                status: "finished",
                $or: [
                    { "challenger.user": authUserId },
                    { "opponent.user": authUserId },
                ],
            }),
        ]);

        const authIdStr = String(authUserId);

        // Add win/loss indicator for current user
        const historyWithResult = history.map((pk) => ({
            ...pk,
            result: pk.isDraw
                ? "draw"
                : String(pk.winner?._id) === authIdStr
                    ? "win"
                    : "loss",
        }));

        res.json({
            success: true,
            history: historyWithResult,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: parseInt(skip) + history.length < total,
            },
        });
    } catch (err) {
        console.error("❌ Get PK history error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// GET PK LEADERBOARD
// ===========================================

/**
 * GET /api/pk/leaderboard
 * Get PK leaderboard
 */
router.get("/leaderboard", async (req, res) => {
    try {
        const { period = "all", limit = 20 } = req.query;

        // period is currently not applied directly; stats are aggregated on User
        // (Je kan later een PK-aggregate toevoegen als je echt per periode wilt filteren)

        const leaderboard = await User.find({
            "stats.pkWins": { $gt: 0 },
        })
            .select(
                "username avatar isVerified stats.pkWins stats.pkLosses stats.pkDraws stats.pkStreak stats.pkWinRate followersCount"
            )
            .sort({
                "stats.pkWins": -1,
                "stats.pkWinRate": -1,
            })
            .limit(parseInt(limit))
            .lean();

        const ranked = leaderboard.map((user, index) => ({
            rank: index + 1,
            ...user,
            totalBattles:
                (user.stats?.pkWins || 0) +
                (user.stats?.pkLosses || 0) +
                (user.stats?.pkDraws || 0),
        }));

        res.json({
            success: true,
            period,
            leaderboard: ranked,
        });
    } catch (err) {
        console.error("❌ PK leaderboard error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// GET USER PK STATS
// ===========================================

/**
 * GET /api/pk/stats/:userId
 * Get PK statistics for a user
 */
router.get("/stats/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .select(
                "username avatar stats.pkWins stats.pkLosses stats.pkDraws stats.pkStreak stats.pkBestStreak stats.pkWinRate stats.pkTotalBattles"
            )
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // Get recent PK battles
        const recentBattles = await PK.find({
            status: "finished",
            $or: [
                { "challenger.user": userId },
                { "opponent.user": userId },
            ],
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate([
                {
                    path: "challenger.user",
                    select: "username avatar",
                },
                {
                    path: "opponent.user",
                    select: "username avatar",
                },
                { path: "winner", select: "username" },
            ])
            .lean();

        res.json({
            success: true,
            user: {
                username: user.username,
                avatar: user.avatar,
            },
            stats:
                user.stats || {
                    pkWins: 0,
                    pkLosses: 0,
                    pkDraws: 0,
                    pkStreak: 0,
                    pkBestStreak: 0,
                    pkWinRate: 0,
                    pkTotalBattles: 0,
                },
            recentBattles,
        });
    } catch (err) {
        console.error("❌ PK stats error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// ===========================================
// GET SPECIFIC PK DETAILS
// (LET OP: staat bewust NA alle /fixed routes)
// ===========================================

/**
 * GET /api/pk/:pkId
 * Get specific PK details
 */
router.get("/:pkId", async (req, res) => {
    try {
        const pk = await PK.findById(req.params.pkId).populate([
            {
                path: "challenger.user",
                select: "username avatar isVerified followersCount",
            },
            {
                path: "opponent.user",
                select: "username avatar isVerified followersCount",
            },
            { path: "winner", select: "username avatar" },
        ]);

        if (!pk) {
            return res.status(404).json({
                success: false,
                error: "PK not found",
            });
        }

        res.json({
            success: true,
            pk,
        });
    } catch (err) {
        console.error("❌ Get PK error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

module.exports = router;
