// backend/routes/wallet.js
// World-Studio.live - Wallet Routes
// Handles coin purchases, Stripe payments, withdrawals, and transfers

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Stripe = require("stripe");
const User = require("../models/User");
const PlatformWallet = require("../models/PlatformWallet");
const authMiddleware = require("../middleware/authMiddleware");
const requireAdmin = require("../middleware/requireAdmin");

// ===========================================
// CONFIGURATION
// ===========================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL || "https://world-studio.live";
const COIN_RATE = 100; // 100 coins = €1
const MIN_WITHDRAWAL = 1000;
const MAX_WITHDRAWAL = 100000;

// ===========================================
// COIN PACKAGES
// ===========================================

const COIN_PACKAGES = [
    { id: "starter", coins: 100, price: 499, label: "Starter Pack", bonus: 0, icon: "💰" },
    { id: "basic", coins: 250, price: 999, label: "Basic Pack", bonus: 25, icon: "💎" },
    { id: "popular", coins: 500, price: 1999, label: "Popular Pack", bonus: 50, popular: true, icon: "⭐" },
    { id: "value", coins: 1000, price: 3499, label: "Value Pack", bonus: 150, icon: "🏆" },
    { id: "premium", coins: 2500, price: 7999, label: "Premium Pack", bonus: 500, icon: "👑" },
    { id: "ultimate", coins: 5000, price: 14999, label: "Ultimate Pack", bonus: 1500, icon: "🚀" },
    { id: "mega", coins: 10000, price: 27999, label: "Mega Pack", bonus: 4000, icon: "🌟" },
];

// ===========================================
// HELPERS
// ===========================================

const formatPrice = (cents) => `€${(cents / 100).toFixed(2)}`;
const coinsToEur = (coins) => (coins / COIN_RATE).toFixed(2);

const ensureWallet = (user) => {
    if (!user.wallet) {
        user.wallet = { balance: 0, totalReceived: 0, totalSpent: 0, totalEarned: 0, totalWithdrawn: 0, transactions: [] };
    }
    if (!user.wallet.transactions) user.wallet.transactions = [];
    return user;
};

const addTransaction = (user, tx) => {
    user.wallet.transactions.unshift({ ...tx, createdAt: new Date() });
    if (user.wallet.transactions.length > 500) {
        user.wallet.transactions = user.wallet.transactions.slice(0, 500);
    }
};

// ===========================================
// PUBLIC ROUTES
// ===========================================

/**
 * GET /api/wallet/packages
 */
router.get("/packages", (req, res) => {
    const packages = COIN_PACKAGES.map(pkg => ({
        ...pkg,
        totalCoins: pkg.coins + pkg.bonus,
        priceFormatted: formatPrice(pkg.price),
        bonusPercent: pkg.bonus > 0 ? Math.round((pkg.bonus / pkg.coins) * 100) : 0
    }));

    res.json({
        success: true,
        packages,
        exchangeRate: `${COIN_RATE} coins = €1`,
        minWithdrawal: MIN_WITHDRAWAL
    });
});

/**
 * GET /api/wallet/exchange-rate
 */
router.get("/exchange-rate", (req, res) => {
    res.json({
        success: true,
        rate: COIN_RATE,
        minWithdrawal: MIN_WITHDRAWAL,
        maxWithdrawal: MAX_WITHDRAWAL
    });
});

// ===========================================
// WALLET INFO
// ===========================================

/**
 * GET /api/wallet
 */
router.get("/", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("wallet");
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const wallet = user.wallet || {};
        const balance = wallet.balance || 0;

        res.json({
            success: true,
            balance,
            balanceEur: coinsToEur(balance),
            totalReceived: wallet.totalReceived || 0,
            totalSpent: wallet.totalSpent || 0,
            totalEarned: wallet.totalEarned || 0,
            totalWithdrawn: wallet.totalWithdrawn || 0,
            canWithdraw: balance >= MIN_WITHDRAWAL,
            minWithdrawal: MIN_WITHDRAWAL
        });
    } catch (err) {
        console.error("❌ Wallet fetch error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch wallet" });
    }
});

