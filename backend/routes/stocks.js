// backend/routes/stocks.js
"use strict";

const express = require("express");
const axios = require("axios");
const router = express.Router();

const FINNHUB_API = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY;

// ---------------------------------------------
// GLOBAL AXIOS INSTANCE (timeout + defaults)
// ---------------------------------------------
const api = axios.create({
    baseURL: FINNHUB_API,
    timeout: 6000, // avoid hanging server
});

// ---------------------------------------------
// 1. Supported Stocks (Static List)
// ---------------------------------------------
router.get("/supported", (req, res) => {
    try {
        return res.json([
            { symbol: "AAPL", name: "Apple Inc.", type: "stock" },
            { symbol: "TSLA", name: "Tesla Motors", type: "stock" },
            { symbol: "MSFT", name: "Microsoft", type: "stock" },
            { symbol: "GOOG", name: "Alphabet", type: "stock" },
            { symbol: "AMZN", name: "Amazon", type: "stock" },
        ]);
    } catch (err) {
        console.error("Supported Stocks Error:", err);
        return res.status(500).json({ error: "Could not load supported stocks" });
    }
});

// ---------------------------------------------
// 2. OHLCV Chart Data (5-min interval)
// ---------------------------------------------
router.get("/chart/:symbol", async (req, res) => {
    const symbol = (req.params.symbol || "").trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Symbol required" });

    if (!API_KEY) {
        return res.status(500).json({ error: "Missing FINNHUB_API_KEY" });
    }

    try {
        const now = Math.floor(Date.now() / 1000);
        const oneDayAgo = now - 24 * 60 * 60;

        const { data } = await api.get("/stock/candle", {
            params: {
                symbol,
                resolution: 5,
                from: oneDayAgo,
                to: now,
                token: API_KEY,
            },
        });

        if (!data || data.s !== "ok") {
            return res.status(400).json({ error: "Invalid chart data received" });
        }

        const chart = data.c.map((close, i) => ({
            time: new Date(data.t[i] * 1000).toISOString(),
            price: Number(close),
        }));

        return res.json(chart);

    } catch (err) {
        console.error("Finnhub Chart Error:", err.message);
        return res.status(500).json({
            error: "Failed to fetch chart data",
            details: err.message,
        });
    }
});

// ---------------------------------------------
// 3. Price Prediction (Demo Logic)
// ---------------------------------------------
router.post("/predict", async (req, res) => {
    const symbol = (req.body.symbol || "").trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Symbol required" });

    if (!API_KEY) {
        return res.status(500).json({ error: "Missing FINNHUB_API_KEY" });
    }

    try {
        const { data } = await api.get("/quote", {
            params: { symbol, token: API_KEY },
        });

        const current = Number(data.c || 0);
        if (!current) return res.status(400).json({ error: "Invalid price received" });

        const predicted = current * (1 + (Math.random() - 0.5) / 50); // ±1%
        const change = predicted - current;
        const changePercent = (change / current) * 100;
        const confidence = Math.max(75, 100 - Math.abs(changePercent) * 2);

        return res.json({
            symbol,
            currentPrice: current,
            predictedPrice: Number(predicted.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            confidence: Number(confidence.toFixed(2)),
        });

    } catch (err) {
        console.error("Prediction Error:", err.message);
        return res.status(500).json({ error: "Prediction failed", details: err.message });
    }
});

// ---------------------------------------------
// 4. 5-Day Prediction History (Simulated)
// ---------------------------------------------
router.get("/history/:symbol", (req, res) => {
    const symbol = (req.params.symbol || "").trim().toUpperCase();
    if (!symbol) return res.status(400).json({ error: "Symbol required" });

    const today = new Date();

    const history = Array.from({ length: 5 }).map((_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        return {
            date: date.toISOString(),
            predictedPrice: (150 + Math.random() * 10).toFixed(2),
            actualPrice: (150 + Math.random() * 10).toFixed(2),
            confidence: (80 + Math.random() * 15).toFixed(2),
        };
    });

    return res.json(history.reverse());
});

module.exports = router;
