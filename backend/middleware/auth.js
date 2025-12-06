// backend/middleware/auth.js
// World-Studio.live - Authentication Middleware (UNIVERSE EDITION 🚀)
// Handles JWT verification, user loading, and role-based access control

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const isProduction = process.env.NODE_ENV === "production";

// ===========================================
// CONFIGURATION
// ===========================================
let JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY_GRACE_PERIOD = 5 * 60; // 5 minutes grace period (reserved for future use)

// Strict handling in production, softer in dev
if (!JWT_SECRET) {
    if (isProduction) {
        console.error("❌ JWT_SECRET is not defined in environment variables (PRODUCTION)!");
        throw new Error("JWT_SECRET must be defined in production");
    } else {
        console.warn(
            "⚠️ JWT_SECRET missing. Using DEV fallback secret. DO NOT use this in production!"
        );
        JWT_SECRET = "world-studio-dev-secret";
    }
}

// ===========================================
// INTERNAL HELPERS
// ===========================================

/**
 * Extract Bearer token from headers or cookies
 * @param {Request} req
 * @returns {string|null}
 */
const getTokenFromRequest = (req) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        if (token && token !== "null" && token !== "undefined") {
            return token;
        }
    }

    // Optional: support token from cookies (e.g. HTTP-only)
    if (req.cookies && req.cookies.token) {
        const token = req.cookies.token;
        if (token && token !== "null" && token !== "undefined") {
            return token;
        }
    }

    return null;
};

/**
 * Central admin check
 * @param {User} user
 * @returns {boolean}
 */
const isAdminUser = (user) => {
    if (!user) return false;
    return (
        user.role === "admin" ||
        user.isAdmin === true ||
        user.email === "menziesalm@gmail.com"
    );
};

/**
 * Check if user has any of the given roles
 * @param {User} user
 * @param {string[]} roles
 * @returns {boolean}
 */
const hasRole = (user, roles = []) => {
    if (!user) return false;
    if (isAdminUser(user)) return true; // admin always ok

    const userRole = user.role || "user";
    return roles.includes(userRole);
};

// ===========================================
// MAIN AUTH MIDDLEWARE
// ===========================================

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const auth = async (req, res, next) => {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "No token provided",
                code: "NO_TOKEN",
            });
        }

        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    error: "Token expired",
                    code: "TOKEN_EXPIRED",
                    expiredAt: jwtError.expiredAt,
                });
            }
            if (jwtError.name === "JsonWebTokenError") {
                return res.status(401).json({
                    success: false,
                    error: "Invalid token",
                    code: "INVALID_TOKEN",
                });
            }
            console.error("❌ JWT verify error:", jwtError);
            return res.status(401).json({
                success: false,
                error: "Authentication failed",
                code: "AUTH_FAILED",
            });
        }

        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                error: "Invalid token payload",
                code: "INVALID_PAYLOAD",
            });
        }

        // Find user
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND",
            });
        }

        // ✅ FIXED: Check if user is banned (uses isBanned / bannedUntil from your schema)
        if (user.isBanned || user.status === "banned") {
            // Als er een einddatum is en die ligt in de toekomst => ban actief
            if (!user.bannedUntil || user.bannedUntil > new Date()) {
                return res.status(403).json({
                    success: false,
                    error: "Account has been suspended",
                    code: "ACCOUNT_BANNED",
                    reason: user.banReason || "Violation of terms of service",
                    bannedUntil: user.bannedUntil || null,
                });
            }
        }

        // Check if user is deactivated
        if (user.status === "deactivated" || user.isDeactivated) {
            return res.status(403).json({
                success: false,
                error: "Account has been deactivated",
                code: "ACCOUNT_DEACTIVATED",
            });
        }

        // Attach user and token info to request
        req.user = user;
        req.userId = user._id;
        req.token = token;
        req.tokenExp = decoded.exp;

        // Update last active timestamp (fire & forget)
        User.findByIdAndUpdate(user._id, {
            lastActive: new Date(),
            lastIp: req.ip || req.connection?.remoteAddress,
        }).catch(() => { });

        next();
    } catch (err) {
        console.error("❌ Auth middleware error:", err);
        return res.status(401).json({
            success: false,
            error: "Authentication failed",
            code: "AUTH_FAILED",
        });
    }
};

// ===========================================
// OPTIONAL AUTH MIDDLEWARE
// ===========================================

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block if no/invalid token
 * Useful for public routes that show extra info for logged-in users
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            req.user = null;
            req.userId = null;
            return next();
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            if (decoded && decoded.id) {
                const user = await User.findById(decoded.id).select("-password");
                if (user) {
                    req.user = user;
                    req.userId = user._id;
                    req.token = token;
                    req.tokenExp = decoded.exp;

                    // Async lastActive update
                    User.findByIdAndUpdate(user._id, {
                        lastActive: new Date(),
                        lastIp: req.ip || req.connection?.remoteAddress,
                    }).catch(() => { });
                } else {
                    req.user = null;
                    req.userId = null;
                }
            } else {
                req.user = null;
                req.userId = null;
            }
        } catch {
            // Token invalid/expired → gewoon als guest verder
            req.user = null;
            req.userId = null;
        }

        next();
    } catch (err) {
        req.user = null;
        req.userId = null;
        next();
    }
};

