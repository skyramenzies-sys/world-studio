// backend/models/User.js
// World-Studio.live - User Model
// Core user model with wallet, notifications, stats, social & moderation (UNIVERSE EDITION 🌌)

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ===========================================
// SUB-SCHEMAS
// ===========================================

/**
 * Notification Schema
 */
const NotificationSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            required: true,
            maxLength: 500,
        },
        type: {
            type: String,
            enum: [
                "follow",
                "like",
                "comment",
                "gift",
                "live",
                "mention",
                "system",
                "purchase",
                "pk_challenge",
                "pk_result",
                "subscription",
                "payout",
                "warning",
                "achievement",
            ],
            default: "system",
        },
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        fromUsername: String,
        fromAvatar: String,
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        },
        streamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stream",
        },
        pkId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PK",
        },
        giftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Gift",
        },
        amount: {
            type: Number,
        },
        icon: String,
        actionUrl: String,
        read: {
            type: Boolean,
            default: false,
        },
        readAt: Date,
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

/**
 * Wallet Transaction Schema
 */
const WalletTransactionSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "purchase",
                "topup",
                "withdraw",
                "gift_sent",
                "gift_received",
                "pk_reward",
                "pk_loss",
                "content_sale",
                "content_purchase",
                "subscription_received",
                "subscription_payment",
                "refund",
                "bonus",
                "promotion",
                "adjustment",
                "payout",
            ],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            maxLength: 200,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "cancelled", "processing"],
            default: "completed",
        },

        // Related entities
        relatedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        relatedUsername: String,
        giftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Gift",
        },
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
        },
        streamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stream",
        },
        pkId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PK",
        },

        // Payment processor
        stripePaymentId: String,
        paypalTransactionId: String,

        // Balance tracking
        balanceBefore: Number,
        balanceAfter: Number,

        // Metadata
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

/**
 * Wallet Schema
 */
const WalletSchema = new mongoose.Schema(
    {
        balance: {
            type: Number,
            default: 0,
            min: 0,
        },
        pendingBalance: {
            type: Number,
            default: 0,
        },
        totalReceived: {
            type: Number,
            default: 0,
        },
        totalSpent: {
            type: Number,
            default: 0,
        },
        totalEarned: {
            type: Number,
            default: 0,
        },
        totalWithdrawn: {
            type: Number,
            default: 0,
        },
        lifetimeBalance: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            default: "coins",
        },
        transactions: {
            type: [WalletTransactionSchema],
            default: [],
        },
        lastTransaction: Date,
    },
    { _id: false }
);

/**
 * Stats Schema (PK, Gifts, Streaming)
 */
const StatsSchema = new mongoose.Schema(
    {
        // PK Battle Stats
        pkWins: { type: Number, default: 0 },
        pkLosses: { type: Number, default: 0 },
        pkDraws: { type: Number, default: 0 },
        pkStreak: { type: Number, default: 0 },
        pkBestStreak: { type: Number, default: 0 },
        pkTotalBattles: { type: Number, default: 0 },
        pkWinRate: { type: Number, default: 0 },

        // Gift Stats
        totalGiftsSent: { type: Number, default: 0 },
        totalGiftsReceived: { type: Number, default: 0 },
        totalGiftsSentValue: { type: Number, default: 0 },
        totalGiftsReceivedValue: { type: Number, default: 0 },
        uniqueGifters: { type: Number, default: 0 },

        // Streaming Stats
        totalLiveMinutes: { type: Number, default: 0 },
        totalStreams: { type: Number, default: 0 },
        totalStreamViewers: { type: Number, default: 0 },
        peakViewers: { type: Number, default: 0 },
        avgViewers: { type: Number, default: 0 },

        // Content Stats
        totalPosts: { type: Number, default: 0 },
        totalPostViews: { type: Number, default: 0 },
        totalPostLikes: { type: Number, default: 0 },
        totalSales: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },

        // Engagement
        totalComments: { type: Number, default: 0 },
        totalShares: { type: Number, default: 0 },
    },
    { _id: false }
);

/**
 * Social Links Schema
 */
