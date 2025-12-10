// src/components/StockPredictor.jsx
// World-Studio.live - Real-Time Market Analyzer (Universe Edition)
// External APIs: CoinGecko (crypto), Yahoo Finance (stocks)

import React, { useState, useEffect, useCallback } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    ReferenceLine,
} from "recharts";
import { toast } from "react-hot-toast";

// API Base URL for proxy
const API_BASE = import.meta.env.VITE_API_URL || "https://world-studio-production.up.railway.app";

// ===========================================
// ASSET CONFIG
// ===========================================

const ASSETS = {
    crypto: [
        {
            symbol: "bitcoin",
            displaySymbol: "BTC",
            name: "Bitcoin",
            icon: "₿",
            color: "#F7931A",
            buyLinks: {
                binance: "https://www.binance.com/trade/BTC_USDT",
                coinbase: "https://www.coinbase.com/price/bitcoin",
                kraken: "https://www.kraken.com/prices/bitcoin",
            },
        },
        {
            symbol: "ethereum",
            displaySymbol: "ETH",
            name: "Ethereum",
            icon: "Ξ",
            color: "#627EEA",
            buyLinks: {
                binance: "https://www.binance.com/trade/ETH_USDT",
                coinbase: "https://www.coinbase.com/price/ethereum",
                kraken: "https://www.kraken.com/prices/ethereum",
            },
        },
        {
            symbol: "solana",
            displaySymbol: "SOL",
            name: "Solana",
            icon: "◎",
            color: "#00FFA3",
            buyLinks: {
                binance: "https://www.binance.com/trade/SOL_USDT",
                coinbase: "https://www.coinbase.com/price/solana",
                kraken: "https://www.kraken.com/prices/solana",
            },
        },
        {
            symbol: "binancecoin",
            displaySymbol: "BNB",
            name: "BNB",
            icon: "⬡",
            color: "#F3BA2F",
            buyLinks: {
                binance: "https://www.binance.com/trade/BNB_USDT",
                coinbase: "https://www.coinbase.com/price/bnb",
                kraken: "https://www.kraken.com/prices/bnb",
            },
        },
        {
            symbol: "ripple",
            displaySymbol: "XRP",
            name: "XRP",
            icon: "✕",
            color: "#23292F",
            buyLinks: {
                binance: "https://www.binance.com/trade/XRP_USDT",
                kraken: "https://www.kraken.com/prices/ripple",
                bitstamp: "https://www.bitstamp.net/markets/xrp/usd/",
            },
        },
        {
            symbol: "cardano",
            displaySymbol: "ADA",
            name: "Cardano",
            icon: "₳",
            color: "#0033AD",
            buyLinks: {
                binance: "https://www.binance.com/trade/ADA_USDT",
                coinbase: "https://www.coinbase.com/price/cardano",
                kraken: "https://www.kraken.com/prices/cardano",
            },
        },
        {
            symbol: "dogecoin",
            displaySymbol: "DOGE",
            name: "Dogecoin",
            icon: "Ð",
            color: "#C3A634",
            buyLinks: {
                binance: "https://www.binance.com/trade/DOGE_USDT",
                coinbase: "https://www.coinbase.com/price/dogecoin",
                kraken: "https://www.kraken.com/prices/dogecoin",
            },
        },
        {
            symbol: "polkadot",
            displaySymbol: "DOT",
            name: "Polkadot",
            icon: "●",
            color: "#E6007A",
            buyLinks: {
                binance: "https://www.binance.com/trade/DOT_USDT",
                coinbase: "https://www.coinbase.com/price/polkadot",
                kraken: "https://www.kraken.com/prices/polkadot",
            },
        },
        {
            symbol: "avalanche-2",
            displaySymbol: "AVAX",
            name: "Avalanche",
            icon: "🔺",
            color: "#E84142",
            buyLinks: {
                binance: "https://www.binance.com/trade/AVAX_USDT",
                coinbase: "https://www.coinbase.com/price/avalanche",
                kraken: "https://www.kraken.com/prices/avalanche",
            },
        },
        {
            symbol: "chainlink",
            displaySymbol: "LINK",
            name: "Chainlink",
            icon: "⬡",
            color: "#2A5ADA",
            buyLinks: {
                binance: "https://www.binance.com/trade/LINK_USDT",
                coinbase: "https://www.coinbase.com/price/chainlink",
                kraken: "https://www.kraken.com/prices/chainlink",
            },
        },
        {
            symbol: "tron",
            displaySymbol: "TRX",
            name: "TRON",
            icon: "⧫",
            color: "#FF0013",
            buyLinks: {
                binance: "https://www.binance.com/trade/TRX_USDT",
                kraken: "https://www.kraken.com/prices/tron",
                kucoin: "https://www.kucoin.com/trade/TRX-USDT",
            },
        },
        {
            symbol: "polygon-ecosystem-token",
            displaySymbol: "POL",
            name: "Polygon",
            icon: "⬡",
            color: "#8247E5",
            buyLinks: {
                binance: "https://www.binance.com/trade/MATIC_USDT",
                coinbase: "https://www.coinbase.com/price/polygon",
                kraken: "https://www.kraken.com/prices/polygon",
            },
        },
    ],
    stocks: [
        {
            symbol: "AAPL",
            name: "Apple",
            icon: "",
            color: "#A2AAAD",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/AAPL",
                etoro: "https://www.etoro.com/markets/aapl",
                tradingview: "https://www.tradingview.com/symbols/NASDAQ-AAPL/",
            },
        },
        {
            symbol: "GOOGL",
            name: "Google",
            icon: "G",
            color: "#4285F4",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/GOOGL",
                etoro: "https://www.etoro.com/markets/googl",
                tradingview: "https://www.tradingview.com/symbols/NASDAQ-GOOGL/",
            },
        },
        {
            symbol: "MSFT",
            name: "Microsoft",
            icon: "⊞",
            color: "#00A4EF",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/MSFT",
                etoro: "https://www.etoro.com/markets/msft",
                tradingview: "https://www.tradingview.com/symbols/NASDAQ-MSFT/",
            },
        },
        {
            symbol: "TSLA",
            name: "Tesla",
            icon: "T",
            color: "#CC0000",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/TSLA",
                etoro: "https://www.etoro.com/markets/tsla",
                tradingview: "https://www.tradingview.com/symbols/NASDAQ-TSLA/",
            },
        },
        {
            symbol: "NVDA",
            name: "NVIDIA",
            icon: "◢",
            color: "#76B900",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/NVDA",
                etoro: "https://www.etoro.com/markets/nvda",
                tradingview: "https://www.tradingview.com/symbols/NASDAQ-NVDA/",
            },
        },
        {
            symbol: "AMZN",
            name: "Amazon",
            icon: "→",
            color: "#FF9900",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/AMZN",
                etoro: "https://www.etoro.com/markets/amzn",
                tradingview: "https://www.tradingview.com/symbols/NASDAQ-AMZN/",
            },
        },
        {
            symbol: "META",
            name: "Meta",
            icon: "∞",
            color: "#0082FB",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/META",
                etoro: "https://www.etoro.com/markets/meta",
                tradingview: "https://www.tradingview.com/symbols/NASDAQ-META/",
            },
        },
        {
            symbol: "AMD",
            name: "AMD",
            icon: "◆",
            color: "#ED1C24",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/AMD",
                etoro: "https://www.etoro.com/markets/amd",
                tradingview: "https://www.tradingview.com/symbols/NASDAQ-AMD/",
            },
        },
        {
            symbol: "NFLX",
            name: "Netflix",
            icon: "N",
            color: "#E50914",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/NFLX",
                etoro: "https://www.etoro.com/markets/nflx",
                tradingview: "https://www.tradingview.com/symbols/NASDAQ-NFLX/",
            },
        },
        {
            symbol: "DIS",
            name: "Disney",
            icon: "🏰",
            color: "#113CCF",
            buyLinks: {
                robinhood: "https://robinhood.com/stocks/DIS",
                etoro: "https://www.etoro.com/markets/dis",
                tradingview: "https://www.tradingview.com/symbols/NYSE-DIS/",
            },
        },
    ],
};

