// backend/routes/platformWallet.js
// World-Studio.live - Platform Wallet Routes (UNIVERSE EDITION 🚀)
// Handles platform revenue, fees, transactions, and financial reporting

const express = require("express");
const router = express.Router();
const PlatformWallet = require("../models/PlatformWallet");
const User = require("../models/User");
// Gift is momenteel niet nodig in deze router; later kun je 'm hier weer gebruiken als je wilt.
// const Gift = require("../models/Gift");
const auth = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Safe positive integer parser
 */
const toPositiveInt = (value, fallback) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n <= 0) return fallback;
    return n;
};

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

    return {
        now,
        todayStart,
        weekStart,
        monthStart,
        lastMonthStart,
        lastMonthEnd,
        yearStart,
    };
};

/**
 * Ensure platform wallet exists
 */
const ensureWallet = async () => {
    let wallet = await PlatformWallet.findOne({ identifier: "platform-main" });

    if (!wallet) {
        wallet = new PlatformWallet({
            identifier: "platform-main",
            balance: 0,
            pendingBalance: 0,
            reservedBalance: 0,
            history: [],
            lifetimeStats: {
                totalRevenue: 0,
                totalFees: 0,
                totalPayouts: 0,
                totalRefunds: 0,
            },
            feeConfig: {
                giftFeePercent: 15,
                contentFeePercent: 15,
                subscriptionFeePercent: 20,
                withdrawalFeePercent: 0,
                withdrawalFeeFixed: 0,
                minWithdrawal: 1000,
                coinExchangeRate: 100, // 100 coins = €1
            },
            currency: "coins",
        });
        await wallet.save();
    }

    return wallet;
};

// ===========================================
// PUBLIC / ADMIN ENDPOINTS
// ===========================================

/**
 * GET /api/platform-wallet/balance
 * Get platform balance (admin only)
 */
router.get("/balance", auth, requireAdmin, async (req, res) => {
    try {
        const wallet = await ensureWallet();

        const balance = wallet.balance || 0;
        const pendingBalance = wallet.pendingBalance || 0;
        const reservedBalance = wallet.reservedBalance || 0;

        res.json({
            success: true,
            balance,
            pendingBalance,
            reservedBalance,
            availableBalance: balance - reservedBalance,
            currency: wallet.currency || "coins",
        });
    } catch (err) {
        console.error("❌ Platform balance error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get platform balance",
        });
    }
});

/**
 * GET /api/platform-wallet/stats
 * Get platform wallet statistics
 */
router.get("/stats", auth, requireAdmin, async (req, res) => {
    try {
        const wallet = await ensureWallet();
        const { todayStart, weekStart, monthStart } = getDateRanges();


        const history = wallet.history || [];

        const calculatePeriodStats = (startDate) => {
            const periodTransactions = history.filter(
                (tx) =>
                    new Date(tx.date) >= startDate &&
                    tx.status === "completed"
            );

            let revenue = 0;
            let payouts = 0;
            let refunds = 0;

            periodTransactions.forEach((tx) => {
                const amount = tx.amount || 0;
                if (tx.type === "payout" || tx.type === "withdrawal") {
                    payouts += Math.abs(amount);
                } else if (tx.type === "refund") {
                    refunds += Math.abs(amount);
                } else if (amount > 0) {
                    revenue += amount;
                }
            });

            return {
                revenue,
                payouts,
                refunds,
                transactions: periodTransactions.length,
            };
        };

        const todayStats = calculatePeriodStats(todayStart);
        const weekStats = calculatePeriodStats(weekStart);
        const monthStats = calculatePeriodStats(monthStart);

        const balance = wallet.balance || 0;
        const reservedBalance = wallet.reservedBalance || 0;
        const pendingBalance = wallet.pendingBalance || 0;

        res.json({
            success: true,
            balance: {
                current: balance,
                pending: pendingBalance,
                reserved: reservedBalance,
                available: balance - reservedBalance,
            },
            today: todayStats,
            thisWeek: weekStats,
            thisMonth: monthStats,
            lifetime:
                wallet.lifetimeStats || {
                    totalRevenue: 0,
                    totalFees: 0,
                    totalPayouts: 0,
                    totalRefunds: 0,
                },
            feeConfig: wallet.feeConfig,
        });
    } catch (err) {
        console.error("❌ Platform stats error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get platform stats",
        });
    }
});

