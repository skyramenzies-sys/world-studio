// backend/routes/adminWallet.js
// World-Studio.live - Admin Wallet Routes
// Platform wallet management and financial reporting

const express = require("express");
const router = express.Router();
const PlatformWallet = require("../models/PlatformWallet");
const User = require("../models/User");
const Gift = require("../models/Gift");
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get date ranges for reporting
 */
const getDateRanges = () => {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const yearStart = new Date(now.getFullYear(), 0, 1);

    return { now, todayStart, weekStart, monthStart, lastMonthStart, lastMonthEnd, yearStart };
};

// ===========================================
// WALLET OVERVIEW
// ===========================================

/**
 * GET /api/admin/wallet
 * Get platform wallet overview
 */
router.get("/", auth, requireAdmin, async (req, res) => {
    try {
        const wallet = await PlatformWallet.getWallet();

        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: "Platform wallet not found"
            });
        }

        res.json({
            success: true,
            wallet: {
                balance: wallet.balance,
                availableBalance: wallet.availableBalance,
                pendingBalance: wallet.pendingBalance,
                reservedBalance: wallet.reservedBalance,
                totalBalance: wallet.totalBalance,
                netAvailable: wallet.netAvailable,
                currency: wallet.currency,
                lifetimeStats: wallet.lifetimeStats,
                monthlyStats: wallet.monthlyStats,
                feeConfig: wallet.feeConfig,
                payoutSettings: wallet.payoutSettings,
                lastAuditDate: wallet.lastAuditDate,
                updatedAt: wallet.updatedAt
            }
        });
    } catch (err) {
        console.error("❌ Admin wallet error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load wallet"
        });
    }
});

/**
 * GET /api/admin/wallet/dashboard
 * Get comprehensive dashboard stats
 */
router.get("/dashboard", auth, requireAdmin, async (req, res) => {
    try {
        const stats = await PlatformWallet.getDashboardStats();

        res.json({
            success: true,
            ...stats
        });
    } catch (err) {
        console.error("❌ Dashboard stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load dashboard stats"
        });
    }
});

// ===========================================
// TRANSACTION HISTORY
// ===========================================

/**
 * GET /api/admin/wallet/history
 * Get full wallet transaction history
 */
router.get("/history", auth, requireAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            type,
            startDate,
            endDate,
            status
        } = req.query;

        const wallet = await PlatformWallet.getWallet();

        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: "Platform wallet not found"
            });
        }

        let history = [...wallet.history];

        // Filter by type
        if (type && type !== "all") {
            history = history.filter(tx => tx.type === type);
        }

        // Filter by status
        if (status && status !== "all") {
            history = history.filter(tx => tx.status === status);
        }

        // Filter by date range
        if (startDate) {
            const start = new Date(startDate);
            history = history.filter(tx => new Date(tx.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            history = history.filter(tx => new Date(tx.date) <= end);
        }

        // Sort by date (newest first)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Pagination
        const total = history.length;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedHistory = history.slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            history: paginatedHistory,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error("❌ Admin wallet history error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load history"
        });
    }
});

/**
 * GET /api/admin/wallet/history/export
 * Export transaction history as CSV
 */
router.get("/history/export", auth, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;

        const wallet = await PlatformWallet.getWallet();
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: "Platform wallet not found"
            });
        }

        let history = [...wallet.history];

        // Apply filters
        if (type && type !== "all") {
            history = history.filter(tx => tx.type === type);
        }
        if (startDate) {
            history = history.filter(tx => new Date(tx.date) >= new Date(startDate));
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            history = history.filter(tx => new Date(tx.date) <= end);
        }

        // Sort by date
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Create CSV
        const headers = ["Date", "Type", "Amount", "From User", "To User", "Description", "Status", "Balance After"];
        const rows = history.map(tx => [
            new Date(tx.date).toISOString(),
            tx.type,
            tx.amount,
            tx.fromUsername || "",
            tx.toUsername || "",
            tx.reason || tx.description || "",
            tx.status,
            tx.balanceAfter || ""
        ]);

        const csv = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=platform-wallet-${new Date().toISOString().split("T")[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error("❌ Export error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to export history"
        });
    }
});

// ===========================================
// REVENUE REPORTS
// ===========================================

/**
 * GET /api/admin/wallet/revenue
 * Get revenue report
 */