const SocialLinksSchema = new mongoose.Schema(
    {
        website: String,
        twitter: String,
        instagram: String,
        youtube: String,
        tiktok: String,
        discord: String,
        telegram: String,
        twitch: String,
    },
    { _id: false }
);

/**
 * Settings Schema
 */
const SettingsSchema = new mongoose.Schema(
    {
        // Privacy
        profileVisibility: {
            type: String,
            enum: ["public", "followers", "private"],
            default: "public",
        },
        showOnlineStatus: { type: Boolean, default: true },
        allowMessages: {
            type: String,
            enum: ["everyone", "followers", "none"],
            default: "everyone",
        },
        allowGifts: { type: Boolean, default: true },

        // Notifications
        emailNotifications: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: true },
        notifyFollows: { type: Boolean, default: true },
        notifyLikes: { type: Boolean, default: true },
        notifyComments: { type: Boolean, default: true },
        notifyGifts: { type: Boolean, default: true },

        // Stream
        defaultStreamPrivacy: {
            type: String,
            enum: ["public", "followers", "subscribers"],
            default: "public",
        },
        autoSaveRecordings: { type: Boolean, default: false },

        // Content
        showNSFW: { type: Boolean, default: false },
        language: { type: String, default: "en" },
        theme: { type: String, default: "dark" },
    },
    { _id: false }
);

/**
 * Withdrawal Info Schema
 */
const WithdrawalInfoSchema = new mongoose.Schema(
    {
        method: {
            type: String,
            enum: ["paypal", "bank", "crypto"],
            default: "paypal",
        },
        paypalEmail: String,
        bankName: String,
        bankAccount: String,
        bankRouting: String,
        bankSwift: String,
        cryptoWallet: String,
        cryptoType: String,
        isVerified: { type: Boolean, default: false },
    },
    { _id: false }
);

/**
 * Moderation Event Schema (robot log)
 */
const ModerationEventSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: ["warning", "temp_ban", "permanent_ban", "unban"],
            required: true,
        },
        reason: {
            type: String,
            maxLength: 500,
        },
        durationSeconds: {
            type: Number, // 0 = alleen warning, -1 = permanent
        },
        moderator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        moderatorUsername: String,
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

// ===========================================
// MAIN USER SCHEMA
// ===========================================
const UserSchema = new mongoose.Schema(
    {
        // Basic Info
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minLength: 3,
            maxLength: 30,
            match: /^[a-zA-Z0-9_]+$/,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minLength: 6,
        },

        // Profile
        displayName: {
            type: String,

        },
        avatar: {
            type: String,

        },
        avatarPublicId: String,
        coverImage: {
            type: String,

        },
        bio: {
            type: String,

        },
        location: String,
        website: String,
        birthDate: Date,
        gender: {
            type: String,
            enum: ["male", "female", "other", "prefer_not_to_say"],
        },

        // Role & Verification
        role: {
            type: String,
            enum: ["user", "creator", "moderator", "admin"],
            default: "creator",
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verifiedAt: Date,
        verificationBadge: {
            type: String,
            enum: ["none", "creator", "partner", "celebrity", "brand"],
            default: "none",
        },

        // Account Status
        isBanned: {
            type: Boolean,
            default: false,
        },
        banReason: String,
        bannedAt: Date,
        bannedUntil: Date,

        // Moderation Robot
        isPermanentBan: {
            type: Boolean,
            default: false,
        },
        moderationStrikes: {
            type: Number,
            default: 0,
        },
        lastViolationAt: Date,
        moderationHistory: {
            type: [ModerationEventSchema],
            default: [],
        },

        isDeactivated: {
            type: Boolean,
            default: false,
        },
        deactivatedAt: Date,

        // Email Verification
        emailVerified: {
            type: Boolean,
            default: false,
        },
        emailVerificationToken: String,
        emailVerificationExpires: Date,

        // Password Reset
        resetPasswordToken: String,
        resetPasswordExpires: Date,

        // Live Status
        isLive: {
            type: Boolean,
            default: false,
        },
        currentStreamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stream",
        },
        lastStreamedAt: Date,

        // Social
        followers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: [],
            },
        ],
        following: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: [],
            },
        ],
        followersCount: {
            type: Number,
            default: 0,
        },
        followingCount: {
            type: Number,
            default: 0,
        },
        blockedUsers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],

        // Social Links
        socialLinks: {
            type: SocialLinksSchema,
            default: () => ({}),
        },

        // Notifications
        notifications: {
            type: [NotificationSchema],
            default: [],
        },
        unreadNotifications: {
            type: Number,
            default: 0,
        },

        // Wallet
        wallet: {
            type: WalletSchema,
            default: () => ({
                balance: 0,
                totalReceived: 0,
                totalSpent: 0,
                transactions: [],
            }),
        },

        // Withdrawal Info
        withdrawalInfo: {
            type: WithdrawalInfoSchema,
            default: () => ({}),
        },

        // Stats
        stats: {
            type: StatsSchema,
            default: () => ({}),
        },

        // Settings
        settings: {
            type: SettingsSchema,
            default: () => ({}),
        },

        // Premium/Subscription
        isPremium: {
            type: Boolean,
            default: false,
        },
        premiumTier: {
            type: String,
            enum: ["free", "basic", "pro", "vip"],
            default: "free",
        },
        premiumExpiresAt: Date,
        stripeCustomerId: String,
        stripeSubscriptionId: String,

        // Activity
        lastSeen: {
            type: Date,
        },
        lastActive: Date,
        lastLogin: Date,
        lastIp: String,
        loginCount: {
            type: Number,
            default: 0,
        },

        // Device tokens for push notifications
        deviceTokens: [
            {
                token: String,
                platform: { type: String, enum: ["ios", "android", "web"] },
                addedAt: { type: Date, default: Date.now },
            },
        ],

        // Two-Factor Auth
        twoFactorEnabled: {
            type: Boolean,
            default: false,
        },
        twoFactorSecret: String,

        // OAuth
        googleId: String,
        appleId: String,
        facebookId: String,

        // Referral
        referralCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        referralCount: {
            type: Number,
            default: 0,
        },

        // Metadata
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ===========================================
// INDEXES
// ===========================================

// Let op: username, email en referralCode hebben al 'unique: true' in het veld zelf.
// Mongoose maakt daarvoor automatisch indexes aan.
// Daarom hier GEEN extra duplicate index-definities meer.

UserSchema.index({ role: 1 });
UserSchema.index({ isLive: 1 });
UserSchema.index({ isBanned: 1 });
UserSchema.index({ isVerified: 1 });
UserSchema.index({ followersCount: -1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastSeen: -1 });
UserSchema.index({ "wallet.balance": -1 });


// Text search
UserSchema.index({
    username: "text",
    displayName: "text",
    bio: "text"
});


// ===========================================
// VIRTUALS
// ===========================================

// Profile URL
UserSchema.virtual("profileUrl").get(function () {
    return `https://world-studio.live/profile/${this._id}`;
});

// Display name or username
UserSchema.virtual("name").get(function () {
    return this.displayName || this.username;
});

// Is admin
UserSchema.virtual("isAdmin").get(function () {
    return this.role === "admin" || this.email === "menziesalm@gmail.com";
});

// Is moderator or above
UserSchema.virtual("isModerator").get(function () {
    return ["admin", "moderator"].includes(this.role);
});

// Is creator or above
UserSchema.virtual("isCreator").get(function () {
    return ["admin", "moderator", "creator"].includes(this.role);
});

// PK win rate
UserSchema.virtual("pkWinRate").get(function () {
    const wins = this.stats?.pkWins || 0;
    const losses = this.stats?.pkLosses || 0;
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
});

