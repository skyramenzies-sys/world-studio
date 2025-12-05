// backend/models/PlatformWallet.js
// World-Studio.live - Platform Wallet Model
// Tracks platform earnings, fees, and revenue from all transactions

const mongoose = require("mongoose");

// ===========================================
// TRANSACTION HISTORY SCHEMA
// ===========================================
const PlatformTransactionSchema = new mongoose.Schema({
    // Transaction Amount
    amount: {
        type: Number,
        required: true
    },

    // Source of funds
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    fromUsername: String,

    // To user (for refunds, payouts)
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    toUsername: String,

    // Transaction Type
    type: {
        type: String,
        enum: [
            "gift_fee",           // Fee from gift transactions
            "content_fee",        // Fee from content sales
            "subscription_fee",   // Fee from subscriptions
            "withdrawal_fee",     // Fee from user withdrawals
            "coin_purchase",      // Revenue from coin purchases
            "premium_upgrade",    // Premium account upgrades
            "promotion_fee",      // Featured/promoted content
            "refund",             // Refund to user
            "payout",             // Payout to creator
            "adjustment",         // Manual adjustment
            "stripe_fee",         // Stripe processing fee (expense)
            "other"
        ],
        default: "other"
    },

    // Transaction details
    reason: {
        type: String,
        maxLength: 500
    },
    description: String,

    // Related entities
    relatedGiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Gift"
    },
    relatedPurchaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Purchase"
    },
    relatedTransactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction"
    },
    relatedStreamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LiveStream"
    },

    // Payment processor info
    stripePaymentId: String,
    stripeRefundId: String,
    paypalTransactionId: String,

    // Currency
    currency: {
        type: String,
        default: "EUR"
    },
    originalAmount: Number, // If converted from different currency
    originalCurrency: String,
    exchangeRate: Number,

    // Fee breakdown
    grossAmount: Number,
    netAmount: Number,
    processingFee: Number,

    // Balance tracking
    balanceBefore: Number,
    balanceAfter: Number,

    // Status
    status: {
        type: String,
        enum: ["pending", "completed", "failed", "refunded", "cancelled"],
        default: "completed"
    },

    // Metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // IP and location (for audit)
    ip: String,
    country: String,

    // Timestamps
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    processedAt: Date
}, { _id: true });

// ===========================================
// DAILY SUMMARY SCHEMA
// ===========================================
const DailySummarySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    revenue: {
        giftFees: { type: Number, default: 0 },
        contentFees: { type: Number, default: 0 },
        subscriptionFees: { type: Number, default: 0 },
        coinPurchases: { type: Number, default: 0 },
        premiumUpgrades: { type: Number, default: 0 },
        promotionFees: { type: Number, default: 0 },
        withdrawalFees: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    expenses: {
        refunds: { type: Number, default: 0 },
        payouts: { type: Number, default: 0 },
        stripeFees: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    netProfit: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 }
}, { _id: false });

