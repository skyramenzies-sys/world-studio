// backend/routes/stocks.js
// World-Studio.live - Stock Market Data Routes
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
const ALPHA_VANTAGE_API = "https://www.alphavantage.co/query";
const API_KEY = process.env.FINNHUB_API_KEY;
const ALPHA_KEY = process.env.ALPHA_VANTAGE_KEY;

// Axios instance with timeout
const api = axios.create({
    baseURL: FINNHUB_API,
    timeout: 8000,
});

// Cache for rate limiting
const priceCache = new Map();
const CACHE_TTL = 60000; // 1 minute

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
    { symbol: "BTC", name: "Bitcoin", type: "crypto", logo: "₿" },
    { symbol: "ETH", name: "Ethereum", type: "crypto", logo: "⟠" },
    { symbol: "BNB", name: "Binance Coin", type: "crypto", logo: "🔶" },
    { symbol: "XRP", name: "Ripple", type: "crypto", logo: "💧" },
    { symbol: "SOL", name: "Solana", type: "crypto", logo: "◎" },
    { symbol: "ADA", name: "Cardano", type: "crypto", logo: "🔷" },
    { symbol: "DOGE", name: "Dogecoin", type: "crypto", logo: "🐕" },
    { symbol: "DOT", name: "Polkadot", type: "crypto", logo: "⚫" },
    { symbol: "MATIC", name: "Polygon", type: "crypto", logo: "🟣" },
    { symbol: "AVAX", name: "Avalanche", type: "crypto", logo: "🔺" },
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
        BTC: 67000, ETH: 3500, SOL: 150, XRP: 0.55, DOGE: 0.12
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
    const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, prices.length);

    // Relative Strength Index (RSI)
    let gains = 0, losses = 0;
    for (let i = 1; i < Math.min(15, prices.length); i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Volatility (standard deviation)
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance);

    return {
        sma20: Number(sma20.toFixed(2)),
        rsi: Number(rsi.toFixed(2)),
        volatility: Number(volatility.toFixed(2)),
        trend: rsi > 70 ? "overbought" : rsi < 30 ? "oversold" : "neutral"
    };
};

// ===========================================
// ROUTES
// ===========================================

/**
 * GET /api/stocks/supported
 * Get list of supported stocks
 */
router.get("/supported", (req, res) => {
    try {
        const { type, sector, search } = req.query;

        let stocks = [...SUPPORTED_STOCKS];

        if (type === "crypto") {
            stocks = [...SUPPORTED_CRYPTO];
        } else if (type === "all") {
            stocks = [...SUPPORTED_STOCKS, ...SUPPORTED_CRYPTO];
        }

        if (sector && sector !== "all") {
            stocks = stocks.filter(s => s.sector === sector);
        }

        if (search) {
            const query = search.toLowerCase();
            stocks = stocks.filter(s =>
                s.symbol.toLowerCase().includes(query) ||
                s.name.toLowerCase().includes(query)
            );
        }

        res.json({
            success: true,
            stocks,
            count: stocks.length
        });
    } catch (err) {
        console.error("❌ Supported stocks error:", err);
        res.status(500).json({
            success: false,
            error: "Could not load supported stocks"
        });
    }
});

/**
 * GET /api/stocks/sectors
 * Get available sectors
 */
router.get("/sectors", (req, res) => {
    const sectors = [...new Set(SUPPORTED_STOCKS.map(s => s.sector))];
    res.json({
        success: true,
        sectors
    });
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
            error: "Symbol required"
        });
    }

    // Check cache first
    const cached = getCachedPrice(symbol);
    if (cached) {
        return res.json({ success: true, ...cached, cached: true });
    }

    // Check if API key exists
    if (!API_KEY) {
        // Return mock data for demo
        const mockPrice = generateMockPrice(symbol);
        const stockInfo = SUPPORTED_STOCKS.find(s => s.symbol === symbol) ||
            SUPPORTED_CRYPTO.find(s => s.symbol === symbol);

        const data = {
            symbol,
            name: stockInfo?.name || symbol,
            price: mockPrice,
            change: Number((mockPrice * 0.01 * (Math.random() - 0.5)).toFixed(2)),
            changePercent: Number((Math.random() * 2 - 1).toFixed(2)),
            high: Number((mockPrice * 1.02).toFixed(2)),
            low: Number((mockPrice * 0.98).toFixed(2)),
            open: Number((mockPrice * 0.995).toFixed(2)),
            previousClose: Number((mockPrice * 0.998).toFixed(2)),
            volume: Math.floor(Math.random() * 50000000),
            timestamp: new Date().toISOString(),
            demo: true
        };

        setCachedPrice(symbol, data);
        return res.json({ success: true, ...data });
    }

    try {
        const { data } = await api.get("/quote", {
            params: { symbol, token: API_KEY }
        });

        if (!data || data.c === 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid quote data"
            });
        }

        const stockInfo = SUPPORTED_STOCKS.find(s => s.symbol === symbol);

        const result = {
            symbol,
            name: stockInfo?.name || symbol,
            logo: stockInfo?.logo || "📈",
            sector: stockInfo?.sector || "Unknown",
            price: Number(data.c),
            change: Number((data.c - data.pc).toFixed(2)),
            changePercent: Number(((data.c - data.pc) / data.pc * 100).toFixed(2)),
            high: Number(data.h),
            low: Number(data.l),
            open: Number(data.o),
            previousClose: Number(data.pc),
            timestamp: new Date().toISOString()
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
            error: "Using demo data"
        });
    }
});