// Fallback base prices for stocks (simulation)
const STOCK_BASE_PRICES = {
    AAPL: 178,
    GOOGL: 141,
    MSFT: 378,
    TSLA: 248,
    NVDA: 875,
    AMZN: 178,
    META: 485,
    AMD: 156,
    NFLX: 628,
    DIS: 112,
};

// ==========================================
// TECHNICAL ANALYSIS FUNCTIONS
// ==========================================

const calculateRSI = (prices, period = 14) => {
    if (!prices || prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - 100 / (1 + avgGain / avgLoss);
};

const calculateSMA = (prices, period) => {
    if (!prices || prices.length === 0) return 0;
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
};

const calculateEMA = (prices, period) => {
    if (!prices || prices.length === 0) return 0;
    if (prices.length < period) return prices[prices.length - 1] || 0;

    const multiplier = 2 / (period + 1);
    let ema =
        prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
};

const calculateMACD = (prices) => {
    if (!prices || prices.length < 26)
        return { macdLine: 0, signalLine: 0, histogram: 0 };

    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;

    const macdHistory = [];
    for (let i = 26; i <= prices.length; i++) {
        const slice = prices.slice(0, i);
        macdHistory.push(
            calculateEMA(slice, 12) - calculateEMA(slice, 26)
        );
    }
    const signalLine =
        macdHistory.length >= 9
            ? calculateEMA(macdHistory, 9)
            : macdLine;
    return { macdLine, signalLine, histogram: macdLine - signalLine };
};

const calculateBollingerBands = (prices, period = 20, stdDev = 2) => {
    if (!prices || prices.length === 0) {
        return { upper: 0, middle: 0, lower: 0 };
    }
    if (prices.length < period) {
        const price = prices[prices.length - 1] || 100;
        return {
            upper: price * 1.02,
            middle: price,
            lower: price * 0.98,
        };
    }
    const sma = calculateSMA(prices, period);
    const slice = prices.slice(-period);
    const variance =
        slice.map((p) => Math.pow(p - sma, 2)).reduce((a, b) => a + b, 0) /
        period;
    const sd = Math.sqrt(variance);

    return {
        upper: sma + sd * stdDev,
        middle: sma,
        lower: sma - sd * stdDev,
    };
};

const calculateStochastic = (prices, period = 14) => {
    if (!prices || prices.length < period) return { k: 50, d: 50 };
    const recent = prices.slice(-period);
    const current = prices[prices.length - 1];
    const low = Math.min(...recent);
    const high = Math.max(...recent);
    const k = high === low ? 50 : ((current - low) / (high - low)) * 100;
    return { k, d: k };
};

// ==========================================
// SIGNAL GENERATION
// ==========================================

const generateSignal = (indicators) => {
    let bull = 0;
    let bear = 0;
    const reasons = [];

    // RSI
    if (indicators.rsi < 30) {
        bull += 2;
        reasons.push({ text: "RSI oversold", type: "bullish" });
    } else if (indicators.rsi < 40) {
        bull += 1;
        reasons.push({ text: "RSI low", type: "bullish" });
    } else if (indicators.rsi > 70) {
        bear += 2;
        reasons.push({ text: "RSI overbought", type: "bearish" });
    } else if (indicators.rsi > 60) {
        bear += 1;
        reasons.push({ text: "RSI high", type: "bearish" });
    } else {
        reasons.push({ text: "RSI neutral", type: "neutral" });
    }

    // MACD
    if (indicators.macd.histogram > 0) {
        bull += 2;
        reasons.push({ text: "MACD bullish", type: "bullish" });
    } else {
        bear += 2;
        reasons.push({ text: "MACD bearish", type: "bearish" });
    }

    // Moving Averages
    if (
        indicators.currentPrice > indicators.sma20 &&
        indicators.sma20 > indicators.sma50
    ) {
        bull += 2;
        reasons.push({
            text: "Above rising MAs",
            type: "bullish",
        });
    } else if (
        indicators.currentPrice < indicators.sma20 &&
        indicators.sma20 < indicators.sma50
    ) {
        bear += 2;
        reasons.push({
            text: "Below falling MAs",
            type: "bearish",
        });
    } else if (indicators.currentPrice > indicators.sma20) {
        bull += 1;
        reasons.push({ text: "Above SMA20", type: "bullish" });
    } else {
        bear += 1;
        reasons.push({ text: "Below SMA20", type: "bearish" });
    }

    // Bollinger
    const bbRange =
        indicators.bollinger.upper - indicators.bollinger.lower || 1;
    const bbPos =
        (indicators.currentPrice - indicators.bollinger.lower) / bbRange;

    if (bbPos <= 0.2) {
        bull += 1;
        reasons.push({ text: "Near lower BB", type: "bullish" });
    } else if (bbPos >= 0.8) {
        bear += 1;
        reasons.push({ text: "Near upper BB", type: "bearish" });
    }

    // Stochastic
    if (indicators.stochastic.k < 20) {
        bull += 1;
        reasons.push({ text: "Stoch oversold", type: "bullish" });
    } else if (indicators.stochastic.k > 80) {
        bear += 1;
        reasons.push({ text: "Stoch overbought", type: "bearish" });
    }

    // Momentum (24h change)
    if (indicators.change24h > 3) {
        bull += 1;
        reasons.push({
            text: `+${indicators.change24h.toFixed(1)}% today`,
            type: "bullish",
        });
    } else if (indicators.change24h < -3) {
        bear += 1;
        reasons.push({
            text: `${indicators.change24h.toFixed(1)}% today`,
            type: "bearish",
        });
    }

    const total = bull + bear;
    const bullPct = total > 0 ? (bull / total) * 100 : 50;

    let signal, strength, emoji;
    if (bullPct >= 70) {
        signal = "STRONG BUY";
        strength = "strong-buy";
        emoji = "🚀";
    } else if (bullPct >= 55) {
        signal = "BUY";
        strength = "buy";
        emoji = "📈";
    } else if (bullPct <= 30) {
        signal = "STRONG SELL";
        strength = "strong-sell";
        emoji = "🔻";
    } else if (bullPct <= 45) {
        signal = "SELL";
        strength = "sell";
        emoji = "📉";
    } else {
        signal = "HOLD";
        strength = "hold";
        emoji = "⏸️";
    }

    return {
        signal,
        strength,
        emoji,
        bullishPercentage: bullPct,
        reasons,
        bullishSignals: bull,
        bearishSignals: bear,
    };
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const formatPrice = (price) => {

    if (price == null || isNaN(price)) return "$0.00";
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price < 100) return `$${price.toFixed(2)}`;
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
};

const formatNumber = (num) => {
    // 0 moet gewoon "0" tonen, niet "N/A"
    if (num == null || isNaN(num)) return "N/A";
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
};

const getSignalColor = (strength) => {
    switch (strength) {
        case "strong-buy":
            return "from-green-500/30 to-emerald-500/30 border-green-500/50 text-green-400";
        case "buy":
            return "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300";
        case "strong-sell":
            return "from-red-500/30 to-rose-500/30 border-red-500/50 text-red-400";
        case "sell":
            return "from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300";
        default:
            return "from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-400";
    }
};

// ==========================================
// MAIN COMPONENT (UNIVERSE EDITION)
// ==========================================

export default function StockPredictor() {
    const [selectedType, setSelectedType] = useState("crypto");
    const [selectedAsset, setSelectedAsset] = useState(ASSETS.crypto[0]);

    const [marketData, setMarketData] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [indicators, setIndicators] = useState(null);
    const [signal, setSignal] = useState(null);

    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    const [allCryptoData, setAllCryptoData] = useState({});
    const [allStockData, setAllStockData] = useState({});
    const [timeframe, setTimeframe] = useState("7d");

    // ---------------------------------------
    // FETCH CRYPTO (CoinGecko)
    // ---------------------------------------
    const fetchCryptoData = useCallback(
        async (asset) => {
            try {
                const days =
                    timeframe === "24h"
                        ? 1
                        : timeframe === "7d"
                            ? 7
                            : 30;

                const [priceRes, chartRes] = await Promise.all([
                    fetch(
                        `${API_BASE}/api/stocks/crypto/${asset.symbol}`
                    ),
                    fetch(
                        `${API_BASE}/api/stocks/crypto/${asset.symbol}/chart?days=${days}&interval=${days === 1 ? "hourly" : "daily"
                        }`
                    ),
                ]);

                if (!priceRes.ok || !chartRes.ok) {
                    throw new Error("CoinGecko API error");
                }

                const priceData = await priceRes.json();
                const chartDataRaw = await chartRes.json();

                const prices = (chartDataRaw.prices || []).map(
                    (p) => p[1]
                );
                if (!prices.length) throw new Error("No price data");

                const currentPrice =
                    priceData.market_data?.current_price?.usd || 0;

                const calcs = {
                    rsi: calculateRSI(prices),
                    sma20: calculateSMA(prices, 20),
                    sma50: calculateSMA(prices, 50),
                    macd: calculateMACD(prices),
                    bollinger: calculateBollingerBands(prices),
                    stochastic: calculateStochastic(prices),
                    currentPrice,
                    change24h:
                        priceData.market_data
                            ?.price_change_percentage_24h || 0,
                    change7d:
                        priceData.market_data
                            ?.price_change_percentage_7d || 0,
                };

                setIndicators(calcs);
                setSignal(generateSignal(calcs));

                setMarketData({
                    price: currentPrice,
                    change24h: calcs.change24h,
                    change7d: calcs.change7d,
                    high24h: priceData.market_data?.high_24h?.usd,
                    low24h: priceData.market_data?.low_24h?.usd,
                    marketCap: priceData.market_data?.market_cap?.usd,
                    volume24h: priceData.market_data?.total_volume?.usd,
                    ath: priceData.market_data?.ath?.usd,
                    athChange:
                        priceData.market_data
                            ?.ath_change_percentage?.usd,
                    marketCapRank: priceData.market_cap_rank,
                });

                setChartData(
                    (chartDataRaw.prices || []).map(
                        ([ts, price]) => ({
                            time: new Date(ts).toLocaleDateString(
                                "en-US",
                                {
                                    month: "short",
                                    day: "numeric",
                                }
                            ),
                            price,
                        })
                    )
                );

                setLastUpdate(new Date());
            } catch (err) {
                console.error("Crypto fetch error:", err);
                toast.error(
                    "Crypto data unavailable (rate limit or network)."
                );
            }
        },
        [timeframe]
    );

    // ---------------------------------------
    // FETCH STOCKS (Yahoo Finance / simulation)
    // ---------------------------------------
    const generateSimulatedStockData = (asset) => {
        const basePrice =
            STOCK_BASE_PRICES[asset.symbol] || 100;
        const volatility = 0.02;
        const prices = [];
        let price = basePrice * (1 - volatility * 15);

        for (let i = 0; i < 30; i++) {
            price =
                price *
                (1 + (Math.random() - 0.48) * volatility);
            prices.push(price);
        }

        const currentPrice = prices[prices.length - 1];
        const prevPrice = prices[prices.length - 2] || currentPrice;
        const change24h =
            ((currentPrice - prevPrice) / prevPrice) * 100;

        const change7dBase =
            prices[Math.max(0, prices.length - 7)];
        const change7d =
            ((currentPrice - change7dBase) / change7dBase) * 100;

        const calcs = {
            rsi: calculateRSI(prices),
            sma20: calculateSMA(prices, 20),
            sma50: calculateSMA(prices, Math.min(50, prices.length)),
            macd: calculateMACD(prices),
            bollinger: calculateBollingerBands(prices),
            stochastic: calculateStochastic(prices),
            currentPrice,
            change24h,
            change7d,
        };

        setIndicators(calcs);
        setSignal(generateSignal(calcs));
        setMarketData({
            price: currentPrice,
            change24h,
            change7d,
            high24h: currentPrice * 1.01,
            low24h: currentPrice * 0.99,
            marketCap: currentPrice * 1e9,
            volume24h: Math.random() * 50e6,
            simulated: true,
        });

        setChartData(
            prices.map((p, i) => ({
                time: `Day ${i + 1}`,
                price: p,
            }))
        );
        setLastUpdate(new Date());

        toast("Using estimated stock data (API unavailable)", {
            icon: "ℹ️",
        });
    };

    const fetchStockData = useCallback(
        async (asset) => {
            try {
                const range =
                    timeframe === "24h"
                        ? "1d"
                        : timeframe === "7d"
                            ? "5d"
                            : "1mo";
                const interval =
                    timeframe === "24h" ? "5m" : "1d";

                const url = `${API_BASE}/api/stocks/chart/${asset.symbol}?range=${range}&interval=${interval}`;

                const res = await fetch(url);
                if (!res.ok) throw new Error("Yahoo API error");

                const data = await res.json();
                const result = data.chart?.result?.[0];
                if (!result) throw new Error("No data");

                const meta = result.meta || {};
                const quotes =
                    result.indicators?.quote?.[0] || {};
                const closes = quotes.close || [];
                const timestamps = result.timestamp || [];

                const prices = closes.filter(
                    (p) => p != null
                );
                if (!prices.length)
                    throw new Error("No price series");

                const currentPrice = meta.regularMarketPrice;
                const prevClose =
                    meta.chartPreviousClose ||
                    meta.previousClose ||
                    prices[prices.length - 2] ||
                    currentPrice;

                const change24h = prevClose
                    ? ((currentPrice - prevClose) /
                        prevClose) *
                    100
                    : 0;

                const calcs = {
                    rsi: calculateRSI(prices),
                    sma20: calculateSMA(
                        prices,
                        Math.min(20, prices.length)
                    ),
                    sma50: calculateSMA(
                        prices,
                        Math.min(50, prices.length)
                    ),
                    macd: calculateMACD(prices),
                    bollinger: calculateBollingerBands(prices),
                    stochastic: calculateStochastic(prices),
                    currentPrice,
                    change24h,
                    change7d: 0,
                };

                setIndicators(calcs);
                setSignal(generateSignal(calcs));
                setMarketData({
                    price: currentPrice,
                    change24h,
                    change7d: 0,
                    high24h: meta.regularMarketDayHigh,
                    low24h: meta.regularMarketDayLow,
                    marketCap: meta.marketCap,
                    volume24h: meta.regularMarketVolume,
                    previousClose: prevClose,
                    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
                    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
                });

                const chartFormatted = timestamps
                    .map((ts, i) => ({
                        time: new Date(
                            ts * 1000
                        ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                        }),
                        price: closes[i],
                    }))
                    .filter((d) => d.price != null);

                setChartData(chartFormatted);
                setLastUpdate(new Date());
            } catch (err) {
                console.error("Stock fetch error:", err);
                generateSimulatedStockData(asset);
            }
        },
        [timeframe]
    );

    // ---------------------------------------
    // FETCH ALL CRYPTO QUOTES
    // ---------------------------------------
    const fetchAllCryptoPrices = useCallback(async () => {
        try {
            const ids = ASSETS.crypto
                .map((a) => a.symbol)
                .join(",");
            const res = await fetch(
                `${API_BASE}/api/stocks/crypto/prices?ids=${ids}`
            );
            if (!res.ok) return;
            const json = await res.json();
            setAllCryptoData(json);
        } catch (err) {
            console.error("All crypto fetch error:", err);
        }
    }, []);

    // ---------------------------------------
    // FETCH ALL STOCK QUOTES
    // ---------------------------------------
    const fetchAllStockPrices = useCallback(async () => {
        try {
            const symbols = ASSETS.stocks
                .map((a) => a.symbol)
                .join(",");
            const res = await fetch(
                `${API_BASE}/api/stocks/quotes?symbols=${symbols}`
            );
            if (!res.ok) throw new Error("Quote API error");
            const data = await res.json();
            const stockMap = {};
            (data.quoteResponse?.result || []).forEach((q) => {
                stockMap[q.symbol] = {
                    price: q.regularMarketPrice,
                    change: q.regularMarketChangePercent,
                };
            });
            setAllStockData(stockMap);
        } catch (err) {
            // Fallback: use base prices + random change
            console.error("All stock fetch error:", err);
            const fallback = {};
            ASSETS.stocks.forEach((s) => {
                const base =
                    STOCK_BASE_PRICES[s.symbol] || 100;
                fallback[s.symbol] = {
                    price: base,
                    change: (Math.random() - 0.5) * 4,
                };
            });
            setAllStockData(fallback);
        }
    }, []);

    // ---------------------------------------
    // LOAD DATA ON TYPE / ASSET / TIMEFRAME
    // ---------------------------------------
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setMarketData(null);
            setIndicators(null);
            setSignal(null);

            try {
                if (selectedType === "crypto") {
                    await fetchCryptoData(selectedAsset);
                    await fetchAllCryptoPrices();
                } else {
                    await fetchStockData(selectedAsset);
                    await fetchAllStockPrices();
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [
        selectedAsset,
        selectedType,
        timeframe,
        fetchCryptoData,
        fetchStockData,
        fetchAllCryptoPrices,
        fetchAllStockPrices,
    ]);

    // ---------------------------------------
    // AUTO REFRESH (1 min)
    // ---------------------------------------
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            if (selectedType === "crypto") {
                fetchCryptoData(selectedAsset);
                fetchAllCryptoPrices();
            } else {
                fetchStockData(selectedAsset);
                fetchAllStockPrices();
            }
        }, 60_000);

        return () => clearInterval(interval);
    }, [
        autoRefresh,
        selectedAsset,
        selectedType,
        fetchCryptoData,
        fetchStockData,
        fetchAllCryptoPrices,
        fetchAllStockPrices,
    ]);

    // ---------------------------------------
    // HANDLERS
    // ---------------------------------------
    const handleAssetSelect = (asset) => {
        setSelectedAsset(asset);
    };

    const handleTypeChange = (type) => {
        setSelectedType(type);
        setSelectedAsset(
            type === "crypto"
                ? ASSETS.crypto[0]
                : ASSETS.stocks[0]
        );
    };

    const assets =
        selectedType === "crypto"
            ? ASSETS.crypto
            : ASSETS.stocks;
    const allPrices =
        selectedType === "crypto"
            ? allCryptoData
            : allStockData;

    const buyLinks = selectedAsset?.buyLinks || {};

    // ---------------------------------------
    // RENDER
    // ---------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/50 to-black text-white p-3 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl md:text-4xl font-bold mb-2">
                        📊 Real-Time Market Analyzer
                    </h1>
                    <p className="text-white/60 text-sm">
                        Live prices • Technical analysis • Trading
                        signals
                    </p>
                    <p className="text-xs text-cyan-400/60 mt-1">
                        🌍 Powered by World-Studio.live
                    </p>
                    {lastUpdate && (
                        <p className="text-xs text-white/40 mt-1">
                            Updated:{" "}
                            {lastUpdate.toLocaleTimeString()}
                            {autoRefresh && (
                                <span className="text-green-400">
                                    {" "}
                                    • Live
                                </span>
                            )}
                            {marketData?.simulated && (
                                <span className="text-yellow-400">
                                    {" "}
                                    • Estimated
                                </span>
                            )}
                        </p>
                    )}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                    <button
                        onClick={() => handleTypeChange("crypto")}
                        className={`px-4 py-2 rounded-xl font-semibold transition text-sm ${selectedType === "crypto"
                                ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-black"
                                : "bg-white/10 hover:bg-white/20"
                            }`}
                    >
                        🪙 Crypto
                    </button>
                    <button
                        onClick={() => handleTypeChange("stocks")}
                        className={`px-4 py-2 rounded-xl font-semibold transition text-sm ${selectedType === "stocks"
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-black"
                                : "bg-white/10 hover:bg-white/20"
                            }`}
                    >
                        📈 Stocks
                    </button>

                    <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                        {["24h", "7d", "30d"].map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-3 py-1 rounded-lg text-sm transition ${timeframe === tf
                                        ? "bg-cyan-500 text-black font-semibold"
                                        : "hover:bg-white/10"
                                    }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() =>
                            setAutoRefresh((prev) => !prev)
                        }
                        className={`px-3 py-2 rounded-xl text-sm transition ${autoRefresh
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-white/10"
                            }`}
                    >
                        {autoRefresh ? "🔴 Live" : "⏸️"}
                    </button>
                </div>

                <div className="grid lg:grid-cols-4 gap-4">
                    {/* Asset List */}
                    <div className="lg:col-span-1 bg-white/5 rounded-2xl p-3 border border-white/10 max-h-[500px] overflow-y-auto">
                        <h3 className="font-semibold text-white/60 mb-3 text-sm px-1">
                            {selectedType === "crypto"
                                ? "🪙 Cryptocurrencies"
                                : "📈 Stocks"}
                        </h3>
                        <div className="space-y-1">
                            {assets.map((asset) => {
                                const priceData =
                                    allPrices[asset.symbol];
                                const price =
                                    selectedType === "crypto"
                                        ? priceData?.usd
                                        : priceData?.price;
                                const change =
                                    selectedType === "crypto"
                                        ? priceData
                                            ?.usd_24h_change
                                        : priceData?.change;

                                return (
                                    <button
                                        key={asset.symbol}
                                        onClick={() =>
                                            handleAssetSelect(asset)
                                        }
                                        className={`w-full p-2.5 rounded-xl text-left transition flex items-center gap-2 ${selectedAsset?.symbol ===
                                                asset.symbol
                                                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40"
                                                : "hover:bg-white/10 border border-transparent"
                                            }`}
                                    >
                                        <span
                                            className="text-xl"
                                            style={{
                                                color: asset.color,
                                            }}
                                        >
                                            {asset.icon}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {asset.name}
                                            </div>
                                            <div className="text-xs text-white/40">
                                                {asset.displaySymbol ||
                                                    asset.symbol}
                                            </div>
                                        </div>
                                        {price != null && (
                                            <div className="text-right">
                                                <div className="text-xs font-medium">
                                                    {formatPrice(
                                                        price
                                                    )}
                                                </div>
                                                {change != null && (
                                                    <div
                                                        className={`text-xs ${change >= 0
                                                                ? "text-green-400"
                                                                : "text-red-400"
                                                            }`}
                                                    >
                                                        {change >= 0
                                                            ? "+"
                                                            : ""}
                                                        {change.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-4">
                        {loading ? (
                            <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
                                <p className="text-white/60">
                                    Loading real-time data...
                                </p>
                            </div>
                        ) : marketData && signal ? (
                            <>
                                {/* Price + Signal */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span
                                                className="text-3xl"
                                                style={{
                                                    color: selectedAsset.color,
                                                }}
                                            >
                                                {selectedAsset.icon}
                                            </span>
                                            <div>
                                                <h2 className="text-xl font-bold">
                                                    {
                                                        selectedAsset.name
                                                    }
                                                </h2>
                                                <p className="text-white/50 text-sm">
                                                    {selectedAsset.displaySymbol ||
                                                        selectedAsset.symbol}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-3xl font-bold mb-2">
                                            {formatPrice(
                                                marketData.price
                                            )}
                                        </div>
                                        <div className="flex gap-3 text-sm">
                                            <span
                                                className={
                                                    marketData.change24h >= 0
                                                        ? "text-green-400"
                                                        : "text-red-400"
                                                }
                                            >
                                                24h:{" "}
                                                {marketData.change24h >=
                                                    0
                                                    ? "+"
                                                    : ""}
                                                {marketData.change24h?.toFixed(
                                                    2
                                                )}
                                                %
                                            </span>
                                            {marketData.change7d !==
                                                0 && (
                                                    <span
                                                        className={
                                                            marketData.change7d >=
                                                                0
                                                                ? "text-green-400"
                                                                : "text-red-400"
                                                        }
                                                    >
                                                        7d:{" "}
                                                        {marketData.change7d >=
                                                            0
                                                            ? "+"
                                                            : ""}
                                                        {marketData.change7d?.toFixed(
                                                            2
                                                        )}
                                                        %
                                                    </span>
                                                )}
                                        </div>
                                    </div>

                                    <div
                                        className={`rounded-2xl p-5 border bg-gradient-to-br ${getSignalColor(
                                            signal.strength
                                        )}`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm text-white/60">
                                                Trading Signal
                                            </span>
                                            <span className="text-2xl">
                                                {signal.emoji}
                                            </span>
                                        </div>
                                        <div className="text-3xl font-bold mb-2">
                                            {signal.signal}
                                        </div>
                                        <div className="flex gap-4 text-sm">
                                            <span className="text-green-200">
                                                📈{" "}
                                                {
                                                    signal.bullishSignals
                                                }
                                            </span>
                                            <span className="text-red-200">
                                                📉{" "}
                                                {
                                                    signal.bearishSignals
                                                }
                                            </span>
                                        </div>
                                        <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-green-400"
                                                style={{
                                                    width: `${signal.bullishPercentage.toFixed(
                                                        0
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Chart */}
                                {chartData.length > 0 && (
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                        <h3 className="font-semibold mb-3 text-sm">
                                            Price Chart ({timeframe})
                                        </h3>
                                        <div
                                            style={{
                                                width: "100%",
                                                height: 250,
                                            }}
                                        >
                                            <ResponsiveContainer>
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient
                                                            id="grad"
                                                            x1="0"
                                                            y1="0"
                                                            x2="0"
                                                            y2="1"
                                                        >
                                                            <stop
                                                                offset="5%"
                                                                stopColor={
                                                                    selectedAsset.color
                                                                }
                                                                stopOpacity={
                                                                    0.3
                                                                }
                                                            />
                                                            <stop
                                                                offset="95%"
                                                                stopColor={
                                                                    selectedAsset.color
                                                                }
                                                                stopOpacity={
                                                                    0
                                                                }
                                                            />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        stroke="rgba(255,255,255,0.05)"
                                                    />
                                                    <XAxis
                                                        dataKey="time"
                                                        stroke="rgba(255,255,255,0.3)"
                                                        fontSize={10}
                                                    />
                                                    <YAxis
                                                        stroke="rgba(255,255,255,0.3)"
                                                        fontSize={10}
                                                        domain={[
                                                            "auto",
                                                            "auto",
                                                        ]}
                                                        tickFormatter={(
                                                            v
                                                        ) =>
                                                            formatPrice(
                                                                v
                                                            )
                                                        }
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            background:
                                                                "rgba(0,0,0,0.9)",
                                                            border: "none",
                                                            borderRadius:
                                                                "10px",
                                                        }}
                                                        formatter={(v) => [
                                                            formatPrice(
                                                                v
                                                            ),
                                                            "Price",
                                                        ]}
                                                    />
                                                    {indicators && (
                                                        <>
                                                            <ReferenceLine
                                                                y={
                                                                    indicators
                                                                        .bollinger
                                                                        .upper
                                                                }
                                                                stroke="#ef4444"
                                                                strokeDasharray="3 3"
                                                                strokeOpacity={
                                                                    0.5
                                                                }
                                                            />
                                                            <ReferenceLine
                                                                y={
                                                                    indicators
                                                                        .bollinger
                                                                        .lower
                                                                }
                                                                stroke="#22c55e"
                                                                strokeDasharray="3 3"
                                                                strokeOpacity={
                                                                    0.5
                                                                }
                                                            />
                                                        </>
                                                    )}
                                                    <Area
                                                        type="monotone"
                                                        dataKey="price"
                                                        stroke={
                                                            selectedAsset.color
                                                        }
                                                        strokeWidth={2}
                                                        fill="url(#grad)"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Signal Reasons */}
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <h3 className="font-semibold mb-3 text-sm">
                                        Analysis
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {signal.reasons.map((r, i) => (
                                            <span
                                                key={i}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${r.type ===
                                                        "bullish"
                                                        ? "bg-green-500/20 text-green-400"
                                                        : r.type ===
                                                            "bearish"
                                                            ? "bg-red-500/20 text-red-400"
                                                            : "bg-white/10 text-white/60"
                                                    }`}
                                            >
                                                {r.type === "bullish"
                                                    ? "📈"
                                                    : r.type ===
                                                        "bearish"
                                                        ? "📉"
                                                        : "➡️"}{" "}
                                                {r.text}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Indicators */}
                                {indicators && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                            <p className="text-xs text-white/40">
                                                RSI
                                            </p>
                                            <p
                                                className={`text-xl font-bold ${indicators.rsi <
                                                        30
                                                        ? "text-green-400"
                                                        : indicators.rsi >
                                                            70
                                                            ? "text-red-400"
                                                            : ""
                                                    }`}
                                            >
                                                {indicators.rsi.toFixed(
                                                    1
                                                )}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                            <p className="text-xs text-white/40">
                                                MACD
                                            </p>
                                            <p
                                                className={`text-xl font-bold ${indicators.macd
                                                        .histogram >
                                                        0
                                                        ? "text-green-400"
                                                        : "text-red-400"
                                                    }`}
                                            >
                                                {indicators.macd
                                                    .histogram > 0
                                                    ? "Bullish"
                                                    : "Bearish"}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                            <p className="text-xs text-white/40">
                                                SMA 20
                                            </p>
                                            <p className="text-xl font-bold">
                                                {formatPrice(
                                                    indicators.sma20
                                                )}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                            <p className="text-xs text-white/40">
                                                Stochastic
                                            </p>
                                            <p
                                                className={`text-xl font-bold ${indicators
                                                        .stochastic.k <
                                                        20
                                                        ? "text-green-400"
                                                        : indicators
                                                            .stochastic
                                                            .k >
                                                            80
                                                            ? "text-red-400"
                                                            : ""
                                                    }`}
                                            >
                                                {indicators.stochastic.k.toFixed(
                                                    1
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Market Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                        <p className="text-xs text-white/40">
                                            Market Cap
                                        </p>
                                        <p className="font-semibold">
                                            {formatNumber(
                                                marketData.marketCap
                                            )}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                        <p className="text-xs text-white/40">
                                            Volume
                                        </p>
                                        <p className="font-semibold">
                                            {formatNumber(
                                                marketData.volume24h
                                            )}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                        <p className="text-xs text-white/40">
                                            24h High
                                        </p>
                                        <p className="font-semibold text-green-400">
                                            {formatPrice(
                                                marketData.high24h
                                            )}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                                        <p className="text-xs text-white/40">
                                            24h Low
                                        </p>
                                        <p className="font-semibold text-red-400">
                                            {formatPrice(
                                                marketData.low24h
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Buy Links */}
                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                    <h3 className="font-semibold mb-3 text-sm">
                                        🛒 Trade {selectedAsset.name}
                                    </h3>
                                    {Object.keys(buyLinks).length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {Object.entries(
                                                buyLinks
                                            ).map(([ex, url]) => (
                                                <a
                                                    key={ex}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center px-3 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl font-medium text-sm capitalize transition"
                                                >
                                                    {ex}
                                                </a>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-white/50">
                                            No exchanges configured for this asset.
                                        </p>
                                    )}
                                </div>

                                <p className="text-center text-xs text-white/30">
                                    ⚠️ Not financial advice. Always DYOR.
                                </p>
                            </>
                        ) : (
                            <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
                                <p className="text-4xl mb-4">📊</p>
                                <p className="text-white/60">
                                    Select an asset to view analysis
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-white/30 text-xs">
                        🌍 World-Studio.live • Real-Time Market
                        Analyzer
                    </p>
                </div>
            </div>
        </div>
    );
}
