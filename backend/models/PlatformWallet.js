// backend/models/PlatformWallet.js
// World-Studio.live - Platform Wallet Model (UNIVERSE EDITION 🚀)
// Central platform revenue & fee tracking

const mongoose = require("mongoose");

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

// ===========================================
// HISTORY SUB-SCHEMA
// ===========================================

const historySchema = new Schema(
    {
        amount: { type: Number, required: true }, // positief = in, negatief = uit
        type: { type: String, default: "other" }, // gift_fee, pk_gift_fee, content_fee, payout, withdrawal, refund, manual_add, manual_deduct, ...
        fromUserId: { type: ObjectId, ref: "User" },
        fromUsername: { type: String },
        toUserId: { type: ObjectId, ref: "User" },
        toUsername: { type: String },
        giftId: { type: ObjectId, ref: "Gift" },
        streamId: { type: ObjectId, ref: "Stream" },
        postId: { type: ObjectId, ref: "Post" },
        reason: { type: String },
        metadata: { type: Schema.Types.Mixed },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "cancelled"],
            default: "completed",
        },
        balanceAfter: { type: Number },
        date: { type: Date, default: Date.now },
    },
    { _id: true }
);

// ===========================================
// MAIN SCHEMA
// ===========================================

const platformWalletSchema = new Schema(
    {
        identifier: {
            type: String,
            unique: true,
            required: true,
            index: true,
        },

        // Balances (in coins)
        balance: { type: Number, default: 0 }, // totaal saldo
        pendingBalance: { type: Number, default: 0 }, // bv. nog niet vrijgegeven
        reservedBalance: { type: Number, default: 0 }, // gereserveerd voor uitbetalingen
        currency: { type: String, default: "coins" },

        // Transaction history
        history: [historySchema],

        // Lifetime stats
        lifetimeStats: {
            totalRevenue: { type: Number, default: 0 },
            totalFees: { type: Number, default: 0 },
            totalPayouts: { type: Number, default: 0 },
            totalRefunds: { type: Number, default: 0 },
        },

        // Fee config
        feeConfig: {
            giftFeePercent: { type: Number, default: 15 },
            contentFeePercent: { type: Number, default: 15 },
            subscriptionFeePercent: { type: Number, default: 20 },
            withdrawalFeePercent: { type: Number, default: 0 },
            withdrawalFeeFixed: { type: Number, default: 0 },
            minWithdrawal: { type: Number, default: 1000 }, // bv. 1000 coins
            coinExchangeRate: { type: Number, default: 100 }, // 100 coins = €1
        },
    },
    {
        timestamps: true,
    }
);

// ===========================================
// STATIC HELPERS (CLASS METHODS)
// ===========================================

/**
 * Get or create the main platform wallet
 * Used by: routes + PK system (PlatformWallet.getWallet())
 */
platformWalletSchema.statics.getWallet = async function () {
    let wallet = await this.findOne({ identifier: "platform-main" });

    if (!wallet) {
        wallet = await this.create({
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
                coinExchangeRate: 100,
            },
            currency: "coins",
        });
    }

    return wallet;
};



// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Add a transaction to the platform wallet
 * Compatible met PK code:
 *   const wallet = await PlatformWallet.getWallet();
 *   await wallet.addTransaction({ amount, type: "pk_gift_fee", ... });
 */
platformWalletSchema.methods.addTransaction = async function (opts = {}) {
    const {
        amount,
        type = "other",
        reason,
        fromUserId,
        fromUsername,
        toUserId,
        toUsername,
        giftId,
        streamId,
        postId,
        metadata,
        status = "completed",

        // Flags voor automatische stats-logic
        isRevenue = false, // bv. fees, inkomsten
        isPayout = false,  // bv. uitbetalingen naar creators
        isRefund = false,  // bv. refunds
    } = opts;

    const numericAmount = Number(amount) || 0;
    if (!numericAmount) {
        return this;
    }

    // Bepaal delta richting wallet
    let delta = numericAmount;

    // Als expliciet payout/refund, altijd als negatieve cashflow loggen
    if (
        isPayout ||
        isRefund ||
        type === "payout" ||
        type === "withdrawal" ||
        type === "refund"
    ) {
        delta = -Math.abs(numericAmount);
    }

    // Werk balans bij
    this.balance = (this.balance || 0) + delta;

    // Zorg dat lifetimeStats bestaat
    this.lifetimeStats = this.lifetimeStats || {
        totalRevenue: 0,
        totalFees: 0,
        totalPayouts: 0,
        totalRefunds: 0,
    };

    // Revenue (fees, content-fees, etc.)
    if (isRevenue || delta > 0) {
        this.lifetimeStats.totalRevenue =
            (this.lifetimeStats.totalRevenue || 0) + Math.abs(delta);
    }

    // Fees
    if (
        type.includes("fee") ||
        type === "gift_fee" ||
        type === "pk_gift_fee" ||
        type === "content_fee"
    ) {
        this.lifetimeStats.totalFees =
            (this.lifetimeStats.totalFees || 0) + Math.abs(delta);
    }

    // Payouts / withdrawals
    if (isPayout || type === "payout" || type === "withdrawal") {
        this.lifetimeStats.totalPayouts =
            (this.lifetimeStats.totalPayouts || 0) + Math.abs(delta);
    }

    // Refunds
    if (isRefund || type === "refund") {
        this.lifetimeStats.totalRefunds =
            (this.lifetimeStats.totalRefunds || 0) + Math.abs(delta);
    }

    // Transactie in history pushen
    this.history.unshift({
        amount: delta, // wat er echt bij/af ging
        type,

        fromUserId,
        fromUsername,
        toUserId,
        toUsername,
        giftId,
        streamId,
        postId,
        reason: reason || `Platform transaction: ${type}`,
        metadata,
        status,
        balanceAfter: this.balance,
        date: new Date(),
    });

    // History limiter
    if (this.history.length > 10000) {
        this.history = this.history.slice(0, 10000);
    }

    await this.save();
    return this;
};

const PlatformWallet =
    mongoose.models.PlatformWallet ||
    mongoose.model("PlatformWallet", platformWalletSchema);

module.exports = PlatformWallet;
