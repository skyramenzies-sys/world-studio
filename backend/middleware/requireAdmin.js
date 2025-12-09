// backend/middleware/requireAdmin.js
// World-Studio.live - Admin Guard (UNIVERSE EDITION 🚀)


const authModule = require("./auth");
const isAdminUser = authModule.isAdminUser;

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

    // Alles oké
    next();
};

module.exports = requireAdmin;

