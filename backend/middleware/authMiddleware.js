// backend/middleware/authMiddleware.js
// World-Studio.live - Authentication Middleware (UNIVERSE EDITION 🌌)
// Alternative auth stack: HTTP + Socket.io + roles + token utils

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const isProduction = process.env.NODE_ENV === "production";

// ===========================================
// CONFIGURATION
// ===========================================
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    if (isProduction) {
        console.error("❌ JWT_SECRET is not defined in environment variables (PRODUCTION)!");
        throw new Error("JWT_SECRET must be defined in production");
    } else {
        console.warn(
            "⚠️ JWT_SECRET missing. Using DEV fallback secret. DO NOT use this in production!"
        );
        JWT_SECRET = "world-studio-dev-secret-alt";
    }
}

// ===========================================
// INTERNAL HELPERS
// ===========================================

/**
 * Extract token from HTTP request
 * - Authorization: Bearer xxx
 * - Authorization: xxx (raw)
 * - query.token (for some websocket/http combos)
 * - cookies.token
 */
const getTokenFromRequest = (req) => {
    let token = null;

    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader) {
        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else {
            token = authHeader;
        }
    }

    if (!token && req.query?.token) {
        token = req.query.token;
    }

    if (!token && req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token || token === "null" || token === "undefined") {
        return null;
    }

    return token;
};

/**
 * Extract token from Socket.io handshake
 */
const getTokenFromSocket = (socket) => {
    const fromAuth = socket.handshake.auth?.token;
    if (fromAuth && fromAuth !== "null" && fromAuth !== "undefined") {
        return fromAuth;
    }

    const authHeader = socket.handshake.headers?.authorization;
    if (authHeader) {
        if (authHeader.startsWith("Bearer ")) {
            return authHeader.split(" ")[1];
        }
        return authHeader;
    }

    const fromQuery = socket.handshake.query?.token;
    if (fromQuery && fromQuery !== "null" && fromQuery !== "undefined") {
        return fromQuery;
    }

    return null;
};

/**
 * Extract userId from decoded JWT
 */
const getUserIdFromDecoded = (decoded) =>
    decoded?.id || decoded?.userId || decoded?._id || decoded?.sub || null;

/**
 * Central admin check
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
 * Shared "account state" checks (banned/deactivated/email verify)
 * Returns error object if blocked, anders null.
 */
const checkAccountState = (user) => {
    if (!user) {
        return {
            status: 401,
            body: {
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND",
            },
        };
    }

    if (user.isBanned || user.banned || user.status === "banned") {
        return {
            status: 403,
            body: {
                success: false,
                error: "Your account has been suspended",
                code: "ACCOUNT_SUSPENDED",
                reason: user.banReason || "Violation of terms of service",
                bannedAt: user.bannedAt,
            },
        };
    }

    if (user.isDeactivated || user.status === "deactivated") {
        return {
            status: 403,
            body: {
                success: false,
                error: "Your account has been deactivated",
                code: "ACCOUNT_DEACTIVATED",
            },
        };
    }

    if (
        process.env.REQUIRE_EMAIL_VERIFICATION === "true" &&
        !user.emailVerified
    ) {
        return {
            status: 403,
            body: {
                success: false,
                error: "Please verify your email address",
                code: "EMAIL_NOT_VERIFIED",
            },
        };
    }

    return null;
};

/**
 * Fire-and-forget lastActive update
 */
const updateLastActive = (userId, ip) => {
    if (!userId) return;
    User.findByIdAndUpdate(userId, {
        lastActive: new Date(),
        lastActiveIp: ip,
    }).catch(() => { });
};

// ===========================================
// MAIN AUTH MIDDLEWARE
// ===========================================

/**
 * Strict authentication middleware (required)
 */
