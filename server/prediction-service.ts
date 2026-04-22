import http from "http";
import { getStockHistory, getStockNews } from "./stock-service";
import { getNextTradingDay } from "./market-holidays";
import type { PredictionResult, NewsArticle } from "@shared/schema";
import { buildFallbackExplanation, generateLLMExplanation, type ExplainPayload } from "./llm-explainer";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";

let mlServiceReady = false;

function httpRequest(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: options.method || "GET",
      headers: options.headers || {},
      timeout: 180000,
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode || 200, data: parsed });
        } catch {
          resolve({ status: res.statusCode || 200, data });
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timeout")); });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

export async function waitForMLService(maxWaitSeconds = 60): Promise<boolean> {
  if (mlServiceReady) return true;

  console.log(`Waiting for ML service at ${ML_SERVICE_URL} to be ready...`);
  const startTime = Date.now();
  const pollInterval = 2000;

  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    try {
      const result = await httpRequest(`${ML_SERVICE_URL}/health`);
      if (result.status === 200) {
        console.log("ML service is ready!");
        mlServiceReady = true;
        return true;
      }
      console.log(`ML service health check returned status ${result.status}, retrying...`);
    } catch (err: any) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`ML service not ready yet (${elapsed}s elapsed): ${err.message}`);
    }
    await new Promise(r => setTimeout(r, pollInterval));
  }

  console.error(`ML service not ready after ${maxWaitSeconds}s`);
  return false;
}

async function mlRequest(endpoint: string, body: any, maxRetries = 5, delayMs = 3000): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await httpRequest(`${ML_SERVICE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (result.status >= 200 && result.status < 300) {
        return result.data;
      }
      throw new Error(`ML service returned status ${result.status}`);
    } catch (error: any) {
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

  const isReady = await waitForMLService();
  if (!isReady) {
    console.error("ML service not available for sentiment analysis - returning neutral");
    return articles.map((a) => ({
      ...a,
      sentiment: "neutral" as const,
      sentimentScore: 0.5,
    }));
  }

  try {
    const result = await mlRequest("/analyze-sentiment", { articles });
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
    const isReady = await waitForMLService();
    if (!isReady) {
      throw new Error("ML service not available after waiting");
    }

    console.log(`Sending prediction request to ML service for ${symbol}...`);
    const mlResult = await mlRequest("/predict", {
      symbol,
      prices: historyData,
      news: newsArticles,
    });

    console.log(`ML prediction received for ${symbol}: direction=${mlResult.direction}, confidence=${mlResult.confidence}`);

    const explainPayload: ExplainPayload = mlResult.explain_payload || {
      symbol,
      lstm_direction: mlResult.direction as "up" | "down",
      lstm_confidence: mlResult.confidence,
      technical_score: mlResult.factors?.technical_score ?? 0.5,
      price_action: mlResult.factors?.price_action ?? "Unknown",
      volume_signal: mlResult.factors?.volume_signal ?? "Unknown",
      sentiment_score: mlResult.factors?.sentiment_score ?? 0.5,
      news_impact: mlResult.factors?.news_impact ?? "Unknown",
      top_feature_importance: (mlResult.feature_importance || []).slice(0, 3),
      recent_news: (newsArticles || []).slice(0, 5).map((article) => ({
        title: article.title,
        source: article.source,
        publishedAt: article.publishedAt,
      })),
    };

    let explanation = buildFallbackExplanation(explainPayload, "llm_not_attempted");
    try {
      explanation = await generateLLMExplanation(explainPayload);
    } catch (error: any) {
      const reason = error?.message || "llm_error";
      console.error(`LLM explanation failed for ${symbol}: ${reason}`);
      explanation = buildFallbackExplanation(explainPayload, reason);
    }

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
      explanation,
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
      explanation: buildFallbackExplanation(
        {
          symbol,
          lstm_direction: fallbackDirection as "up" | "down",
          lstm_confidence: 0.45,
          technical_score: 0.5,
          price_action: avgPriceChange > 0 ? "Upward trend" : "Downward trend",
          volume_signal: "ML service unavailable",
          sentiment_score: 0.5,
          news_impact: "Analysis unavailable - ML service offline",
          top_feature_importance: [
            { feature: "Price Returns", importance: 0.25 },
            { feature: "Moving Average Ratio", importance: 0.20 },
            { feature: "News Sentiment", importance: 0.15 },
          ],
          recent_news: (newsArticles || []).slice(0, 5).map((article) => ({
            title: article.title,
            source: article.source,
            publishedAt: article.publishedAt,
          })),
        },
        "ml_service_unavailable",
      ),
    };
  }
}