/**
 * GET /api/wallet/transactions
 */
router.get("/transactions", authMiddleware, async (req, res) => {
    try {
        const { limit = 50, skip = 0, type } = req.query;
        const user = await User.findById(req.userId).select("wallet");
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        let transactions = user.wallet?.transactions || [];
        if (type && type !== "all") transactions = transactions.filter(t => t.type === type);
        transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = transactions.length;
        transactions = transactions.slice(parseInt(skip), parseInt(skip) + parseInt(limit));

        res.json({
            success: true,
            transactions,
            pagination: { total, limit: parseInt(limit), skip: parseInt(skip), hasMore: parseInt(skip) + transactions.length < total }
        });
    } catch (err) {
        console.error("❌ Transactions error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch transactions" });
    }
});

/**
 * GET /api/wallet/stats
 */
router.get("/stats", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("wallet");
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const transactions = user.wallet?.transactions || [];
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisMonthTxs = transactions.filter(t => new Date(t.createdAt) >= thisMonth);
        const received = thisMonthTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const spent = thisMonthTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

        res.json({
            success: true,
            stats: {
                balance: user.wallet?.balance || 0,
                totalReceived: user.wallet?.totalReceived || 0,
                totalSpent: user.wallet?.totalSpent || 0,
                totalEarned: user.wallet?.totalEarned || 0,
                totalWithdrawn: user.wallet?.totalWithdrawn || 0,
                thisMonth: { received, spent }
            }
        });
    } catch (err) {
        console.error("❌ Stats error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
});

// ===========================================
// STRIPE CHECKOUT
// ===========================================

/**
 * POST /api/wallet/checkout
 */
router.post("/checkout", authMiddleware, async (req, res) => {
    try {
        const { packageId } = req.body;
        const pkg = COIN_PACKAGES.find(p => p.id === packageId);
        if (!pkg) return res.status(400).json({ success: false, error: "Invalid package" });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const totalCoins = pkg.coins + pkg.bonus;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card", "ideal", "bancontact"],
            mode: "payment",
            customer_email: user.email,
            client_reference_id: req.userId.toString(),
            metadata: {
                userId: req.userId.toString(),
                username: user.username,
                packageId: pkg.id,
                coins: totalCoins.toString()
            },
            line_items: [{
                price_data: {
                    currency: "eur",
                    product_data: {
                        name: pkg.label,
                        description: `${totalCoins} WS-Coins${pkg.bonus > 0 ? ` (${pkg.coins} + ${pkg.bonus} bonus)` : ""}`
                    },
                    unit_amount: pkg.price
                },
                quantity: 1
            }],
            success_url: `${FRONTEND_URL}/wallet?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/wallet?canceled=true`
        });

        console.log(`💳 Checkout: ${pkg.label} for ${user.username}`);
        res.json({ success: true, url: session.url, sessionId: session.id });
    } catch (err) {
        console.error("❌ Checkout error:", err);
        res.status(500).json({ success: false, error: "Failed to create checkout" });
    }
});

/**
 * POST /api/wallet/verify-payment
 */
