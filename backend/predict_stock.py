"""
World-Studio.live - Ultimate Stock Predictor
============================================

ML-powered stock prediction using ensemble models:
- Random Forest
- XGBoost  
- LSTM Neural Network

Features:
- Technical indicators (RSI, MACD, Moving Averages, Volatility)
- News sentiment analysis
- Ensemble prediction for accuracy
- FastAPI REST & WebSocket API
- Real-time predictions

Usage:
    python predict_stock.py                    # Start server on port 8000
    uvicorn predict_stock:app --port 8000     # Production mode

API:
    POST /predict {"symbol": "AAPL"}          # Get prediction
    GET /quote/{symbol}                        # Quick quote
    GET /health                                # Health check
    WS /ws                                     # Real-time updates
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

import numpy as np
import pandas as pd
import yfinance as yf
import requests

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score

import torch
import torch.nn as nn

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio

# Optional imports
try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    xgb = None
    HAS_XGB = False

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    HAS_VADER = True
except ImportError:
    HAS_VADER = False

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===========================================
# CONFIGURATION
# ===========================================

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

# Cache for predictions (simple in-memory)
prediction_cache: Dict[str, Dict] = {}
CACHE_TTL = 300  # 5 minutes

# Supported symbols
SUPPORTED_STOCKS = [
    "AAPL", "MSFT", "GOOG", "GOOGL", "META", "NVDA", "AMD", "INTC",
    "AMZN", "TSLA", "NFLX", "CRM", "ORCL", "ADBE", "PYPL", "SQ",
    "JPM", "V", "MA", "BAC", "GS", "WFC",
    "JNJ", "UNH", "PFE", "MRNA", "ABBV",
    "XOM", "CVX", "COP",
    "KO", "PEP", "MCD", "NKE", "DIS", "SBUX",
]

SUPPORTED_CRYPTO = [
    "BTC-USD", "ETH-USD", "BNB-USD", "XRP-USD", "SOL-USD",
    "ADA-USD", "DOGE-USD", "DOT-USD", "MATIC-USD", "AVAX-USD"
]

# ===========================================
# NEWS SENTIMENT
# ===========================================


def get_news_sentiment(symbol: str, api_key: Optional[str] = None) -> float:
    """
    Fetch news sentiment for a stock symbol.
    Returns compound score between -1 (negative) and 1 (positive).
    """
    if not api_key and not NEWS_API_KEY:
        return 0.0

    if not HAS_VADER:
        return 0.0

    key = api_key or NEWS_API_KEY
    clean_symbol = symbol.replace("-USD", "").replace(".", "")

    url = (
        f"https://newsapi.org/v2/everything"
        f"?q={clean_symbol}&language=en&sortBy=publishedAt&pageSize=10&apiKey={key}"
    )

    try:
        resp = requests.get(url, timeout=5)
        data = resp.json()
        articles = data.get("articles", [])

        if not articles:
            return 0.0

        analyzer = SentimentIntensityAnalyzer()
        scores = []

        for article in articles[:10]:
            title = article.get("title", "")
            desc = article.get("description", "")
            text = f"{title} {desc}"

            if text.strip():
                score = analyzer.polarity_scores(text)["compound"]
                scores.append(score)

        return float(np.mean(scores)) if scores else 0.0

    except Exception as e:
        logger.warning(f"Sentiment fetch error for {symbol}: {e}")
        return 0.0


# ===========================================
# DATA FETCHING
# ===========================================

def fetch_stock_data(symbol: str, years: int = 5) -> pd.DataFrame:
    """
    Fetch historical stock data from Yahoo Finance.
    """
    end = datetime.now()
    start = end - timedelta(days=years * 365)

    try:
        df = yf.download(symbol, start=start, end=end, progress=False)

        if df.empty:
            raise ValueError(f"No data found for {symbol}")

        if len(df) < 100:
            raise ValueError(
                f"Insufficient data for {symbol} (need 100+ days)")

        # Flatten multi-index columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        return df

    except Exception as e:
        logger.error(f"Data fetch error for {symbol}: {e}")
        raise


def get_current_price(symbol: str) -> float:
    """Get current/latest price for symbol."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        return info.get("regularMarketPrice") or info.get("currentPrice") or 0.0
    except Exception:
        return 0.0