router.get("/revenue", auth, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, period = "month" } = req.query;
        const { todayStart, weekStart, monthStart, yearStart } = getDateRanges();

        let start, end;

        // Determine date range
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            switch (period) {
                case "today":
                    start = todayStart;
                    end = new Date();
                    break;
                case "week":
                    start = weekStart;
                    end = new Date();
                    break;
                case "month":
                    start = monthStart;
                    end = new Date();
                    break;
                case "year":
                    start = yearStart;
                    end = new Date();
                    break;
                default:
                    start = monthStart;
                    end = new Date();
            }
        }

        const report = await PlatformWallet.getRevenueReport(start, end);

        res.json({
            success: true,
            report
        });
    } catch (err) {
        console.error("❌ Revenue report error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to generate revenue report"
        });
    }
});

/**
 * GET /api/admin/wallet/revenue/chart
 * Get revenue chart data
 */
router.get("/revenue/chart", auth, requireAdmin, async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const wallet = await PlatformWallet.getWallet();
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: "Platform wallet not found"
            });
        }

        // Group transactions by day
        const chartData = [];
        for (let i = parseInt(days) - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            // Get transactions for this day
            const dayTransactions = wallet.history.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= date && txDate < nextDate && tx.status === "completed";
            });

            let revenue = 0;
            let expenses = 0;

            dayTransactions.forEach(tx => {
                if (["refund", "payout", "stripe_fee"].includes(tx.type)) {
                    expenses += Math.abs(tx.amount);
                } else if (tx.amount > 0) {
                    revenue += tx.amount;
                }
            });

            chartData.push({
                date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                fullDate: date.toISOString().split("T")[0],
                revenue,
                expenses,
                profit: revenue - expenses
            });
        }

        res.json({
            success: true,
            chart: chartData
        });
    } catch (err) {
        console.error("❌ Revenue chart error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to generate chart data"
        });
    }
});

// ===========================================
// TRANSACTIONS BY TYPE
// ===========================================

/**
 * GET /api/admin/wallet/transactions/:type
 * Get transactions by type
 */
router.get("/transactions/:type", auth, requireAdmin, async (req, res) => {
    try {
        const { type } = req.params;
        const { limit = 100 } = req.query;

        const wallet = await PlatformWallet.getWallet();
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: "Platform wallet not found"
            });
        }

        const transactions = wallet.getTransactionsByType(type, parseInt(limit));

        res.json({
            success: true,
            type,
            transactions,
            total: transactions.length
        });
    } catch (err) {
        console.error("❌ Transactions by type error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load transactions"
        });
    }
});

// ===========================================
// FEE CONFIGURATION
// ===========================================

/**
 * GET /api/admin/wallet/fees
 * Get current fee configuration
 */
router.get("/fees", auth, requireAdmin, async (req, res) => {
    try {
        const wallet = await PlatformWallet.getWallet();
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: "Platform wallet not found"
            });
        }

        res.json({
            success: true,
            feeConfig: wallet.feeConfig
        });
    } catch (err) {
        console.error("❌ Get fees error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load fee configuration"
        });
    }
});

/**
 * PUT /api/admin/wallet/fees
 * Update fee configuration
 */
router.put("/fees", auth, requireAdmin, async (req, res) => {
    try {
        const {
            giftFeePercent,
            contentFeePercent,
            subscriptionFeePercent,
            withdrawalFeePercent,
            withdrawalFeeFixed,
            minWithdrawal,
            coinExchangeRate
        } = req.body;

        const wallet = await PlatformWallet.getWallet();
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: "Platform wallet not found"
            });
        }

        const newConfig = {};

        if (giftFeePercent !== undefined) {
            if (giftFeePercent < 0 || giftFeePercent > 50) {
                return res.status(400).json({
                    success: false,
                    error: "Gift fee must be between 0% and 50%"
                });
            }
            newConfig.giftFeePercent = giftFeePercent;
        }

        if (contentFeePercent !== undefined) {
            if (contentFeePercent < 0 || contentFeePercent > 50) {
                return res.status(400).json({
                    success: false,
                    error: "Content fee must be between 0% and 50%"
                });
            }
            newConfig.contentFeePercent = contentFeePercent;
        }

        if (subscriptionFeePercent !== undefined) {
            if (subscriptionFeePercent < 0 || subscriptionFeePercent > 50) {
                return res.status(400).json({
                    success: false,
                    error: "Subscription fee must be between 0% and 50%"
                });
            }
            newConfig.subscriptionFeePercent = subscriptionFeePercent;
        }

        if (withdrawalFeePercent !== undefined) newConfig.withdrawalFeePercent = withdrawalFeePercent;
        if (withdrawalFeeFixed !== undefined) newConfig.withdrawalFeeFixed = withdrawalFeeFixed;
        if (minWithdrawal !== undefined) newConfig.minWithdrawal = minWithdrawal;
        if (coinExchangeRate !== undefined) newConfig.coinExchangeRate = coinExchangeRate;

        await wallet.updateFeeConfig(newConfig);

        console.log(`💰 Fee config updated by admin: ${JSON.stringify(newConfig)}`);

        res.json({
            success: true,
            message: "Fee configuration updated",
            feeConfig: wallet.feeConfig
        });
    } catch (err) {
        console.error("❌ Update fees error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to update fee configuration"
        });
    }
});

