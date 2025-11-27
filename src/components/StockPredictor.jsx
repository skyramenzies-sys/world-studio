// src/components/StockPredictor.jsx
import React, { useState, useEffect } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Area,
    AreaChart,
} from "recharts";
import { toast } from "react-hot-toast";
import api from "../api/api";

// Default assets if API doesn't provide them
const DEFAULT_ASSETS = [
    // Crypto
    { symbol: "BTC", name: "Bitcoin", type: "crypto", icon: "₿" },
    { symbol: "ETH", name: "Ethereum", type: "crypto", icon: "Ξ" },
    { symbol: "SOL", name: "Solana", type: "crypto", icon: "◎" },
    { symbol: "BNB", name: "Binance Coin", type: "crypto", icon: "⬡" },
    { symbol: "XRP", name: "Ripple", type: "crypto", icon: "✕" },
    { symbol: "ADA", name: "Cardano", type: "crypto", icon: "₳" },
    // Stocks
    { symbol: "AAPL", name: "Apple", type: "stock", icon: "" },
    { symbol: "GOOGL", name: "Google", type: "stock", icon: "G" },
    { symbol: "MSFT", name: "Microsoft", type: "stock", icon: "M" },
    { symbol: "TSLA", name: "Tesla", type: "stock", icon: "T" },
    { symbol: "AMZN", name: "Amazon", type: "stock", icon: "A" },
    { symbol: "NVDA", name: "NVIDIA", type: "stock", icon: "N" },
    // Commodities
    { symbol: "GOLD", name: "Gold", type: "commodity", icon: "🥇" },
    { symbol: "SILVER", name: "Silver", type: "commodity", icon: "🥈" },
    { symbol: "OIL", name: "Crude Oil", type: "commodity", icon: "🛢️" },
    // Forex
    { symbol: "EUR/USD", name: "Euro/US Dollar", type: "forex", icon: "€" },
    { symbol: "GBP/USD", name: "British Pound/US Dollar", type: "forex", icon: "£" },
    { symbol: "USD/JPY", name: "US Dollar/Japanese Yen", type: "forex", icon: "¥" },
];

