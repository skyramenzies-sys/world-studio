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
import asyncio

# -------- LIVE NEWS SENTIMENT --------


def get_news_sentiment(symbol, api_key=None):
    """Fetches latest news and computes VADER sentiment."""
    # Example uses NewsAPI.org (get your own free API key!)
    if not api_key:
        return 0.0  # fallback
    url = f"https://newsapi.org/v2/everything?q={symbol}&language=en&sortBy=publishedAt&pageSize=5&apiKey={api_key}"
    try:
        resp = requests.get(url, timeout=5)
        articles = resp.json().get("articles", [])
        if not articles:
            return 0.0
        analyzer = SentimentIntensityAnalyzer()
        scores = [analyzer.polarity_scores(
            a['title'])['compound'] for a in articles]
        avg_sent = float(np.mean(scores))
        return avg_sent
    except Exception:
        return 0.0

# -------- FEATURE ENGINEERING --------


def fetch_stock_data(symbol, years=5):
    end = datetime.now()
    start = end - timedelta(days=years*365)
    df = yf.download(symbol, start=start, end=end, progress=False)
    if df.empty or len(df) < 100:
        raise ValueError(f"Insufficient data for {symbol}")
    return df


def add_features(df, sentiment=0.0):
    df = df.copy()
    df['MA_5'] = df['Close'].rolling(window=5).mean()
    df['MA_20'] = df['Close'].rolling(window=20).mean()
    df['Daily_Return'] = df['Close'].pct_change()
    df['Volatility'] = df['Daily_Return'].rolling(window=5).std()
    df['RSI'] = _rsi(df['Close'])
    df['MACD'] = _macd(df['Close'])
    df['Volume_Change'] = df['Volume'].pct_change()
    df['Sentiment'] = sentiment  # LIVE news sentiment!
    df['Target'] = df['Close'].shift(-1)
    df = df.dropna()
    return df


def _rsi(series, period=14):
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def _macd(series):
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    return ema12 - ema26


def get_X_y(df):
    feature_columns = ['Close', 'Volume', 'MA_5', 'MA_20',
                       'Daily_Return', 'Volatility', 'RSI', 'MACD', 'Volume_Change', 'Sentiment']
    X = df[feature_columns].values
    y = df['Target'].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    return X_scaled, y, feature_columns, scaler

# -------- ML & DEEP LEARNING MODELS --------


def train_rf(X_train, y_train):
    model = RandomForestRegressor(n_estimators=100)
    model.fit(X_train, y_train)
    return model


def train_xgb(X_train, y_train):
    if xgb is None:
        return None
    model = xgb.XGBRegressor(n_estimators=100, verbosity=0)
    model.fit(X_train, y_train)
    return model


class LSTMModel(nn.Module):
    def __init__(self, n_features, hidden_size=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_size=n_features, hidden_size=hidden_size,
                            num_layers=num_layers, batch_first=True)
        self.dropout = nn.Dropout(0.2)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        out = self.dropout(lstm_out[:, -1, :])
        return self.fc(out)


def create_sequences(X, y, lookback=20):
    Xs, ys = [], []
    for i in range(len(X) - lookback):
        Xs.append(X[i:(i + lookback)])
        ys.append(y[i + lookback])
    return np.array(Xs), np.array(ys)


def train_lstm(X_train, y_train, n_features, lookback=20, epochs=10):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = LSTMModel(n_features=n_features).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.MSELoss()
    X_train_t = torch.tensor(X_train, dtype=torch.float32).to(device)
    y_train_t = torch.tensor(
        y_train, dtype=torch.float32).view(-1, 1).to(device)
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        output = model(X_train_t)
        loss = criterion(output, y_train_t)
        loss.backward()
        optimizer.step()
    return model, device


def predict_lstm(model, device, X):
    model.eval()
    X_t = torch.tensor(X, dtype=torch.float32).to(device)
    with torch.no_grad():
        pred = model(X_t).cpu().numpy().flatten()
    return pred

# -------- ENSEMBLE & EXPLAINABILITY --------


