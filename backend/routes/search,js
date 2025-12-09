// backend/routes/search.js
// World-Studio.live - Global Search (UNIVERSE EDITION 🌌)
// Start met user search, later makkelijk uit te breiden naar posts/streams/etc.

const express = require("express");
const router = express.Router();
const User = require("../models/User");

/**
 * Escape RegExp helper om rare karakters in zoekterm te escapen
 */
const escapeRegex = (str) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Fallback user search als User.searchUsers niet bestaat
 */
async function fallbackUserSearch(q, limit = 20) {
    const regex = new RegExp(escapeRegex(q), "i");

    // Basic veiligheidsfilters (geen hard-banned accounts)
    const query = {
        isBanned: { $ne: true },
        $or: [
            { username: regex },
            { email: regex },
            { displayName: regex },
        ],
    };

    return User.find(query)
        .select(
            "username avatar displayName isVerified followersCount stats.pkWins stats.pkWinRate"
        )
        .sort({ followersCount: -1 })
        .limit(limit)
        .lean();
}

router.get("/", async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q) return res.json({ success: true, users: [] });

        const limit = parseInt(req.query.limit, 10) || 20;

        let users = [];

        // ✅ Als User.searchUsers bestaat, gebruik die
        if (typeof User.searchUsers === "function") {
            users = await User.searchUsers(q, { limit });
        } else {
            // ✅ Anders veilige fallback op regex search
            users = await fallbackUserSearch(q, limit);
        }

        return res.json({
            success: true,
            users: users || [],
        });
    } catch (err) {
        console.error("❌ [GET /api/search] error:", err);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
