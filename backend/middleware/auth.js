// backend/middleware/auth.js
// World-Studio.live - Auth Middleware (UNIVERSE EDITION 🌌)
// Verifieert JWT, laadt de user en zet req.user + req.userId

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Zelfde admin-check als in /routes/admin.js en /auth/me
const isAdminUser = (user) => {
    if (!user) return false;
    const email = (user.email || "").toLowerCase();
    return user.role === "admin" || email === "menziesalm@gmail.com";
};

const auth = async (req, res, next) => {
    try {
        // Token uit Authorization: Bearer xxx of cookie (optioneel)
        let token = null;

        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.replace("Bearer ", "").trim();
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "No token provided",
                code: "NO_TOKEN"
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("❌ JWT_SECRET missing in environment");
            return res.status(500).json({
                success: false,
                error: "Server misconfiguration (JWT)",
                code: "SERVER_CONFIG"
            });
        }

        // Payload van auth.js: { id: userId }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.warn("⚠️ Invalid token:", err.message);
            return res.status(401).json({
                success: false,
                error: "Invalid or expired token",
                code: "INVALID_TOKEN"
            });
        }

        const userId = decoded.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Invalid token payload",
                code: "INVALID_PAYLOAD"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        // Banned check (extra safety)
        if (user.isBanned) {
            const banMessage = user.bannedUntil
                ? `Account suspended until ${user.bannedUntil.toLocaleDateString()}`
                : "Account permanently suspended";

            return res.status(403).json({
                success: false,
                error: banMessage,
                reason: user.banReason || null,
                code: "BANNED"
            });
        }

        // Inject op request
        req.user = user;          // volledige user (voor admin / moderation)
        req.userId = user._id;    // compatibel met authMiddleware gebruik

        next();
    } catch (err) {
        console.error("❌ Auth middleware error:", err);
        return res.status(500).json({
            success: false,
            error: "Authentication failed",
            code: "AUTH_ERROR"
        });
    }
};

// Export hoofd-middleware + helper
auth.isAdminUser = isAdminUser;

module.exports = auth;