/**
 * GET /api/stocks/quotes
 * Get multiple quotes at once
 */
router.get("/quotes", async (req, res) => {
    try {
        const symbols = (req.query.symbols || "").split(",").filter(Boolean);

        if (symbols.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Symbols required"
            });
        }

        const quotes = await Promise.all(
            symbols.slice(0, 20).map(async (symbol) => {
                const sym = symbol.trim().toUpperCase();
                const cached = getCachedPrice(sym);

                if (cached) return { ...cached, cached: true };

                if (!API_KEY) {
                    const mockPrice = generateMockPrice(sym);
                    const info = SUPPORTED_STOCKS.find(s => s.symbol === sym);
                    return {
                        symbol: sym,
                        name: info?.name || sym,
                        price: mockPrice,
                        change: Number((Math.random() * 4 - 2).toFixed(2)),
                        changePercent: Number((Math.random() * 4 - 2).toFixed(2)),
                        demo: true
                    };
                }

                try {
                    const { data } = await api.get("/quote", {
                        params: { symbol: sym, token: API_KEY }
                    });

                    const info = SUPPORTED_STOCKS.find(s => s.symbol === sym);
                    const result = {
                        symbol: sym,
                        name: info?.name || sym,
                        logo: info?.logo || "📈",
                        price: Number(data.c),
                        change: Number((data.c - data.pc).toFixed(2)),
                        changePercent: Number(((data.c - data.pc) / data.pc * 100).toFixed(2))
                    };

                    setCachedPrice(sym, result);
                    return result;
                } catch (e) {
                    return { symbol: sym, error: e.message };
                }
            })
        );

        res.json({
            success: true,
            quotes,
            count: quotes.length
        });
    } catch (err) {
        console.error("❌ Quotes error:", err);
        res.status(500).json({
            success: false,
            error: err.message
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
            error: "Symbol required"
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
        "5Y": 5 * 365 * 24 * 60 * 60
    };

    const seconds = ranges[range] || ranges["1D"];
    const from = now - seconds;

    if (!API_KEY) {
        // Generate mock chart data
        const points = range === "1D" ? 78 : range === "1W" ? 35 : 30;
        const basePrice = generateMockPrice(symbol);

        const chart = Array.from({ length: points }).map((_, i) => {
            const variance = basePrice * 0.03 * (Math.random() - 0.5);
            const price = basePrice + variance + (i * 0.1);
            const time = new Date(Date.now() - (points - i) * (seconds * 1000 / points));

            return {
                time: time.toISOString(),
                timestamp: Math.floor(time.getTime() / 1000),
                open: Number((price - Math.random()).toFixed(2)),
                high: Number((price + Math.random() * 2).toFixed(2)),
                low: Number((price - Math.random() * 2).toFixed(2)),
                close: Number(price.toFixed(2)),
                volume: Math.floor(Math.random() * 1000000)
            };
        });

        return res.json({
            success: true,
            symbol,
            range,
            resolution,
            chart,
            demo: true
        });
    }

    try {
        const { data } = await api.get("/stock/candle", {
            params: {
                symbol,
                resolution,
                from,
                to: now,
                token: API_KEY
            }
        });

        if (!data || data.s !== "ok") {
            return res.status(400).json({
                success: false,
                error: "Invalid chart data"
            });
        }

        const chart = data.t.map((timestamp, i) => ({
            time: new Date(timestamp * 1000).toISOString(),
            timestamp,
            open: Number(data.o[i]),
            high: Number(data.h[i]),
            low: Number(data.l[i]),
            close: Number(data.c[i]),
            volume: Number(data.v[i])
        }));

        // Calculate indicators
        const prices = chart.map(c => c.close);
        const indicators = calculateIndicators(prices);

        res.json({
            success: true,
            symbol,
            range,
            resolution,
            chart,
            indicators,
            count: chart.length
        });

    } catch (err) {
        console.error("❌ Chart error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to fetch chart data",
            details: err.message
        });
    }
});

