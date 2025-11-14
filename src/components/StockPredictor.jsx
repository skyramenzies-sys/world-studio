import React, { useState, useEffect } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import "./StockPredictor.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://world-studio-production.up.railway.app";

const StockPredictor = () => {
    const [stocks, setStocks] = useState([]);
    const [selectedStock, setSelectedStock] = useState("");
    const [prediction, setPrediction] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stocksError, setStocksError] = useState(null);

    // Fetch supported stocks on mount
    useEffect(() => {
        fetchSupportedStocks();
        // eslint-disable-next-line
    }, []);

    const fetchSupportedStocks = async () => {
        setStocksError(null);
        try {
            const res = await fetch(`${API_BASE}/api/stocks/supported`);
            if (!res.ok) throw new Error("Failed to fetch supported stocks.");
            const data = await res.json();
            setStocks(data);
            if (data.length > 0) setSelectedStock(data[0].symbol);
        } catch (err) {
            setStocks([]);
            setStocksError("Unable to load supported stocks.");
        }
    };

    const getPrediction = async () => {
        if (!selectedStock) return;
        setLoading(true);
        setError(null);
        setPrediction(null);
        setChartData([]);

        try {
            const res = await fetch(`${API_BASE}/api/stocks/predict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol: selectedStock }),
            });

            if (!res.ok) throw new Error("Prediction failed");
            const data = await res.json();

            // Simulate chart data (replace with real chart data if API provides)
            const simulatedData = Array.from({ length: 10 }, (_, i) => ({
                name: `-${10 - i}h`,
                price:
                    data.currentPrice +
                    (Math.random() - 0.5) * (data.currentPrice * 0.01),
            })).concat([
                {
                    name: "Tomorrow",
                    price: data.predictedPrice,
                },
            ]);

            setPrediction(data);
            setChartData(simulatedData);
        } catch (err) {
            setError(err.message || "Could not fetch prediction.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="stock-predictor">
            <h1>🌐 World-Studio Stock Price Predictor 📈</h1>
            <p className="subtitle">Powered by World-Studio Prediction™</p>

            <div className="predictor-card">
                <div className="input-section">
                    <label>Select Asset:</label>
                    <select
                        value={selectedStock}
                        onChange={(e) => setSelectedStock(e.target.value)}
                        className="stock-select"
                        disabled={loading || !stocks.length}
                    >
                        {stocks.length === 0 && (
                            <option value="">No assets available</option>
                        )}
                        {stocks.map((stock) => (
                            <option key={stock.symbol} value={stock.symbol}>
                                {stock.name} ({stock.symbol}) — {stock.type}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={getPrediction}
                        disabled={loading || !selectedStock}
                        className="predict-button"
                    >
                        {loading ? "🔄 Analyzing..." : "🚀 Get Prediction"}
                    </button>
                </div>

                {stocksError && (
                    <div className="error-message">❌ {stocksError}</div>
                )}

                {error && <div className="error-message">❌ {error}</div>}

                {prediction && (
                    <div className="prediction-result">
                        <h2>
                            {prediction.symbol} — World-Studio Prediction
                        </h2>

                        <div className="price-section">
                            <div className="price-box">
                                <span className="label">Current Price</span>
                                <span className="price">
                                    ${prediction.currentPrice?.toFixed(2) ?? "N/A"}
                                </span>
                            </div>

                            <div className="arrow">→</div>

                            <div className="price-box">
                                <span className="label">Predicted Tomorrow</span>
                                <span className="price predicted">
                                    ${prediction.predictedPrice?.toFixed(2) ?? "N/A"}
                                </span>
                            </div>
                        </div>

                        <div className="change-section">
                            <div
                                className={`change ${prediction.change > 0 ? "positive" : "negative"
                                    }`}
                            >
                                {prediction.change > 0 ? "📈" : "📉"} $
                                {prediction.change?.toFixed(2) ?? "0.00"} (
                                {prediction.changePercent > 0 ? "+" : ""}
                                {prediction.changePercent?.toFixed(2) ?? "0.00"}%)
                            </div>
                        </div>

                        {/* 📊 Recharts Graph */}
                        {chartData.length > 0 && (
                            <div style={{ width: "100%", height: 300, marginTop: "2rem" }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="name" stroke="white" />
                                        <YAxis stroke="white" domain={["auto", "auto"]} />
                                        <Tooltip
                                            contentStyle={{
                                                background: "rgba(0,0,0,0.7)",
                                                border: "none",
                                                borderRadius: "10px",
                                                color: "white",
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="price"
                                            stroke="#06b6d4"
                                            strokeWidth={3}
                                            dot={{ r: 3 }}
                                            activeDot={{ r: 6, fill: "#22c55e" }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        <div className="confidence-section">
                            <span>
                                World-Studio Confidence: {prediction.confidence ?? "N/A"}%
                            </span>
                            <div className="confidence-bar">
                                <div
                                    className="confidence-fill"
                                    style={{ width: `${prediction.confidence ?? 0}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="disclaimer">
                            🚨 This is a World-Studio Prediction™.
                            Past performance does not guarantee future results,
                            but learning does.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockPredictor;