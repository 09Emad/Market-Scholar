# StockVision - Academic Stock Market Decision Support System

## Overview
An educational stock market decision support system for academic purposes. Provides real-time stock price data, historical charts, news sentiment analysis using TF-IDF + VADER, and AI-powered next-day price direction predictions using LSTM neural networks for US stocks.

Built as a graduation project for Istanbul Topkapi University, Software Engineering Department (2025-2026).

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: Express.js REST API (port 5000)
- **ML Service**: Python Flask API (port 5001) - auto-spawned by Node.js server
- **Database**: PostgreSQL (Drizzle ORM) for prediction history logging
- **ML Models**: Custom Python models - LSTM (TensorFlow/Keras) + TF-IDF/VADER (scikit-learn/NLTK)
- **Data**: Yahoo Finance API for stock quotes, history, and news

## Key Features
- Stock symbol search with popular stock suggestions
- Real-time stock price display with key metrics
- Interactive price charts with 6 time ranges (1D, 1W, 1M, 3M, 6M, 1Y)
- News feed with TF-IDF + VADER sentiment analysis (positive/negative/neutral)
- LSTM-powered next-day price direction prediction with confidence scores
- Real model evaluation metrics (Accuracy, Precision, Recall, F1-Score) from train/test split
- Feature importance visualization (combined permutation + weight-based from LSTM model)
- Prediction history logging and tracking
- Market status indicator (Open/Closed/Pre-Market/After-Hours)
- Educational disclaimers and risk/limitations section

## Project Structure
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/components/` - All UI components (stock-search, price-chart, news-feed, prediction-card, etc.)
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

## API Endpoints
- `GET /api/stock/quote/:symbol` - Stock quote data
- `GET /api/stock/history/:symbol/:range` - Historical price data
- `GET /api/stock/news/:symbol` - News with sentiment analysis
- `POST /api/stock/predict` - Generate LSTM prediction (trains per-request)
- `GET /api/predictions` - Prediction history

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `OPENAI_API_KEY` - Not used for predictions (kept for legacy compatibility)
