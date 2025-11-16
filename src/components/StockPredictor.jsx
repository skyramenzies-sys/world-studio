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

// Fallback to production API if Vite env is missing
const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    "https://world-studio-production.up.railway.app";

const StockPredictor = () => {
    const [stocks, setStocks] = useState([]);
    const [selectedStock, setSelectedStock] = useState("");
    const [prediction, setPrediction] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState(null);
    const [stocksError, setStocksError] = useState(null);

    // ---------------------------------
    // 🟦 1. Fetch supported symbols once
    // ---------------------------------
    useEffect(() => {
        fetchSupportedStocks();
    }, []);

    const fetchSupportedStocks = async () => {
        setStocksError(null);
        try {
            const res = await fetch(`${API_BASE}/api/stocks/supported`);
            if (!res.ok) throw new Error("Failed to fetch supported stocks");
            const data = await res.json();

            const valid = Array.isArray(data) ? data : [];

            setStocks(valid);

            // If empty → avoid undefined symbol
            if (valid.length > 0) {
                setSelectedStock(valid[0].symbol);
            } else {
                setSelectedStock("");
            }
        } catch (err) {
            console.error("Error loading stocks:", err);
            setStocks([]);
            setStocksError("Unable to load supported assets.");
        }
    };

    // ---------------------------------
    // 🟩 2. Fetch prediction
    // ---------------------------------
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

            if (!res.ok) throw new Error("Prediction request failed");

            const data = await res.json();

            // Safety checks
            const current = Number(data.currentPrice) || 0;
            const predicted = Number(data.predictedPrice) || 0;

            // Simulated small chart history
            const simulatedData = [
                ...Array.from({ length: 10 }, (_, i) => ({
                    name: `-${10 - i}h`,
                    price: current + (Math.random() - 0.5) * current * 0.01,
                })),
                { name: "Tomorrow", price: predicted },
            ];

            setPrediction(data);
            setChartData(simulatedData);
        } catch (err) {
            console.error("Prediction error:", err);
            setError("Could not fetch prediction.");
        }

        setLoading(false);
    };

    // ---------------------------------
    // 🟪 3. UI
    // ---------------------------------
    return (
        <div className="stock-predictor">
            <h1>🌐 World-Studio Stock Price Predictor 📈</h1>
            <p className="subtitle">Powered by World-Studio Prediction™</p>

            <div className="predictor-card">
                {/* SELECTOR */}
                <div className="input-section">
                    <label>Select Asset:</label>

                    <select
                        value={selectedStock}
                        onChange={(e) => setSelectedStock(e.target.value)}
                        className="stock-select"
                        disabled={loading || stocks.length === 0}
                    >
                        {stocks.length === 0 && (
                            <option>No assets available</option>
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

                {/* RESULTS BELOW */}
                {prediction && (
                    <div className="prediction-result">
                        <h2>{prediction.symbol} — Prediction</h2>

                        {/* PRICE COMPARISON */}
                        <div className="price-section">
                            <div className="price-box">
                                <span>Current Price</span>
                                <span className="price">
                                    ${prediction.currentPrice?.toFixed(2)}
                                </span>
                            </div>

                            <div className="arrow">→</div>

                            <div className="price-box">
                                <span>Predicted Tomorrow</span>
                                <span className="price predicted">
                                    ${prediction.predictedPrice?.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* CHANGE INDICATOR */}
                        <div className="change-section">
                            <div
                                className={`change ${prediction.change > 0
                                        ? "positive"
                                        : "negative"
                                    }`}
                            >
                                {prediction.change > 0 ? "📈" : "📉"} $
                                {prediction.change?.toFixed(2)} (
                                {prediction.changePercent > 0 ? "+" : ""}
                                {prediction.changePercent?.toFixed(2)}%)
                            </div>
                        </div>

                        {/* CHART */}
                        {chartData.length > 0 && (
                            <div
                                style={{
                                    width: "100%",
                                    height: 300,
                                    marginTop: "2rem",
                                }}
                            >
                                <ResponsiveContainer>
                                    <LineChart data={chartData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="rgba(255,255,255,0.1)"
                                        />
                                        <XAxis
                                            dataKey="name"
                                            stroke="white"
                                        />
                                        <YAxis stroke="white" />
                                        <Tooltip
                                            contentStyle={{
                                                background:
                                                    "rgba(0,0,0,0.7)",
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
                                            activeDot={{
                                                r: 6,
                                                fill: "#22c55e",
                                            }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* CONFIDENCE */}
                        <div className="confidence-section">
                            <span>
                                Confidence: {prediction.confidence ?? "N/A"}%
                            </span>
                            <div className="confidence-bar">
                                <div
                                    className="confidence-fill"
                                    style={{
                                        width: `${prediction.confidence ?? 0
                                            }%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className="disclaimer">
                            🚨 This is a World-Studio Prediction™.
                            <br />
                            Past performance does not guarantee future results.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockPredictor;