// ===========================================
// PRE-SAVE MIDDLEWARE
// ===========================================
UserSchema.pre("save", async function (next) {
    // Hash password if modified
    if (this.isModified("password")) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    // Update follower/following counts
    if (this.isModified("followers")) {
        this.followersCount = this.followers?.length || 0;
    }
    if (this.isModified("following")) {
        this.followingCount = this.following?.length || 0;
    }

    // Update unread notifications count
    if (this.isModified("notifications")) {
        this.unreadNotifications =
            this.notifications?.filter((n) => !n.read).length || 0;
    }

    // Generate referral code if not set
    if (!this.referralCode && this.isNew) {
        this.referralCode = `WS${this._id.toString().slice(-6).toUpperCase()}`;
    }

    // Update PK win rate & total battles
    if (
        this.isModified("stats.pkWins") ||
        this.isModified("stats.pkLosses") ||
        this.isModified("stats.pkDraws")
    ) {
        const wins = this.stats?.pkWins || 0;
        const losses = this.stats?.pkLosses || 0;
        const draws = this.stats?.pkDraws || 0;
        const total = wins + losses + draws;

        this.stats.pkTotalBattles = total;
        this.stats.pkWinRate =
            wins + losses > 0
                ? Math.round((wins / (wins + losses)) * 100)
                : 0;
    }

    this.updatedAt = new Date();
    next();
});

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Compare password
 */
UserSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

/**
 * Add notification
 */
UserSchema.methods.addNotification = async function (notification) {
    this.notifications.unshift({
        ...notification,
        createdAt: new Date(),
    });

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
        this.notifications = this.notifications.slice(0, 100);
    }

    this.unreadNotifications = this.notifications.filter((n) => !n.read).length;
    return this.save();
};

/**
 * Mark notifications as read
 */
UserSchema.methods.markNotificationsRead = async function (
    notificationIds = null
) {
    const now = new Date();

    if (notificationIds) {
        this.notifications.forEach((n) => {
            if (notificationIds.includes(n._id.toString())) {
                n.read = true;
                n.readAt = now;
            }
        });
    } else {
        // Mark all as read
        this.notifications.forEach((n) => {
            if (!n.read) {
                n.read = true;
                n.readAt = now;
            }
        });
    }

    this.unreadNotifications = this.notifications.filter((n) => !n.read).length;
    return this.save();
};

/**
 * Add wallet transaction
 */
UserSchema.methods.addTransaction = async function (transaction) {
    const balanceBefore = this.wallet.balance;

    // Update balance
    if (
        [
            "topup",
            "gift_received",
            "pk_reward",
            "content_sale",
            "subscription_received",
            "bonus",
            "refund",
        ].includes(transaction.type)
    ) {
        this.wallet.balance += Math.abs(transaction.amount);
        this.wallet.totalReceived += Math.abs(transaction.amount);
        if (
            ["content_sale", "subscription_received", "gift_received"].includes(
                transaction.type
            )
        ) {
            this.wallet.totalEarned += Math.abs(transaction.amount);
        }
    } else if (
        [
            "purchase",
            "gift_sent",
            "content_purchase",
            "subscription_payment",
            "withdraw",
            "payout",
        ].includes(transaction.type)
    ) {
        this.wallet.balance -= Math.abs(transaction.amount);
        this.wallet.totalSpent += Math.abs(transaction.amount);
        if (["withdraw", "payout"].includes(transaction.type)) {
            this.wallet.totalWithdrawn += Math.abs(transaction.amount);
        }
    }

    // Ensure balance doesn't go negative
    if (this.wallet.balance < 0) this.wallet.balance = 0;

    // Update lifetime balance
    this.wallet.lifetimeBalance = Math.max(
        this.wallet.lifetimeBalance,
        this.wallet.balance
    );

    // Add transaction record
    this.wallet.transactions.unshift({
        ...transaction,
        balanceBefore,
        balanceAfter: this.wallet.balance,
        createdAt: new Date(),
    });

    // Keep only last 500 transactions
    if (this.wallet.transactions.length > 500) {
        this.wallet.transactions = this.wallet.transactions.slice(0, 500);
    }

    this.wallet.lastTransaction = new Date();
    return this.save();
};

/**
 * Check if has enough balance
 */
UserSchema.methods.hasBalance = function (amount) {
    return this.wallet.balance >= amount;
};

/**
 * Follow user
 */