# ===========================================
# TECHNICAL INDICATORS
# ===========================================

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Relative Strength Index."""
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.rolling(window=period, min_periods=1).mean()
    avg_loss = loss.rolling(window=period, min_periods=1).mean()

    rs = avg_gain / avg_loss.replace(0, np.inf)
    rsi = 100 - (100 / (1 + rs))

    return rsi.fillna(50)


def calculate_macd(series: pd.Series) -> pd.Series:
    """Calculate MACD (Moving Average Convergence Divergence)."""
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    return ema12 - ema26


def calculate_bollinger_bands(series: pd.Series, period: int = 20) -> tuple:
    """Calculate Bollinger Bands."""
    sma = series.rolling(window=period).mean()
    std = series.rolling(window=period).std()

    upper = sma + (std * 2)
    lower = sma - (std * 2)

    return upper, sma, lower


def add_technical_features(df: pd.DataFrame, sentiment: float = 0.0) -> pd.DataFrame:
    """Add technical indicators as features."""
    df = df.copy()

    # Moving averages
    df["MA_5"] = df["Close"].rolling(5).mean()
    df["MA_10"] = df["Close"].rolling(10).mean()
    df["MA_20"] = df["Close"].rolling(20).mean()
    df["MA_50"] = df["Close"].rolling(50).mean()

    # Price changes
    df["Daily_Return"] = df["Close"].pct_change()
    df["Weekly_Return"] = df["Close"].pct_change(5)

    # Volatility
    df["Volatility_5"] = df["Daily_Return"].rolling(5).std()
    df["Volatility_20"] = df["Daily_Return"].rolling(20).std()

    # Technical indicators
    df["RSI"] = calculate_rsi(df["Close"])
    df["MACD"] = calculate_macd(df["Close"])

    # Volume features
    df["Volume_Change"] = df["Volume"].pct_change()
    df["Volume_MA"] = df["Volume"].rolling(20).mean()
    df["Volume_Ratio"] = df["Volume"] / df["Volume_MA"]

    # Price position
    df["Price_vs_MA20"] = (df["Close"] - df["MA_20"]) / df["MA_20"]
    df["High_Low_Range"] = (df["High"] - df["Low"]) / df["Close"]

    # Sentiment
    df["Sentiment"] = sentiment

    # Target: next day's close
    df["Target"] = df["Close"].shift(-1)

    return df.dropna()


# ===========================================
# FEATURE PREPARATION
# ===========================================

def prepare_features(df: pd.DataFrame) -> tuple:
    """Prepare features for ML models."""
    feature_cols = [
        "Close", "Volume", "MA_5", "MA_10", "MA_20",
        "Daily_Return", "Volatility_5", "Volatility_20",
        "RSI", "MACD", "Volume_Change", "Volume_Ratio",
        "Price_vs_MA20", "High_Low_Range", "Sentiment"
    ]

    # Filter to available columns
    available = [c for c in feature_cols if c in df.columns]

    X = df[available].values
    y = df["Target"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return X_scaled, y, available, scaler


def create_sequences(X: np.ndarray, y: np.ndarray, lookback: int = 20) -> tuple:
    """Create sequences for LSTM model."""
    Xs, ys = [], []

    for i in range(len(X) - lookback):
        Xs.append(X[i:i + lookback])
        ys.append(y[i + lookback])

    return np.array(Xs), np.array(ys)


# ===========================================
# ML MODELS
# ===========================================

def train_random_forest(X: np.ndarray, y: np.ndarray) -> RandomForestRegressor:
    """Train Random Forest model."""
    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X, y)
    return model


def train_gradient_boosting(X: np.ndarray, y: np.ndarray) -> GradientBoostingRegressor:
    """Train Gradient Boosting model."""
    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    model.fit(X, y)
    return model


def train_xgboost(X: np.ndarray, y: np.ndarray):
    """Train XGBoost model if available."""
    if not HAS_XGB:
        return None

    model = xgb.XGBRegressor(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        verbosity=0,
        random_state=42
    )
    model.fit(X, y)
    return model


# ===========================================
# LSTM MODEL
# ===========================================

class LSTMPredictor(nn.Module):
    """LSTM Neural Network for time series prediction."""

    def __init__(self, n_features: int, hidden_size: int = 64, num_layers: int = 2):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=n_features,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2 if num_layers > 1 else 0
        )

        self.dropout = nn.Dropout(0.2)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        out = self.dropout(lstm_out[:, -1, :])
        return self.fc(out)


def train_lstm(
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_features: int,
    epochs: int = 50,
    batch_size: int = 32
) -> tuple:
    """Train LSTM model."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = LSTMPredictor(n_features).to(device)

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    X_tensor = torch.tensor(X_train, dtype=torch.float32).to(device)
    y_tensor = torch.tensor(
        y_train, dtype=torch.float32).view(-1, 1).to(device)

    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        output = model(X_tensor)
        loss = criterion(output, y_tensor)
        loss.backward()
        optimizer.step()

        if (epoch + 1) % 10 == 0:
            logger.debug(
                f"LSTM Epoch {epoch + 1}/{epochs}, Loss: {loss.item():.6f}")

    return model, device


def predict_with_lstm(model: nn.Module, device: str, X: np.ndarray) -> np.ndarray:
    """Make predictions with LSTM model."""
    model.eval()
    X_tensor = torch.tensor(X, dtype=torch.float32).to(device)

    with torch.no_grad():
        predictions = model(X_tensor).cpu().numpy().flatten()

    return predictions


