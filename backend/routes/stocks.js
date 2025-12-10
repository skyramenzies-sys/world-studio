const express = require("express");
const router = express.Router();
const axios = require("axios");

// ============ CRYPTO PRICES (CoinGecko) ============
router.get("/crypto/prices", async (req, res) => {
    try {
        const ids = req.query.ids || "bitcoin,ethereum,solana,binancecoin,ripple,cardano,dogecoin,polkadot,avalanche-2,chainlink,tron,polygon-ecosystem-token";
        const response = await axios.get(
            "https://api.coingecko.com/api/v3/simple/price",
            {
                params: {
                    ids,
                    vs_currencies: "usd",
                    include_24hr_change: true
                },
                timeout: 10000
            }
        );
        res.json(response.data);
    } catch (err) {
        console.error("Crypto prices error:", err.message);
        res.status(500).json({ error: "Failed to fetch crypto prices" });
    }
});

// ============ CRYPTO DETAILS ============
router.get("/crypto/:coinId", async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${req.params.coinId}`,
            {
                params: {
                    localization: false,
                    tickers: false,
                    community_data: false,
                    developer_data: false
                },
                timeout: 10000
            }
        );
        res.json(response.data);
    } catch (err) {
        console.error("Crypto detail error:", err.message);
        res.status(500).json({ error: "Failed to fetch crypto details" });
    }
});

// ============ CRYPTO CHART ============
router.get("/crypto/:coinId/chart", async (req, res) => {
    try {
        const { days = 7, interval = "daily" } = req.query;
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${req.params.coinId}/market_chart`,
            {
                params: {
                    vs_currency: "usd",
                    days,
                    interval
                },
                timeout: 10000
            }
        );
        res.json(response.data);
    } catch (err) {
        console.error("Crypto chart error:", err.message);
        res.status(500).json({ error: "Failed to fetch crypto chart" });
    }
});

// ============ STOCK QUOTES (Yahoo Finance proxy) ============
router.get("/quotes", async (req, res) => {
    try {
        const symbols = req.query.symbols || "AAPL,GOOGL,MSFT,TSLA,NVDA";
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v7/finance/quote`,
            {
                params: { symbols },
                headers: {
                    "User-Agent": "Mozilla/5.0"
                },
                timeout: 10000
            }
        );
        res.json(response.data);
    } catch (err) {
        console.error("Stock quotes error:", err.message);
        res.status(500).json({ error: "Failed to fetch stock quotes" });
    }
});

// ============ STOCK CHART ============
router.get("/chart/:symbol", async (req, res) => {
    try {
        const { range = "5d", interval = "1d" } = req.query;
        const response = await axios.get(
            `https://query1.finance.yahoo.com/v8/finance/chart/${req.params.symbol}`,
            {
                params: { range, interval },
                headers: {
                    "User-Agent": "Mozilla/5.0"
                },
                timeout: 10000
            }
        );
        res.json(response.data);
    } catch (err) {
        console.error("Stock chart error:", err.message);
        res.status(500).json({ error: "Failed to fetch stock chart" });
    }
});

module.exports = router;