// ===========================================
// RECORD FEE
// ===========================================

/**
 * POST /api/platform-wallet/fee
 * Record a platform fee
 * (Use from internal services / server-side only)
 */
router.post("/fee", async (req, res) => {
    try {
        const {
            amount,
            fromUserId,
            fromUsername,
            reason,
            type = "gift_fee",
            giftId,
            streamId,
            postId,
            metadata,
        } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: "Valid amount is required",
            });
        }

        const wallet = await ensureWallet();
        const numericAmount = Number(amount) || 0;

        wallet.balance = (wallet.balance || 0) + numericAmount;


        wallet.lifetimeStats = wallet.lifetimeStats || {};
        wallet.lifetimeStats.totalFees =
            (wallet.lifetimeStats.totalFees || 0) + numericAmount;
        wallet.lifetimeStats.totalRevenue =
            (wallet.lifetimeStats.totalRevenue || 0) + numericAmount;


        wallet.history.unshift({
            amount: numericAmount,
            type,
            fromUserId,
            fromUsername,
            reason: reason || `Platform fee: ${type}`,
            giftId,
            streamId,
            postId,
            metadata,
            status: "completed",
            balanceAfter: wallet.balance,
            date: new Date(),
        });


        if (wallet.history.length > 10000) {
            wallet.history = wallet.history.slice(0, 10000);
        }

        await wallet.save();

        res.json({
            success: true,
            balance: wallet.balance,
            transactionId: wallet.history[0]._id,
        });
    } catch (err) {
        console.error("❌ Fee record error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to record fee",
        });
    }
});

/**
 * POST /api/platform-wallet/gift-fee
 * Record gift platform fee (convenience endpoint)
 */
router.post("/gift-fee", async (req, res) => {
    try {
        const {
            giftAmount,
            senderId,
            senderUsername,
            recipientId,
            recipientUsername,
            giftId,
            streamId,
        } = req.body;

        const wallet = await ensureWallet();
        const feePercent = wallet.feeConfig?.giftFeePercent || 15;
        const platformFee = Math.floor(giftAmount * (feePercent / 100));

        if (platformFee <= 0) {
            return res.json({
                success: true,
                fee: 0,
                balance: wallet.balance,
            });
        }

        wallet.balance = (wallet.balance || 0) + platformFee;
        wallet.lifetimeStats = wallet.lifetimeStats || {};
        wallet.lifetimeStats.totalFees =
            (wallet.lifetimeStats.totalFees || 0) + platformFee;
        wallet.lifetimeStats.totalRevenue =
            (wallet.lifetimeStats.totalRevenue || 0) + platformFee;

        wallet.history.unshift({
            amount: platformFee,
            type: "gift_fee",
            fromUserId: senderId,
            fromUsername: senderUsername,
            toUserId: recipientId,
            toUsername: recipientUsername,
            reason: `Gift fee (${feePercent}%): ${senderUsername} → ${recipientUsername}`,
            giftId,
            streamId,
            metadata: {
                originalAmount: giftAmount,
                feePercent,
                creatorReceived: giftAmount - platformFee,
            },
            status: "completed",
            balanceAfter: wallet.balance,
            date: new Date(),
        });

        if (wallet.history.length > 10000) {
            wallet.history = wallet.history.slice(0, 10000);
        }

        await wallet.save();

        res.json({
            success: true,
            fee: platformFee,
            balance: wallet.balance,
        });
    } catch (err) {
        console.error("❌ Gift fee error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to record gift fee",
        });
    }
});

/**
 * POST /api/platform-wallet/content-fee
 * Record content sale platform fee
 */
