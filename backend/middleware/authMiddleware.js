// backend/middleware/authMiddleware.js
"use strict";

const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function authMiddleware(req, res, next) {
    try {
        // 1. Extract Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No authorization header provided" });
        }

        // Must follow Bearer <token>
        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({ message: "Invalid authorization format" });
        }

        const token = parts[1];
        if (!token) {
            return res.status(401).json({ message: "Token missing" });
        }

        // 2. Verify JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // 3. Fetch user
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User no longer exists" });
        }

        // 4. Attach user info to request
        req.user = user;
        req.userId = user._id;

        next();
    } catch (err) {
        console.error("🔥 Auth Middleware Error:", err);
        res.status(500).json({ message: "Authentication service error" });
    }
};
