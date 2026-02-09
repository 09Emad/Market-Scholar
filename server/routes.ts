import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getStockQuote, getStockHistory, getStockNews } from "./stock-service";
import { analyzeSentiment, generatePrediction } from "./prediction-service";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/stock/quote/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      if (!symbol || symbol.length > 10) {
        return res.status(400).json({ message: "Invalid stock symbol" });
      }
      const quote = await getStockQuote(symbol.toUpperCase());
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch stock quote" });
    }
  });

  app.get("/api/stock/history/:symbol/:range", async (req, res) => {
    try {
      const { symbol, range } = req.params;
      if (!symbol || symbol.length > 10) {
        return res.status(400).json({ message: "Invalid stock symbol" });
      }
      const validRanges = ["1d", "1w", "1m", "3m", "6m", "1y"];
      if (!validRanges.includes(range)) {
        return res.status(400).json({ message: "Invalid time range" });
      }
      const history = await getStockHistory(symbol.toUpperCase(), range);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch stock history" });
    }
  });

  app.get("/api/stock/news/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      if (!symbol || symbol.length > 10) {
        return res.status(400).json({ message: "Invalid stock symbol" });
      }
      const news = await getStockNews(symbol.toUpperCase());
      const analyzed = await analyzeSentiment(news);
      res.json(analyzed);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch news" });
    }
  });

  app.post("/api/stock/predict", async (req, res) => {
    try {
      const { symbol } = req.body;
      if (!symbol || typeof symbol !== "string" || symbol.length > 10) {
        return res.status(400).json({ message: "Invalid stock symbol" });
      }

      const prediction = await generatePrediction(symbol.toUpperCase());

      const quote = await getStockQuote(symbol.toUpperCase()).catch(() => null);

      await storage.createPrediction({
        symbol: symbol.toUpperCase(),
        targetDate: prediction.targetDate,
        direction: prediction.direction,
        confidence: prediction.confidence,
        currentPrice: quote?.price ?? null,
        sentimentScore: prediction.factors.sentimentScore,
        factors: prediction.factors,
        actualDirection: null,
        wasCorrect: null,
      });

      res.json(prediction);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate prediction" });
    }
  });

  app.get("/api/predictions", async (_req, res) => {
    try {
      const predictions = await storage.getPredictions(50);
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch predictions" });
    }
  });

  app.get("/api/predictions/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const predictions = await storage.getPredictionsBySymbol(symbol.toUpperCase());
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch predictions" });
    }
  });

  return httpServer;
}