router.post("/verify-payment", authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ success: false, error: "Session ID required" });

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) return res.status(404).json({ success: false, error: "Session not found" });
        if (session.payment_status !== "paid") {
            return res.status(400).json({ success: false, error: "Payment not completed" });
        }

        const userId = session.metadata?.userId || session.client_reference_id;
        if (userId !== req.userId.toString()) {
            return res.status(403).json({ success: false, error: "Session mismatch" });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        ensureWallet(user);

        const alreadyProcessed = user.wallet.transactions.some(t => t.stripeSessionId === sessionId);
        if (alreadyProcessed) {
            return res.json({ success: true, message: "Already processed", balance: user.wallet.balance, alreadyProcessed: true });
        }

        const coins = parseInt(session.metadata?.coins) || 0;
        if (coins <= 0) return res.status(400).json({ success: false, error: "Invalid coins" });

        const pkg = COIN_PACKAGES.find(p => p.id === session.metadata?.packageId);

        user.wallet.balance += coins;
        user.wallet.totalReceived = (user.wallet.totalReceived || 0) + coins;

        addTransaction(user, {
            type: "purchase",
            amount: coins,
            description: `Purchased ${pkg?.label || coins + " coins"}`,
            stripeSessionId: sessionId,
            status: "completed"
        });

        await user.save();

        const io = req.app.get("io");
        if (io) io.to(`user_${req.userId}`).emit("wallet_update", { balance: user.wallet.balance, change: coins });

        console.log(`✅ +${coins} coins for ${user.username}`);
        res.json({ success: true, message: `${coins} coins added!`, balance: user.wallet.balance, coinsAdded: coins });
    } catch (err) {
        console.error("❌ Verify error:", err);
        res.status(500).json({ success: false, error: "Verification failed" });
    }
});

// ===========================================
// STRIPE WEBHOOK
// ===========================================

/**
 * POST /api/wallet/webhook
 */
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        if (webhookSecret && sig) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        }
    } catch (err) {
        console.error("❌ Webhook error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📨 Webhook: ${event.type}`);

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        try {
            const userId = session.metadata?.userId || session.client_reference_id;
            const coins = parseInt(session.metadata?.coins) || 0;

            if (userId && coins > 0) {
                const user = await User.findById(userId);
                if (user) {
                    ensureWallet(user);
                    const alreadyProcessed = user.wallet.transactions.some(t => t.stripeSessionId === session.id);

                    if (!alreadyProcessed) {
                        user.wallet.balance += coins;
                        user.wallet.totalReceived = (user.wallet.totalReceived || 0) + coins;

                        addTransaction(user, {
                            type: "purchase",
                            amount: coins,
                            description: `Purchased ${coins} coins`,
                            stripeSessionId: session.id,
                            status: "completed"
                        });

                        await user.save();
                        console.log(`✅ [WEBHOOK] +${coins} for ${user.username}`);
                    }
                }
            }
        } catch (err) {
            console.error("❌ Webhook process error:", err);
        }
    }

    res.json({ received: true });
});

// ===========================================
// TRANSFER
// ===========================================

/**
 * POST /api/wallet/transfer
 */
router.post("/transfer", authMiddleware, async (req, res) => {
    try {
        const { recipientId, recipientUsername, amount, message } = req.body;

        if (!amount || amount < 1) return res.status(400).json({ success: false, error: "Invalid amount" });
        if (amount > 100000) return res.status(400).json({ success: false, error: "Max transfer: 100,000" });

        let recipient;
        if (recipientId) recipient = await User.findById(recipientId);
        else if (recipientUsername) {
            recipient = await User.findOne({ username: { $regex: new RegExp(`^${recipientUsername}$`, "i") } });
        }

        if (!recipient) return res.status(404).json({ success: false, error: "Recipient not found" });
        if (recipient._id.toString() === req.userId.toString()) {
            return res.status(400).json({ success: false, error: "Cannot transfer to self" });
        }

        const sender = await User.findById(req.userId);
        ensureWallet(sender);

        if (sender.wallet.balance < amount) {
            return res.status(400).json({ success: false, error: "Insufficient balance" });
        }

        ensureWallet(recipient);

        // Deduct from sender
        sender.wallet.balance -= amount;
        sender.wallet.totalSpent = (sender.wallet.totalSpent || 0) + amount;
        addTransaction(sender, {
            type: "transfer_sent",
            amount: -amount,
            description: `Transfer to @${recipient.username}`,
            relatedUserId: recipient._id,
            message: message?.substring(0, 200),
            status: "completed"
        });

        // Add to recipient
        recipient.wallet.balance += amount;
        recipient.wallet.totalReceived = (recipient.wallet.totalReceived || 0) + amount;
        addTransaction(recipient, {
            type: "transfer_received",
            amount,
            description: `Transfer from @${sender.username}`,
            relatedUserId: sender._id,
            message: message?.substring(0, 200),
            status: "completed"
        });

        // Notification
        recipient.notifications = recipient.notifications || [];
        recipient.notifications.unshift({
            message: `@${sender.username} sent you ${amount} coins`,
            type: "transfer",
            fromUser: sender._id,
            amount,
            read: false,
            createdAt: new Date()
        });
        recipient.unreadNotifications = (recipient.unreadNotifications || 0) + 1;

        await Promise.all([sender.save(), recipient.save()]);

        const io = req.app.get("io");
        if (io) {
            io.to(`user_${recipient._id}`).emit("wallet_update", { balance: recipient.wallet.balance, change: amount });
            io.to(`user_${recipient._id}`).emit("notification", { type: "transfer", amount });
        }

        console.log(`💸 Transfer: ${amount} from ${sender.username} to ${recipient.username}`);
        res.json({ success: true, message: `Sent ${amount} to @${recipient.username}`, newBalance: sender.wallet.balance });
    } catch (err) {
        console.error("❌ Transfer error:", err);
        res.status(500).json({ success: false, error: "Transfer failed" });
    }
});

