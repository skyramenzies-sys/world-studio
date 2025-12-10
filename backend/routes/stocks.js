const express = require("express");
const router = express.Router();
const axios = require("axios");

// Cache with 5 minute TTL
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

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

// Mock data for when APIs are rate limited
const MOCK_CRYPTO = {
    bitcoin: { usd: 97500, usd_24h_change: 2.1 },
    ethereum: { usd: 3650, usd_24h_change: 1.5 },
    solana: { usd: 225, usd_24h_change: 3.2 },
    binancecoin: { usd: 685, usd_24h_change: 0.8 },
    ripple: { usd: 2.35, usd_24h_change: 4.5 },
    cardano: { usd: 1.05, usd_24h_change: 2.8 },
    dogecoin: { usd: 0.42, usd_24h_change: 5.2 },
    polkadot: { usd: 9.50, usd_24h_change: 1.2 },
    "avalanche-2": { usd: 45, usd_24h_change: 2.5 },
    chainlink: { usd: 25, usd_24h_change: 1.8 },
    tron: { usd: 0.25, usd_24h_change: 0.5 },
    "polygon-ecosystem-token": { usd: 0.55, usd_24h_change: 1.1 }
};

// ============ CRYPTO PRICES ============
router.get("/crypto/prices", async (req, res) => {
    const cacheKey = `prices-${req.query.ids || "default"}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const ids = req.query.ids || "bitcoin,ethereum,solana";
        const response = await axios.get(
            "https://api.coingecko.com/api/v3/simple/price",
            {
                params: { ids, vs_currencies: "usd", include_24hr_change: true },
                timeout: 10000
            }
        );
        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (err) {
        console.error("Crypto prices error:", err.message);
        res.json(MOCK_CRYPTO);
    }
});

// ============ CRYPTO DETAILS ============
router.get("/crypto/:coinId", async (req, res) => {
    const coinId = req.params.coinId;
    const cacheKey = `coin-${coinId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${coinId}`,
            {
                params: { localization: false, tickers: false, community_data: false, developer_data: false },
                timeout: 10000
            }
        );
        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (err) {
        console.error("Crypto detail error:", err.message);
        // Return mock coin data
        const mockPrice = MOCK_CRYPTO[coinId]?.usd || 100;
        res.json({
            id: coinId,
            symbol: coinId.substring(0, 3).toUpperCase(),
            name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
            market_data: {
                current_price: { usd: mockPrice },
                price_change_percentage_24h: MOCK_CRYPTO[coinId]?.usd_24h_change || 0,
                price_change_percentage_7d: 5.2,
                high_24h: { usd: mockPrice * 1.05 },
                low_24h: { usd: mockPrice * 0.95 },
                market_cap: { usd: mockPrice * 1000000000 },
                total_volume: { usd: mockPrice * 50000000 },
                ath: { usd: mockPrice * 1.5 },
                ath_change_percentage: { usd: -10 }
            },
            market_cap_rank: 10
        });
    }
});

// ============ CRYPTO CHART ============
router.get("/crypto/:coinId/chart", async (req, res) => {
    const { days = 7 } = req.query;
    const coinId = req.params.coinId;
    const cacheKey = `chart-${coinId}-${days}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
            {
                params: { vs_currency: "usd", days },
                timeout: 10000
            }
        );
        setCache(cacheKey, response.data);
        res.json(response.data);
    } catch (err) {
        console.error("Crypto chart error:", err.message);
        // Generate mock chart data
        const basePrice = MOCK_CRYPTO[coinId]?.usd || 100;
        const prices = [];
        const now = Date.now();
        for (let i = parseInt(days); i >= 0; i--) {
            const timestamp = now - (i * 24 * 60 * 60 * 1000);
            const variation = 1 + (Math.random() - 0.5) * 0.1;
            prices.push([timestamp, basePrice * variation]);
        }
        res.json({ prices });
    }
});

// ============ STOCK QUOTES ============
router.get("/quotes", async (req, res) => {
    const symbols = req.query.symbols || "AAPL,GOOGL,MSFT";
    const cacheKey = `quotes-${symbols}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Mock stock data (Yahoo requires auth now)
    const mockStocks = {
        AAPL: { price: 195.50, change: 1.2 },
        GOOGL: { price: 175.80, change: 0.8 },
        MSFT: { price: 425.30, change: 1.5 },
        TSLA: { price: 355.20, change: 3.2 },
        NVDA: { price: 142.50, change: 2.1 },
        AMZN: { price: 198.75, change: 0.9 },
        META: { price: 585.40, change: 1.8 },
        AMD: { price: 138.60, change: 2.5 },
        NFLX: { price: 875.20, change: 0.5 },
        DIS: { price: 112.30, change: -0.3 }
    };

    const result = symbols.split(",").map(sym => ({
        symbol: sym,
        regularMarketPrice: mockStocks[sym]?.price || 100,
        regularMarketChangePercent: mockStocks[sym]?.change || 0,
        shortName: sym
    }));

    const data = { quoteResponse: { result } };
    setCache(cacheKey, data);
    res.json(data);
});

// ============ STOCK CHART ============
router.get("/chart/:symbol", async (req, res) => {
    const { range = "5d" } = req.query;
    const symbol = req.params.symbol;
    const cacheKey = `stockchart-${symbol}-${range}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Generate mock chart
    const basePrice = 150;
    const timestamps = [];
    const closes = [];
    const now = Math.floor(Date.now() / 1000);
    
    for (let i = 5; i >= 0; i--) {
        timestamps.push(now - (i * 24 * 60 * 60));
        closes.push(basePrice * (1 + (Math.random() - 0.5) * 0.05));
    }

    const data = {
        chart: {
            result: [{
                timestamp: timestamps,
                indicators: {
                    quote: [{ close: closes }]
                }
            }]
        }
    };
    
    setCache(cacheKey, data);
    res.json(data);
});

module.exports = router;
