// backend/models/PredictionLog.js
// World-Studio.live - Prediction Log Model
// Audit trail for all market predictions made by the system or users

const mongoose = require("mongoose");

// ===========================================
// PREDICTION LOG SCHEMA
// ===========================================
const PredictionLogSchema = new mongoose.Schema({
    // Asset Information
    symbol: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        index: true
    },
    name: String,
    assetType: {
        type: String,
        enum: ["crypto", "stock", "forex", "commodity", "index"],
        default: "crypto"
    },

    // Price Data
    currentPrice: {
        type: Number
    },
    predictedPrice: {
        type: Number,
        required: true
    },
    change: {
        type: Number
    },
    changePercent: {
        type: Number
    },

    // Prediction Details
    signal: {
        type: String,
        enum: ["strong_buy", "buy", "hold", "sell", "strong_sell"],
        default: "hold"
    },
    direction: {
        type: String,
        enum: ["bullish", "bearish", "neutral"],
        default: "neutral"
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    timeframe: {
        type: String,
        enum: ["1h", "4h", "1d", "1w", "1m"],
        default: "1d"
    },

    // Source
    user: {
        type: String,
        default: "system"
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    source: {
        type: String,
        enum: ["system", "algorithm", "ai", "user", "analyst", "api"],
        default: "system"
    },
    modelVersion: String,

    // Related Prediction
    predictionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Prediction"
    },

    // Action Type
    action: {
        type: String,
        enum: ["created", "updated", "verified", "expired", "cancelled", "viewed"],
        default: "created"
    },

    // Technical Indicators (snapshot)
    indicators: {
        rsi: Number,
        macd: Number,
        sma50: Number,
        sma200: Number
    },

    // Verification (if applicable)
    verification: {
        actualPrice: Number,
        wasAccurate: Boolean,
        accuracy: Number,
        verifiedAt: Date
    },

    // Request Metadata
    metadata: {
        ip: String,
        userAgent: String,
        requestId: String,
        sessionId: String
    },

    // Performance
    processingTime: Number, // ms

    // Notes
    notes: String,
    error: String,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false, // Only use createdAt for logs
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ===========================================
// INDEXES
// ===========================================
PredictionLogSchema.index({ symbol: 1, createdAt: -1 });
PredictionLogSchema.index({ user: 1, createdAt: -1 });
PredictionLogSchema.index({ userId: 1, createdAt: -1 });
PredictionLogSchema.index({ action: 1, createdAt: -1 });
PredictionLogSchema.index({ source: 1 });
PredictionLogSchema.index({ predictionId: 1 });
PredictionLogSchema.index({ createdAt: -1 });

// TTL index - automatically delete logs after 180 days
PredictionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

// ===========================================
// VIRTUALS
// ===========================================

// Formatted change
PredictionLogSchema.virtual("formattedChange").get(function () {
    if (this.changePercent === undefined) return null;
    const sign = this.changePercent >= 0 ? "+" : "";
    return `${sign}${this.changePercent.toFixed(2)}%`;
});

// Is bullish prediction
PredictionLogSchema.virtual("isBullish").get(function () {
    return this.change > 0 || this.direction === "bullish";
});

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Log a new prediction
 */
PredictionLogSchema.statics.logPrediction = async function (data) {
    const log = new this({
        symbol: data.symbol,
        name: data.name,
        assetType: data.assetType || "crypto",
        currentPrice: data.currentPrice,
        predictedPrice: data.predictedPrice,
        change: data.change,
        changePercent: data.changePercent,
        signal: data.signal,
        direction: data.direction,
        confidence: data.confidence,
        timeframe: data.timeframe,
        user: data.user || "system",
        userId: data.userId,
        source: data.source || "system",
        modelVersion: data.modelVersion,
        predictionId: data.predictionId,
        action: data.action || "created",
        indicators: data.indicators,
        metadata: data.metadata,
        processingTime: data.processingTime,
        notes: data.notes
    });

    return log.save();
};

/**
 * Log prediction view
 */
PredictionLogSchema.statics.logView = async function (predictionId, userId, metadata = {}) {
    return this.create({
        predictionId,
        userId,
        action: "viewed",
        user: userId ? userId.toString() : "anonymous",
        source: "user",
        symbol: metadata.symbol || "UNKNOWN",
        predictedPrice: metadata.predictedPrice || 0,
        confidence: metadata.confidence || 0,
        metadata
    });
};

/**
 * Log verification
 */
PredictionLogSchema.statics.logVerification = async function (predictionId, verificationData) {
    return this.create({
        predictionId,
        action: "verified",
        source: "system",
        symbol: verificationData.symbol,
        predictedPrice: verificationData.predictedPrice,
        confidence: verificationData.confidence,
        verification: {
            actualPrice: verificationData.actualPrice,
            wasAccurate: verificationData.wasAccurate,
            accuracy: verificationData.accuracy,
            verifiedAt: new Date()
        }
    });
};

/**
 * Get logs by symbol
 */
PredictionLogSchema.statics.getBySymbol = async function (symbol, options = {}) {
    const { limit = 100, skip = 0, action } = options;

    const query = { symbol: symbol.toUpperCase() };
    if (action) query.action = action;

    return this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

/**
 * Get logs by user
 */
PredictionLogSchema.statics.getByUser = async function (userId, options = {}) {
    const { limit = 100, skip = 0 } = options;

    return this.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

/**
 * Get recent logs
 */
PredictionLogSchema.statics.getRecent = async function (limit = 50) {
    return this.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * Get activity summary
 */
PredictionLogSchema.statics.getActivitySummary = async function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [total, byAction, bySource, bySymbol] = await Promise.all([
        this.countDocuments({ createdAt: { $gte: since } }),

        this.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: "$action", count: { $sum: 1 } } }
        ]),

        this.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: "$source", count: { $sum: 1 } } }
        ]),

        this.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: "$symbol", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ])
    ]);

    return {
        period: `${hours}h`,
        total,
        byAction: Object.fromEntries(byAction.map(a => [a._id, a.count])),
        bySource: Object.fromEntries(bySource.map(s => [s._id, s.count])),
        topSymbols: bySymbol.map(s => ({ symbol: s._id, count: s.count }))
    };
};

