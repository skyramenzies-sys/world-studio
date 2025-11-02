import React, { useState, useEffect } from 'react';
import './StockPredictor.css';

const StockPredictor = () => {
    const [stocks, setStocks] = useState([]);
    const [selectedStock, setSelectedStock] = useState('AAPL');
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch supported stocks on mount
    useEffect(() => {
        fetchSupportedStocks();
    }, []);

    const fetchSupportedStocks = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/stocks/supported');
            const data = await response.json();
            setStocks(data);
        } catch (err) {
            console.error('Error fetching stocks:', err);
        }
    };

    const getPrediction = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:5000/api/stocks/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symbol: selectedStock })
            });

            if (!response.ok) {
                throw new Error('Prediction failed');
            }

            const data = await response.json();
            setPrediction(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="stock-predictor">
            <h1>World-Studio Stock Price Predictor 📈</h1>
            <p className="subtitle">Powered by World-Studio!</p>

            <div className="predictor-card">
                <div className="input-section">
                    <label>Select Asset:</label>
                    <select
                        value={selectedStock}
                        onChange={(e) => setSelectedStock(e.target.value)}
                        className="stock-select"
                    >
                        {stocks.map((stock) => (
                            <option key={stock.symbol} value={stock.symbol}>
                                {stock.name} ({stock.symbol}) - {stock.type}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={getPrediction}
                        disabled={loading}
                        className="predict-button"
                    >
                        {loading ? '🔄 Analyzing...' : '🚀 Get Prediction'}
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        ❌ {error}
                    </div>
                )}

                {prediction && (
                    <div className="prediction-result">
                        <h2>{prediction.symbol} Prediction</h2>

                        <div className="price-section">
                            <div className="price-box">
                                <span className="label">Current Price</span>
                                <span className="price">${prediction.currentPrice.toFixed(2)}</span>
                            </div>

                            <div className="arrow">→</div>

                            <div className="price-box">
                                <span className="label">Predicted Tomorrow</span>
                                <span className="price predicted">${prediction.predictedPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="change-section">
                            <div className={`change ${prediction.change > 0 ? 'positive' : 'negative'}`}>
                                {prediction.change > 0 ? '📈' : '📉'}
                                {prediction.change > 0 ? '+' : ''}${prediction.change.toFixed(2)}
                                ({prediction.changePercent > 0 ? '+' : ''}{prediction.changePercent.toFixed(2)}%)
                            </div>
                        </div>

                        <div className="confidence-section">
                            <span>World-Studio Confidence: {prediction.confidence}%</span>
                            <div className="confidence-bar">
                                <div
                                    className="confidence-fill"
                                    style={{ width: `${prediction.confidence}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="disclaimer">
                            This is World-Studio prediction, can be financial advice. Past performance may guarantee future results if you learn about it.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockPredictor;