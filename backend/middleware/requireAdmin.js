// backend/middleware/requireAdmin.js
// World-Studio.live - Admin Guard (UNIVERSE EDITION 🚀)
// Used after auth middleware to protect admin-only routes.

const authModule = require("./auth");

// Haal de centrale admin-check helper uit auth.js
const { isAdminUser } = authModule;

/**
 * Admin-only middleware
 * Verwacht dat `auth` al gedraaid heeft en `req.user` gezet is.
 *
 * Gebruik:
 *   const auth = require("../middleware/auth");
 *   const requireAdmin = require("../middleware/requireAdmin");
 *
 *   router.get("/admin-only", auth, requireAdmin, (req, res) => { ... });
 */
const requireAdmin = (req, res, next) => {
    // Geen user → niet ingelogd
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "AUTH_REQUIRED",
        });
    }

    // Geen admin → geen toegang
    if (!isAdminUser(req.user)) {
        return res.status(403).json({
            success: false,
            error: "Admin access required",
            code: "ADMIN_REQUIRED",
        });
    }

    // Alles ok → doorgaan
    next();
};

module.exports = requireAdmin;