// ===========================================
// ROLE-BASED ACCESS MIDDLEWARE
// ===========================================

/**
 * Admin-only middleware
 * Must be used after auth middleware
 */
const adminOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "AUTH_REQUIRED",
        });
    }


    if (!isAdminUser(req.user)) {
        return res.status(403).json({
            success: false,
            error: "Admin access required",
            code: "ADMIN_REQUIRED",
        });
    }

    next();
};

/**
 * Moderator or Admin middleware
 * Must be used after auth middleware
 */
const modOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "AUTH_REQUIRED",
        });
    }

    const hasAccess =
        isAdminUser(req.user) ||
        req.user.role === "moderator" ||
        req.user.isModerator === true;

    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            error: "Moderator access required",
            code: "MOD_REQUIRED",
        });
    }

    next();
};

/**
 * Creator (verified) middleware
 * Must be used after auth middleware
 */
const creatorOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "AUTH_REQUIRED",
        });
    }

    const isCreator =
        isAdminUser(req.user) ||
        req.user.role === "creator" ||

        req.user.isVerified === true ||
        req.user.isCreator === true;

    if (!isCreator) {
        return res.status(403).json({
            success: false,
            error: "Creator status required",
            code: "CREATOR_REQUIRED",
        });
    }

    next();
};

/**
 * Factory function for role-based access
 * @param {...string} allowedRoles - Array of allowed roles
 * @returns {Function} - Middleware function
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required",
                code: "AUTH_REQUIRED",
            });
        }

        if (hasRole(req.user, allowedRoles)) {
            return next();
        }

        const userRole = req.user.role || "user";

        return res.status(403).json({
            success: false,
            error: `Required role: ${allowedRoles.join(" or ")}`,
            code: "INSUFFICIENT_ROLE",
            requiredRoles: allowedRoles,
            userRole,
        });
    };
};

// ===========================================
// RESOURCE OWNERSHIP MIDDLEWARE
// ===========================================

/**
 * Check if user owns the resource
 * @param {Function} getResourceOwnerId - Function to get owner ID from request
 * @returns {Function} - Middleware function
 */
const ownerOnly = (getResourceOwnerId) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required",
                code: "AUTH_REQUIRED",
            });
        }

        try {
            const ownerId = await getResourceOwnerId(req);

            if (!ownerId) {
                return res.status(404).json({
                    success: false,
                    error: "Resource not found",
                    code: "RESOURCE_NOT_FOUND",
                });
            }

            const isOwner = req.user._id.toString() === ownerId.toString();
            const isAdmin = isAdminUser(req.user);

            if (!isOwner && !isAdmin) {
                return res.status(403).json({
                    success: false,
                    error: "You don't have permission to access this resource",
                    code: "NOT_OWNER",
                });
            }

            next();
        } catch (err) {
            console.error("❌ Owner check error:", err);
            return res.status(500).json({
                success: false,
                error: "Error checking ownership",
                code: "OWNERSHIP_CHECK_FAILED",
            });
        }
    };
};

// ===========================================
// RATE LIMITING HELPER
// ===========================================

/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiting
 */
const rateLimitMap = new Map();

const rateLimit = (options = {}) => {
    const {
        windowMs = 60 * 1000, // 1 minute
        max = 100, // max requests per window
        message = "Too many requests, please try again later",
        keyGenerator = (req) => req.user?._id?.toString() || req.ip,
    } = options;

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();

        // Clean old entries
        if (rateLimitMap.size > 10000) {
            const cutoff = now - windowMs;
            for (const [k, v] of rateLimitMap) {
                if (v.resetTime < cutoff) rateLimitMap.delete(k);
            }
        }

        let record = rateLimitMap.get(key);

        if (!record || record.resetTime < now) {
            record = { count: 0, resetTime: now + windowMs };
        }

        record.count++;
        rateLimitMap.set(key, record);

        if (record.count > max) {
            return res.status(429).json({
                success: false,
                error: message,
                code: "RATE_LIMITED",
                retryAfter: Math.ceil((record.resetTime - now) / 1000),
            });
        }

        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
        res.setHeader("X-RateLimit-Reset", record.resetTime);

        next();
    };
};

// ===========================================
// TOKEN UTILITIES
// ===========================================

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiry (default: 7d)
 * @returns {string} - JWT token
 */
const generateToken = (payload, expiresIn = "7d") => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

/**
 * Verify and decode token without throwing
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

/**
 * Decode token without verification (useful for getting exp time)
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch {
        return null;
    }
};

// ===========================================
// EXPORTS
// ===========================================
module.exports = auth;

// Named exports for additional functionality
module.exports.auth = auth;
module.exports.optionalAuth = optionalAuth;
module.exports.adminOnly = adminOnly;
module.exports.modOrAdmin = modOrAdmin;
module.exports.creatorOnly = creatorOnly;
module.exports.requireRole = requireRole;
module.exports.ownerOnly = ownerOnly;
module.exports.rateLimit = rateLimit;
module.exports.generateToken = generateToken;
module.exports.verifyToken = verifyToken;
module.exports.decodeToken = decodeToken;
module.exports.isAdminUser = isAdminUser;
module.exports.hasRole = hasRole;