# ===========================================
# ENSEMBLE PREDICTION
# ===========================================

def ensemble_predict(
    models: Dict[str, Any],
    X: np.ndarray,
    X_seq: Optional[np.ndarray] = None,
    weights: Optional[Dict[str, float]] = None
) -> float:
    """
    Make ensemble prediction using all available models.
    """
    if weights is None:
        weights = {"rf": 0.35, "gb": 0.25, "xgb": 0.25, "lstm": 0.15}

    predictions = []
    total_weight = 0

    # Random Forest
    if "rf" in models and models["rf"] is not None:
        pred = models["rf"].predict(X[[-1]])[0]
        predictions.append(pred * weights.get("rf", 0.3))
        total_weight += weights.get("rf", 0.3)

    # Gradient Boosting
    if "gb" in models and models["gb"] is not None:
        pred = models["gb"].predict(X[[-1]])[0]
        predictions.append(pred * weights.get("gb", 0.25))
        total_weight += weights.get("gb", 0.25)

    # XGBoost
    if "xgb" in models and models["xgb"] is not None:
        pred = models["xgb"].predict(X[[-1]])[0]
        predictions.append(pred * weights.get("xgb", 0.25))
        total_weight += weights.get("xgb", 0.25)

    # LSTM
    if "lstm" in models and models["lstm"] is not None and X_seq is not None:
        pred = predict_with_lstm(
            models["lstm"], models["device"], X_seq[[-1]])[0]
        predictions.append(pred * weights.get("lstm", 0.15))
        total_weight += weights.get("lstm", 0.15)

    if total_weight == 0:
        raise ValueError("No models available for prediction")

    return sum(predictions) / total_weight


# ===========================================
# MAIN PREDICTION PIPELINE
# ===========================================

def predict_stock(
    symbol: str,
    lookback: int = 20,
    use_cache: bool = True
) -> Dict[str, Any]:
    """
    Main prediction pipeline for a stock symbol.
    """
    symbol = symbol.upper()

    # Check cache
    if use_cache and symbol in prediction_cache:
        cached = prediction_cache[symbol]
        if datetime.now().timestamp() - cached.get("cached_at", 0) < CACHE_TTL:
            return cached["data"]

    try:
        # Get sentiment
        sentiment = get_news_sentiment(symbol, NEWS_API_KEY)
        logger.info(f"Sentiment for {symbol}: {sentiment:.3f}")

        # Fetch and prepare data
        df = fetch_stock_data(symbol)
        df = add_technical_features(df, sentiment)

        X, y, features, scaler = prepare_features(df)

        # Train/test split
        split_idx = int(len(X) * 0.8)
        X_train, y_train = X[:split_idx], y[:split_idx]
        X_test, y_test = X[split_idx:], y[split_idx:]

        # Create sequences for LSTM
        X_seq, y_seq = create_sequences(X, y, lookback)

        # Train models
        models = {
            "rf": train_random_forest(X_train, y_train),
            "gb": train_gradient_boosting(X_train, y_train),
            "xgb": train_xgboost(X_train, y_train)
        }

        # Train LSTM if enough data
        if len(X_seq) > lookback * 2:
            seq_split = split_idx - lookback
            X_seq_train = X_seq[:seq_split]
            y_seq_train = y_seq[:seq_split]

            if len(X_seq_train) > 10:
                lstm_model, device = train_lstm(
                    X_seq_train,
                    y_seq_train,
                    n_features=X_seq.shape[2],
                    epochs=30
                )
                models["lstm"] = lstm_model
                models["device"] = device

        # Make prediction
        predicted_price = ensemble_predict(models, X, X_seq)

        # Calculate metrics
        current_price = float(df["Close"].iloc[-1])
        change = predicted_price - current_price
        change_percent = (change / current_price) * 100

        # Determine direction and confidence
        direction = "up" if change > 0 else "down" if change < 0 else "neutral"

        # Calculate confidence based on model agreement
        individual_preds = []
        if models.get("rf"):
            individual_preds.append(models["rf"].predict(X[[-1]])[0])
        if models.get("gb"):
            individual_preds.append(models["gb"].predict(X[[-1]])[0])
        if models.get("xgb"):
            individual_preds.append(models["xgb"].predict(X[[-1]])[0])

        if len(individual_preds) > 1:
            std_dev = np.std(individual_preds)
            confidence = max(
                50, min(95, 100 - (std_dev / current_price * 100 * 10)))
        else:
            confidence = 70.0

        # Build result
        result = {
            "symbol": symbol,
            "currentPrice": round(current_price, 2),
            "predictedPrice": round(predicted_price, 2),
            "change": round(change, 2),
            "changePercent": round(change_percent, 2),
            "direction": direction,
            "confidence": round(confidence, 1),
            "sentiment": round(sentiment, 3),
            "sentimentLabel": "bullish" if sentiment > 0.1 else "bearish" if sentiment < -0.1 else "neutral",
            "indicators": {
                "rsi": round(float(df["RSI"].iloc[-1]), 2),
                "macd": round(float(df["MACD"].iloc[-1]), 4),
                "volatility": round(float(df["Volatility_20"].iloc[-1]) * 100, 2),
                "ma20": round(float(df["MA_20"].iloc[-1]), 2),
                "ma50": round(float(df["MA_50"].iloc[-1]), 2) if "MA_50" in df.columns else None
            },
            "models": {
                "rf": models.get("rf") is not None,
                "gb": models.get("gb") is not None,
                "xgb": models.get("xgb") is not None,
                "lstm": models.get("lstm") is not None
            },
            "dataPoints": len(df),
            "timestamp": datetime.utcnow().isoformat(),
            "disclaimer": "This is a demo prediction. Not financial advice."
        }

        # Cache result
        prediction_cache[symbol] = {
            "data": result,
            "cached_at": datetime.now().timestamp()
        }

        return result

    except Exception as e:
        logger.error(f"Prediction error for {symbol}: {e}")
        raise


