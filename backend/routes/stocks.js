// backend/routes/stocks.js
// World-Studio.live - Stock Market Data Routes (UNIVERSE EDITION 🚀)
// Real-time stock data, charts, predictions, and portfolio tracking

"use strict";

const express = require("express");
const axios = require("axios");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// ===========================================
// CONFIGURATION
// ===========================================

const FINNHUB_API = "https://finnhub.io/api/v1";
const ALPHA_VANTAGE_API = "https://www.alphavantage.co/query"; // reserved for future use
const API_KEY = process.env.FINNHUB_API_KEY;
const ALPHA_KEY = process.env.ALPHA_VANTAGE_KEY; // reserved for future use

// Axios instance with timeout
const api = axios.create({
    baseURL: FINNHUB_API,
    timeout: 8000,
});

// Cache for rate limiting
const priceCache = new Map();
const CACHE_TTL = 60_000; // 1 minute

// ===========================================
// SUPPORTED STOCKS & CRYPTO
// ===========================================

const SUPPORTED_STOCKS = [
    // Tech Giants
    { symbol: "AAPL", name: "Apple Inc.", type: "stock", sector: "Technology", logo: "🍎" },
    { symbol: "MSFT", name: "Microsoft Corporation", type: "stock", sector: "Technology", logo: "🪟" },
    { symbol: "GOOG", name: "Alphabet Inc.", type: "stock", sector: "Technology", logo: "🔍" },
    { symbol: "GOOGL", name: "Alphabet Inc. Class A", type: "stock", sector: "Technology", logo: "🔍" },
    { symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", sector: "Consumer", logo: "📦" },
    { symbol: "META", name: "Meta Platforms Inc.", type: "stock", sector: "Technology", logo: "👤" },
    { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock", sector: "Technology", logo: "🎮" },
    { symbol: "TSLA", name: "Tesla Inc.", type: "stock", sector: "Automotive", logo: "⚡" },

    // Finance
    { symbol: "JPM", name: "JPMorgan Chase & Co.", type: "stock", sector: "Finance", logo: "🏦" },
    { symbol: "V", name: "Visa Inc.", type: "stock", sector: "Finance", logo: "💳" },
    { symbol: "MA", name: "Mastercard Inc.", type: "stock", sector: "Finance", logo: "💳" },
    { symbol: "BAC", name: "Bank of America", type: "stock", sector: "Finance", logo: "🏦" },

    // Healthcare
    { symbol: "JNJ", name: "Johnson & Johnson", type: "stock", sector: "Healthcare", logo: "💊" },
    { symbol: "UNH", name: "UnitedHealth Group", type: "stock", sector: "Healthcare", logo: "🏥" },
    { symbol: "PFE", name: "Pfizer Inc.", type: "stock", sector: "Healthcare", logo: "💉" },

    // Consumer
    { symbol: "KO", name: "Coca-Cola Company", type: "stock", sector: "Consumer", logo: "🥤" },
    { symbol: "PEP", name: "PepsiCo Inc.", type: "stock", sector: "Consumer", logo: "🥤" },
    { symbol: "MCD", name: "McDonald's Corporation", type: "stock", sector: "Consumer", logo: "🍔" },
    { symbol: "NKE", name: "Nike Inc.", type: "stock", sector: "Consumer", logo: "👟" },
    { symbol: "DIS", name: "Walt Disney Company", type: "stock", sector: "Entertainment", logo: "🏰" },

    // Energy
    { symbol: "XOM", name: "Exxon Mobil", type: "stock", sector: "Energy", logo: "⛽" },
    { symbol: "CVX", name: "Chevron Corporation", type: "stock", sector: "Energy", logo: "⛽" },

    // Other Tech
    { symbol: "NFLX", name: "Netflix Inc.", type: "stock", sector: "Entertainment", logo: "🎬" },
    { symbol: "AMD", name: "Advanced Micro Devices", type: "stock", sector: "Technology", logo: "💻" },
    { symbol: "INTC", name: "Intel Corporation", type: "stock", sector: "Technology", logo: "💻" },
    { symbol: "CRM", name: "Salesforce Inc.", type: "stock", sector: "Technology", logo: "☁️" },
    { symbol: "ORCL", name: "Oracle Corporation", type: "stock", sector: "Technology", logo: "🗄️" },
    { symbol: "ADBE", name: "Adobe Inc.", type: "stock", sector: "Technology", logo: "🎨" },
    { symbol: "PYPL", name: "PayPal Holdings", type: "stock", sector: "Finance", logo: "💰" },
    { symbol: "SQ", name: "Block Inc.", type: "stock", sector: "Finance", logo: "⬛" },
];

const SUPPORTED_CRYPTO = [
    { symbol: "BTC", name: "Bitcoin", type: "crypto", sector: "Crypto", logo: "₿" },
    { symbol: "ETH", name: "Ethereum", type: "crypto", sector: "Crypto", logo: "⟠" },
    { symbol: "BNB", name: "Binance Coin", type: "crypto", sector: "Crypto", logo: "🔶" },
    { symbol: "XRP", name: "Ripple", type: "crypto", sector: "Crypto", logo: "💧" },
    { symbol: "SOL", name: "Solana", type: "crypto", sector: "Crypto", logo: "◎" },
    { symbol: "ADA", name: "Cardano", type: "crypto", sector: "Crypto", logo: "🔷" },
    { symbol: "DOGE", name: "Dogecoin", type: "crypto", sector: "Crypto", logo: "🐕" },
    { symbol: "DOT", name: "Polkadot", type: "crypto", sector: "Crypto", logo: "⚫" },
    { symbol: "MATIC", name: "Polygon", type: "crypto", sector: "Crypto", logo: "🟣" },
    { symbol: "AVAX", name: "Avalanche", type: "crypto", sector: "Crypto", logo: "🔺" },
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get cached price or null
 */
const getCachedPrice = (symbol) => {
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
};

/**
 * Set cached price
 */
const setCachedPrice = (symbol, data) => {
    priceCache.set(symbol, { data, timestamp: Date.now() });
};

/**
 * Generate mock price for demo/fallback
 */
const generateMockPrice = (symbol) => {
    const basePrices = {
        AAPL: 175, MSFT: 380, GOOG: 140, AMZN: 180, META: 500,
        NVDA: 480, TSLA: 250, JPM: 195, V: 280, NFLX: 620,
        BTC: 67000, ETH: 3500, SOL: 150, XRP: 0.55, DOGE: 0.12,
    };

    const base = basePrices[symbol] || 100;
    const variance = base * 0.02 * (Math.random() - 0.5);
    return Number((base + variance).toFixed(2));
};

/**
 * Calculate technical indicators
 */
const calculateIndicators = (prices) => {
    if (!prices || prices.length < 14) return null;

    // Simple Moving Average (SMA)
    const window = Math.min(20, prices.length);
    const sma20 = prices.slice(-window).reduce((a, b) => a + b, 0) / window;

    // Relative Strength Index (RSI)
    let gains = 0, losses = 0;
    const len = Math.min(15, prices.length);
    for (let i = 1; i < len; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14 || 0.00001;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Volatility (standard deviation)
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance);

    return {
        sma20: Number(sma20.toFixed(2)),
        rsi: Number(rsi.toFixed(2)),
        volatility: Number(volatility.toFixed(2)),
        trend: rsi > 70 ? "overbought" : rsi < 30 ? "oversold" : "neutral",
    };
};

// ===========================================
// ROUTES
// ===========================================

/**
 * GET /api/stocks/supported
 * Get list of supported stocks/crypto
 */
router.get("/supported", (req, res) => {
    try {
        const { type, sector, search } = req.query;

        let list = [...SUPPORTED_STOCKS];

        if (type === "crypto") {
            list = [...SUPPORTED_CRYPTO];
        } else if (type === "all") {
            list = [...SUPPORTED_STOCKS, ...SUPPORTED_CRYPTO];
        }

        if (sector && sector !== "all") {
            list = list.filter((s) => s.sector === sector);
        }

        if (search) {
            const query = search.toLowerCase();
            list = list.filter(
                (s) =>
                    s.symbol.toLowerCase().includes(query) ||
                    s.name.toLowerCase().includes(query)
            );
        }

        res.json({
            success: true,
            stocks: list,
            count: list.length,
        });
    } catch (err) {
        console.error("❌ Supported stocks error:", err);
        res.status(500).json({
            success: false,
            error: "Could not load supported stocks",
        });
    }
});

/**
 * GET /api/stocks/sectors
 * Get available sectors
 */
router.get("/sectors", (req, res) => {
    try {
        const sectors = [...new Set(SUPPORTED_STOCKS.map((s) => s.sector))];
        res.json({
            success: true,
            sectors,
        });
    } catch (err) {
        console.error("❌ Sectors error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to load sectors",
        });
    }
});

/**
 * GET /api/stocks/quote/:symbol
 * Get real-time quote for a symbol
 */
router.get("/quote/:symbol", async (req, res) => {
    const symbol = (req.params.symbol || "").trim().toUpperCase();
    if (!symbol) {
        return res.status(400).json({
            success: false,
            error: "Symbol required",
        });
    }

    // Check cache first
    const cached = getCachedPrice(symbol);
    if (cached) {
        return res.json({ success: true, ...cached, cached: true });
    }

    const stockInfo =
        SUPPORTED_STOCKS.find((s) => s.symbol === symbol) ||
        SUPPORTED_CRYPTO.find((s) => s.symbol === symbol);

    // No API key → demo mode
    if (!API_KEY) {

        const mockPrice = generateMockPrice(symbol);


        const data = {
            symbol,
            name: stockInfo?.name || symbol,
            logo: stockInfo?.logo || "📈",
            sector: stockInfo?.sector || (stockInfo?.type === "crypto" ? "Crypto" : "Unknown"),
            price: mockPrice,
            change: Number((mockPrice * 0.01 * (Math.random() - 0.5)).toFixed(2)),
            changePercent: Number((Math.random() * 2 - 1).toFixed(2)),
            high: Number((mockPrice * 1.02).toFixed(2)),
            low: Number((mockPrice * 0.98).toFixed(2)),
            open: Number((mockPrice * 0.995).toFixed(2)),
            previousClose: Number((mockPrice * 0.998).toFixed(2)),
            volume: Math.floor(Math.random() * 50_000_000),
            timestamp: new Date().toISOString(),
            demo: true,
        };

        setCachedPrice(symbol, data);
        return res.json({ success: true, ...data });
    }

    try {
        const { data } = await api.get("/quote", {
            params: { symbol, token: API_KEY },
        });

        if (!data || data.c == null || data.c === 0) {
            // Graceful fallback to demo
            const mockPrice = generateMockPrice(symbol);
            const demo = {
                symbol,
                name: stockInfo?.name || symbol,
                logo: stockInfo?.logo || "📈",
                sector: stockInfo?.sector || "Unknown",
                price: mockPrice,
                change: Number((mockPrice * 0.01 * (Math.random() - 0.5)).toFixed(2)),
                changePercent: Number((Math.random() * 2 - 1).toFixed(2)),
                demo: true,
                note: "Using demo data (no valid quote)",
            };
            setCachedPrice(symbol, demo);
            return res.json({ success: true, ...demo });
        }

        const pc = data.pc || data.c; // avoid division by 0
        const change = data.c - pc;
        const changePercent = pc ? (change / pc) * 100 : 0;

        const result = {
            symbol,
            name: stockInfo?.name || symbol,
            logo: stockInfo?.logo || "📈",
            sector: stockInfo?.sector || "Unknown",
            price: Number(data.c),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            high: Number(data.h ?? data.c),
            low: Number(data.l ?? data.c),
            open: Number(data.o ?? data.c),
            previousClose: Number(pc),
            timestamp: new Date().toISOString(),
        };

        setCachedPrice(symbol, result);
        res.json({ success: true, ...result });

    } catch (err) {
        console.error("❌ Quote error:", err.message);

        // Fallback to mock
        const mockPrice = generateMockPrice(symbol);
        res.json({
            success: true,
            symbol,
            price: mockPrice,
            change: Number((mockPrice * 0.01).toFixed(2)),
            changePercent: 1.0,
            demo: true,
            error: "Using demo data (quote failed)",
        });
    }
});

/**
 * GET /api/stocks/quotes
 * Get multiple quotes at once
 */
router.get("/quotes", async (req, res) => {
    try {
        const symbols = (req.query.symbols || "")
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);

        if (symbols.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Symbols required",
            });
        }

        const quotes = await Promise.all(
            symbols.slice(0, 20).map(async (sym) => {
                const cached = getCachedPrice(sym);
                const info =
                    SUPPORTED_STOCKS.find((s) => s.symbol === sym) ||
                    SUPPORTED_CRYPTO.find((s) => s.symbol === sym);

                if (cached) return { ...cached, cached: true };

                if (!API_KEY) {
                    const mockPrice = generateMockPrice(sym);

                    return {
                        symbol: sym,
                        name: info?.name || sym,
                        logo: info?.logo || "📈",
                        price: mockPrice,
                        change: Number((Math.random() * 4 - 2).toFixed(2)),
                        changePercent: Number((Math.random() * 4 - 2).toFixed(2)),
                        demo: true,
                    };
                }

                try {
                    const { data } = await api.get("/quote", {
                        params: { symbol: sym, token: API_KEY },
                    });

                    if (!data || data.c == null || data.c === 0) {
                        const mockPrice = generateMockPrice(sym);
                        return {
                            symbol: sym,
                            name: info?.name || sym,
                            logo: info?.logo || "📈",
                            price: mockPrice,
                            change: 0,
                            changePercent: 0,
                            demo: true,
                            note: "No valid quote, demo used",
                        };
                    }

                    const pc = data.pc || data.c;
                    const change = data.c - pc;
                    const changePercent = pc ? (change / pc) * 100 : 0;

                    const result = {
                        symbol: sym,
                        name: info?.name || sym,
                        logo: info?.logo || "📈",
                        price: Number(data.c),
                        change: Number(change.toFixed(2)),
                        changePercent: Number(changePercent.toFixed(2)),
                    };

                    setCachedPrice(sym, result);
                    return result;
                } catch (e) {
                    console.error(`❌ Quote error for ${sym}:`, e.message);
                    const mockPrice = generateMockPrice(sym);
                    return {
                        symbol: sym,
                        name: info?.name || sym,
                        logo: info?.logo || "📈",
                        price: mockPrice,
                        change: 0,
                        changePercent: 0,
                        demo: true,
                        error: e.message,
                    };
                }
            })
        );

        res.json({
            success: true,
            quotes,
            count: quotes.length,
        });
    } catch (err) {
        console.error("❌ Quotes error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

/**
 * GET /api/stocks/chart/:symbol
 * Get OHLCV chart data
 */
router.get("/chart/:symbol", async (req, res) => {
    const symbol = (req.params.symbol || "").trim().toUpperCase();
    const { resolution = "5", range = "1D" } = req.query;

    if (!symbol) {
        return res.status(400).json({
            success: false,
            error: "Symbol required",
        });
    }

    // Calculate time range
    const now = Math.floor(Date.now() / 1000);
    const ranges = {
        "1D": 24 * 60 * 60,
        "1W": 7 * 24 * 60 * 60,
        "1M": 30 * 24 * 60 * 60,
        "3M": 90 * 24 * 60 * 60,
        "1Y": 365 * 24 * 60 * 60,
        "5Y": 5 * 365 * 24 * 60 * 60,
    };

    const seconds = ranges[range] || ranges["1D"];
    const from = now - seconds;

    // No API key → mock chart
    if (!API_KEY) {

        const points = range === "1D" ? 78 : range === "1W" ? 35 : 30;
        const basePrice = generateMockPrice(symbol);

        const chart = Array.from({ length: points }).map((_, i) => {
            const variance = basePrice * 0.03 * (Math.random() - 0.5);
            const price = basePrice + variance + i * 0.1;
            const time = new Date(
                Date.now() - (points - i) * ((seconds * 1000) / points)
            );

            return {
                time: time.toISOString(),
                timestamp: Math.floor(time.getTime() / 1000),
                open: Number((price - Math.random()).toFixed(2)),
                high: Number((price + Math.random() * 2).toFixed(2)),
                low: Number((price - Math.random() * 2).toFixed(2)),
                close: Number(price.toFixed(2)),
                volume: Math.floor(Math.random() * 1_000_000),
            };
        });

        const prices = chart.map((c) => c.close);
        const indicators = calculateIndicators(prices);

        return res.json({
            success: true,
            symbol,
            range,
            resolution,
            chart,
            indicators,
            count: chart.length,
            demo: true,
        });
    }

    try {
        const { data } = await api.get("/stock/candle", {
            params: {
                symbol,
                resolution,
                from,
                to: now,
                token: API_KEY,
            },
        });

        if (!data || data.s !== "ok" || !Array.isArray(data.t) || data.t.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid chart data",
            });
        }

        const chart = data.t.map((timestamp, i) => ({
            time: new Date(timestamp * 1000).toISOString(),
            timestamp,
            open: Number(data.o[i]),
            high: Number(data.h[i]),
            low: Number(data.l[i]),
            close: Number(data.c[i]),
            volume: Number(data.v[i]),
        }));

        const prices = chart.map((c) => c.close);
        const indicators = calculateIndicators(prices);

        res.json({
            success: true,
            symbol,
            range,
            resolution,
            chart,
            indicators,
            count: chart.length,
        });

    } catch (err) {
        console.error("❌ Chart error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to fetch chart data",
            details: err.message,
        });
    }
});

