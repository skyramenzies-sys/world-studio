// routes/stocks.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const FINNHUB_API = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_API_KEY;

// 1. Supported stocks (GET)
router.get('/supported', async (req, res) => {
    try {
        const stocks = [
            { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
            { symbol: 'TSLA', name: 'Tesla Motors', type: 'stock' },
            { symbol: 'MSFT', name: 'Microsoft', type: 'stock' },
            { symbol: 'GOOG', name: 'Alphabet', type: 'stock' },
            { symbol: 'AMZN', name: 'Amazon', type: 'stock' },
        ];
        res.json(stocks);
    } catch (err) {
        console.error("Supported stocks error:", err.message);
        res.status(500).json({ error: 'Failed to fetch supported stocks' });
    }
});

// 2. OHLCV chart data for a symbol (GET)
router.get('/chart/:symbol', async (req, res) => {
    const { symbol } = req.params;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });
    try {
        const now = Math.floor(Date.now() / 1000);
        const oneDayAgo = now - 24 * 60 * 60;
        const url = `${FINNHUB_API}/stock/candle?symbol=${symbol}&resolution=5&from=${oneDayAgo}&to=${now}&token=${API_KEY}`;
        const { data } = await axios.get(url);

        if (!data.c || !Array.isArray(data.c) || !data.t)
            return res.status(400).json({ error: 'Invalid data from API' });

        const chart = data.c.map((close, i) => ({
            name: new Date(data.t[i] * 1000).toLocaleTimeString(),
            price: close,
        }));

        res.json(chart);
    } catch (err) {
        console.error('Finnhub Chart Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch stock chart data' });
    }
});

// 3. Prediction endpoint (POST) - returns current and "predicted" price
router.post('/predict', async (req, res) => {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    try {
        const url = `${FINNHUB_API}/quote?symbol=${symbol}&token=${API_KEY}`;
        const { data } = await axios.get(url);

        const current = Number(data.c) || 0;
        const predicted = current * (1 + (Math.random() - 0.5) / 50); // ±1%
        const change = predicted - current;
        const changePercent = current ? (change / current) * 100 : 0;
        const confidence = Math.min(100, Math.max(80, 100 - Math.abs(changePercent) * 2));

        res.json({
            symbol,
            currentPrice: current,
            predictedPrice: predicted,
            change,
            changePercent,
            confidence: confidence.toFixed(2),
        });
    } catch (err) {
        console.error('Prediction error:', err.message);
        res.status(500).json({ error: 'Failed to get prediction' });
    }
});

// 4. Prediction history (GET) - dummy, replace with DB if needed
router.get('/history/:symbol', async (req, res) => {
    // You should replace this with a DB query; here is dummy data for the frontend
    const { symbol } = req.params;
    // Simulate last 5 days
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
    res.json(history);
});

module.exports = router;
