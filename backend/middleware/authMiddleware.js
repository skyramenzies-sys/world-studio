// backend/middleware/authMiddleware.js
// Backwards-compat wrapper rond auth.js (Universe Edition)
const jwt = require("jsonwebtoken");
const auth = require("./auth");

// Optional auth - doesn't fail if no token, just sets req.user if valid
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = null;
        req.userId = null;
        return next();
    }
    
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        req.userId = decoded.id || decoded._id;
    } catch (err) {
        req.user = null;
        req.userId = null;
    }
    next();
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