/**
 * POST /api/stocks/predict
 * Get price prediction (demo ML model)
 * → Universe Edition: requires auth (personal trading tool)
 */
router.post("/predict", authMiddleware, async (req, res) => {
    const symbol = (req.body.symbol || "").trim().toUpperCase();
    const { timeframe = "1D" } = req.body;

    if (!symbol) {
        return res.status(400).json({
            success: false,
            error: "Symbol required",
        });
    }

    try {
        let currentPrice;

        if (API_KEY) {
            const { data } = await api.get("/quote", {
                params: { symbol, token: API_KEY },
            });
            currentPrice = Number(data?.c || 0);
        } else {
            currentPrice = generateMockPrice(symbol);
        }

        if (!currentPrice || Number.isNaN(currentPrice)) {
            return res.status(400).json({
                success: false,
                error: "Could not get current price",
            });
        }

        // Simulate ML prediction (demo)
        const volatility = 0.02; // 2% base volatility
        const timeMultiplier =
            {
                "1H": 0.3,
                "1D": 1,
                "1W": 2.5,
                "1M": 5,
            }[timeframe] || 1;

        const changePercent =
            (Math.random() - 0.48) * volatility * timeMultiplier * 100;
        const predicted = currentPrice * (1 + changePercent / 100);
        const change = predicted - currentPrice;

        // Confidence decreases with longer timeframes and larger predictions
        const baseConfidence = 85;
        const volatilityPenalty = Math.abs(changePercent) * 2;
        const timePenalty = (timeMultiplier - 1) * 5;
        const confidence = Math.max(
            50,
            baseConfidence - volatilityPenalty - timePenalty
        );

        // Sentiment based on prediction
        const sentiment =
            changePercent > 1 ? "bullish" : changePercent < -1 ? "bearish" : "neutral";

        const stockInfo =
            SUPPORTED_STOCKS.find((s) => s.symbol === symbol) ||
            SUPPORTED_CRYPTO.find((s) => s.symbol === symbol);

        res.json({
            success: true,
            symbol,
            name: stockInfo?.name || symbol,
            timeframe,
            currentPrice: Number(currentPrice.toFixed(2)),
            predictedPrice: Number(predicted.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            confidence: Number(confidence.toFixed(1)),
            sentiment,
            direction: changePercent >= 0 ? "up" : "down",
            timestamp: new Date().toISOString(),
            disclaimer:
                "This is a demo prediction for entertainment purposes only. Not financial advice.",
        });

    } catch (err) {
        console.error("❌ Prediction error:", err.message);
        res.status(500).json({
            success: false,
            error: "Prediction failed",
            details: err.message,
        });
    }
});

/**
 * GET /api/stocks/history/:symbol
 * Get prediction history (simulated)
 * → Universe Edition: requires auth (user dashboard)
 */
router.get("/history/:symbol", authMiddleware, (req, res) => {
    const symbol = (req.params.symbol || "").trim().toUpperCase();
    const days = parseInt(req.query.days || "7", 10);

    if (!symbol) {
        return res.status(400).json({
            success: false,
            error: "Symbol required",
        });
    }

    const basePrice = generateMockPrice(symbol);
    const today = new Date();

    const history = Array.from({ length: days }).map((_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const predictedVariance = basePrice * 0.02 * (Math.random() - 0.5);
        const actualVariance = basePrice * 0.02 * (Math.random() - 0.5);
        const predicted = basePrice + predictedVariance;
        const actual = basePrice + actualVariance;
        const rawAccuracy =
            100 - Math.abs(((predicted - actual) / actual) * 100 || 0);
        const accuracy = Math.max(70, rawAccuracy);

        return {
            date: date.toISOString().split("T")[0],
            predictedPrice: Number(predicted.toFixed(2)),
            actualPrice: Number(actual.toFixed(2)),
            difference: Number((predicted - actual).toFixed(2)),
            accuracy: Number(accuracy.toFixed(1)),
            direction: predicted >= actual ? "correct" : "incorrect",
        };
    });

    // Calculate overall accuracy
    const avgAccuracy =
        history.reduce((sum, h) => sum + h.accuracy, 0) / history.length;
    const correctDirections = history.filter(
        (h) => h.direction === "correct"
    ).length;

    res.json({
        success: true,
        symbol,
        days,
        history: history.reverse(),
        summary: {
            avgAccuracy: Number(avgAccuracy.toFixed(1)),
            correctDirections,
            directionAccuracy: Number(
                ((correctDirections / history.length) * 100).toFixed(1)
            ),
        },
    });
});

/**
 * GET /api/stocks/news/:symbol
 * Get stock news (requires API key or demo)
 */
router.get("/news/:symbol", async (req, res) => {
    const symbol = (req.params.symbol || "").trim().toUpperCase();
    const limit = parseInt(req.query.limit || "10", 10);

    if (!symbol) {
        return res.status(400).json({
            success: false,
            error: "Symbol required",
        });
    }

    // Demo mode
    if (!API_KEY) {
        const stockInfo =
            SUPPORTED_STOCKS.find((s) => s.symbol === symbol) ||
            SUPPORTED_CRYPTO.find((s) => s.symbol === symbol);
        const mockNews = [
            {
                id: 1,
                headline: `${stockInfo?.name || symbol} Shows Strong Q4 Performance`,
                summary: `Analysts are optimistic about ${symbol}'s growth trajectory...`,
                source: "Market Watch",
                datetime: Date.now() / 1000 - 3600,
                url: "#",
                sentiment: "positive",
            },
            {
                id: 2,
                headline: `${symbol} Announces New Product Launch`,
                summary: `The company unveiled its latest innovation today...`,
                source: "Tech News",
                datetime: Date.now() / 1000 - 7200,
                url: "#",
                sentiment: "positive",
            },
            {
                id: 3,
                headline: `Market Analysis: ${symbol} Stock Outlook`,
                summary: `Experts weigh in on the future of ${symbol}...`,
                source: "Financial Times",
                datetime: Date.now() / 1000 - 14_400,
                url: "#",
                sentiment: "neutral",
            },
        ];

        return res.json({
            success: true,
            symbol,
            news: mockNews.slice(0, limit),
            demo: true,
        });
    }

    try {
        const today = new Date();
        const weekAgo = new Date(
            today.getTime() - 7 * 24 * 60 * 60 * 1000
        );

        const { data } = await api.get("/company-news", {
            params: {
                symbol,
                from: weekAgo.toISOString().split("T")[0],
                to: today.toISOString().split("T")[0],
                token: API_KEY,
            },
        });

        const news = (data || [])
            .slice(0, limit)
            .map((item) => ({
                id: item.id,
                headline: item.headline,
                summary: item.summary,
                source: item.source,
                datetime: item.datetime,
                url: item.url,
                image: item.image,
            }));

        res.json({
            success: true,
            symbol,
            news,
            count: news.length,
        });

    } catch (err) {
        console.error("❌ News error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to fetch news",
        });
    }
});