// ===========================================
// WITHDRAWAL
// ===========================================

/**
 * POST /api/wallet/withdraw
 */
router.post("/withdraw", authMiddleware, async (req, res) => {
    try {
        const { amount, method, accountDetails } = req.body;

        if (!amount || amount < MIN_WITHDRAWAL) {
            return res.status(400).json({ success: false, error: `Minimum: ${MIN_WITHDRAWAL} coins` });
        }
        if (amount > MAX_WITHDRAWAL) {
            return res.status(400).json({ success: false, error: `Maximum: ${MAX_WITHDRAWAL} coins` });
        }

        const validMethods = ["paypal", "bank", "ideal", "wise"];
        if (!validMethods.includes(method)) {
            return res.status(400).json({ success: false, error: "Invalid method" });
        }

        if (!accountDetails?.email && !accountDetails?.iban) {
            return res.status(400).json({ success: false, error: "Account details required" });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        ensureWallet(user);

        if (user.wallet.balance < amount) {
            return res.status(400).json({ success: false, error: "Insufficient balance" });
        }

        const eurAmount = coinsToEur(amount);

        user.wallet.balance -= amount;
        user.wallet.totalWithdrawn = (user.wallet.totalWithdrawn || 0) + amount;

        addTransaction(user, {
            type: "withdrawal",
            amount: -amount,
            description: `Withdrawal: €${eurAmount} via ${method}`,
            method,
            accountDetails: {
                email: accountDetails.email?.substring(0, 100),
                iban: accountDetails.iban?.substring(0, 50),
                name: accountDetails.name?.substring(0, 100)
            },
            eurAmount: parseFloat(eurAmount),
            status: "pending"
        });

        await user.save();

        console.log(`💳 Withdrawal: €${eurAmount} by ${user.username}`);
        res.json({
            success: true,
            message: `€${eurAmount} will be sent within 3-5 days`,
            newBalance: user.wallet.balance,
            eurAmount
        });
    } catch (err) {
        console.error("❌ Withdrawal error:", err);
        res.status(500).json({ success: false, error: "Withdrawal failed" });
    }
});

/**
 * GET /api/wallet/withdrawals
 */
router.get("/withdrawals", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("wallet");
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const withdrawals = (user.wallet?.transactions || [])
            .filter(t => t.type === "withdrawal")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, withdrawals, count: withdrawals.length });
    } catch (err) {
        console.error("❌ Get withdrawals error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch" });
    }
});

// ===========================================
// ADMIN
// ===========================================

/**
 * POST /api/wallet/admin/add-coins
 */