/**
 * Get accuracy stats from logs
 */
PredictionLogSchema.statics.getAccuracyFromLogs = async function (symbol = null) {
    const query = {
        action: "verified",
        "verification.isVerified": { $exists: true }
    };

    if (symbol) query.symbol = symbol.toUpperCase();

    const logs = await this.find(query).lean();

    if (logs.length === 0) return { total: 0, accurate: 0, accuracy: 0 };

    const accurate = logs.filter(l => l.verification?.wasAccurate).length;

    return {
        total: logs.length,
        accurate,
        accuracy: Math.round((accurate / logs.length) * 100)
    };
};

/**
 * Get hourly prediction count
 */
PredictionLogSchema.statics.getHourlyStats = async function (hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.aggregate([
        { $match: { createdAt: { $gte: since }, action: "created" } },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" },
                    hour: { $hour: "$createdAt" }
                },
                count: { $sum: 1 },
                avgConfidence: { $avg: "$confidence" }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } }
    ]);
};

/**
 * Clean up old logs (beyond TTL)
 */
PredictionLogSchema.statics.cleanup = async function (daysOld = 180) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await this.deleteMany({
        createdAt: { $lt: cutoff }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old prediction logs`);
    return result;
};

/**
 * Get error logs
 */
PredictionLogSchema.statics.getErrors = async function (limit = 50) {
    return this.find({ error: { $exists: true, $ne: null } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// ===========================================
// EXPORT
// ===========================================
const PredictionLog = mongoose.model("PredictionLog", PredictionLogSchema);

module.exports = PredictionLog;
module.exports.PredictionLog = PredictionLog;
module.exports.PredictionLogSchema = PredictionLogSchema;