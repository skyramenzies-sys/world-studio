// backend/routes/crypto.js
// World-Studio.live - Crypto Price Proxy (with caching)
// Solves CORS and rate-limiting issues with CoinGecko

// Solves CORS and rate-limiting issues with CoinGecko
const express = require("express");
const axios = require("axios");
const router = express.Router();

// Simple in-memory cache structure
const cache = {
    markets: { data: null, timestamp: 0 },
    trending: { data: null, timestamp: 0 },
};

const CACHE_DURATION = 60 * 1000; // 60 seconds
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

// Helper to check if cache is valid
const isCacheValid = (timestamp) =>
    Date.now() - timestamp < CACHE_DURATION;

// Helper to fetch with timeout
const fetchWithTimeout = async (url, timeout = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        clearTimeout(timeoutId);
        throw err;
    }
};

// ------------------------------------------------
// GET /api/crypto/prices
// Get prices for multiple coins
// ------------------------------------------------
router.get("/prices", async (req, res) => {
    try {
        const {
            ids = "bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot,avalanche-2,chainlink,tron,matic-network",
            vs_currency = "usd"
        } = req.query;

        // Check cache
        const cacheKey = `${ids}-${vs_currency}`;
        if (cache.prices.data && cache.prices.key === cacheKey && isCacheValid(cache.prices.timestamp)) {
            return res.json(cache.prices.data);
        }

        // Fetch from CoinGecko
        const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=${vs_currency}&include_24hr_change=true&include_market_cap=true`;

        const data = await fetchWithTimeout(url);

        // Update cache
        cache.prices = {
            data,
            key: cacheKey,
            timestamp: Date.now()
        };

        res.json(data);
    } catch (err) {
        console.error("❌ Crypto prices error:", err.message);

        // Return cached data if available (even if stale)
        if (cache.prices.data) {
            return res.json({
                ...cache.prices.data,
                _cached: true,
                _cacheAge: Date.now() - cache.prices.timestamp
            });
        }

        res.status(503).json({
            error: "Unable to fetch crypto prices",
            message: err.message
        });
    }
});

// ------------------------------------------------
// GET /api/crypto/coin/:coinId
// Get detailed info for a single coin
// ------------------------------------------------
router.get("/coin/:coinId", async (req, res) => {
    try {
        const { coinId } = req.params;

        // Check cache
        const cached = cache.coins.get(coinId);
        if (cached && isCacheValid(cached.timestamp)) {
            return res.json(cached.data);
        }

        // Fetch from CoinGecko
        const url = `${COINGECKO_BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;

        const data = await fetchWithTimeout(url);

        // Update cache
        cache.coins.set(coinId, {
            data,
            timestamp: Date.now()
        });

        res.json(data);
    } catch (err) {
        console.error(`❌ Crypto coin ${req.params.coinId} error:`, err.message);

        // Return cached data if available
        const cached = cache.coins.get(req.params.coinId);
        if (cached) {
            return res.json({
                ...cached.data,
                _cached: true
            });
        }

        res.status(503).json({
            error: "Unable to fetch coin data",
            message: err.message
        });
    }
});

// ------------------------------------------------
// GET /api/crypto/chart/:coinId
// Get price chart data for a coin
// ------------------------------------------------
router.get("/chart/:coinId", async (req, res) => {
    try {
        const { coinId } = req.params;
        const { days = 7, interval = "daily", vs_currency = "usd" } = req.query;

        const cacheKey = `${coinId}-${days}-${interval}-${vs_currency}`;

        // Check cache
        const cached = cache.charts.get(cacheKey);
        if (cached && isCacheValid(cached.timestamp)) {
            return res.json(cached.data);
        }

        // Fetch from CoinGecko
        const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=${vs_currency}&days=${days}&interval=${interval}`;

        const data = await fetchWithTimeout(url);

        // Update cache
        cache.charts.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        res.json(data);
    } catch (err) {
        console.error(`❌ Crypto chart ${req.params.coinId} error:`, err.message);

        const cacheKey = `${req.params.coinId}-${req.query.days || 7}-${req.query.interval || "daily"}-${req.query.vs_currency || "usd"}`;
        const cached = cache.charts.get(cacheKey);
        if (cached) {
            return res.json({
                ...cached.data,
                _cached: true
            });
        }

        res.status(503).json({
            error: "Unable to fetch chart data",
            message: err.message
        });
    }
});

// ------------------------------------------------
// GET /api/crypto/markets
// Get market data for top coins
// ------------------------------------------------
router.get("/markets", async (req, res) => {
    try {
        const {
            vs_currency = "usd",
            order = "market_cap_desc",
            per_page = 20,
            page = 1
        } = req.query;

        const cacheKey = `markets-${vs_currency}-${order}-${per_page}-${page}`;

        // Check cache
        if (cache.markets?.key === cacheKey && isCacheValid(cache.markets.timestamp)) {
            return res.json(cache.markets.data);
        }

        // Fetch from CoinGecko
        const url = `${COINGECKO_BASE}/coins/markets?vs_currency=${vs_currency}&order=${order}&per_page=${per_page}&page=${page}&sparkline=true&price_change_percentage=24h,7d`;

        const data = await fetchWithTimeout(url);

        // Update cache
        cache.markets = {
            data,
            key: cacheKey,
            timestamp: Date.now()
        };

        res.json(data);
    } catch (err) {
        console.error("❌ Crypto markets error:", err.message);

        if (cache.markets?.data) {
            return res.json({
                data: cache.markets.data,
                _cached: true
            });
        }

        res.status(503).json({
            error: "Unable to fetch market data",
            message: err.message
        });
    }
});

// ------------------------------------------------
// GET /api/crypto/trending
// Get trending coins
// ------------------------------------------------
router.get("/trending", async (req, res) => {
    try {
        // Check cache (longer duration for trending - 5 minutes)
        if (cache.trending && Date.now() - cache.trending.timestamp < 5 * 60 * 1000) {
            return res.json(cache.trending.data);
        }

        const url = `${COINGECKO_BASE}/search/trending`;
        const data = await fetchWithTimeout(url);

        cache.trending = {
            data,
            timestamp: Date.now()
        };

        res.json(data);
    } catch (err) {
        console.error("❌ Crypto trending error:", err.message);

        if (cache.trending?.data) {
            return res.json({
                ...cache.trending.data,
                _cached: true
            });
        }

        res.status(503).json({
            error: "Unable to fetch trending data",
            message: err.message
        });
    }
});

module.exports = router;