router.post("/admin/add-coins", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { targetUserId, targetUsername, amount, reason } = req.body;
        if (!amount || amount < 1) return res.status(400).json({ success: false, error: "Invalid amount" });

        let user;
        if (targetUserId) user = await User.findById(targetUserId);
        else if (targetUsername) {
            user = await User.findOne({ username: { $regex: new RegExp(`^${targetUsername}$`, "i") } });
        }

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        ensureWallet(user);
        user.wallet.balance += amount;
        user.wallet.totalReceived = (user.wallet.totalReceived || 0) + amount;

        addTransaction(user, {
            type: "admin_add",
            amount,
            description: reason || `Admin added ${amount} coins`,
            adminId: req.userId,
            status: "completed"
        });

        await user.save();

        console.log(`👑 Admin +${amount} to ${user.username}`);
        res.json({ success: true, message: `Added ${amount} to @${user.username}`, newBalance: user.wallet.balance });
    } catch (err) {
        console.error("❌ Admin add error:", err);
        res.status(500).json({ success: false, error: "Failed" });
    }
});

/**
 * POST /api/wallet/admin/deduct-coins
 */
router.post("/admin/deduct-coins", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { targetUserId, targetUsername, amount, reason } = req.body;
        if (!amount || amount < 1) return res.status(400).json({ success: false, error: "Invalid amount" });

        let user;
        if (targetUserId) user = await User.findById(targetUserId);
        else if (targetUsername) {
            user = await User.findOne({ username: { $regex: new RegExp(`^${targetUsername}$`, "i") } });
        }

        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        ensureWallet(user);
        user.wallet.balance = Math.max(0, user.wallet.balance - amount);

        addTransaction(user, {
            type: "admin_deduct",
            amount: -amount,
            description: reason || `Admin deducted ${amount} coins`,
            adminId: req.userId,
            status: "completed"
        });

        await user.save();

        console.log(`👑 Admin -${amount} from ${user.username}`);
        res.json({ success: true, message: `Deducted ${amount} from @${user.username}`, newBalance: user.wallet.balance });
    } catch (err) {
        console.error("❌ Admin deduct error:", err);
        res.status(500).json({ success: false, error: "Failed" });
    }
});

/**
 * GET /api/wallet/admin/pending-withdrawals
 */
router.get("/admin/pending-withdrawals", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({
            "wallet.transactions": { $elemMatch: { type: "withdrawal", status: "pending" } }
        }).select("username email wallet.transactions");

        const pending = [];
        for (const user of users) {
            const userPending = user.wallet?.transactions?.filter(t => t.type === "withdrawal" && t.status === "pending") || [];
            userPending.forEach(w => pending.push({ userId: user._id, username: user.username, email: user.email, ...w.toObject() }));
        }

        pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        res.json({ success: true, withdrawals: pending, count: pending.length });
    } catch (err) {
        console.error("❌ Get pending error:", err);
        res.status(500).json({ success: false, error: "Failed" });
    }
});

/**
 * POST /api/wallet/admin/process-withdrawal
 */
router.post("/admin/process-withdrawal", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { userId, transactionId, status, note } = req.body;

        if (!["completed", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, error: "Status: completed or rejected" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const tx = user.wallet?.transactions?.id(transactionId);
        if (!tx || tx.type !== "withdrawal" || tx.status !== "pending") {
            return res.status(400).json({ success: false, error: "Invalid transaction" });
        }

        tx.status = status;
        tx.processedAt = new Date();
        tx.processedBy = req.userId;
        if (note) tx.adminNote = note;

        if (status === "rejected") {
            const refund = Math.abs(tx.amount);
            user.wallet.balance += refund;
            user.wallet.totalWithdrawn = Math.max(0, (user.wallet.totalWithdrawn || 0) - refund);

            addTransaction(user, {
                type: "withdrawal_refund",
                amount: refund,
                description: `Refund: ${note || "Rejected"}`,
                status: "completed"
            });
        }

        await user.save();

        console.log(`👑 Withdrawal ${status}: ${transactionId}`);
        res.json({ success: true, message: `Withdrawal ${status}`, newBalance: user.wallet.balance });
    } catch (err) {
        console.error("❌ Process error:", err);
        res.status(500).json({ success: false, error: "Failed" });
    }
});

module.exports = router;