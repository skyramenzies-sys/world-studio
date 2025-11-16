"""
ULTIMATE STOCK PREDICTOR — CLEAN VERSION
Optimized for: stability, readability, production usage.
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score
from sklearn.preprocessing import StandardScaler

import torch
import torch.nn as nn
import requests
import asyncio

# Optional modules
try:
    import xgboost as xgb
except ImportError:
    xgb = None

try:
    import shap
except ImportError:
    shap = None

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from fastapi import FastAPI, WebSocket
from pydantic import BaseModel


# -----------------------------
# NEWS SENTIMENT
# -----------------------------
def get_news_sentiment(symbol: str, api_key=None) -> float:
    """Fetch latest news sentiment."""
    if not api_key:
        return 0.0

    url = (
        f"https://newsapi.org/v2/everything"
        f"?q={symbol}&language=en&sortBy=publishedAt&pageSize=5&apiKey={api_key}"
    )

    try:
        resp = requests.get(url, timeout=5)
        articles = resp.json().get("articles", [])
        if not articles:
            return 0.0

        analyzer = SentimentIntensityAnalyzer()
        scores = [analyzer.polarity_scores(
            a["title"])["compound"] for a in articles]
        return float(np.mean(scores))

    except Exception:
        return 0.0


# -----------------------------
# DATA FETCHING + FEATURES
# -----------------------------
def fetch_stock_data(symbol: str, years=5):
    end = datetime.now()
    start = end - timedelta(days=years * 365)

    df = yf.download(symbol, start=start, end=end, progress=False)
    if df.empty or len(df) < 100:
        raise ValueError(f"Insufficient stock data for {symbol}")

    return df


def _rsi(series, period=14):
    delta = series.diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _macd(series):
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    return ema12 - ema26


def add_features(df, sentiment=0.0):
    df = df.copy()

    df["MA_5"] = df["Close"].rolling(5).mean()
    df["MA_20"] = df["Close"].rolling(20).mean()
    df["Daily_Return"] = df["Close"].pct_change()
    df["Volatility"] = df["Daily_Return"].rolling(5).std()
    df["RSI"] = _rsi(df["Close"])
    df["MACD"] = _macd(df["Close"])
    df["Volume_Change"] = df["Volume"].pct_change()
    df["Sentiment"] = sentiment

    df["Target"] = df["Close"].shift(-1)
    return df.dropna()


def get_X_y(df):
    features = [
        "Close",
        "Volume",
        "MA_5",
        "MA_20",
        "Daily_Return",
        "Volatility",
        "RSI",
        "MACD",
        "Volume_Change",
        "Sentiment",
    ]

    X = df[features].values
    y = df["Target"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    return X_scaled, y, features, scaler


# -----------------------------
# MODELS
# -----------------------------
def train_rf(X, y):
    model = RandomForestRegressor(n_estimators=120)
    model.fit(X, y)
    return model


def train_xgb(X, y):
    if xgb is None:
        return None
    model = xgb.XGBRegressor(n_estimators=150, verbosity=0)
    model.fit(X, y)
    return model


class LSTMModel(nn.Module):
    def __init__(self, n_features, hidden=64, layers=2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=n_features,
            hidden_size=hidden,
            num_layers=layers,
            batch_first=True,
        )
        self.dropout = nn.Dropout(0.2)
        self.fc = nn.Linear(hidden, 1)

    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.dropout(out[:, -1])
        return self.fc(out)


def create_sequences(X, y, lookback):
    Xs, ys = [], []
    for i in range(len(X) - lookback):
        Xs.append(X[i: i + lookback])
        ys.append(y[i + lookback])
    return np.array(Xs), np.array(ys)


def train_lstm(X_train, y_train, n_features, epochs=8, lookback=20):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = LSTMModel(n_features).to(device)

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    X_t = torch.tensor(X_train, dtype=torch.float32).to(device)
    y_t = torch.tensor(y_train, dtype=torch.float32).view(-1, 1).to(device)

    for _ in range(epochs):
        model.train()
        optimizer.zero_grad()

        output = model(X_t)
        loss = criterion(output, y_t)

        loss.backward()
        optimizer.step()

    return model, device


def predict_lstm(model, device, X):
    model.eval()
    t = torch.tensor(X, dtype=torch.float32).to(device)
    with torch.no_grad():
        return model(t).cpu().numpy().flatten()


# -----------------------------
# ENSEMBLE
# -----------------------------
def ensemble_predict(models, X, X_seq):
    preds = []

    if "rf" in models:
        preds.append(models["rf"].predict(X[[-1]])[0])

    if "xgb" in models and models["xgb"] is not None:
        preds.append(models["xgb"].predict(X[[-1]])[0])

    if "lstm" in models:
        lstm_out = predict_lstm(
            models["lstm"], models["device"], X_seq[[-1]])[0]
        preds.append(lstm_out)

    return float(np.mean(preds))


# -----------------------------
# MAIN PIPELINE
# -----------------------------
def ultimate_predict(symbol: str, api_key=None, lookback=20):
    sentiment = get_news_sentiment(symbol, api_key)

    df = fetch_stock_data(symbol)
    df = add_features(df, sentiment)

    X, y, features, scaler = get_X_y(df)

    split = int(len(X) * 0.8)

    X_train, y_train = X[:split], y[:split]
    X_test, y_test = X[split:], y[split:]

    X_seq, y_seq = create_sequences(X, y, lookback)

    models = {
        "rf": train_rf(X_train, y_train),
        "xgb": train_xgb(X_train, y_train)
    }

    if len(X_seq) > lookback:
        X_seq_train = X_seq[: split - lookback]
        y_seq_train = y_seq[: split - lookback]

        lstm, device = train_lstm(
            X_seq_train, y_seq_train, n_features=X_seq.shape[2]
        )
        models["lstm"] = lstm
        models["device"] = device

    # FINAL PREDICTION
    pred = ensemble_predict(models, X, X_seq)

    current = float(df["Close"].iloc[-1])
    change = pred - current
    change_pct = (change / current) * 100

    return {
        "symbol": symbol,
        "currentPrice": round(current, 2),
        "predictedPrice": round(pred, 2),
        "change": round(change, 2),
        "changePercent": round(change_pct, 2),
        "sentiment": sentiment,
        "timestamp": datetime.utcnow().isoformat()
    }


# -----------------------------
# FASTAPI SERVER
# -----------------------------
app = FastAPI(title="Ultimate Stock Predictor")


class StockRequest(BaseModel):
    symbol: str


@app.post("/predict")
async def predict_route(req: StockRequest):
    try:
        return ultimate_predict(req.symbol)
    except Exception as e:
        return {"error": str(e)}


@app.get("/")
async def root():
    return {"message": "Ultimate Stock Predictor Running"}


@app.websocket("/ws")
async def ws_route(ws: WebSocket):
    await ws.accept()

    try:
        data = await ws.receive_json()
        symbol = data.get("symbol", "AAPL")

        while True:
            pred = ultimate_predict(symbol)
            await ws.send_json(pred)
            await asyncio.sleep(30)

    except Exception:
        pass

    finally:
        await ws.close()


# Standalone mode
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