// ===========================================
// MAIN PLATFORM WALLET SCHEMA
// ===========================================
const PlatformWalletSchema = new mongoose.Schema({
    // Wallet Identifier (singleton - only one platform wallet)
    identifier: {
        type: String,
        default: "platform-main",
        unique: true
    },

    // Current Balance
    balance: {
        type: Number,
        default: 0,
        min: 0
    },

    // Available for withdrawal (after holds)
    availableBalance: {
        type: Number,
        default: 0
    },

    // Pending transactions
    pendingBalance: {
        type: Number,
        default: 0
    },

    // Reserved funds (for pending payouts)
    reservedBalance: {
        type: Number,
        default: 0
    },

    // Currency
    currency: {
        type: String,
        default: "EUR"
    },

    // Transaction History
    history: [PlatformTransactionSchema],

    // Daily Summaries (for quick reporting)
    dailySummaries: [DailySummarySchema],

    // Lifetime Stats
    lifetimeStats: {
        totalRevenue: { type: Number, default: 0 },
        totalExpenses: { type: Number, default: 0 },
        totalProfit: { type: Number, default: 0 },
        totalTransactions: { type: Number, default: 0 },
        totalGiftFees: { type: Number, default: 0 },
        totalContentFees: { type: Number, default: 0 },
        totalCoinPurchases: { type: Number, default: 0 },
        totalRefunds: { type: Number, default: 0 },
        totalPayouts: { type: Number, default: 0 }
    },

    // Monthly Stats (current month)
    monthlyStats: {
        month: { type: Number, default: new Date().getMonth() + 1 },
        year: { type: Number, default: new Date().getFullYear() },
        revenue: { type: Number, default: 0 },
        expenses: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
        transactionCount: { type: Number, default: 0 }
    },

    // Fee Configuration
    feeConfig: {
        giftFeePercent: { type: Number, default: 15 },      // 15% fee on gifts
        contentFeePercent: { type: Number, default: 15 },   // 15% fee on content sales
        subscriptionFeePercent: { type: Number, default: 20 }, // 20% fee on subscriptions
        withdrawalFeePercent: { type: Number, default: 0 }, // No withdrawal fee
        withdrawalFeeFixed: { type: Number, default: 0 },   // Fixed withdrawal fee
        minWithdrawal: { type: Number, default: 10 },       // Minimum €10 withdrawal
        coinExchangeRate: { type: Number, default: 100 }    // 100 coins = €1
    },

    // Payout Settings
    payoutSettings: {
        autoPayoutEnabled: { type: Boolean, default: false },
        autoPayoutThreshold: { type: Number, default: 100 }, // Auto payout at €100
        payoutSchedule: {
            type: String,
            enum: ["daily", "weekly", "monthly", "manual"],
            default: "manual"
        },
        nextScheduledPayout: Date
    },

    // Bank/Stripe Info
    stripeAccountId: String,
    stripeBankAccountId: String,

    // Audit
    lastAuditDate: Date,
    lastAuditBalance: Number,
    auditNotes: String,

    // Metadata
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===========================================
// INDEXES
// ===========================================
PlatformWalletSchema.index({ identifier: 1 }, { unique: true });
PlatformWalletSchema.index({ "history.date": -1 });
PlatformWalletSchema.index({ "history.type": 1 });
PlatformWalletSchema.index({ "history.fromUserId": 1 });
PlatformWalletSchema.index({ "dailySummaries.date": -1 });

// ===========================================
// VIRTUALS
// ===========================================

// Total balance (including pending)
PlatformWalletSchema.virtual("totalBalance").get(function () {
    return this.balance + this.pendingBalance;
});

// Net available (minus reserved)
PlatformWalletSchema.virtual("netAvailable").get(function () {
    return this.availableBalance - this.reservedBalance;
});

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Get or create the platform wallet (singleton)
 */
PlatformWalletSchema.statics.getWallet = async function () {
    let wallet = await this.findOne({ identifier: "platform-main" });

    if (!wallet) {
        wallet = await this.create({ identifier: "platform-main" });
        console.log("✅ Platform wallet created");
    }

    return wallet;
};

/**
 * Add revenue to platform wallet
 */
PlatformWalletSchema.statics.addRevenue = async function (transactionData) {
    const wallet = await this.getWallet();
    return wallet.addTransaction({
        ...transactionData,
        isRevenue: true
    });
};

/**
 * Record expense from platform wallet
 */
PlatformWalletSchema.statics.recordExpense = async function (transactionData) {
    const wallet = await this.getWallet();
    return wallet.addTransaction({
        ...transactionData,
        isRevenue: false
    });
};

/**
 * Get revenue report for date range
 */
PlatformWalletSchema.statics.getRevenueReport = async function (startDate, endDate) {
    const wallet = await this.getWallet();

    const transactions = wallet.history.filter(t =>
        t.date >= startDate &&
        t.date <= endDate &&
        t.status === "completed"
    );

    const report = {
        period: { start: startDate, end: endDate },
        revenue: {
            giftFees: 0,
            contentFees: 0,
            subscriptionFees: 0,
            coinPurchases: 0,
            premiumUpgrades: 0,
            promotionFees: 0,
            withdrawalFees: 0,
            other: 0,
            total: 0
        },
        expenses: {
            refunds: 0,
            payouts: 0,
            stripeFees: 0,
            other: 0,
            total: 0
        },
        transactionCount: transactions.length
    };

    transactions.forEach(t => {
        const amount = Math.abs(t.amount);

        switch (t.type) {
            case "gift_fee":
                report.revenue.giftFees += amount;
                report.revenue.total += amount;
                break;
            case "content_fee":
                report.revenue.contentFees += amount;
                report.revenue.total += amount;
                break;
            case "subscription_fee":
                report.revenue.subscriptionFees += amount;
                report.revenue.total += amount;
                break;
            case "coin_purchase":
                report.revenue.coinPurchases += amount;
                report.revenue.total += amount;
                break;
            case "premium_upgrade":
                report.revenue.premiumUpgrades += amount;
                report.revenue.total += amount;
                break;
            case "promotion_fee":
                report.revenue.promotionFees += amount;
                report.revenue.total += amount;
                break;
            case "withdrawal_fee":
                report.revenue.withdrawalFees += amount;
                report.revenue.total += amount;
                break;
            case "refund":
                report.expenses.refunds += amount;
                report.expenses.total += amount;
                break;
            case "payout":
                report.expenses.payouts += amount;
                report.expenses.total += amount;
                break;
            case "stripe_fee":
                report.expenses.stripeFees += amount;
                report.expenses.total += amount;
                break;
            default:
                if (t.amount > 0) {
                    report.revenue.other += amount;
                    report.revenue.total += amount;
                } else {
                    report.expenses.other += amount;
                    report.expenses.total += amount;
                }
        }
    });

    report.netProfit = report.revenue.total - report.expenses.total;
    return report;
};

/**
 * Get dashboard stats
 */
PlatformWalletSchema.statics.getDashboardStats = async function () {
    const wallet = await this.getWallet();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Get today's transactions
    const todayTransactions = wallet.history.filter(t =>
        t.date >= today && t.status === "completed"
    );

    // Get this week's transactions
    const weekTransactions = wallet.history.filter(t =>
        t.date >= thisWeek && t.status === "completed"
    );

    // Get this month's transactions
    const monthTransactions = wallet.history.filter(t =>
        t.date >= thisMonth && t.status === "completed"
    );

    const calcTotals = (transactions) => {
        let revenue = 0, expenses = 0;
        transactions.forEach(t => {
            if (["refund", "payout", "stripe_fee"].includes(t.type)) {
                expenses += Math.abs(t.amount);
            } else if (t.amount > 0) {
                revenue += t.amount;
            }
        });
        return { revenue, expenses, profit: revenue - expenses };
    };

    return {
        balance: wallet.balance,
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        today: calcTotals(todayTransactions),
        thisWeek: calcTotals(weekTransactions),
        thisMonth: calcTotals(monthTransactions),
        lifetime: wallet.lifetimeStats,
        feeConfig: wallet.feeConfig
    };
};

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Add a transaction to the wallet
 */
PlatformWalletSchema.methods.addTransaction = async function (data) {
    const {
        amount,
        type,
        reason,
        fromUserId,
        fromUsername,
        toUserId,
        toUsername,
        isRevenue = true,
        ...rest
    } = data;

    // Calculate balance change
    const balanceChange = isRevenue ? Math.abs(amount) : -Math.abs(amount);
    const balanceBefore = this.balance;
    const balanceAfter = balanceBefore + balanceChange;

    // Create transaction record
    const transaction = {
        amount: balanceChange,
        type,
        reason,
        fromUserId,
        fromUsername,
        toUserId,
        toUsername,
        balanceBefore,
        balanceAfter,
        date: new Date(),
        status: "completed",
        ...rest
    };

    // Add to history (keep last 10000 transactions in document)
    this.history.push(transaction);
    if (this.history.length > 10000) {
        this.history = this.history.slice(-10000);
    }

    // Update balance
    this.balance = balanceAfter;
    this.availableBalance = balanceAfter;

    // Update lifetime stats
    if (isRevenue) {
        this.lifetimeStats.totalRevenue += Math.abs(amount);
        this.lifetimeStats.totalProfit += Math.abs(amount);

        // Update specific stats
        if (type === "gift_fee") this.lifetimeStats.totalGiftFees += Math.abs(amount);
        if (type === "content_fee") this.lifetimeStats.totalContentFees += Math.abs(amount);
        if (type === "coin_purchase") this.lifetimeStats.totalCoinPurchases += Math.abs(amount);
    } else {
        this.lifetimeStats.totalExpenses += Math.abs(amount);
        this.lifetimeStats.totalProfit -= Math.abs(amount);

        if (type === "refund") this.lifetimeStats.totalRefunds += Math.abs(amount);
        if (type === "payout") this.lifetimeStats.totalPayouts += Math.abs(amount);
    }

    this.lifetimeStats.totalTransactions += 1;

    // Update monthly stats
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (this.monthlyStats.month !== currentMonth || this.monthlyStats.year !== currentYear) {
        // Reset monthly stats for new month
        this.monthlyStats = {
            month: currentMonth,
            year: currentYear,
            revenue: 0,
            expenses: 0,
            profit: 0,
            transactionCount: 0
        };
    }

    if (isRevenue) {
        this.monthlyStats.revenue += Math.abs(amount);
        this.monthlyStats.profit += Math.abs(amount);
    } else {
        this.monthlyStats.expenses += Math.abs(amount);
        this.monthlyStats.profit -= Math.abs(amount);
    }
    this.monthlyStats.transactionCount += 1;

    this.updatedAt = new Date();
    await this.save();

    return transaction;
};

/**
 * Record gift fee
 */
PlatformWalletSchema.methods.recordGiftFee = async function (giftAmount, fromUserId, fromUsername, giftId) {
    const feeAmount = Math.floor(giftAmount * (this.feeConfig.giftFeePercent / 100));

    return this.addTransaction({
        amount: feeAmount,
        type: "gift_fee",
        reason: `${this.feeConfig.giftFeePercent}% fee on gift of ${giftAmount} coins`,
        fromUserId,
        fromUsername,
        relatedGiftId: giftId,
        isRevenue: true
    });
};

/**
 * Record content sale fee
 */
PlatformWalletSchema.methods.recordContentFee = async function (saleAmount, fromUserId, fromUsername, purchaseId) {
    const feeAmount = Math.floor(saleAmount * (this.feeConfig.contentFeePercent / 100));

    return this.addTransaction({
        amount: feeAmount,
        type: "content_fee",
        reason: `${this.feeConfig.contentFeePercent}% fee on content sale of €${(saleAmount / 100).toFixed(2)}`,
        fromUserId,
        fromUsername,
        relatedPurchaseId: purchaseId,
        isRevenue: true
    });
};

/**
 * Record coin purchase revenue
 */
PlatformWalletSchema.methods.recordCoinPurchase = async function (amount, fromUserId, fromUsername, stripePaymentId) {
    return this.addTransaction({
        amount,
        type: "coin_purchase",
        reason: `Coin purchase: €${(amount / 100).toFixed(2)}`,
        fromUserId,
        fromUsername,
        stripePaymentId,
        isRevenue: true
    });
};

/**
 * Record payout to creator
 */
PlatformWalletSchema.methods.recordPayout = async function (amount, toUserId, toUsername, paymentMethod) {
    return this.addTransaction({
        amount,
        type: "payout",
        reason: `Payout to ${toUsername} via ${paymentMethod}`,
        toUserId,
        toUsername,
        isRevenue: false
    });
};

/**
 * Record refund
 */
PlatformWalletSchema.methods.recordRefund = async function (amount, toUserId, toUsername, reason, stripeRefundId) {
    return this.addTransaction({
        amount,
        type: "refund",
        reason: `Refund: ${reason}`,
        toUserId,
        toUsername,
        stripeRefundId,
        isRevenue: false
    });
};

/**
 * Update fee configuration
 */
PlatformWalletSchema.methods.updateFeeConfig = async function (newConfig) {
    Object.assign(this.feeConfig, newConfig);
    this.updatedAt = new Date();
    return this.save();
};

/**
 * Get recent transactions
 */
PlatformWalletSchema.methods.getRecentTransactions = function (limit = 50) {
    return this.history
        .slice(-limit)
        .reverse();
};

/**
 * Get transactions by type
 */
PlatformWalletSchema.methods.getTransactionsByType = function (type, limit = 100) {
    return this.history
        .filter(t => t.type === type)
        .slice(-limit)
        .reverse();
};

// ===========================================
// EXPORT
// ===========================================
const PlatformWallet = mongoose.model("PlatformWallet", PlatformWalletSchema);

module.exports = PlatformWallet;
module.exports.PlatformWallet = PlatformWallet;
module.exports.PlatformWalletSchema = PlatformWalletSchema;
module.exports.PlatformTransactionSchema = PlatformTransactionSchema;
module.exports.DailySummarySchema = DailySummarySchema;