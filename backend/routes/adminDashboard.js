// backend/routes/adminDashboard.js
// World-Studio.live - Admin Dashboard Routes (UNIVERSUM EDITION 🌌)
// Deze file is een DUNNE ALIAS rond de nieuwe /api/admin routes.
// Alle echte logica leeft in backend/routes/admin.js

const express = require("express");
const router = express.Router();

// ✅ matcht de nieuwe export in middleware/auth.js
const { auth } = require("../middleware/auth");
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
// USERS LIST + USER MANAGEMENT
// =====================================================

/**
 * GET /api/admin-dashboard/users
 * Alias → GET /api/admin/users
 */
router.get("/users", auth, requireAdmin, redirectGet("/users"));

/**
 * GET /api/admin-dashboard/users/:userId
 * Alias → GET /api/admin/users/:userId
 */
router.get(
    "/users/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/users/${req.params.userId}`)
);

/**
 * PUT /api/admin-dashboard/users/:userId
 * Alias → PUT /api/admin/users/:userId
 */
router.put(
    "/users/:userId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/users/${req.params.userId}`)
);

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

/**
 * POST /api/admin-dashboard/stop-stream/:streamId
 * Alias → POST /api/admin/stop-stream/:streamId
 */
router.post(
    "/stop-stream/:streamId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/stop-stream/${req.params.streamId}`)
);

// =====================================================
// WITHDRAWALS (Withdrawals tab in AdminDashboard U.E.)
// =====================================================

/**
 * GET /api/admin-dashboard/withdrawals
 * Alias → GET /api/admin/withdrawals
 */
router.get("/withdrawals", auth, requireAdmin, redirectGet("/withdrawals"));

/**
 * POST /api/admin-dashboard/withdrawals/:id/approve
 * Alias → POST /api/admin/withdrawals/:id/approve
 */
router.post(
    "/withdrawals/:id/approve",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/withdrawals/${req.params.id}/approve`)
);

/**
 * POST /api/admin-dashboard/withdrawals/:id/reject
 * Alias → POST /api/admin/withdrawals/:id/reject
 */
router.post(
    "/withdrawals/:id/reject",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/withdrawals/${req.params.id}/reject`)
);

// =====================================================
// REPORTS / MODERATION
// =====================================================

/**
 * GET /api/admin-dashboard/reports
 * Alias → GET /api/admin/reports
 */
router.get("/reports", auth, requireAdmin, redirectGet("/reports"));

/**
 * POST /api/admin-dashboard/reports/:id/resolve
 * Alias → POST /api/admin/reports/:id/resolve
 */
router.post(
    "/reports/:id/resolve",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/reports/${req.params.id}/resolve`)
);

/**
 * DELETE /api/admin-dashboard/reports/:id
 * Alias → DELETE /api/admin/reports/:id
 */
router.delete(
    "/reports/:id",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/reports/${req.params.id}`)
);

// =====================================================
// POSTS MANAGEMENT (content tab / moderation)
// =====================================================

/**
 * GET /api/admin-dashboard/posts
 * Alias → GET /api/admin/posts
 */
router.get("/posts", auth, requireAdmin, redirectGet("/posts"));

/**
 * DELETE /api/admin-dashboard/posts/:postId
 * Alias → DELETE /api/admin/posts/:postId
 */
router.delete(
    "/posts/:postId",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/posts/${req.params.postId}`)
);

/**
 * POST /api/admin-dashboard/posts/:postId/feature
 * Alias → POST /api/admin/posts/:postId/feature
 */
router.post(
    "/posts/:postId/feature",
    auth,
    requireAdmin,
    redirectWithParam((req) => `/posts/${req.params.postId}/feature`)
);

// =====================================================
// SYSTEM / ANNOUNCEMENTS (System tab)
// =====================================================

/**
 * GET /api/admin-dashboard/system
 * Alias → GET /api/admin/system
 */
router.get("/system", auth, requireAdmin, redirectGet("/system"));

/**
 * POST /api/admin-dashboard/announcement
 * Alias → POST /api/admin/announcement
 */
router.post(
    "/announcement",
    auth,
    requireAdmin,
    redirectGet("/announcement")
);

/**
 * POST /api/admin-dashboard/broadcast
 * Alias → POST /api/admin/broadcast
 */
router.post(
    "/broadcast",
    auth,
    requireAdmin,
    redirectGet("/broadcast")
);

module.exports = router;