router.post("/content-fee", async (req, res) => {
    try {
        const {
            saleAmount,
            buyerId,
            buyerUsername,
            sellerId,
            sellerUsername,
            postId,
            contentType,
        } = req.body;

        const wallet = await ensureWallet();
        const feePercent = wallet.feeConfig?.contentFeePercent || 15;
        const platformFee = Math.floor(saleAmount * (feePercent / 100));

        if (platformFee <= 0) {
            return res.json({
                success: true,
                fee: 0,
                balance: wallet.balance,
            });
        }

        wallet.balance = (wallet.balance || 0) + platformFee;
        wallet.lifetimeStats = wallet.lifetimeStats || {};
        wallet.lifetimeStats.totalFees =
            (wallet.lifetimeStats.totalFees || 0) + platformFee;
        wallet.lifetimeStats.totalRevenue =
            (wallet.lifetimeStats.totalRevenue || 0) + platformFee;

        wallet.history.unshift({
            amount: platformFee,
            type: "content_fee",
            fromUserId: buyerId,
            fromUsername: buyerUsername,
            toUserId: sellerId,
            toUsername: sellerUsername,
            reason: `Content sale fee (${feePercent}%): ${contentType || "content"}`,
            postId,
            metadata: {
                originalAmount: saleAmount,
                feePercent,
                contentType,
                creatorReceived: saleAmount - platformFee,
            },
            status: "completed",
            balanceAfter: wallet.balance,
            date: new Date(),
        });

        if (wallet.history.length > 10000) {
            wallet.history = wallet.history.slice(0, 10000);
        }

        await wallet.save();

        res.json({
            success: true,
            fee: platformFee,
            balance: wallet.balance,
        });
    } catch (err) {
        console.error("❌ Content fee error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to record content fee",
        });
    }
});

// ===========================================
// TRANSACTION HISTORY
// ===========================================

/**
 * GET /api/platform-wallet/history
 * Get transaction history
 */
router.get("/history", auth, requireAdmin, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            type,
            startDate,
            endDate,
            status,
        } = req.query;

        const wallet = await ensureWallet();
        let history = [...(wallet.history || [])];


        if (type && type !== "all") {
            history = history.filter((tx) => tx.type === type);
        }


        if (status && status !== "all") {
            history = history.filter((tx) => tx.status === status);
        }


        if (startDate) {
            const start = new Date(startDate);
            history = history.filter((tx) => new Date(tx.date) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            history = history.filter((tx) => new Date(tx.date) <= end);
        }


        const total = history.length;
        const pageNum = toPositiveInt(page, 1);
        const limitNum = toPositiveInt(limit, 50);
        const skip = (pageNum - 1) * limitNum;
        const paginatedHistory = history.slice(skip, skip + limitNum);


        let totalAmount = 0;
        let revenueAmount = 0;
        let payoutAmount = 0;

        history.forEach((tx) => {
            const amt = tx.amount || 0;
            if (tx.type === "payout" || tx.type === "withdrawal" || tx.type === "refund") {
                payoutAmount += Math.abs(amt);
            } else if (amt > 0) {
                revenueAmount += amt;
            }
            totalAmount += amt;
        });

        res.json({
            success: true,
            history: paginatedHistory,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
            summary: {
                totalAmount,
                revenueAmount,
                payoutAmount,
                netAmount: revenueAmount - payoutAmount,
            },
        });
    } catch (err) {
        console.error("❌ History error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get history",
        });
    }
});

/**
 * GET /api/platform-wallet/history/export
 * Export transaction history as CSV
 */
