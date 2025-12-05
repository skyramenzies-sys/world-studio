// backend/middleware/requireAdmin.js
// World-Studio.live - Admin Access Middleware
// Ensures only admin users can access protected routes

// ===========================================
// HARDCODED ADMIN EMAILS
// These emails always have admin access
// ===========================================
const SUPER_ADMINS = [
    "menziesalm@gmail.com",
    // Add more super admin emails here if needed
];

// ===========================================
// MAIN ADMIN MIDDLEWARE
// ===========================================

/**
 * Require admin role middleware
 * Must be used AFTER auth middleware
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAdmin(req, res, next) {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Not authenticated",
            message: "Authentication required",
            code: "AUTH_REQUIRED"
        });
    }

    // Check admin status
    const isAdmin = checkAdminStatus(req.user);

    if (!isAdmin) {
        console.warn(`⚠️ Admin access denied for user: ${req.user.email || req.user.username}`);
        return res.status(403).json({
            success: false,
            error: "Admin access only",
            message: "You do not have permission to access this resource",
            code: "ADMIN_REQUIRED"
        });
    }

    // Log admin access
    console.log(`👑 Admin access granted: ${req.user.email || req.user.username}`);

    next();
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Check if user has admin privileges
 * @param {Object} user - User object
 * @returns {boolean} - True if user is admin
 */
function checkAdminStatus(user) {
    if (!user) return false;

    // Check super admin emails
    if (user.email && SUPER_ADMINS.includes(user.email.toLowerCase())) {
        return true;
    }

    // Check role
    if (user.role === "admin") {
        return true;
    }

    // Check isAdmin flag
    if (user.isAdmin === true) {
        return true;
    }

    return false;
}

// ===========================================
// ADDITIONAL ADMIN MIDDLEWARES
// ===========================================

/**
 * Require super admin (hardcoded emails only)
 */
function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Not authenticated",
            code: "AUTH_REQUIRED"
        });
    }

    const isSuperAdmin = req.user.email &&
        SUPER_ADMINS.includes(req.user.email.toLowerCase());

    if (!isSuperAdmin) {
        return res.status(403).json({
            success: false,
            error: "Super admin access only",
            code: "SUPER_ADMIN_REQUIRED"
        });
    }

    next();
}

/**
 * Require admin or moderator
 */
function requireAdminOrMod(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Not authenticated",
            code: "AUTH_REQUIRED"
        });
    }

    const hasAccess =
        checkAdminStatus(req.user) ||
        req.user.role === "moderator" ||
        req.user.isModerator === true;

    if (!hasAccess) {
        return res.status(403).json({
            success: false,
            error: "Admin or moderator access required",
            code: "ADMIN_OR_MOD_REQUIRED"
        });
    }

    next();
}

/**
 * Require specific admin permission
 * @param {string} permission - Required permission
 */
function requireAdminPermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: "Not authenticated",
                code: "AUTH_REQUIRED"
            });
        }

        // Super admins have all permissions
        if (req.user.email && SUPER_ADMINS.includes(req.user.email.toLowerCase())) {
            return next();
        }

        // Check role
        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                error: "Admin access required",
                code: "ADMIN_REQUIRED"
            });
        }

        // Check specific permission
        const permissions = req.user.permissions || [];
        if (!permissions.includes(permission) && !permissions.includes("*")) {
            return res.status(403).json({
                success: false,
                error: `Missing permission: ${permission}`,
                code: "PERMISSION_DENIED",
                requiredPermission: permission
            });
        }

        next();
    };
}

/**
 * Log admin action middleware
 * Use after requireAdmin to log admin actions
 */
function logAdminAction(action) {
    return (req, res, next) => {
        const logEntry = {
            action,
            admin: req.user?.email || req.user?.username || "unknown",
            adminId: req.user?._id,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers["user-agent"],
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method,
            body: req.method !== "GET" ? sanitizeLogData(req.body) : undefined,
        };

        console.log(`👑 ADMIN ACTION:`, JSON.stringify(logEntry));

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override to log response
        res.json = (data) => {
            logEntry.responseStatus = res.statusCode;
            logEntry.success = res.statusCode < 400;
            console.log(`👑 ADMIN ACTION COMPLETE:`, JSON.stringify({
                action: logEntry.action,
                admin: logEntry.admin,
                success: logEntry.success,
                status: logEntry.responseStatus
            }));
            return originalJson(data);
        };

        next();
    };
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeLogData(data) {
    if (!data) return data;

    const sanitized = { ...data };
    const sensitiveFields = ["password", "token", "secret", "apiKey", "creditCard"];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = "[REDACTED]";
        }
    }

    return sanitized;
}

// ===========================================
// EXPORTS
// ===========================================
module.exports = requireAdmin;

// Named exports
module.exports.requireAdmin = requireAdmin;
module.exports.requireSuperAdmin = requireSuperAdmin;
module.exports.requireAdminOrMod = requireAdminOrMod;
module.exports.requireAdminPermission = requireAdminPermission;
module.exports.logAdminAction = logAdminAction;
module.exports.checkAdminStatus = checkAdminStatus;
module.exports.SUPER_ADMINS = SUPER_ADMINS;