// backend/models/Prediction.js
// World-Studio.live - Market Prediction Model
// Stores and tracks stock/crypto price predictions and their accuracy

const mongoose = require("mongoose");

// ===========================================
// SUB-SCHEMAS
// ===========================================

/**
 * Technical Indicator Schema
 */
const IndicatorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    value: Number,
    signal: {
        type: String,
        enum: ["strong_buy", "buy", "neutral", "sell", "strong_sell"]
    },
    weight: {
        type: Number,
        default: 1
    }
}, { _id: false });

/**
 * Price Target Schema
 */
const PriceTargetSchema = new mongoose.Schema({
    timeframe: {
        type: String,
        enum: ["1h", "4h", "1d", "1w", "1m"],
        required: true
    },
    target: Number,
    support: Number,
    resistance: Number,
    confidence: Number
}, { _id: false });

// ===========================================
// MAIN PREDICTION SCHEMA
// ===========================================
const PredictionSchema = new mongoose.Schema({
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
        default: "crypto",
        index: true
    },
    exchange: String,

    // Current Price Data
    currentPrice: {
        type: Number,
        required: true
    },
    priceAtPrediction: Number,
    currency: {
        type: String,
        default: "USD"
    },

    // Prediction Data
    predictedPrice: {
        type: Number,
        required: true
    },
    change: {
        type: Number,
        required: true
    },
    changePercent: {
        type: Number,
        required: true
    },

    // Direction
    direction: {
        type: String,
        enum: ["bullish", "bearish", "neutral"],
        default: "neutral"
    },

    // Signal Strength
    signal: {
        type: String,
        enum: ["strong_buy", "buy", "hold", "sell", "strong_sell"],
        default: "hold",
        index: true
    },

    // Confidence & Accuracy
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },

    // Timeframe
    timeframe: {
        type: String,
        enum: ["1h", "4h", "1d", "1w", "1m", "3m"],
        default: "1d"
    },
    predictionExpiry: Date,

    // Price Targets
    priceTargets: [PriceTargetSchema],
    targetPrice: Number,
    stopLoss: Number,
    takeProfit: Number,

    // Support & Resistance
    supportLevels: [Number],
    resistanceLevels: [Number],

    // Technical Indicators
    indicators: [IndicatorSchema],

    // Indicator Values (raw)
    technicalData: {
        rsi: Number,
        rsi14: Number,
        macd: Number,
        macdSignal: Number,
        macdHistogram: Number,
        sma20: Number,
        sma50: Number,
        sma200: Number,
        ema12: Number,
        ema26: Number,
        bollingerUpper: Number,
        bollingerMiddle: Number,
        bollingerLower: Number,
        stochK: Number,
        stochD: Number,
        atr: Number,
        adx: Number,
        cci: Number,
        williamsR: Number,
        obv: Number,
        vwap: Number
    },

    // Market Data
    marketData: {
        volume24h: Number,
        volumeChange: Number,
        marketCap: Number,
        high24h: Number,
        low24h: Number,
        open24h: Number,
        previousClose: Number,
        weekHigh52: Number,
        weekLow52: Number
    },

    // Sentiment
    sentiment: {
        overall: {
            type: String,
            enum: ["very_negative", "negative", "neutral", "positive", "very_positive"]
        },
        score: Number, // -100 to 100
        fearGreedIndex: Number,
        socialVolume: Number,
        newsScore: Number
    },

    // Source of Prediction
    source: {
        type: String,
        enum: ["algorithm", "ai", "analyst", "community", "hybrid"],
        default: "algorithm"
    },
    modelVersion: String,

    // Verification (after prediction period)
    verification: {
        isVerified: {
            type: Boolean,
            default: false
        },
        actualPrice: Number,
        actualChange: Number,
        actualChangePercent: Number,
        wasAccurate: Boolean,
        accuracy: Number, // How close was prediction (%)
        verifiedAt: Date
    },

    // User who created (if user-generated)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    username: String,

    // Engagement
    views: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },

    // Status
    status: {
        type: String,
        enum: ["active", "expired", "verified", "cancelled"],
        default: "active",
        index: true
    },

    // Notes
    notes: String,
    analysis: String,

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
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
PredictionSchema.index({ symbol: 1, createdAt: -1 });
PredictionSchema.index({ assetType: 1, signal: 1 });
PredictionSchema.index({ symbol: 1, timeframe: 1, createdAt: -1 });
PredictionSchema.index({ status: 1, createdAt: -1 });
PredictionSchema.index({ "verification.isVerified": 1 });
PredictionSchema.index({ confidence: -1 });
PredictionSchema.index({ userId: 1, createdAt: -1 });