UserSchema.methods.follow = async function (userId) {
    if (!this.following.some((id) => id.toString() === userId.toString())) {
        this.following.push(userId);
        this.followingCount = this.following.length;
        return this.save();
    }
    return this;
};

/**
 * Unfollow user
 */
UserSchema.methods.unfollow = async function (userId) {
    this.following = this.following.filter(
        (id) => id.toString() !== userId.toString()
    );
    this.followingCount = this.following.length;
    return this.save();
};

/**
 * Check if following
 */
UserSchema.methods.isFollowing = function (userId) {
    return this.following.some((id) => id.toString() === userId.toString());
};

/**
 * Block user
 */
UserSchema.methods.blockUser = async function (userId) {
    if (!this.blockedUsers.some((id) => id.toString() === userId.toString())) {
        this.blockedUsers.push(userId);
        // Also unfollow
        this.following = this.following.filter(
            (id) => id.toString() !== userId.toString()
        );
        return this.save();
    }
    return this;
};

/**
 * Check if blocked
 */
UserSchema.methods.hasBlocked = function (userId) {
    return this.blockedUsers.some((id) => id.toString() === userId.toString());
};

/**
 * Update stats
 */
UserSchema.methods.updateStats = async function (updates) {
    Object.keys(updates).forEach((key) => {
        if (this.stats[key] !== undefined) {
            if (typeof updates[key] === "number" && updates[key] > 0) {
                this.stats[key] += updates[key];
            } else {
                this.stats[key] = updates[key];
            }
        }
    });
    return this.save();
};

/**
 * Record PK result
 */
UserSchema.methods.recordPKResult = async function (won, draw = false) {
    if (draw) {
        this.stats.pkDraws += 1;
        this.stats.pkStreak = 0;
    } else if (won) {
        this.stats.pkWins += 1;
        this.stats.pkStreak += 1;
        this.stats.pkBestStreak = Math.max(
            this.stats.pkBestStreak,
            this.stats.pkStreak
        );
    } else {
        this.stats.pkLosses += 1;
        this.stats.pkStreak = 0;
    }

    this.stats.pkTotalBattles =
        this.stats.pkWins + this.stats.pkLosses + this.stats.pkDraws;
    this.stats.pkWinRate =
        this.stats.pkWins + this.stats.pkLosses > 0
            ? Math.round(
                (this.stats.pkWins /
                    (this.stats.pkWins + this.stats.pkLosses)) *
                100
            )
            : 0;

    return this.save();
};

/**
 * Get public profile
 */
UserSchema.methods.toPublicProfile = function () {
    return {
        _id: this._id,
        username: this.username,
        displayName: this.displayName,
        avatar: this.avatar,
        coverImage: this.coverImage,
        bio: this.bio,
        isVerified: this.isVerified,
        verificationBadge: this.verificationBadge,
        isLive: this.isLive,
        currentStreamId: this.currentStreamId,
        followersCount: this.followersCount,
        followingCount: this.followingCount,
        stats: {
            pkWins: this.stats.pkWins,
            pkLosses: this.stats.pkLosses,
            pkWinRate: this.pkWinRate,
            totalStreams: this.stats.totalStreams,
            totalPosts: this.stats.totalPosts,
        },
        socialLinks: this.socialLinks,
        createdAt: this.createdAt,
    };
};

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Find by username or email
 */
UserSchema.statics.findByLogin = async function (login) {
    const q = login.toLowerCase();
    return this.findOne({
        $or: [{ username: q }, { email: q }],
    });
};

/**
 * Search users
 */