async function authMiddleware(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "No token provided",
                code: "NO_TOKEN",
            });
        }


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
            if (jwtError.name === "NotBeforeError") {
                return res.status(401).json({
                    success: false,
                    error: "Token not yet active",
                    code: "TOKEN_NOT_ACTIVE",
                });
            }
            console.error("❌ JWT verify error:", jwtError);
            return res.status(401).json({
                success: false,
                error: "Authentication failed",
                code: "AUTH_FAILED",
            });
        }

        const userId = getUserIdFromDecoded(decoded);
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Invalid token payload",
                code: "INVALID_PAYLOAD",
            });
        }


        const user = await User.findById(userId).select("-password");
        const stateError = checkAccountState(user);
        if (stateError) {
            return res.status(stateError.status).json(stateError.body);
        }


        req.user = user;
        req.userId = user._id;
        req.token = token;
        req.tokenData = decoded;


        updateLastActive(user._id, req.ip);

        next();
    } catch (err) {
        console.error("❌ Auth middleware error:", err.message);
        return res.status(401).json({
            success: false,
            error: "Authentication failed",
            code: "AUTH_FAILED",
        });
    }
}



// ===========================================
// OPTIONAL AUTH MIDDLEWARE
// ===========================================

/**
 * Optional authentication - doesn't block if no/invalid token
 * Useful for public routes that show extra info for authenticated users
 */
async function optionalAuth(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            req.user = null;
            req.userId = null;
            return next();
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = getUserIdFromDecoded(decoded);

            if (!userId) {
                req.user = null;
                req.userId = null;
                return next();
            }

            const user = await User.findById(userId).select("-password");
            const stateError = checkAccountState(user);

            if (!user || stateError) {
                req.user = null;
                req.userId = null;
                return next();
            }

            req.user = user;
            req.userId = user._id;
            req.token = token;
            req.tokenData = decoded;

            updateLastActive(user._id, req.ip);
        } catch {
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
 * Use: io.use(socketAuth)
 */
async function socketAuth(socket, next) {
    try {
        const token = getTokenFromSocket(socket);

        if (!token) {
            return next(new Error("No token provided"));
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return next(new Error("Invalid or expired token"));
        }

        const userId = getUserIdFromDecoded(decoded);
        if (!userId) {
            return next(new Error("Invalid token payload"));
        }

        const user = await User.findById(userId).select("-password");
        const stateError = checkAccountState(user);

        if (!user || stateError) {
            return next(new Error("Account not allowed"));
        }



        socket.user = user;
        socket.userId = user._id.toString();
        socket.token = token;
        socket.tokenData = decoded;

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
            code: "AUTH_REQUIRED",
        });
    }



    if (!isAdminUser(req.user)) {
        return res.status(403).json({
            success: false,
            error: "Admin access required",
            code: "ADMIN_ONLY",
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
            code: "MOD_ONLY",
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
            code: "AUTH_REQUIRED",
        });
    }

    const isVerifiedCreator =
        isAdminUser(req.user) ||
        req.user.role === "creator" ||

        req.user.isVerified === true ||
        req.user.isCreator === true;

    if (!isVerifiedCreator) {
        return res.status(403).json({
            success: false,
            error: "Verified creator status required",
            code: "CREATOR_ONLY",
        });
    }

    next();
}

/**
 * Factory for custom role check
 * @param {...string} roles - Allowed roles
 */
function hasRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Authentication required",
                code: "AUTH_REQUIRED",
            });
        }

        const userRole = req.user.role || "user";

        // Admin bypass
        if (isAdminUser(req.user)) {
            return next();
        }

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: `Required role: ${roles.join(" or ")}`,
                code: "ROLE_REQUIRED",
                userRole,
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
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

/**
 * Verify token and return decoded data (or null)
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

/**
 * Decode token without verification
 * @returns {Object | null} Decode payload or null if invalid
 */
function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch {
        return null;
    }
}

/**
 * Check if token is expired
 * @returns {boolen} true if expired or invalid
 */
function isTokenExpired(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) return true;
        return Date.now() >= decoded.exp * 1000;
    } catch {
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
module.exports.isAdminUser = isAdminUser;
