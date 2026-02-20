import { getStockHistory, getStockNews } from "./stock-service";
import { getNextTradingDay } from "./market-holidays";
import type { PredictionResult, NewsArticle } from "@shared/schema";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3, delayMs = 2000): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return response;
    } catch (error: any) {
      clearTimeout(timeout);
      console.error(`ML service attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        throw error;
      }
    }
  }
  throw new Error("All retry attempts failed");
}

export async function analyzeSentiment(articles: NewsArticle[]): Promise<NewsArticle[]> {
  if (articles.length === 0) return [];

  try {
    const response = await fetchWithRetry(`${ML_SERVICE_URL}/analyze-sentiment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles }),
    });

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("ML Sentiment analysis error:", error.message);
    return articles.map((a) => ({
      ...a,
      sentiment: "neutral" as const,
      sentimentScore: 0.5,
    }));
  }
}

export async function generatePrediction(symbol: string): Promise<PredictionResult> {
  const [historyData, newsArticles] = await Promise.all([
    getStockHistory(symbol, "6m"),
    getStockNews(symbol),
  ]);

  const nextTrading = getNextTradingDay(new Date());
  const targetDate = nextTrading.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  try {
    console.log(`Sending prediction request to ML service at ${ML_SERVICE_URL}/predict for ${symbol}...`);
    const response = await fetchWithRetry(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        prices: historyData,
        news: newsArticles,
      }),
    });

    if (!response.ok) {
      throw new Error(`ML service returned ${response.status}`);
    }

    const mlResult = await response.json();
    console.log(`ML prediction received for ${symbol}: direction=${mlResult.direction}, confidence=${mlResult.confidence}`);

    return {
      symbol,
      direction: mlResult.direction as "up" | "down",
      confidence: mlResult.confidence,
      targetDate,
      factors: {
        technicalScore: mlResult.factors.technical_score,
        sentimentScore: mlResult.factors.sentiment_score,
        volumeSignal: mlResult.factors.volume_signal,
        priceAction: mlResult.factors.price_action,
        newsImpact: mlResult.factors.news_impact,
      },
      modelMetrics: {
        accuracy: mlResult.model_metrics.accuracy,
        precision: mlResult.model_metrics.precision,
        recall: mlResult.model_metrics.recall,
        f1Score: mlResult.model_metrics.f1_score,
      },
      featureImportance: mlResult.feature_importance,
      analysisReport: mlResult.analysis_report || [],
    };
  } catch (error: any) {
    console.error("ML Prediction error:", error.message);
    console.error("Falling back to basic prediction");

    const recentPrices = historyData.slice(-20);
    const avgPriceChange = recentPrices.length > 1
      ? recentPrices.slice(1).reduce((sum, p, i) =>
          sum + (p.close - recentPrices[i].close) / recentPrices[i].close, 0
        ) / (recentPrices.length - 1)
      : 0;

    const fallbackDirection = avgPriceChange > 0 ? "up" : "down";

    return {
      symbol,
      direction: fallbackDirection as "up" | "down",
      confidence: 0.45,
      targetDate,
      factors: {
        technicalScore: 0.5,
        sentimentScore: 0.5,
        volumeSignal: "ML service unavailable",
        priceAction: avgPriceChange > 0 ? "Upward trend" : "Downward trend",
        newsImpact: "Analysis unavailable - ML service offline",
      },
      modelMetrics: {
        accuracy: 0.5,
        precision: 0.5,
        recall: 0.5,
        f1Score: 0.5,
      },
      featureImportance: [
        { feature: "Price Returns", importance: 0.25 },
        { feature: "Moving Average Ratio", importance: 0.20 },
        { feature: "News Sentiment", importance: 0.15 },
        { feature: "Volatility", importance: 0.15 },
        { feature: "Volume Change", importance: 0.10 },
        { feature: "Price Range", importance: 0.08 },
        { feature: "Momentum", importance: 0.07 },
      ],
    };
  }
}
