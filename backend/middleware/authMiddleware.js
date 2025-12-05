// backend/middleware/authMiddleware.js
// World-Studio.live - Authentication Middleware (Alternative Version)
// Handles JWT verification with flexible token extraction

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ===========================================
// CONFIGURATION
// ===========================================
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("❌ JWT_SECRET is not defined in environment variables!");
    throw new Error("JWT_SECRET must be defined");
}

// ===========================================
// MAIN AUTH MIDDLEWARE
// ===========================================

/**
 * Authentication middleware
 * Extracts token from Authorization header (Bearer or raw)
 * Verifies JWT and attaches user to request
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
async function authMiddleware(req, res, next) {
    try {
        let token = null;

        // Extract token from Authorization header
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (authHeader) {
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            } else {
                // Support raw token in header
                token = authHeader;
            }
        }

        // Also check for token in query string (for WebSocket connections)
        if (!token && req.query?.token) {
            token = req.query.token;
        }

        // Check for token in cookies
        if (!token && req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token || token === "null" || token === "undefined") {
            return res.status(401).json({
                success: false,
                error: "No token provided",
                code: "NO_TOKEN"
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
                    expiredAt: jwtError.expiredAt
                });
            }
            if (jwtError.name === "JsonWebTokenError") {
                return res.status(401).json({
                    success: false,
                    error: "Invalid token",
                    code: "INVALID_TOKEN"
                });
            }
            if (jwtError.name === "NotBeforeError") {
                return res.status(401).json({
                    success: false,
                    error: "Token not yet active",
                    code: "TOKEN_NOT_ACTIVE"
                });
            }
            throw jwtError;
        }

        // Get user ID from decoded token
        const userId = decoded.id || decoded.userId || decoded._id || decoded.sub;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Invalid token payload",
                code: "INVALID_PAYLOAD"
            });
        }

        // Find user in database
        const user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        // Check if user is banned
        if (user.isBanned || user.banned || user.status === "banned") {
            return res.status(403).json({
                success: false,
                error: "Your account has been suspended",
                code: "ACCOUNT_SUSPENDED",
                reason: user.banReason || "Violation of terms of service",
                bannedAt: user.bannedAt
            });
        }

        // Check if user is deactivated
        if (user.isDeactivated || user.status === "deactivated") {
            return res.status(403).json({
                success: false,
                error: "Your account has been deactivated",
                code: "ACCOUNT_DEACTIVATED"
            });
        }

        // Check if email verification is required
        if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
            return res.status(403).json({
                success: false,
                error: "Please verify your email address",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        // Attach user and related data to request
        req.user = user;
        req.userId = user._id;
        req.token = token;
        req.tokenData = decoded;

        // Update last active (fire and forget)
        updateLastActive(user._id, req.ip);

        next();
    } catch (err) {
        console.error("❌ Auth middleware error:", err.message);
        return res.status(401).json({
            success: false,
            error: "Authentication failed",
            code: "AUTH_FAILED"
        });
    }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Update user's last active timestamp
 * Non-blocking, fire and forget
 */
function updateLastActive(userId, ip) {
    User.findByIdAndUpdate(userId, {
        lastActive: new Date(),
        lastActiveIp: ip
    }).catch(() => { }); // Silently ignore errors
}

// ===========================================
// OPTIONAL AUTH MIDDLEWARE
// ===========================================

/**
 * Optional authentication - doesn't block if no token
 * Useful for public routes that show extra info for authenticated users
 */
async function optionalAuth(req, res, next) {
    try {
        let token = null;
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (authHeader) {
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            } else {
                token = authHeader;
            }
        }

        if (!token || token === "null" || token === "undefined") {
            req.user = null;
            req.userId = null;
            return next();
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.id || decoded.userId || decoded._id || decoded.sub;

            if (userId) {
                const user = await User.findById(userId).select("-password");
                if (user && !user.isBanned && !user.isDeactivated) {
                    req.user = user;
                    req.userId = user._id;
                } else {
                    req.user = null;
                    req.userId = null;
                }
            } else {
                req.user = null;
                req.userId = null;
            }
        } catch (jwtError) {
            req.user = null;
            req.userId = null;
        }

        next();
    } catch (err) {
        req.user = null;
        req.userId = null;
        next();
    }
}