/**
 * POST /api/stocks/predict
 * Get price prediction (demo ML model)
 */
router.post("/predict", async (req, res) => {
    const symbol = (req.body.symbol || "").trim().toUpperCase();
    const { timeframe = "1D" } = req.body;

    if (!symbol) {
        return res.status(400).json({
            success: false,
            error: "Symbol required"
        });
    }

    try {
        let currentPrice;

        if (API_KEY) {
            const { data } = await api.get("/quote", {
                params: { symbol, token: API_KEY }
            });
            currentPrice = Number(data.c);
        } else {
            currentPrice = generateMockPrice(symbol);
        }

        if (!currentPrice) {
            return res.status(400).json({
                success: false,
                error: "Could not get current price"
            });
        }

        // Simulate ML prediction (demo)
        const volatility = 0.02; // 2% base volatility
        const timeMultiplier = {
            "1H": 0.3, "1D": 1, "1W": 2.5, "1M": 5
        }[timeframe] || 1;

        const changePercent = (Math.random() - 0.48) * volatility * timeMultiplier * 100;
        const predicted = currentPrice * (1 + changePercent / 100);
        const change = predicted - currentPrice;

        // Confidence decreases with longer timeframes and larger predictions
        const baseConfidence = 85;
        const volatilityPenalty = Math.abs(changePercent) * 2;
        const timePenalty = (timeMultiplier - 1) * 5;
        const confidence = Math.max(50, baseConfidence - volatilityPenalty - timePenalty);

        // Sentiment based on prediction
        const sentiment = changePercent > 1 ? "bullish" :
            changePercent < -1 ? "bearish" : "neutral";

        const stockInfo = SUPPORTED_STOCKS.find(s => s.symbol === symbol);

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
            disclaimer: "This is a demo prediction for entertainment purposes only. Not financial advice."
        });

    } catch (err) {
        console.error("❌ Prediction error:", err.message);
        res.status(500).json({
            success: false,
            error: "Prediction failed",
            details: err.message
        });
    }
});

/**
 * GET /api/stocks/history/:symbol
 * Get prediction history (simulated)
 */
router.get("/history/:symbol", (req, res) => {
    const symbol = (req.params.symbol || "").trim().toUpperCase();
    const { days = 7 } = req.query;

    if (!symbol) {
        return res.status(400).json({
            success: false,
            error: "Symbol required"
        });
    }

    const basePrice = generateMockPrice(symbol);
    const today = new Date();

    const history = Array.from({ length: parseInt(days) }).map((_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const predictedVariance = basePrice * 0.02 * (Math.random() - 0.5);
        const actualVariance = basePrice * 0.02 * (Math.random() - 0.5);
        const predicted = basePrice + predictedVariance;
        const actual = basePrice + actualVariance;
        const accuracy = 100 - Math.abs((predicted - actual) / actual * 100);

        return {
            date: date.toISOString().split("T")[0],
            predictedPrice: Number(predicted.toFixed(2)),
            actualPrice: Number(actual.toFixed(2)),
            difference: Number((predicted - actual).toFixed(2)),
            accuracy: Number(Math.max(70, accuracy).toFixed(1)),
            direction: predicted >= actual ? "correct" : "incorrect"
        };
    });

    // Calculate overall accuracy
    const avgAccuracy = history.reduce((sum, h) => sum + h.accuracy, 0) / history.length;
    const correctDirections = history.filter(h => h.direction === "correct").length;

    res.json({
        success: true,
        symbol,
        days: parseInt(days),
        history: history.reverse(),
        summary: {
            avgAccuracy: Number(avgAccuracy.toFixed(1)),
            correctDirections,
            directionAccuracy: Number((correctDirections / history.length * 100).toFixed(1))
        }
    });
});

/**
 * GET /api/stocks/news/:symbol
 * Get stock news (requires API key)
 */
