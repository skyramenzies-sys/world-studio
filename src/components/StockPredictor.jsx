import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import "./StockPredictor.css";

export default function StockPredictor() {
    const [stocks, setStocks] = useState([]);
    const [selected, setSelected] = useState("AAPL");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("https://world-studio-production.up.railway.app/api/stocks/supported")
            .then(r => r.json())
            .then(setStocks)
            .catch(console.error);
    }, []);

    const predict = async () => {
        setLoading(true);
        const res = await fetch(
            "https://world-studio-production.up.railway.app/api/stocks/predict",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol: selected }),
            }
        );
        const json = await res.json();
        setData(json);
        setLoading(false);
    };

    return (
        <div className="p-8 text-white min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-black">
            <h1 className="text-3xl font-bold mb-2">World-Studio Prediction 📈</h1>
            <p className="mb-6 text-white/70">Live AI-powered market forecasting</p>

            <div className="flex gap-4 mb-8">
                <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="bg-white/10 p-2 rounded border border-white/20"
                >
                    {stocks.map((s) => (
                        <option key={s.symbol} value={s.symbol}>
                            {s.name} ({s.symbol})
                        </option>
                    ))}
                </select>
                <button
                    onClick={predict}
                    disabled={loading}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 rounded font-semibold"
                >
                    {loading ? "Analyzing …" : "🚀 Predict"}
                </button>
            </div>

            {data && (
                <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
                    <h2 className="text-xl font-bold mb-2">{data.symbol}</h2>
                    <p>
                        Current ${data.currentPrice.toFixed(2)} → Predicted
                        <span className="text-cyan-400 font-semibold">
                            ${data.predictedPrice.toFixed(2)}
                        </span>
                    </p>
                    <p className="text-white/70 mb-6">
                        Change {data.change > 0 ? "📈" : "📉"}
                        {data.change.toFixed(2)} ({data.changePercent.toFixed(2)} %) — Confidence {data.confidence} %
                    </p>

                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.trend}>
                            <XAxis dataKey="time" stroke="#ccc" />
                            <YAxis stroke="#ccc" />
                            <Tooltip />
                            <Line type="monotone" dataKey="price" stroke="#00e0ff" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