// ===========================================
// PAYOUT MANAGEMENT
// ===========================================

/**
 * GET /api/admin/wallet/payouts
 * Get pending payouts
 */
router.get("/payouts", auth, requireAdmin, async (req, res) => {
    try {
        // Get users with pending withdrawals
        const usersWithPendingWithdrawals = await User.find({
            "wallet.transactions": {
                $elemMatch: {
                    type: "withdraw",
                    status: "pending"
                }
            }
        }).select("username email avatar wallet").lean();

        const pendingPayouts = [];

        usersWithPendingWithdrawals.forEach(user => {
            const pendingTx = user.wallet?.transactions?.filter(
                tx => tx.type === "withdraw" && tx.status === "pending"
            ) || [];

            pendingTx.forEach(tx => {
                pendingPayouts.push({
                    userId: user._id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    amount: tx.amount,
                    requestedAt: tx.createdAt,
                    transactionId: tx._id
                });
            });
        });

        // Sort by date
        pendingPayouts.sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));

        res.json({
            success: true,
            payouts: pendingPayouts,
            total: pendingPayouts.length
        });
    } catch (err) {
        console.error("❌ Get payouts error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load pending payouts"
        });
    }
});

/**
 * POST /api/admin/wallet/payouts/:userId/process
 * Process a payout
 */
router.post("/payouts/:userId/process", auth, requireAdmin, async (req, res) => {
    try {
        const { amount, paymentMethod = "paypal", transactionRef } = req.body;

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Record payout in platform wallet
        const wallet = await PlatformWallet.getWallet();
        await wallet.recordPayout(amount, user._id, user.username, paymentMethod);

        // Update user's pending withdrawal to completed
        const withdrawalIndex = user.wallet.transactions.findIndex(
            tx => tx.type === "withdraw" && tx.status === "pending"
        );

        if (withdrawalIndex !== -1) {
            user.wallet.transactions[withdrawalIndex].status = "completed";
            user.wallet.transactions[withdrawalIndex].meta = {
                ...user.wallet.transactions[withdrawalIndex].meta,
                processedAt: new Date(),
                processedBy: req.user._id,
                paymentMethod,
                transactionRef
            };
            await user.save();
        }

        // Notify user
        if (user.addNotification) {
            await user.addNotification({
                message: `💸 Your withdrawal of €${(amount / 100).toFixed(2)} has been processed!`,
                type: "payout",
                amount
            });
        }

        console.log(`💸 Payout of ${amount} processed for ${user.username} by admin`);

        res.json({
            success: true,
            message: "Payout processed successfully"
        });
    } catch (err) {
        console.error("❌ Process payout error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to process payout"
        });
    }
});

/**
 * POST /api/admin/wallet/payouts/:userId/reject
 * Reject a payout request
 */
router.post("/payouts/:userId/reject", auth, requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;

        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Find and update the pending withdrawal
        const withdrawalIndex = user.wallet.transactions.findIndex(
            tx => tx.type === "withdraw" && tx.status === "pending"
        );

        if (withdrawalIndex === -1) {
            return res.status(404).json({
                success: false,
                error: "No pending withdrawal found"
            });
        }

        const amount = user.wallet.transactions[withdrawalIndex].amount;

        // Refund the amount back to user's balance
        user.wallet.balance += Math.abs(amount);
        user.wallet.transactions[withdrawalIndex].status = "cancelled";
        user.wallet.transactions[withdrawalIndex].meta = {
            ...user.wallet.transactions[withdrawalIndex].meta,
            rejectedAt: new Date(),
            rejectedBy: req.user._id,
            rejectionReason: reason
        };

        await user.save();

        // Notify user
        if (user.addNotification) {
            await user.addNotification({
                message: `❌ Your withdrawal request was declined. Reason: ${reason || "Not specified"}. The amount has been returned to your wallet.`,
                type: "system"
            });
        }

        console.log(`❌ Payout rejected for ${user.username}. Reason: ${reason}`);

        res.json({
            success: true,
            message: "Payout rejected, funds returned to user"
        });
    } catch (err) {
        console.error("❌ Reject payout error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to reject payout"
        });
    }
});

