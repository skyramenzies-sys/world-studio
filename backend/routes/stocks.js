// routes/stocks.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const FINNHUB_API = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_API_KEY; // Zet deze in je .env

// ✅ 1. Ondersteunde aandelen
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
        res.status(500).json({ error: 'Failed to fetch supported stocks' });
    }
});

// ✅ 2. Historische prijzen (voor grafiek + voorspelling)
router.post('/history', async (req, res) => {
    const { symbol } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    try {
        // laatste 24 u (5 min candles)
        const now = Math.floor(Date.now() / 1000);
        const oneDayAgo = now - 24 * 60 * 60;

        const url = `${FINNHUB_API}/stock/candle?symbol=${symbol}&resolution=5&from=${oneDayAgo}&to=${now}&token=${API_KEY}`;
        const { data } = await axios.get(url);

        if (!data.c || !Array.isArray(data.c))
            return res.status(400).json({ error: 'Invalid data from API' });

        const history = data.c.map((close, i) => ({
            time: new Date(data.t[i] * 1000).toLocaleTimeString(),
            close,
        }));

        res.json({ symbol, history });
    } catch (err) {
        console.error('Finnhub Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch stock history' });
    }
});

// ✅ 3. Realtime prijs + voorspelling (voor test)
router.get('/:symbol/predict', async (req, res) => {
    const { symbol } = req.params;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    try {
        const url = `${FINNHUB_API}/quote?symbol=${symbol}&token=${API_KEY}`;
        const { data } = await axios.get(url);

        const current = data.c || 0;
        const next = current * (1 + (Math.random() - 0.5) / 50); // ±1%
        const change = next - current;
        const changePct = (change / current) * 100;
        const confidence = Math.min(100, Math.max(80, 100 - Math.abs(changePct) * 2));

        res.json({
            symbol,
            currentPrice: current,
            forecastTomorrow: next.toFixed(2),
            changePct,
            confidence,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get prediction' });
    }
});

module.exports = router;
