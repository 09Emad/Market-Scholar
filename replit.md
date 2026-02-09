# StockVision - Academic Stock Market Decision Support System

## Overview
An educational stock market decision support system for academic purposes. Provides real-time stock price data, historical candlestick charts with TradingView-style dark theme, news sentiment analysis using TF-IDF + VADER, and AI-powered next-day price direction predictions using LSTM neural networks for US stocks.

Built as a graduation project for Istanbul Topkapi University, Software Engineering Department (2025-2026).

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI + Custom SVG Charts
- **Backend**: Express.js REST API (port 5000)
- **ML Service**: Python Flask API (port 5001) - auto-spawned by Node.js server
- **Database**: PostgreSQL (Drizzle ORM) for prediction history logging
- **ML Models**: Custom Python models - LSTM (TensorFlow/Keras) + TF-IDF/VADER (scikit-learn/NLTK)
- **Data**: Yahoo Finance API for stock quotes, history, and news

## Key Features
- Stock symbol search with popular stock suggestions
- Real-time stock price display with key metrics
- Professional TradingView-style candlestick charts with 6 time ranges (1D, 1W, 1M, 3M, 6M, 1Y)
- Technical indicators: MA 20, MA 50 moving average lines + RSI(14) sub-chart
- Scrolling ticker bar showing major stock prices in real-time
- Watchlist sidebar with persistent favorites (localStorage), live prices, add/remove stocks
- News feed with TF-IDF + VADER sentiment analysis (positive/negative/neutral)
- LSTM-powered next-day price direction prediction with confidence scores
- Real model evaluation metrics (Accuracy, Precision, Recall, F1-Score) from train/test split
- Feature importance visualization (combined permutation + weight-based from LSTM model)
- Prediction history logging and tracking
- Market status indicator (Open/Closed/Pre-Market/After-Hours)
- Auto-refresh every 30 seconds during market hours
- Educational disclaimers and risk/limitations section

## Project Structure
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/components/price-chart.tsx` - Candlestick chart with MA/RSI indicators
- `client/src/components/ticker-bar.tsx` - Scrolling stock ticker bar
- `client/src/components/watchlist.tsx` - Watchlist sidebar with live prices
- `client/src/components/stock-search.tsx` - Stock symbol search
- `client/src/components/stock-price-card.tsx` - Stock price display card
- `client/src/components/news-feed.tsx` - News with sentiment analysis
- `client/src/components/prediction-card.tsx` - AI prediction display
- `client/src/components/model-metrics.tsx` - ML model evaluation metrics
- `client/src/components/feature-importance.tsx` - Feature importance chart
- `client/src/components/prediction-history.tsx` - Historical predictions table
- `client/src/components/market-status.tsx` - Market status indicator
- `client/src/components/disclaimer.tsx` - Educational disclaimers
- `client/src/lib/constants.ts` - Utility functions and popular stocks list
- `server/routes.ts` - API routes
- `server/stock-service.ts` - Yahoo Finance data service
- `server/prediction-service.ts` - Calls Python ML service for sentiment & predictions
- `server/index.ts` - Spawns Python ML service as child process with auto-restart
- `server/storage.ts` - Database storage layer
- `shared/schema.ts` - Drizzle schema and Zod types
- `python_ml/ml_service.py` - Python Flask ML service with LSTM + TF-IDF/VADER models

## ML Models (python_ml/ml_service.py)
- **Sentiment Analysis**: NLTK VADER for sentiment scoring + scikit-learn TF-IDF for keyword extraction
- **Price Prediction**: LSTM neural network (TensorFlow/Keras)
  - Features: price_returns, volume_change, volatility, price_range, momentum, ma_ratio, news_sentiment
  - Architecture: LSTM(64) -> Dropout(0.2) -> LSTM(32) -> Dropout(0.2) -> Dense(16) -> Dense(1, sigmoid)
  - Training: 6 months historical data, sequence_length=7, 50 epochs, batch_size=8
  - Evaluation: 80/20 train/test split with real metrics
  - Feature importance: 60% permutation importance + 40% weight-based from LSTM input weights
  - Confidence capped to 35%-92% for realism

## Technical Indicators (Frontend)
- **MA 20**: 20-period Simple Moving Average (yellow line, ON by default)
- **MA 50**: 50-period Simple Moving Average (blue line, OFF by default)
- **RSI(14)**: Relative Strength Index with 14-period, overbought (70) / oversold (30) levels

## API Endpoints
- `GET /api/stock/quote/:symbol` - Stock quote data
- `GET /api/stock/history/:symbol/:range` - Historical price data (ranges: 1d, 1w, 1m, 3m, 6m, 1y)
- `GET /api/stock/news/:symbol` - News with sentiment analysis
- `GET /api/stock/batch-quotes?symbols=AAPL,MSFT` - Batch stock quotes (for ticker bar & watchlist)
- `POST /api/stock/predict` - Generate LSTM prediction (trains per-request)
- `GET /api/predictions` - Prediction history
- `GET /api/predictions/:symbol` - Predictions by symbol

## Data Intervals
- 1D: 2-minute candles
- 1W: 15-minute candles
- 1M: Daily candles
- 3M/6M/1Y: Daily candles

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `OPENAI_API_KEY` - Not used for predictions (kept for legacy compatibility)