UserSchema.statics.searchUsers = async function (query, options = {}) {
    const { limit = 20 } = options;

    if (!query || typeof query !== "string") {
        return [];
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const filter = {
        isBanned: { $ne: true },
        $or: [
            { username: regex },
            { email: regex },
            { displayName: regex },
        ],
    };

    const users = await this.find(filter)
        .select(
            "username avatar displayName isVerified followersCount stats.pkWins stats.pkWinRate"
        )
        .sort({
            followersCount: -1,
        })
        .limit(limit)
        .lean();

    return users;
};

/**
 * Get top creators
 */
UserSchema.statics.getTopCreators = async function (limit = 50) {
    return this.find({
        role: { $in: ["creator", "admin"] },
        isBanned: false,
    })
        .sort({ followersCount: -1 })
        .limit(limit)
        .select(
            "username displayName avatar bio isVerified followersCount isLive stats"
        )
        .lean();
};

/**
 * Get live users
 */
UserSchema.statics.getLiveUsers = async function () {
    return this.find({ isLive: true, isBanned: false })
        .select("username avatar currentStreamId followersCount")
        .lean();
};

/**
 * Get suggested users for a user
 */
UserSchema.statics.getSuggested = async function (userId, limit = 10) {
    const user = await this.findById(userId).select("following");

    return this.find({
        _id: { $nin: [...(user?.following || []), userId] },
        isBanned: false,
        isDeactivated: false,
    })
        .sort({ followersCount: -1, lastSeen: -1 })
        .limit(limit)
        .select(
            "username displayName avatar bio isVerified followersCount"
        )
        .lean();
};

/**
 * Get dashboard stats for admin panel
 */
UserSchema.statics.getDashboardStats = async function () {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
        totalUsers,
        creators,
        admins,
        moderators,
        banned,
        live,
        premium,
        newToday,
        newThisWeek,
    ] = await Promise.all([
        this.countDocuments(),
        this.countDocuments({ role: "creator" }),
        this.countDocuments({ role: "admin" }),
        this.countDocuments({ role: "moderator" }),
        this.countDocuments({ isBanned: true }),
        this.countDocuments({ isLive: true, isBanned: false }),
        this.countDocuments({ isPremium: true }),
        this.countDocuments({ createdAt: { $gte: dayAgo } }),
        this.countDocuments({ createdAt: { $gte: weekAgo } }),
    ]);

    const walletAgg = await this.aggregate([
        {
            $group: {
                _id: null,
                totalBalance: { $sum: "$wallet.balance" },
                totalPendingBalance: { $sum: "$wallet.pendingBalance" },
                totalEarned: { $sum: "$wallet.totalEarned" },
                totalWithdrawn: { $sum: "$wallet.totalWithdrawn" },
                totalReceived: { $sum: "$wallet.totalReceived" },
                totalSpent: { $sum: "$wallet.totalSpent" },
            },
        },
    ]);

    const statsAgg = await this.aggregate([
        {
            $group: {
                _id: null,
                totalPosts: { $sum: "$stats.totalPosts" },
                totalStreams: { $sum: "$stats.totalStreams" },
                totalStreamViewers: { $sum: "$stats.totalStreamViewers" },
                totalPkBattles: { $sum: "$stats.pkTotalBattles" },
                totalGiftsReceivedValue: {
                    $sum: "$stats.totalGiftsReceivedValue",
                },
                totalEarnings: { $sum: "$stats.totalEarnings" },
            },
        },
    ]);

    const walletStats = walletAgg[0] || {
        totalBalance: 0,
        totalPendingBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        totalReceived: 0,
        totalSpent: 0,
    };

    const platformStats = statsAgg[0] || {
        totalPosts: 0,
        totalStreams: 0,
        totalStreamViewers: 0,
        totalPkBattles: 0,
        totalGiftsReceivedValue: 0,
        totalEarnings: 0,
    };

    return {
        users: {
            total: totalUsers,
            creators,
            admins,
            moderators,
            premium,
            banned,
        },
        live: {
            currentlyLive: live,
        },
        wallet: walletStats,
        platform: platformStats,
        growth: {
            newToday,
            newThisWeek,
        },
    };
};

// ===========================================
// PREVENT DUPLICATE MODEL ERROR
// ===========================================
const User = mongoose.models.User || mongoose.model("User", UserSchema);

module.exports = User;
module.exports.User = User;
module.exports.UserSchema = UserSchema;
module.exports.NotificationSchema = NotificationSchema;
module.exports.WalletTransactionSchema = WalletTransactionSchema;
module.exports.WalletSchema = WalletSchema;
module.exports.StatsSchema = StatsSchema;
module.exports.ModerationEventSchema = ModerationEventSchema;