// ===========================================
// MANUAL ADJUSTMENTS
// ===========================================

/**
 * POST /api/admin/wallet/adjustment
 * Make a manual balance adjustment
 */
router.post("/adjustment", auth, requireAdmin, async (req, res) => {
    try {
        const { amount, reason, type = "adjustment" } = req.body;

        if (!amount || amount === 0) {
            return res.status(400).json({
                success: false,
                error: "Amount is required"
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: "Reason is required for adjustments"
            });
        }

        const wallet = await PlatformWallet.getWallet();

        const isRevenue = amount > 0;
        await wallet.addTransaction({
            amount: Math.abs(amount),
            type,
            reason: `Manual adjustment: ${reason}`,
            isRevenue,
            metadata: {
                adjustedBy: req.user._id,
                adjustedByUsername: req.user.username
            }
        });

        console.log(`📝 Manual adjustment of ${amount} by ${req.user.username}. Reason: ${reason}`);

        res.json({
            success: true,
            message: "Adjustment recorded",
            newBalance: wallet.balance
        });
    } catch (err) {
        console.error("❌ Adjustment error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to make adjustment"
        });
    }
});

// ===========================================
// AUDIT
// ===========================================

/**
 * POST /api/admin/wallet/audit
 * Record an audit
 */
router.post("/audit", auth, requireAdmin, async (req, res) => {
    try {
        const { notes } = req.body;

        const wallet = await PlatformWallet.getWallet();

        wallet.lastAuditDate = new Date();
        wallet.lastAuditBalance = wallet.balance;
        wallet.auditNotes = notes || `Audit performed by ${req.user.username}`;

        await wallet.save();

        console.log(`📋 Audit recorded by ${req.user.username}`);

        res.json({
            success: true,
            message: "Audit recorded",
            audit: {
                date: wallet.lastAuditDate,
                balance: wallet.lastAuditBalance,
                notes: wallet.auditNotes
            }
        });
    } catch (err) {
        console.error("❌ Audit error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to record audit"
        });
    }
});

// ===========================================
// SUMMARY STATS
// ===========================================

/**
 * GET /api/admin/wallet/summary
 * Get wallet summary with comparisons
 */
router.get("/summary", auth, requireAdmin, async (req, res) => {
    try {
        const { todayStart, weekStart, monthStart, lastMonthStart, lastMonthEnd } = getDateRanges();

        const wallet = await PlatformWallet.getWallet();
        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: "Platform wallet not found"
            });
        }

        // Calculate current period stats
        const currentMonthReport = await PlatformWallet.getRevenueReport(monthStart, new Date());
        const lastMonthReport = await PlatformWallet.getRevenueReport(lastMonthStart, lastMonthEnd);

        // Calculate growth percentages
        const revenueGrowth = lastMonthReport.revenue.total > 0
            ? Math.round(((currentMonthReport.revenue.total - lastMonthReport.revenue.total) / lastMonthReport.revenue.total) * 100)
            : 0;

        res.json({
            success: true,
            summary: {
                currentBalance: wallet.balance,
                availableBalance: wallet.availableBalance,
                pendingBalance: wallet.pendingBalance,

                thisMonth: {
                    revenue: currentMonthReport.revenue.total,
                    expenses: currentMonthReport.expenses.total,
                    profit: currentMonthReport.netProfit,
                    transactions: currentMonthReport.transactionCount
                },

                lastMonth: {
                    revenue: lastMonthReport.revenue.total,
                    expenses: lastMonthReport.expenses.total,
                    profit: lastMonthReport.netProfit
                },

                growth: {
                    revenue: revenueGrowth,
                    trend: revenueGrowth > 0 ? "up" : revenueGrowth < 0 ? "down" : "stable"
                },

                lifetime: wallet.lifetimeStats,

                feeConfig: wallet.feeConfig
            }
        });
    } catch (err) {
        console.error("❌ Summary error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to generate summary"
        });
    }
});

module.exports = router;