const express = require("express");
const router = express.Router();
const axios = require("axios");

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

const getCached = (key) => {
    const item = cache.get(key);
    if (item && Date.now() - item.timestamp < CACHE_TTL) {
        return item.data;
    }
    return null;
};

const setCache = (key, data) => {
    cache.set(key, { data, timestamp: Date.now() });
};

// ============ CRYPTO PRICES ============
router.get("/crypto/prices", async (req, res) => {
    const cacheKey = `prices-${req.query.ids || "default"}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const ids = req.query.ids || "bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin";
        const response = await axios.get(
            "https://api.coingecko.com/api/v3/simple/price",
            {
                params: { ids, vs_currencies: "usd", include_24hr_change: true },
                timeout: 15000,
                headers: { "Accept": "application/json" }
            }
        );
        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (err) {
        console.error("Crypto prices error:", err.message);
        // Return mock data on error
        res.json({
            bitcoin: { usd: 97500, usd_24h_change: 2.1 },
            ethereum: { usd: 3650, usd_24h_change: 1.5 },
            solana: { usd: 225, usd_24h_change: 3.2 }
        });
    }
});

// ============ CRYPTO DETAILS ============
router.get("/crypto/:coinId", async (req, res) => {
    const cacheKey = `coin-${req.params.coinId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${req.params.coinId}`,
            {
                params: { localization: false, tickers: false, community_data: false, developer_data: false },
                timeout: 15000,
                headers: { "Accept": "application/json" }
            }
        );
        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (err) {
        console.error("Crypto detail error:", err.message);
        res.status(500).json({ error: "Rate limited - try again later" });
    }
});

// ============ CRYPTO CHART ============
router.get("/crypto/:coinId/chart", async (req, res) => {
    const { days = 7, interval = "daily" } = req.query;
    const cacheKey = `chart-${req.params.coinId}-${days}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${req.params.coinId}/market_chart`,
            {
                params: { vs_currency: "usd", days, interval },
                timeout: 15000,
                headers: { "Accept": "application/json" }
            }
        );
        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (err) {
        console.error("Crypto chart error:", err.message);
        res.status(500).json({ error: "Rate limited - try again later" });
    }
});

// ============ STOCK QUOTES ============
router.get("/quotes", async (req, res) => {
    const symbols = req.query.symbols || "AAPL,GOOGL,MSFT";
    const cacheKey = `quotes-${symbols}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v7/finance/quote`,
            {
                params: { symbols },
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
                timeout: 15000
            }
        );
        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (err) {
        console.error("Stock quotes error:", err.message);
        // Return mock data
        res.json({ quoteResponse: { result: [] } });
    }
});

// ============ STOCK CHART ============
router.get("/chart/:symbol", async (req, res) => {
    const { range = "5d", interval = "1d" } = req.query;
    const cacheKey = `stockchart-${req.params.symbol}-${range}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${req.params.symbol}`,
            {
                params: { range, interval },
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
                timeout: 15000
            }
        );
        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (err) {
        console.error("Stock chart error:", err.message);
        res.status(500).json({ error: "Failed to fetch stock chart" });
    }
});

module.exports = router;