# ===========================================
# FASTAPI APPLICATION
# ===========================================

app = FastAPI(
    title="World-Studio Stock Predictor",
    description="ML-powered stock price prediction API",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "https://world-studio.live"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class PredictRequest(BaseModel):
    symbol: str
    use_cache: bool = True


class PredictResponse(BaseModel):
    symbol: str
    currentPrice: float
    predictedPrice: float
    change: float
    changePercent: float
    direction: str
    confidence: float
    sentiment: float
    timestamp: str


# ===========================================
# API ENDPOINTS
# ===========================================

@app.get("/")
async def root():
    return {
        "message": "World-Studio Stock Predictor",
        "version": "1.0.0",
        "endpoints": {
            "predict": "POST /predict",
            "quote": "GET /quote/{symbol}",
            "supported": "GET /supported",
            "health": "GET /health"
        }
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models": {
            "xgboost": HAS_XGB,
            "vader": HAS_VADER,
            "torch": torch.cuda.is_available() and "GPU" or "CPU"
        }
    }


@app.get("/supported")
async def get_supported():
    return {
        "stocks": SUPPORTED_STOCKS,
        "crypto": SUPPORTED_CRYPTO,
        "total": len(SUPPORTED_STOCKS) + len(SUPPORTED_CRYPTO)
    }


@app.post("/predict")
async def predict_endpoint(request: PredictRequest):
    try:
        result = predict_stock(request.symbol, use_cache=request.use_cache)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")


@app.get("/predict/{symbol}")
async def predict_get(symbol: str):
    try:
        result = predict_stock(symbol)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")


@app.get("/quote/{symbol}")
async def get_quote(symbol: str):
    """Get quick quote without full prediction."""
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info

        return {
            "symbol": symbol.upper(),
            "price": info.get("regularMarketPrice") or info.get("currentPrice"),
            "previousClose": info.get("previousClose"),
            "open": info.get("open"),
            "high": info.get("dayHigh"),
            "low": info.get("dayLow"),
            "volume": info.get("volume"),
            "marketCap": info.get("marketCap"),
            "name": info.get("shortName") or info.get("longName"),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Quote failed: {str(e)}")


@app.delete("/cache")
async def clear_cache():
    """Clear prediction cache."""
    prediction_cache.clear()
    return {"message": "Cache cleared", "timestamp": datetime.utcnow().isoformat()}


# ===========================================
# WEBSOCKET FOR REAL-TIME UPDATES
# ===========================================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")

    try:
        data = await websocket.receive_json()
        symbol = data.get("symbol", "AAPL").upper()
        interval = data.get("interval", 60)  # seconds

        while True:
            try:
                result = predict_stock(symbol, use_cache=False)
                await websocket.send_json(result)
            except Exception as e:
                await websocket.send_json({"error": str(e)})

            await asyncio.sleep(interval)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


# ===========================================
# MAIN
# ===========================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    print("╔════════════════════════════════════════╗")
    print("║  📈 WORLD-STUDIO STOCK PREDICTOR       ║")
    print("╠════════════════════════════════════════╣")
    print(f"║  Host: {host}                         ║")
    print(f"║  Port: {port}                            ║")
    print(f"║  XGBoost: {'✅' if HAS_XGB else '❌'}                          ║")
    print(
        f"║  VADER: {'✅' if HAS_VADER else '❌'}                            ║")
    print(
        f"║  CUDA: {'✅' if torch.cuda.is_available() else '❌'}                             ║")
    print("╚════════════════════════════════════════╝")

    uvicorn.run(app, host=host, port=port)