router.get("/news/:symbol", async (req, res) => {
    const symbol = (req.params.symbol || "").trim().toUpperCase();
    const { limit = 10 } = req.query;

    if (!symbol) {
        return res.status(400).json({
            success: false,
            error: "Symbol required"
        });
    }

    if (!API_KEY) {
        // Return mock news
        const stockInfo = SUPPORTED_STOCKS.find(s => s.symbol === symbol);
        const mockNews = [
            {
                id: 1,
                headline: `${stockInfo?.name || symbol} Shows Strong Q4 Performance`,
                summary: `Analysts are optimistic about ${symbol}'s growth trajectory...`,
                source: "Market Watch",
                datetime: Date.now() / 1000 - 3600,
                url: "#",
                sentiment: "positive"
            },
            {
                id: 2,
                headline: `${symbol} Announces New Product Launch`,
                summary: `The company unveiled its latest innovation today...`,
                source: "Tech News",
                datetime: Date.now() / 1000 - 7200,
                url: "#",
                sentiment: "positive"
            },
            {
                id: 3,
                headline: `Market Analysis: ${symbol} Stock Outlook`,
                summary: `Experts weigh in on the future of ${symbol}...`,
                source: "Financial Times",
                datetime: Date.now() / 1000 - 14400,
                url: "#",
                sentiment: "neutral"
            }
        ];

        return res.json({
            success: true,
            symbol,
            news: mockNews,
            demo: true
        });
    }

    try {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const { data } = await api.get("/company-news", {
            params: {
                symbol,
                from: weekAgo.toISOString().split("T")[0],
                to: today.toISOString().split("T")[0],
                token: API_KEY
            }
        });

        const news = (data || []).slice(0, parseInt(limit)).map(item => ({
            id: item.id,
            headline: item.headline,
            summary: item.summary,
            source: item.source,
            datetime: item.datetime,
            url: item.url,
            image: item.image
        }));

        res.json({
            success: true,
            symbol,
            news,
            count: news.length
        });

    } catch (err) {
        console.error("❌ News error:", err.message);
        res.status(500).json({
            success: false,
            error: "Failed to fetch news"
        });
    }
});

/**
 * GET /api/stocks/movers
 * Get top gainers and losers
 */
router.get("/movers", async (req, res) => {
    try {
        // Generate mock movers from supported stocks
        const movers = SUPPORTED_STOCKS.slice(0, 10).map(stock => {
            const price = generateMockPrice(stock.symbol);
            const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%

            return {
                ...stock,
                price: Number(price.toFixed(2)),
                change: Number((price * changePercent / 100).toFixed(2)),
                changePercent: Number(changePercent.toFixed(2))
            };
        });

        const gainers = movers
            .filter(m => m.changePercent > 0)
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 5);

        const losers = movers
            .filter(m => m.changePercent < 0)
            .sort((a, b) => a.changePercent - b.changePercent)
            .slice(0, 5);

        res.json({
            success: true,
            gainers,
            losers,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error("❌ Movers error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

/**
 * GET /api/stocks/market-status
 * Get market open/close status
 */
router.get("/market-status", (req, res) => {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

    const hours = nyTime.getHours();
    const minutes = nyTime.getMinutes();
    const day = nyTime.getDay();

    // Market hours: 9:30 AM - 4:00 PM ET, Mon-Fri
    const isWeekday = day >= 1 && day <= 5;
    const afterOpen = hours > 9 || (hours === 9 && minutes >= 30);
    const beforeClose = hours < 16;

    const isOpen = isWeekday && afterOpen && beforeClose;

    // Pre-market: 4:00 AM - 9:30 AM ET
    const isPreMarket = isWeekday && hours >= 4 && (hours < 9 || (hours === 9 && minutes < 30));

    // After-hours: 4:00 PM - 8:00 PM ET
    const isAfterHours = isWeekday && hours >= 16 && hours < 20;

    res.json({
        success: true,
        status: isOpen ? "open" : "closed",
        isOpen,
        isPreMarket,
        isAfterHours,
        nextOpen: isOpen ? null : "9:30 AM ET",
        nextClose: isOpen ? "4:00 PM ET" : null,
        currentTime: nyTime.toISOString(),
        timezone: "America/New_York"
    });
});

/**
 * GET /api/stocks/search
 * Search for stocks
 */
router.get("/search", async (req, res) => {
    const query = (req.query.q || "").toLowerCase();

    if (!query || query.length < 1) {
        return res.status(400).json({
            success: false,
            error: "Search query required"
        });
    }

    // Search in supported stocks
    const results = [...SUPPORTED_STOCKS, ...SUPPORTED_CRYPTO].filter(stock =>
        stock.symbol.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query)
    ).slice(0, 20);

    res.json({
        success: true,
        query,
        results,
        count: results.length
    });
});

/**
 * GET /api/stocks/compare
 * Compare multiple stocks
 */
router.get("/compare", async (req, res) => {
    try {
        const symbols = (req.query.symbols || "").split(",").filter(Boolean);

        if (symbols.length < 2) {
            return res.status(400).json({
                success: false,
                error: "At least 2 symbols required"
            });
        }

        const comparison = await Promise.all(
            symbols.slice(0, 5).map(async (symbol) => {
                const sym = symbol.trim().toUpperCase();
                const info = SUPPORTED_STOCKS.find(s => s.symbol === sym) ||
                    SUPPORTED_CRYPTO.find(s => s.symbol === sym);

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
                    volume: `${(Math.random() * 50 + 5).toFixed(1)}M`
                };
            })
        );

        res.json({
            success: true,
            symbols,
            comparison,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error("❌ Compare error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;