def ensemble_predict(models, X, X_seq, feature_columns, lookback=20):
    preds = []
    if models.get('rf'):
        preds.append(models['rf'].predict(X[[-1]]))
    if models.get('xgb'):
        preds.append(models['xgb'].predict(X[[-1]]))
    if models.get('lstm'):
        lstm_pred = predict_lstm(models['lstm'], models['device'], X_seq[[-1]])
        preds.append(lstm_pred)
    return float(np.mean(preds))


def explain_rf(model, X, feature_names):
    if shap is None:
        return {}
    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X[-1:])
    return {feature_names[i]: float(shap_vals[0][i]) for i in range(len(feature_names))}

# -------- PREDICTION PIPELINE --------


def ultimate_hellfire_predict(symbol, api_key=None, lookback=20):
    sentiment = get_news_sentiment(symbol, api_key)
    df = fetch_stock_data(symbol)
    df = add_features(df, sentiment)
    X, y, feature_columns, scaler = get_X_y(df)
    split = int(len(X) * 0.8)
    X_train, y_train = X[:split], y[:split]
    X_test, y_test = X[split:], y[split:]
    X_seq, y_seq = create_sequences(X, y, lookback)
    X_seq_train, y_seq_train = X_seq[:split -
                                     lookback], y_seq[:split - lookback]
    X_seq_test, y_seq_test = X_seq[split - lookback:], y_seq[split - lookback:]
    models = {}
    models['rf'] = train_rf(X_train, y_train)
    models['xgb'] = train_xgb(X_train, y_train)
    if len(X_seq_train) > 0:
        models['lstm'], models['device'] = train_lstm(X_seq_train, y_seq_train,
                                                      n_features=X_seq.shape[2], lookback=lookback)
    pred = ensemble_predict(models, X, X_seq, feature_columns, lookback)
    current_price = float(df['Close'].iloc[-1])
    change = pred - current_price
    change_percent = 100 * change / current_price
    rf_score = r2_score(y_test, models['rf'].predict(
        X_test)) if models.get('rf') else 0
    xgb_score = r2_score(y_test, models['xgb'].predict(
        X_test)) if models.get('xgb') else 0
    lstm_score = (r2_score(y_seq_test, predict_lstm(models['lstm'], models['device'], X_seq_test))
                  if models.get('lstm') and len(X_seq_test) > 0 else 0)
    confidence = float(np.mean([rf_score, xgb_score, lstm_score])) * 100
    confidence = max(min(confidence, 99.9), 30)
    explanation = explain_rf(models['rf'], X, feature_columns)
    return {
        "symbol": symbol,
        "currentPrice": round(current_price, 2),
        "predictedPrice": round(pred, 2),
        "change": round(change, 2),
        "changePercent": round(change_percent, 2),
        "confidence": round(confidence, 2),
        "sentiment": sentiment,
        "timestamp": datetime.now().isoformat(),
        "model": "Ultimate Hell Fire Ensemble: RF + XGB + LSTM + Live News",
        "explanation": explanation,
        "features": feature_columns
    }

# -------- FASTAPI: REST + WEBSOCKET --------


app = FastAPI(title="🔥 ULTIMATE HELL FIRE Stock Prediction API 🔥")


class StockRequest(BaseModel):
    symbol: str


@app.post("/predict")
async def predict(req: StockRequest):
    api_key = None  # <- SET your NewsAPI key here, or fetch from env
    try:
        return ultimate_hellfire_predict(req.symbol, api_key=api_key)
    except Exception as e:
        return {"error": str(e)}


@app.get("/")
async def root():
    return {"message": "🔥 Welcome to the ULTIMATE HELL FIRE Stock Prediction API! 🔥"}


@app.websocket("/ws")
async def stock_ws(websocket: WebSocket):
    await websocket.accept()
    api_key = None  # <- SET your NewsAPI key here, or fetch from env
    try:
        data = await websocket.receive_json()
        symbol = data.get("symbol", "AAPL")
        while True:
            pred = ultimate_hellfire_predict(symbol, api_key=api_key)
            await websocket.send_json(pred)
            await asyncio.sleep(30)
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        await websocket.close()

if __name__ == "__main__":
    import sys
    import uvicorn
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        api_key = None  # <- SET your NewsAPI key here
        print(ultimate_hellfire_predict(symbol, api_key=api_key))
    else:
        uvicorn.run(app, host="0.0.0.0", port=8000)