// ===========================================
// SOCKET.IO AUTH MIDDLEWARE
// ===========================================

/**
 * Socket.IO authentication middleware
 * For use with socket.io connection
 */
async function socketAuth(socket, next) {
    try {
        const token = socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
            socket.handshake.query?.token;

        if (!token) {
            return next(new Error("No token provided"));
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id || decoded.userId || decoded._id || decoded.sub;

        if (!userId) {
            return next(new Error("Invalid token"));
        }

        const user = await User.findById(userId).select("-password");

        if (!user) {
            return next(new Error("User not found"));
        }

        if (user.isBanned || user.banned) {
            return next(new Error("Account suspended"));
        }

        // Attach user to socket
        socket.user = user;
        socket.userId = user._id.toString();

        next();
    } catch (err) {
        console.error("Socket auth error:", err.message);
        next(new Error("Authentication failed"));
    }
}

// ===========================================
// ROLE CHECK MIDDLEWARES
// ===========================================

/**
 * Check if user is admin
 */
function isAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "AUTH_REQUIRED"
        });
    }

    const isAdminUser =
        req.user.role === "admin" ||
        req.user.isAdmin === true ||
        req.user.email === "menziesalm@gmail.com";

    if (!isAdminUser) {
        return res.status(403).json({
            success: false,
            error: "Admin access required",
            code: "ADMIN_ONLY"
        });
    }

    next();
}

/**
 * Check if user is moderator or admin
 */
function isModerator(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "AUTH_REQUIRED"
        });
    }

    const hasAccess =
        req.user.role === "admin" ||
        req.user.role === "moderator" ||
        req.user.isAdmin === true ||
        req.user.isModerator === true ||
        req.user.email === "menziesalm@gmail.com";

    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            error: "Moderator access required",
            code: "MOD_ONLY"
        });
    }

    next();
}

/**
 * Check if user is verified creator
 */
function isCreator(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "AUTH_REQUIRED"
        });
    }

    const isVerifiedCreator =
        req.user.role === "creator" ||
        req.user.role === "admin" ||
        req.user.isVerified === true ||
        req.user.isCreator === true;

    if (!isVerifiedCreator) {
        return res.status(403).json({
            success: false,
            error: "Verified creator status required",
            code: "CREATOR_ONLY"
        });
    }

    next();
}

/**
 * Factory for custom role check
 * @param {string[]} roles - Allowed roles
 */
function hasRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required",
                code: "AUTH_REQUIRED"
            });
        }

        const userRole = req.user.role || "user";

        // Admin bypass
        if (userRole === "admin" || req.user.email === "menziesalm@gmail.com") {
            return next();
        }

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: `Required role: ${roles.join(" or ")}`,
                code: "ROLE_REQUIRED"
            });
        }

        next();
    };
}

// ===========================================
// TOKEN UTILITIES
// ===========================================

/**
 * Generate a new JWT token
 * @param {Object} payload - Data to encode
 * @param {string} expiresIn - Expiration time (default: 7d)
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = "7d") {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Generate refresh token (longer expiry)
 * @param {Object} payload - Data to encode
 * @returns {string} Refresh token
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

/**
 * Verify token and return decoded data
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Decode token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch (err) {
        return null;
    }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean}
 */
function isTokenExpired(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return true;
        return Date.now() >= decoded.exp * 1000;
    } catch (err) {
        return true;
    }
}

// ===========================================
// EXPORTS
// ===========================================
module.exports = authMiddleware;

// Named exports
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.socketAuth = socketAuth;
module.exports.isAdmin = isAdmin;
module.exports.isModerator = isModerator;
module.exports.isCreator = isCreator;
module.exports.hasRole = hasRole;
module.exports.generateToken = generateToken;
module.exports.generateRefreshToken = generateRefreshToken;
module.exports.verifyToken = verifyToken;
module.exports.decodeToken = decodeToken;
module.exports.isTokenExpired = isTokenExpired;