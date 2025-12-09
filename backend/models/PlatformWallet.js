// backend/models/PlatformWallet.js
// World-Studio.live - Platform Wallet Model (UNIVERSE EDITION 🚀)


const mongoose = require("mongoose");

const PlatformTransactionSchema = new mongoose.Schema(
    {
        amount: { type: Number, required: true }, // + = inkomsten, - = uitgaven
        type: {
            type: String,
            default: "other", // bv: gift_fee, content_fee, subscription_fee, payout, withdrawal, refund, manual_add, manual_deduct, pk_gift_fee
        },
        fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        fromUsername: String,
        toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        toUsername: String,
        giftId: { type: mongoose.Schema.Types.ObjectId, ref: "Gift" },
        streamId: { type: mongoose.Schema.Types.ObjectId, ref: "Stream" },
        postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
        reason: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "cancelled"],
            default: "completed",
        },
        balanceAfter: { type: Number, default: 0 },
        metadata: { type: Object, default: {} },
        date: { type: Date, default: Date.now },
    },
    { _id: true }
);

const LifetimeStatsSchema = new mongoose.Schema(
    {
        totalRevenue: { type: Number, default: 0 }, // alle positieve bedragen (fees, manual add, etc.)
        totalFees: { type: Number, default: 0 }, // gift/content/subscription fees
        totalPayouts: { type: Number, default: 0 }, // uitbetaald aan creators
        totalRefunds: { type: Number, default: 0 }, // terugbetalingen
    },
    { _id: false }
);

const FeeConfigSchema = new mongoose.Schema(
    {
        giftFeePercent: { type: Number, default: 15 },
        contentFeePercent: { type: Number, default: 15 },
        subscriptionFeePercent: { type: Number, default: 20 },
        withdrawalFeePercent: { type: Number, default: 0 },
        withdrawalFeeFixed: { type: Number, default: 0 },
        minWithdrawal: { type: Number, default: 1000 }, // coins
        coinExchangeRate: { type: Number, default: 100 }, // 100 coins = €1
    },
    { _id: false }
);

const PlatformWalletSchema = new mongoose.Schema(
    {
        identifier: {
            type: String,
            default: "platform-main",
            unique: true,

            index: true,
        },

        // Balansen (in coins)
        balance: { type: Number, default: 0 }, // direct beschikbare platform-coins
        pendingBalance: { type: Number, default: 0 }, // bv. nog te bevestigen payments
        reservedBalance: { type: Number, default: 0 }, // gereserveerd voor payouts

        currency: { type: String, default: "coins" },




        lifetimeStats: {
            type: LifetimeStatsSchema,
            default: () => ({}),
        },


        feeConfig: {
            type: FeeConfigSchema,
            default: () => ({}),
        },

        history: {
            type: [PlatformTransactionSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// ===========================================
// STATIC: Haal of maak de hoofdwallet
// ===========================================
PlatformWalletSchema.statics.getWallet = async function () {
    let wallet = await this.findOne({ identifier: "platform-main" });

    if (!wallet) {
        wallet = await this.create({
            identifier: "platform-main",

        });
    }

    return wallet;
};



// ===========================================
// INSTANCE: Transactie toevoegen (Universe helper)
// ===========================================
PlatformWalletSchema.methods.addTransaction = async function (tx) {
    const amount = Number(tx.amount) || 0;

    // ✅ Balans updaten
    this.balance = (this.balance || 0) + amount;

    // ✅ Lifetime stats bijwerken
    this.lifetimeStats = this.lifetimeStats || {};
    // positieve bedragen zijn inkomsten / fees
    if (amount > 0) {
        this.lifetimeStats.totalRevenue =
            (this.lifetimeStats.totalRevenue || 0) + amount;

        // markeer als fee als type dat aangeeft
        if (
            tx.type === "gift_fee" ||
            tx.type === "content_fee" ||
            tx.type === "subscription_fee" ||
            tx.type === "pk_gift_fee"
        ) {
            this.lifetimeStats.totalFees =
                (this.lifetimeStats.totalFees || 0) + amount;
        }
    } else if (amount < 0) {
        // negatieve bedragen → payouts / refunds
        if (tx.type === "payout" || tx.type === "withdrawal") {
            this.lifetimeStats.totalPayouts =
                (this.lifetimeStats.totalPayouts || 0) +
                Math.abs(amount);
        } else if (tx.type === "refund") {
            this.lifetimeStats.totalRefunds =
                (this.lifetimeStats.totalRefunds || 0) +
                Math.abs(amount);
        }
    }

    const transaction = {
        amount,
        type: tx.type || "other",
        fromUserId: tx.fromUserId,
        fromUsername: tx.fromUsername,
        toUserId: tx.toUserId,
        toUsername: tx.toUsername,
        giftId: tx.giftId,
        streamId: tx.streamId,
        postId: tx.postId,
        reason: tx.reason || "",
        metadata: tx.metadata || {},
        status: tx.status || "completed",
        balanceAfter: this.balance,
        date: tx.date || new Date(),
    };

    this.history.unshift(transaction);

    // Max ±10.000 records zoals in je router
    if (this.history.length > 10000) {
        this.history = this.history.slice(0, 10000);
    }

    await this.save();
    return transaction;
};

const PlatformWallet = mongoose.model(
    "PlatformWallet",
    PlatformWalletSchema
);

module.exports = PlatformWallet;
module.exports.PlatformWallet = PlatformWallet;