// ===========================================
// VIRTUALS
// ===========================================

// Is prediction still valid
PredictionSchema.virtual("isActive").get(function () {
    if (this.status !== "active") return false;
    if (this.predictionExpiry && new Date() > this.predictionExpiry) return false;
    return true;
});

// Direction indicator
PredictionSchema.virtual("isUp").get(function () {
    return this.change > 0;
});

// Signal emoji
PredictionSchema.virtual("signalEmoji").get(function () {
    const emojis = {
        strong_buy: "🚀",
        buy: "📈",
        hold: "➡️",
        sell: "📉",
        strong_sell: "⚠️"
    };
    return emojis[this.signal] || "➡️";
});

// Formatted change
PredictionSchema.virtual("formattedChange").get(function () {
    const sign = this.change >= 0 ? "+" : "";
    return `${sign}${this.changePercent.toFixed(2)}%`;
});

// Risk level based on confidence
PredictionSchema.virtual("riskLevel").get(function () {
    if (this.confidence >= 80) return "low";
    if (this.confidence >= 60) return "medium";
    if (this.confidence >= 40) return "high";
    return "very_high";
});

// ===========================================
// PRE-SAVE MIDDLEWARE
// ===========================================
PredictionSchema.pre("save", function (next) {
    // Set direction based on change
    if (this.change > 2) this.direction = "bullish";
    else if (this.change < -2) this.direction = "bearish";
    else this.direction = "neutral";

    // Set prediction expiry if not set
    if (!this.predictionExpiry && this.timeframe) {
        const expiries = {
            "1h": 60 * 60 * 1000,
            "4h": 4 * 60 * 60 * 1000,
            "1d": 24 * 60 * 60 * 1000,
            "1w": 7 * 24 * 60 * 60 * 1000,
            "1m": 30 * 24 * 60 * 60 * 1000,
            "3m": 90 * 24 * 60 * 60 * 1000
        };
        this.predictionExpiry = new Date(Date.now() + (expiries[this.timeframe] || expiries["1d"]));
    }

    // Store price at prediction time
    if (!this.priceAtPrediction) {
        this.priceAtPrediction = this.currentPrice;
    }

    this.updatedAt = new Date();
    next();
});

// ===========================================
// STATIC METHODS
// ===========================================

/**
 * Get latest predictions for a symbol
 */