router.get("/history/export", auth, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, type } = req.query;

        const wallet = await ensureWallet();
        let history = [...(wallet.history || [])];


        if (type && type !== "all") {
            history = history.filter((tx) => tx.type === type);
        }
        if (startDate) {
            history = history.filter(
                (tx) => new Date(tx.date) >= new Date(startDate)
            );
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            history = history.filter((tx) => new Date(tx.date) <= end);
        }

        const headers = [
            "Date",
            "Type",
            "Amount",
            "From User",
            "To User",
            "Reason",
            "Status",
            "Balance After",
        ];

        const rows = history.map((tx) => [
            new Date(tx.date).toISOString(),
            tx.type || "",
            tx.amount || 0,
            tx.fromUsername || "",
            tx.toUsername || "",
            (tx.reason || "").replace(/,/g, ";"),
            tx.status || "",
            tx.balanceAfter || "",
        ]);

        const csv = [
            headers.join(","),
            ...rows.map((row) =>
                row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
            ),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=platform-wallet-${new Date()
                .toISOString()
                .split("T")[0]}.csv`
        );
        res.send(csv);
    } catch (err) {
        console.error("❌ Export error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to export history",
        });
    }
});

// ===========================================
// REVENUE REPORTS
// ===========================================

/**
 * GET /api/platform-wallet/revenue
 * Get revenue report
 */
router.get("/revenue", auth, requireAdmin, async (req, res) => {
    try {
        const { period = "month" } = req.query;
        const { todayStart, weekStart, monthStart, yearStart } =
            getDateRanges();

        const wallet = await ensureWallet();
        const history = wallet.history || [];

        let startDate;
        switch (period) {
            case "today":
                startDate = todayStart;
                break;
            case "week":
                startDate = weekStart;
                break;
            case "year":
                startDate = yearStart;
                break;
            case "month":
            default:
                startDate = monthStart;
                break;
        }

        const periodTransactions = history.filter(
            (tx) =>
                new Date(tx.date) >= startDate && tx.status === "completed"
        );


        const revenueByType = {};
        let totalRevenue = 0;
        let totalPayouts = 0;

        periodTransactions.forEach((tx) => {
            const amount = tx.amount || 0;
            const type = tx.type || "other";

            if (type === "payout" || type === "withdrawal") {
                totalPayouts += Math.abs(amount);
            } else if (amount > 0) {
                revenueByType[type] = (revenueByType[type] || 0) + amount;
                totalRevenue += amount;
            }
        });

        const revenueBreakdown = Object.entries(revenueByType)
            .map(([type, amount]) => ({
                type,
                amount,
                percentage:
                    totalRevenue > 0
                        ? Math.round((amount / totalRevenue) * 100)
                        : 0,
            }))
            .sort((a, b) => b.amount - a.amount);

        res.json({
            success: true,
            period,
            revenue: {
                total: totalRevenue,
                payouts: totalPayouts,
                net: totalRevenue - totalPayouts,
            },
            breakdown: revenueBreakdown,
            transactionCount: periodTransactions.length,
        });
    } catch (err) {
        console.error("❌ Revenue error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get revenue",
        });
    }
});

/**
 * GET /api/platform-wallet/revenue/chart
 * Get revenue chart data
 */
router.get("/revenue/chart", auth, requireAdmin, async (req, res) => {
    try {
        const days = toPositiveInt(req.query.days, 30);

        const wallet = await ensureWallet();
        const history = wallet.history || [];


        const chartData = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayTransactions = history.filter((tx) => {
                const txDate = new Date(tx.date);
                return (
                    txDate >= date &&
                    txDate < nextDate &&
                    tx.status === "completed"
                );
            });

            let revenue = 0;
            let payouts = 0;

            dayTransactions.forEach((tx) => {
                const amount = tx.amount || 0;
                if (tx.type === "payout" || tx.type === "withdrawal") {
                    payouts += Math.abs(amount);
                } else if (amount > 0) {
                    revenue += amount;
                }
            });

            chartData.push({
                date: date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                fullDate: date.toISOString().split("T")[0],
                revenue,
                payouts,
                net: revenue - payouts,
                transactions: dayTransactions.length,
            });
        }

        res.json({
            success: true,
            days,
            chart: chartData,
        });
    } catch (err) {
        console.error("❌ Chart error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get chart data",
        });
    }
});

// ===========================================
// FEE CONFIGURATION
// ===========================================

/**
 * GET /api/platform-wallet/fees
 * Get fee configuration
 */
router.get("/fees", auth, requireAdmin, async (req, res) => {
    try {
        const wallet = await ensureWallet();

        res.json({
            success: true,
            feeConfig:
                wallet.feeConfig || {
                    giftFeePercent: 15,
                    contentFeePercent: 15,
                    subscriptionFeePercent: 20,
                    withdrawalFeePercent: 0,
                    withdrawalFeeFixed: 0,
                    minWithdrawal: 1000,
                    coinExchangeRate: 100, // 100 coins = €1
                },
        });
    } catch (err) {
        console.error("❌ Get fees error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get fee configuration",
        });
    }
});

/**
 * PUT /api/platform-wallet/fees
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
            coinExchangeRate,
        } = req.body;

        const wallet = await ensureWallet();
        wallet.feeConfig = wallet.feeConfig || {};


        if (giftFeePercent !== undefined) {
            if (giftFeePercent < 0 || giftFeePercent > 50) {
                return res.status(400).json({
                    success: false,
                    error: "Gift fee must be between 0% and 50%",
                });
            }
            wallet.feeConfig.giftFeePercent = giftFeePercent;
        }

        if (contentFeePercent !== undefined) {
            if (contentFeePercent < 0 || contentFeePercent > 50) {
                return res.status(400).json({
                    success: false,
                    error: "Content fee must be between 0% and 50%",
                });
            }
            wallet.feeConfig.contentFeePercent = contentFeePercent;
        }

        if (subscriptionFeePercent !== undefined) {
            if (subscriptionFeePercent < 0 || subscriptionFeePercent > 50) {
                return res.status(400).json({
                    success: false,
                    error: "Subscription fee must be between 0% and 50%",
                });
            }
            wallet.feeConfig.subscriptionFeePercent = subscriptionFeePercent;
        }

        if (withdrawalFeePercent !== undefined) {
            wallet.feeConfig.withdrawalFeePercent = Math.max(
                0,
                withdrawalFeePercent
            );
        }

        if (withdrawalFeeFixed !== undefined) {
            wallet.feeConfig.withdrawalFeeFixed = Math.max(
                0,
                withdrawalFeeFixed
            );
        }

        if (minWithdrawal !== undefined) {
            wallet.feeConfig.minWithdrawal = Math.max(0, minWithdrawal);
        }

        if (coinExchangeRate !== undefined) {
            wallet.feeConfig.coinExchangeRate = Math.max(1, coinExchangeRate);
        }

        await wallet.save();

        console.log("💰 Fee config updated:", wallet.feeConfig);

        res.json({
            success: true,
            message: "Fee configuration updated",
            feeConfig: wallet.feeConfig,
        });
    } catch (err) {
        console.error("❌ Update fees error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to update fee configuration",
        });
    }
});

// ===========================================
// MANUAL TRANSACTIONS
// ===========================================

/**
 * POST /api/platform-wallet/add
 * Add funds to platform wallet (manual)
 */
router.post("/add", auth, requireAdmin, async (req, res) => {
    try {
        const { amount, reason, type = "manual_add" } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: "Valid positive amount is required",
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: "Reason is required for manual additions",
            });
        }

        const wallet = await ensureWallet();
        wallet.balance = (wallet.balance || 0) + amount;

        wallet.lifetimeStats = wallet.lifetimeStats || {};
        wallet.lifetimeStats.totalRevenue =
            (wallet.lifetimeStats.totalRevenue || 0) + amount;

        wallet.history.unshift({
            amount,
            type,
            reason,
            fromUsername: req.user?.username || "Admin",
            fromUserId: req.userId,
            status: "completed",
            balanceAfter: wallet.balance,
            metadata: { addedBy: req.userId },
            date: new Date(),
        });

        if (wallet.history.length > 10000) {
            wallet.history = wallet.history.slice(0, 10000);
        }

        await wallet.save();

        console.log(`💰 Manual add: ${amount} coins by ${req.user?.username || "Admin"}`);

        res.json({
            success: true,
            message: "Funds added successfully",
            balance: wallet.balance,
        });
    } catch (err) {
        console.error("❌ Manual add error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to add funds",
        });
    }
});

/**
 * POST /api/platform-wallet/deduct
 * Deduct funds from platform wallet (manual)
 */
router.post("/deduct", auth, requireAdmin, async (req, res) => {
    try {
        const { amount, reason, type = "manual_deduct" } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: "Valid positive amount is required",
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: "Reason is required for manual deductions",
            });
        }

        const wallet = await ensureWallet();

        if ((wallet.balance || 0) < amount) {
            return res.status(400).json({
                success: false,
                error: "Insufficient platform balance",
                currentBalance: wallet.balance,
            });
        }

        wallet.balance -= amount;

        wallet.history.unshift({
            amount: -amount,
            type,
            reason,
            fromUsername: req.user?.username || "Admin",
            fromUserId: req.userId,
            status: "completed",
            balanceAfter: wallet.balance,
            metadata: { deductedBy: req.userId },
            date: new Date(),
        });

        if (wallet.history.length > 10000) {
            wallet.history = wallet.history.slice(0, 10000);
        }

        await wallet.save();

        console.log(`💸 Manual deduct: ${amount} coins by ${req.user?.username || "Admin"}`);

        res.json({
            success: true,
            message: "Funds deducted successfully",
            balance: wallet.balance,
        });
    } catch (err) {
        console.error("❌ Manual deduct error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to deduct funds",
        });
    }
});

// ===========================================
// PAYOUT RECORDING
// ===========================================

/**
 * POST /api/platform-wallet/record-payout
 * Record a payout to creator
 */
router.post("/record-payout", auth, requireAdmin, async (req, res) => {
    try {
        const {
            userId,
            username,
            amount,
            paymentMethod,
            transactionRef,
            notes,
        } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: "Valid amount is required",
            });
        }

        const wallet = await ensureWallet();

        // ✅ Universe Edition fix: daadwerkelijk balans verlagen + saldo-check
        if ((wallet.balance || 0) < amount) {
            return res.status(400).json({
                success: false,
                error: "Insufficient platform balance for payout",
                currentBalance: wallet.balance || 0,
                required: amount,
            });
        }

        wallet.balance -= amount;

        wallet.lifetimeStats = wallet.lifetimeStats || {};
        wallet.lifetimeStats.totalPayouts =
            (wallet.lifetimeStats.totalPayouts || 0) + amount;

        wallet.history.unshift({
            amount: -amount,
            type: "payout",
            toUserId: userId,
            toUsername: username,
            reason: `Creator payout via ${paymentMethod || "unknown"}`,
            metadata: {
                paymentMethod,
                transactionRef,
                notes,
                processedBy: req.userId,
            },
            status: "completed",
            balanceAfter: wallet.balance,
            date: new Date(),
        });

        if (wallet.history.length > 10000) {
            wallet.history = wallet.history.slice(0, 10000);
        }

        await wallet.save();

        console.log(`💸 Payout recorded: ${amount} to ${username}`);

        res.json({
            success: true,
            message: "Payout recorded successfully",
            balance: wallet.balance,
        });
    } catch (err) {
        console.error("❌ Record payout error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to record payout",
        });
    }
});

// ===========================================
// DASHBOARD SUMMARY
// ===========================================

/**
 * GET /api/platform-wallet/dashboard
 * Get dashboard summary
 */
router.get("/dashboard", auth, requireAdmin, async (req, res) => {
    try {
        const wallet = await ensureWallet();
        const {
            todayStart,
            weekStart,
            monthStart,
            lastMonthStart,
            lastMonthEnd,
        } = getDateRanges();

        const history = wallet.history || [];


        const calculateRevenue = (start, end = new Date()) => {
            return history
                .filter((tx) => {
                    const txDate = new Date(tx.date);
                    return (
                        txDate >= start &&
                        txDate < end &&
                        tx.status === "completed" &&
                        tx.amount > 0 &&
                        tx.type !== "payout" &&
                        tx.type !== "withdrawal"
                    );
                })
                .reduce((sum, tx) => sum + (tx.amount || 0), 0);
        };

        const todayRevenue = calculateRevenue(todayStart);
        const weekRevenue = calculateRevenue(weekStart);
        const monthRevenue = calculateRevenue(monthStart);
        const lastMonthRevenue = calculateRevenue(lastMonthStart, lastMonthEnd);

        const monthGrowth =
            lastMonthRevenue > 0
                ? Math.round(
                    ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) *
                    100
                )
                : 0;

        const feesByType = {};
        history.slice(0, 1000).forEach((tx) => {
            if (tx.amount > 0 && tx.type) {
                feesByType[tx.type] =
                    (feesByType[tx.type] || 0) + tx.amount;
            }
        });

        const topSources = Object.entries(feesByType)
            .map(([type, amount]) => ({ type, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);


        const recentTransactions = history.slice(0, 10);

        const balance = wallet.balance || 0;
        const reservedBalance = wallet.reservedBalance || 0;

        res.json({
            success: true,
            balance: {
                current: balance,
                pending: wallet.pendingBalance || 0,
                available: balance - reservedBalance,
            },
            revenue: {
                today: todayRevenue,
                thisWeek: weekRevenue,
                thisMonth: monthRevenue,
                lastMonth: lastMonthRevenue,
                growth: monthGrowth,
                growthTrend:
                    monthGrowth > 0
                        ? "up"
                        : monthGrowth < 0
                            ? "down"
                            : "stable",
            },
            lifetime: wallet.lifetimeStats,
            topSources,
            recentTransactions,
            feeConfig: wallet.feeConfig,
        });
    } catch (err) {
        console.error("❌ Dashboard error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get dashboard data",
        });
    }
});

module.exports = router;
