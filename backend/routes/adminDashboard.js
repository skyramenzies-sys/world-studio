// backend/routes/adminDashboard.js
// World-Studio.live - Admin Dashboard Routes (UNIVERSUM EDITION 🌌)
// Deze file is nu een DUNNE ALIAS rond de nieuwe /api/admin routes.
// Alle echte logica leeft in backend/routes/admin.js

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

// Helper om netjes 307 redirect te sturen (behoudt methode + body)
const redirectGet = (targetPath) => (req, res) => {
    return res.redirect(307, `/api/admin${targetPath}`);
};

const redirectWithParam = (buildPathFn) => (req, res) => {
    const targetPath = buildPathFn(req);
    return res.redirect(307, `/api/admin${targetPath}`);
};

// =====================================================
// DASHBOARD STATS (alias naar /api/admin/stats & /revenue)
// =====================================================

/**
 * GET /api/admin-dashboard/stats
 * Alias → GET /api/admin/stats
 */
router.get("/stats", auth, requireAdmin, redirectGet("/stats"));

/**
 * GET /api/admin-dashboard/revenue
 * Alias → GET /api/admin/revenue
 */
router.get("/revenue", auth, requireAdmin, redirectGet("/revenue"));

// =====================================================
// USERS LIST
// =====================================================

/**
 * GET /api/admin-dashboard/users
 * Alias → GET /api/admin/users
 * Query params worden automatisch doorgegeven door redirect (307)
 */
router.get("/users", auth, requireAdmin, redirectGet("/users"));

// =====================================================
// USER MANAGEMENT ACTIONS
// =====================================================

/**
 * POST /api/admin-dashboard/make-admin/:userId
 * Alias → POST /api/admin/make-admin/:userId
 */
router.post(
    "/make-admin/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/make-admin/${req.params.userId}`)
);

/**
 * POST /api/admin-dashboard/remove-admin/:userId
 * Alias → POST /api/admin/remove-admin/:userId
 */
router.post(
    "/remove-admin/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/remove-admin/${req.params.userId}`)
);

/**
 * POST /api/admin-dashboard/verify-user/:userId
 * Alias → POST /api/admin/verify-user/:userId
 */
router.post(
    "/verify-user/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/verify-user/${req.params.userId}`)
);

/**
 * POST /api/admin-dashboard/unverify-user/:userId
 * Alias → POST /api/admin/unverify-user/:userId
 */
router.post(
    "/unverify-user/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/unverify-user/${req.params.userId}`)
);

/**
 * POST /api/admin-dashboard/ban-user/:userId
 * Alias → POST /api/admin/ban-user/:userId
 */
router.post(
    "/ban-user/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/ban-user/${req.params.userId}`)
);

/**
 * POST /api/admin-dashboard/unban-user/:userId
 * Alias → POST /api/admin/unban-user/:userId
 */
router.post(
    "/unban-user/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/unban-user/${req.params.userId}`)
);

/**
 * DELETE /api/admin-dashboard/delete-user/:userId
 * Alias → DELETE /api/admin/delete-user/:userId
 */
router.delete(
    "/delete-user/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/delete-user/${req.params.userId}`)
);

/**
 * POST /api/admin-dashboard/add-coins/:userId
 * Alias → POST /api/admin/add-coins/:userId
 */
router.post(
    "/add-coins/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/add-coins/${req.params.userId}`)
);

/**
 * POST /api/admin-dashboard/remove-coins/:userId
 * Alias → POST /api/admin/remove-coins/:userId
 */
router.post(
    "/remove-coins/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/remove-coins/${req.params.userId}`)
);

// =====================================================
// STREAMS MANAGEMENT
// =====================================================

/**
 * GET /api/admin-dashboard/streams
 * Alias → GET /api/admin/streams
 */
router.get("/streams", auth, requireAdmin, redirectGet("/streams"));

/**
 * POST /api/admin-dashboard/streams/:streamId/end
 * Alias → POST /api/admin/streams/:streamId/end
 */
router.post(
    "/streams/:streamId/end",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/streams/${req.params.streamId}/end`)
);

module.exports = router;
