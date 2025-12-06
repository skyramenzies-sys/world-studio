// backend/utils/moderation.js
// World-Studio.live - Moderation Engine (UNIVERSE EDITION 🚀)
// Auto warnings + temp bans + permanent bans based on violations

const mongoose = require("mongoose");
const User = require("../models/User");

/**
 * Bepaal volgende straf op basis van aantal strikes
 *
 * Ladder:
 *  1e strike  → warning + 10 min ban
 *  2e strike  → 1 uur ban
 *  3e strike  → 1 dag ban
 *  4e strike  → 3 dagen ban
 *  5e strike  → 30 dagen ban
 *  6+ strike  → permanent ban
 */
function getBanForStrike(strikeCount) {
    const min = (n) => n * 60;
    const hour = (n) => n * 60 * 60;
    const day = (n) => n * 24 * 60 * 60;

    switch (strikeCount) {
        case 1:
            return { type: "temp", seconds: min(10) };     // 10 min
        case 2:
            return { type: "temp", seconds: hour(1) };     // 1 uur
        case 3:
            return { type: "temp", seconds: day(1) };      // 1 dag
        case 4:
            return { type: "temp", seconds: day(3) };      // 3 dagen
        case 5:
            return { type: "temp", seconds: day(30) };     // 1 maand
        default:
            return { type: "permanent", seconds: 0 };      // voorgoed
    }
}

/**
 * Check of user nu geband is
 *
 * @param {User} user
 * @returns {{banned:boolean, permanent?:boolean, until?:Date|null, reason?:string}}
 */
function computeBanStatus(user) {
    if (!user) return { banned: false };

    if (user.isPermanentBan) {
        return {
            banned: true,
            permanent: true,
            reason: "permanent_ban",
            until: null,
        };
    }

    if (user.isBanned && user.banUntil && user.banUntil > new Date()) {
        return {
            banned: true,
            permanent: false,
            reason: "temp_ban",
            until: user.banUntil,
        };
    }

    // Ban afgelopen? optioneel: hier auto opschonen
    return { banned: false };
}

/**
 * Pas een violation toe op een user
 *
 * @param {ObjectId|User} userOrId - user document of id
 * @param {String} reason - bv. "hate_speech", "nudity", "spam"
 *
 * @returns {Promise<{user:User, action:string, strikeCount:number, durationSeconds:number, permanent:boolean}>}
 */
async function applyViolation(userOrId, reason = "violation") {
    const user =
        userOrId instanceof mongoose.Model
            ? userOrId
            : await User.findById(userOrId);

    if (!user) {
        throw new Error("User not found for moderation");
    }

    // +1 strike
    user.moderationStrikes = (user.moderationStrikes || 0) + 1;
    user.lastViolationAt = new Date();

    const strikeCount = user.moderationStrikes;
    const banInfo = getBanForStrike(strikeCount);

    let action = "warning";
    let durationSeconds = 0;

    if (banInfo.type === "temp") {
        const now = new Date();
        const until = new Date(now.getTime() + banInfo.seconds * 1000);

        user.isBanned = true;
        user.isPermanentBan = false;
        user.banUntil = until;

        action = "temp_ban";
        durationSeconds = banInfo.seconds;
    } else if (banInfo.type === "permanent") {
        user.isBanned = true;
        user.isPermanentBan = true;
        user.banUntil = null;

        action = "permanent_ban";
        durationSeconds = 0;
    }

    // Log naar history
    user.moderationHistory = user.moderationHistory || [];
    user.moderationHistory.push({
        reason,
        action,
        durationSeconds,
        createdAt: new Date(),
    });

    await user.save();

    return {
        user,
        action,
        strikeCount,
        durationSeconds,
        permanent: banInfo.type === "permanent",
    };
}

/**
 * Admin: unban user
 */
async function unbanUser(userId, reason = "manual_unban") {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.isBanned = false;
    user.isPermanentBan = false;
    user.banUntil = null;

    user.moderationHistory = user.moderationHistory || [];
    user.moderationHistory.push({
        reason,
        action: "unban",
        durationSeconds: 0,
        createdAt: new Date(),
    });

    await user.save();
    return user;
}

module.exports = {
    getBanForStrike,
    computeBanStatus,
    applyViolation,
    unbanUser,
};