PredictionSchema.statics.getLatestBySymbol = async function (symbol, limit = 10) {
    return this.find({
        symbol: symbol.toUpperCase(),
        status: "active"
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * Get predictions by signal type
 */
PredictionSchema.statics.getBySignal = async function (signal, options = {}) {
    const { assetType, limit = 20, skip = 0 } = options;

    const query = {
        signal,
        status: "active"
    };

    if (assetType) query.assetType = assetType;

    return this.find(query)
        .sort({ confidence: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

/**
 * Get top predictions by confidence
 */
PredictionSchema.statics.getTopPredictions = async function (options = {}) {
    const { assetType, minConfidence = 70, limit = 20 } = options;

    const query = {
        status: "active",
        confidence: { $gte: minConfidence }
    };

    if (assetType) query.assetType = assetType;

    return this.find(query)
        .sort({ confidence: -1 })
        .limit(limit)
        .lean();
};

/**
 * Get strong buy signals
 */
PredictionSchema.statics.getStrongBuys = async function (assetType = null, limit = 10) {
    const query = {
        signal: "strong_buy",
        status: "active",
        confidence: { $gte: 70 }
    };

    if (assetType) query.assetType = assetType;

    return this.find(query)
        .sort({ confidence: -1 })
        .limit(limit)
        .lean();
};

/**
 * Verify expired predictions
 */
PredictionSchema.statics.verifyPrediction = async function (predictionId, actualPrice) {
    const prediction = await this.findById(predictionId);
    if (!prediction) return null;

    const actualChange = actualPrice - prediction.priceAtPrediction;
    const actualChangePercent = (actualChange / prediction.priceAtPrediction) * 100;

    // Was direction correct?
    const predictedDirection = prediction.change > 0 ? "up" : "down";
    const actualDirection = actualChange > 0 ? "up" : "down";
    const wasAccurate = predictedDirection === actualDirection;

    // Calculate accuracy (how close was the prediction)
    const priceDiff = Math.abs(actualPrice - prediction.predictedPrice);
    const accuracy = Math.max(0, 100 - (priceDiff / prediction.priceAtPrediction * 100));

    prediction.verification = {
        isVerified: true,
        actualPrice,
        actualChange,
        actualChangePercent,
        wasAccurate,
        accuracy: Math.round(accuracy * 100) / 100,
        verifiedAt: new Date()
    };
    prediction.status = "verified";

    return prediction.save();
};

/**
 * Get accuracy stats for symbol
 */
PredictionSchema.statics.getAccuracyStats = async function (symbol) {
    const predictions = await this.find({
        symbol: symbol.toUpperCase(),
        "verification.isVerified": true
    }).lean();

    if (predictions.length === 0) {
        return { total: 0, accurate: 0, accuracy: 0 };
    }

    const accurate = predictions.filter(p => p.verification.wasAccurate).length;
    const avgAccuracy = predictions.reduce((sum, p) => sum + (p.verification.accuracy || 0), 0) / predictions.length;

    return {
        total: predictions.length,
        accurate,
        accuracy: Math.round((accurate / predictions.length) * 100),
        avgPriceAccuracy: Math.round(avgAccuracy)
    };
};

/**
 * Get prediction history for symbol
 */
PredictionSchema.statics.getHistory = async function (symbol, options = {}) {
    const { limit = 50, skip = 0, includeExpired = false } = options;

    const query = { symbol: symbol.toUpperCase() };

    if (!includeExpired) {
        query.status = { $in: ["active", "verified"] };
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};

/**
 * Clean up old predictions
 */
PredictionSchema.statics.cleanupOld = async function (daysOld = 90) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await this.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ["expired", "cancelled"] }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old predictions`);
    return result;
};

/**
 * Get summary statistics
 */
PredictionSchema.statics.getSummaryStats = async function () {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [total, active, verified, today] = await Promise.all([
        this.countDocuments(),
        this.countDocuments({ status: "active" }),
        this.countDocuments({ "verification.isVerified": true }),
        this.countDocuments({ createdAt: { $gte: dayAgo } })
    ]);

    // Calculate overall accuracy
    const verifiedPredictions = await this.find({
        "verification.isVerified": true
    }).select("verification.wasAccurate").lean();

    const accurateCount = verifiedPredictions.filter(p => p.verification?.wasAccurate).length;
    const overallAccuracy = verifiedPredictions.length > 0
        ? Math.round((accurateCount / verifiedPredictions.length) * 100)
        : 0;

    return {
        total,
        active,
        verified,
        today,
        overallAccuracy
    };
};

// ===========================================
// INSTANCE METHODS
// ===========================================

/**
 * Check if prediction was accurate
 */
PredictionSchema.methods.checkAccuracy = function (actualPrice) {
    const actualChange = actualPrice - this.priceAtPrediction;
    const predictedDirection = this.change > 0;
    const actualDirection = actualChange > 0;

    return predictedDirection === actualDirection;
};

/**
 * Get risk-reward ratio
 */
PredictionSchema.methods.getRiskReward = function () {
    if (!this.stopLoss || !this.takeProfit || !this.currentPrice) return null;

    const risk = Math.abs(this.currentPrice - this.stopLoss);
    const reward = Math.abs(this.takeProfit - this.currentPrice);

    return {
        risk,
        reward,
        ratio: reward / risk
    };
};

/**
 * Format for display
 */
PredictionSchema.methods.toDisplayFormat = function () {
    return {
        symbol: this.symbol,
        currentPrice: this.currentPrice,
        predictedPrice: this.predictedPrice,
        change: this.formattedChange,
        signal: this.signal,
        signalEmoji: this.signalEmoji,
        confidence: `${this.confidence}%`,
        direction: this.direction,
        timeframe: this.timeframe,
        riskLevel: this.riskLevel,
        isActive: this.isActive
    };
};

// ===========================================
// EXPORT
// ===========================================
const Prediction = mongoose.model("Prediction", PredictionSchema);

module.exports = Prediction;
module.exports.Prediction = Prediction;
module.exports.PredictionSchema = PredictionSchema;
module.exports.IndicatorSchema = IndicatorSchema;
module.exports.PriceTargetSchema = PriceTargetSchema;