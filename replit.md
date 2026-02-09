# StockVision - Academic Stock Market Decision Support System

## Overview
An educational stock market decision support system for academic purposes. Provides real-time stock price data, historical charts, news sentiment analysis, and AI-powered next-day price direction predictions for US stocks.

Built as a graduation project for Istanbul Topkapi University, Software Engineering Department (2025-2026).

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: Express.js REST API
- **Database**: PostgreSQL (Drizzle ORM) for prediction history logging
- **AI**: OpenAI API (gpt-5) for sentiment analysis and prediction
- **Data**: Yahoo Finance API for stock quotes, history, and news

## Key Features
- Stock symbol search with popular stock suggestions
- Real-time stock price display with key metrics
- Interactive price charts with 6 time ranges (1D, 1W, 1M, 3M, 6M, 1Y)
- News feed with AI sentiment analysis (positive/negative/neutral)
- AI-powered next-day price direction prediction with confidence scores
- Model evaluation metrics (Accuracy, Precision, Recall, F1-Score)
- Feature importance visualization
- Prediction history logging and tracking
- Market status indicator (Open/Closed/Pre-Market/After-Hours)
- Educational disclaimers and risk/limitations section

## Project Structure
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/components/` - All UI components (stock-search, price-chart, news-feed, prediction-card, etc.)
- `client/src/lib/constants.ts` - Utility functions and popular stocks list
- `server/routes.ts` - API routes
- `server/stock-service.ts` - Yahoo Finance data service
- `server/prediction-service.ts` - OpenAI-powered sentiment analysis and prediction
- `server/storage.ts` - Database storage layer
- `shared/schema.ts` - Drizzle schema and Zod types

## API Endpoints
- `GET /api/stock/quote/:symbol` - Stock quote data
- `GET /api/stock/history/:symbol/:range` - Historical price data
- `GET /api/stock/news/:symbol` - News with sentiment analysis
- `POST /api/stock/predict` - Generate prediction
- `GET /api/predictions` - Prediction history

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `OPENAI_API_KEY` - OpenAI API key for sentiment analysis and predictions