/**
 * GET /api/stocks/movers
 * Get top gainers and losers (mock from supported list)
 */
router.get("/movers", async (req, res) => {
    try {
        // Generate mock movers from supported stocks
        const movers = SUPPORTED_STOCKS.slice(0, 10).map((stock) => {
            const price = generateMockPrice(stock.symbol);
            const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%

            return {
                ...stock,
                price: Number(price.toFixed(2)),
                change: Number(((price * changePercent) / 100).toFixed(2)),
                changePercent: Number(changePercent.toFixed(2)),
            };
        });

        const gainers = movers
            .filter((m) => m.changePercent > 0)
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 5);

        const losers = movers
            .filter((m) => m.changePercent < 0)
            .sort((a, b) => a.changePercent - b.changePercent)
            .slice(0, 5);

        res.json({
            success: true,
            gainers,
            losers,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error("❌ Movers error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

/**
 * GET /api/stocks/market-status
 * Get market open/close status (NYSE)
 */
router.get("/market-status", (req, res) => {
    try {
        const now = new Date();
        const nyTime = new Date(
            now.toLocaleString("en-US", { timeZone: "America/New_York" })
        );

        const hours = nyTime.getHours();
        const minutes = nyTime.getMinutes();
        const day = nyTime.getDay();

        // Market hours: 9:30 AM - 4:00 PM ET, Mon-Fri
        const isWeekday = day >= 1 && day <= 5;
        const afterOpen = hours > 9 || (hours === 9 && minutes >= 30);
        const beforeClose = hours < 16;

        const isOpen = isWeekday && afterOpen && beforeClose;

        // Pre-market: 4:00 AM - 9:30 AM ET
        const isPreMarket =
            isWeekday &&
            hours >= 4 &&
            (hours < 9 || (hours === 9 && minutes < 30));

        // After-hours: 4:00 PM - 8:00 PM ET
        const isAfterHours =
            isWeekday && hours >= 16 && hours < 20;

        res.json({
            success: true,
            status: isOpen ? "open" : "closed",
            isOpen,
            isPreMarket,
            isAfterHours,
            nextOpen: isOpen ? null : "9:30 AM ET",
            nextClose: isOpen ? "4:00 PM ET" : null,
            currentTime: nyTime.toISOString(),
            timezone: "America/New_York",
        });
    } catch (err) {
        console.error("❌ Market status error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to determine market status",
        });
    }
});

/**
 * GET /api/stocks/search
 * Search for stocks/crypto
 */
router.get("/search", (req, res) => {
    const query = (req.query.q || "").toLowerCase();

    if (!query || query.length < 1) {
        return res.status(400).json({
            success: false,
            error: "Search query required",
        });
    }

    const list = [...SUPPORTED_STOCKS, ...SUPPORTED_CRYPTO];

    const results = list
        .filter(
            (stock) =>
                stock.symbol.toLowerCase().includes(query) ||
                stock.name.toLowerCase().includes(query)
        )
        .slice(0, 20);

    res.json({
        success: true,
        query,
        results,
        count: results.length,
    });
});

/**
 * GET /api/stocks/compare
 * Compare multiple stocks/crypto
 * → Universe Edition: requires auth (dashboard feature)
 */
router.get("/compare", authMiddleware, async (req, res) => {
    try {
        const symbols = (req.query.symbols || "")
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);

        if (symbols.length < 2) {
            return res.status(400).json({
                success: false,
                error: "At least 2 symbols required",
            });
        }

        const comparison = await Promise.all(
            symbols.slice(0, 5).map(async (sym) => {
                const info =
                    SUPPORTED_STOCKS.find((s) => s.symbol === sym) ||
                    SUPPORTED_CRYPTO.find((s) => s.symbol === sym);

                const price = generateMockPrice(sym);
                const changePercent = (Math.random() - 0.5) * 6;

                return {
                    symbol: sym,
                    name: info?.name || sym,
                    logo: info?.logo || "📈",
                    sector: info?.sector || "Unknown",
                    price: Number(price.toFixed(2)),
                    changePercent: Number(changePercent.toFixed(2)),
                    marketCap: `$${(Math.random() * 500 + 50).toFixed(0)}B`,
                    peRatio: Number((15 + Math.random() * 30).toFixed(1)),
                    volume: `${(Math.random() * 50 + 5).toFixed(1)}M`,
                };
            })
        );

        res.json({
            success: true,
            symbols,
            comparison,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error("❌ Compare error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

module.exports = router;