// Asset type colors
const TYPE_COLORS = {
    crypto: { bg: "from-orange-500/20 to-yellow-500/20", text: "text-orange-400", border: "border-orange-500/30" },
    stock: { bg: "from-blue-500/20 to-cyan-500/20", text: "text-blue-400", border: "border-blue-500/30" },
    commodity: { bg: "from-yellow-500/20 to-amber-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
    forex: { bg: "from-green-500/20 to-emerald-500/20", text: "text-green-400", border: "border-green-500/30" },
};

export default function StockPredictor() {
    const [assets, setAssets] = useState(DEFAULT_ASSETS);
    const [selectedAsset, setSelectedAsset] = useState(DEFAULT_ASSETS[0]);
    const [selectedType, setSelectedType] = useState("all");
    const [prediction, setPrediction] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recentPredictions, setRecentPredictions] = useState([]);

    // Fetch supported assets on mount
    useEffect(() => {
        fetchSupportedAssets();
    }, []);

    const fetchSupportedAssets = async () => {
        try {
            const res = await api.get("/stocks/supported");
            if (Array.isArray(res.data) && res.data.length > 0) {
                setAssets(res.data);
                setSelectedAsset(res.data[0]);
            }
        } catch (err) {
            console.log("Using default assets");
            // Keep default assets
        }
    };

    // Filter assets by type
    const filteredAssets = selectedType === "all"
        ? assets
        : assets.filter(a => a.type === selectedType);

    // Generate simulated historical data
    const generateChartData = (currentPrice, predictedPrice) => {
        const data = [];
        const volatility = currentPrice * 0.02; // 2% volatility

        // Past 24 hours
        for (let i = 24; i > 0; i--) {
            const randomChange = (Math.random() - 0.5) * volatility;
            const price = currentPrice + randomChange - (predictedPrice - currentPrice) * (i / 24);
            data.push({
                time: `-${i}h`,
                price: Math.max(0, price),
            });
        }

        // Current
        data.push({
            time: "Now",
            price: currentPrice,
        });

        // Prediction
        data.push({
            time: "24h",
            price: predictedPrice,
            predicted: true,
        });

        return data;
    };

    // Get prediction from API or simulate
    const getPrediction = async () => {
        if (!selectedAsset) return;

        setLoading(true);
        setError(null);

        try {
            // Try API first
            let data;
            try {
                const res = await api.post("/stocks/predict", {
                    symbol: selectedAsset.symbol
                });
                data = res.data;
            } catch (apiErr) {
                // Simulate prediction if API fails
                console.log("API unavailable, simulating prediction...");
                data = simulatePrediction(selectedAsset);
            }

            // Validate and set data
            const currentPrice = Number(data.currentPrice) || 0;
            const predictedPrice = Number(data.predictedPrice) || 0;
            const change = predictedPrice - currentPrice;
            const changePercent = currentPrice > 0 ? (change / currentPrice) * 100 : 0;

            const predictionData = {
                ...data,
                symbol: selectedAsset.symbol,
                name: selectedAsset.name,
                type: selectedAsset.type,
                currentPrice,
                predictedPrice,
                change,
                changePercent,
                confidence: data.confidence || Math.floor(60 + Math.random() * 30),
                timestamp: new Date().toISOString(),
            };

            setPrediction(predictionData);
            setChartData(generateChartData(currentPrice, predictedPrice));

            // Add to recent predictions
            setRecentPredictions(prev => [predictionData, ...prev.slice(0, 4)]);

            toast.success(`Prediction ready for ${selectedAsset.name}!`);
        } catch (err) {
            console.error("Prediction error:", err);
            setError("Could not fetch prediction. Please try again.");
            toast.error("Prediction failed");
        } finally {
            setLoading(false);
        }
    };

    // Simulate prediction (fallback when API is unavailable)
    const simulatePrediction = (asset) => {
        // Base prices for different assets
        const basePrices = {
            BTC: 67000, ETH: 3500, SOL: 150, BNB: 600, XRP: 0.55, ADA: 0.45,
            AAPL: 175, GOOGL: 140, MSFT: 420, TSLA: 250, AMZN: 180, NVDA: 900,
            GOLD: 2350, SILVER: 28, OIL: 78,
            "EUR/USD": 1.085, "GBP/USD": 1.27, "USD/JPY": 155,
        };

        const basePrice = basePrices[asset.symbol] || 100;
        const volatility = asset.type === "crypto" ? 0.05 : 0.02;
        const change = (Math.random() - 0.45) * basePrice * volatility; // Slightly bullish bias

        return {
            currentPrice: basePrice,
            predictedPrice: basePrice + change,
            confidence: Math.floor(65 + Math.random() * 25),
        };
    };

    // Format price based on asset type
    const formatPrice = (price, type) => {
        if (type === "forex") {
            return price.toFixed(4);
        } else if (price < 1) {
            return price.toFixed(4);
        } else if (price < 100) {
            return price.toFixed(2);
        } else {
            return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
        }
    };

    // Get currency symbol
    const getCurrencySymbol = (type) => {
        return type === "forex" ? "" : "$";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                        📈 World-Studio Price Predictor
                    </h1>
                    <p className="text-white/60">
                        AI-powered predictions for stocks, crypto, commodities & forex
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Panel - Asset Selection */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Type Filter */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <h3 className="text-sm font-semibold text-white/60 mb-3">Asset Type</h3>
                            <div className="flex flex-wrap gap-2">
                                {["all", "crypto", "stock", "commodity", "forex"].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${selectedType === type
                                                ? "bg-cyan-500 text-black"
                                                : "bg-white/10 text-white/70 hover:bg-white/20"
                                            }`}
                                    >
                                        {type === "all" ? "All" : type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Asset List */}
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 max-h-[400px] overflow-y-auto">
                            <h3 className="text-sm font-semibold text-white/60 mb-3">Select Asset</h3>
                            <div className="space-y-2">
                                {filteredAssets.map((asset) => (
                                    <button
                                        key={asset.symbol}
                                        onClick={() => setSelectedAsset(asset)}
                                        className={`w-full p-3 rounded-xl text-left transition flex items-center gap-3 ${selectedAsset?.symbol === asset.symbol
                                                ? `bg-gradient-to-r ${TYPE_COLORS[asset.type]?.bg} ${TYPE_COLORS[asset.type]?.border} border`
                                                : "bg-white/5 hover:bg-white/10 border border-transparent"
                                            }`}
                                    >
                                        <span className="text-2xl w-8">{asset.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold truncate">{asset.name}</div>
                                            <div className="text-sm text-white/50">{asset.symbol}</div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded capitalize ${TYPE_COLORS[asset.type]?.text} bg-white/10`}>
                                            {asset.type}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Predict Button */}
                        <button
                            onClick={getPrediction}
                            disabled={loading || !selectedAsset}
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Analyzing...
                                </>
                            ) : (
                                <>🚀 Get Prediction</>
                            )}
                        </button>
                    </div>

                    {/* Right Panel - Results */}
                    <div className="lg:col-span-2 space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                <p className="text-red-400">❌ {error}</p>
                            </div>
                        )}

                        {prediction ? (
                            <>
                                {/* Prediction Result */}
                                <div className={`bg-gradient-to-r ${TYPE_COLORS[prediction.type]?.bg} rounded-2xl p-6 border ${TYPE_COLORS[prediction.type]?.border}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold">{prediction.name}</h2>
                                            <p className="text-white/60">{prediction.symbol} • {prediction.type}</p>
                                        </div>
                                        <div className={`text-4xl font-bold ${prediction.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                                            {prediction.change >= 0 ? "📈" : "📉"}
                                        </div>
                                    </div>

                                    {/* Price comparison */}
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="bg-black/20 rounded-xl p-4 text-center">
                                            <p className="text-white/60 text-sm mb-1">Current Price</p>
                                            <p className="text-2xl font-bold">
                                                {getCurrencySymbol(prediction.type)}{formatPrice(prediction.currentPrice, prediction.type)}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-center text-3xl">
                                            →
                                        </div>
                                        <div className="bg-black/20 rounded-xl p-4 text-center">
                                            <p className="text-white/60 text-sm mb-1">Predicted (24h)</p>
                                            <p className={`text-2xl font-bold ${prediction.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                {getCurrencySymbol(prediction.type)}{formatPrice(prediction.predictedPrice, prediction.type)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Change indicator */}
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${prediction.change >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                        }`}>
                                        <span className="text-xl">{prediction.change >= 0 ? "▲" : "▼"}</span>
                                        <span className="font-bold">
                                            {getCurrencySymbol(prediction.type)}{Math.abs(prediction.change).toFixed(2)} ({prediction.changePercent >= 0 ? "+" : ""}{prediction.changePercent.toFixed(2)}%)
                                        </span>
                                    </div>
                                </div>

                                {/* Chart */}
                                {chartData.length > 0 && (
                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                        <h3 className="text-lg font-semibold mb-4">Price Trend</h3>
                                        <div style={{ width: "100%", height: 300 }}>
                                            <ResponsiveContainer>
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                                                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} domain={['auto', 'auto']} />
                                                    <Tooltip
                                                        contentStyle={{
                                                            background: "rgba(0,0,0,0.8)",
                                                            border: "1px solid rgba(255,255,255,0.1)",
                                                            borderRadius: "10px",
                                                            color: "white",
                                                        }}
                                                        formatter={(value) => [`$${value.toFixed(2)}`, "Price"]}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="price"
                                                        stroke="#06b6d4"
                                                        strokeWidth={2}
                                                        fill="url(#colorPrice)"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Confidence */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white/60">Model Confidence</span>
                                        <span className="font-bold text-cyan-400">{prediction.confidence}%</span>
                                    </div>
                                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${prediction.confidence}%` }}
                                        />
                                    </div>
                                    <p className="text-white/40 text-xs mt-3">
                                        ⚠️ This is a simulated prediction for entertainment purposes only.
                                        Not financial advice. Past performance does not guarantee future results.
                                    </p>
                                </div>
                            </>
                        ) : (
                            /* Empty state */
                            <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
                                <p className="text-6xl mb-4">📊</p>
                                <h3 className="text-xl font-semibold mb-2">Select an Asset</h3>
                                <p className="text-white/60 mb-6">
                                    Choose an asset from the list and click "Get Prediction" to see AI-powered price forecasts
                                </p>
                                {selectedAsset && (
                                    <p className="text-cyan-400">
                                        Selected: {selectedAsset.name} ({selectedAsset.symbol})
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Recent Predictions */}
                        {recentPredictions.length > 0 && (
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <h3 className="text-sm font-semibold text-white/60 mb-3">Recent Predictions</h3>
                                <div className="space-y-2">
                                    {recentPredictions.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                                            <span className="font-medium">{p.symbol}</span>
                                            <span className={p.change >= 0 ? "text-green-400" : "text-red-400"}>
                                                {p.change >= 0 ? "+" : ""}{p.changePercent.toFixed(2)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}