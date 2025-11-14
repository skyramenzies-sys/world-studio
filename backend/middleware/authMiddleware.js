// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function (req, res, next) {
    // Get token from Authorization header (Bearer <token>) or direct token in header
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (authHeader) {
        token = authHeader;
    }

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user and attach to request
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        req.userId = user._id;

        next();
    } catch (err) {
        console.error("Auth error:", err);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};