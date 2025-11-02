const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Stock prediction endpoint
router.post('/predict', async (req, res) => {
    try {
        const { symbol } = req.body;

        if (!symbol) {
            return res.status(400).json({ error: 'Stock symbol required' });
        }

        // Path to Python script
        const pythonScript = path.join(__dirname, '..', 'predict_stock.py');

        // Run Python script
        const python = spawn('python3', [pythonScript, symbol]);

        let dataString = '';
        let errorString = '';

        python.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        python.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                console.error('Python error:', errorString);
                return res.status(500).json({ error: 'Prediction failed', details: errorString });
            }

            try {
                const prediction = JSON.parse(dataString);

                if (prediction.error) {
                    return res.status(400).json(prediction);
                }

                res.json(prediction);
            } catch (parseError) {
                console.error('Parse error:', parseError);
                res.status(500).json({ error: 'Failed to parse prediction' });
            }
        });

    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ error: 'Failed to generate prediction' });
    }
});

// Get supported stocks/assets
router.get('/supported', (req, res) => {
    const supported = [
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
        { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
        { symbol: 'GOOGL', name: 'Google', type: 'stock' },
        { symbol: 'MSFT', name: 'Microsoft', type: 'stock' },
        { symbol: 'AMZN', name: 'Amazon', type: 'stock' },
        { symbol: 'BTC-USD', name: 'Bitcoin', type: 'crypto' },
        { symbol: 'ETH-USD', name: 'Ethereum', type: 'crypto' },
        { symbol: 'GC=F', name: 'Gold', type: 'commodity' },
        { symbol: 'CL=F', name: 'Crude Oil', type: 'commodity' }
    ];

    res.json(supported);
});

module.exports = router;