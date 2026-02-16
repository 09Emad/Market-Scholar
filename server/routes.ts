import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getStockQuote, getStockHistory, getStockNews } from "./stock-service";
import { analyzeSentiment, generatePrediction } from "./prediction-service";
import { log } from "./index";

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

      const parsedTarget = new Date(prediction.targetDate);
      const ty = parsedTarget.getFullYear(), tm = parsedTarget.getMonth(), td = parsedTarget.getDate();
      let sc = 0, ds = new Date(Date.UTC(ty, 2, 1));
      for (let d = 1; d <= 31; d++) { if (new Date(Date.UTC(ty, 2, d)).getUTCDay() === 0) { sc++; if (sc === 2) { ds = new Date(Date.UTC(ty, 2, d)); break; } } }
      let de = new Date(Date.UTC(ty, 10, 1));
      for (let d = 1; d <= 30; d++) { if (new Date(Date.UTC(ty, 10, d)).getUTCDay() === 0) { de = new Date(Date.UTC(ty, 10, d)); break; } }
      const dst = new Date(Date.UTC(ty, tm, td)) >= ds && new Date(Date.UTC(ty, tm, td)) < de;
      const expiryAt = new Date(Date.UTC(ty, tm, td, dst ? 20 : 21, 0, 0)).toISOString();

      await storage.createPrediction({
        symbol: symbol.toUpperCase(),
        targetDate: prediction.targetDate,
        targetExpiryAt: expiryAt,
        direction: prediction.direction,
        confidence: prediction.confidence,
        currentPrice: quote?.price ?? null,
        sentimentScore: prediction.factors.sentimentScore,
        factors: prediction.factors,
        actualDirection: null,
        actualPrice: null,
        wasCorrect: null,
      });

      res.json(prediction);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate prediction" });
    }
  });

  app.get("/api/stock/batch-quotes", async (req, res) => {
    try {
      const symbols = (req.query.symbols as string || "").split(",").filter(Boolean).slice(0, 20);
      if (symbols.length === 0) {
        return res.status(400).json({ message: "No symbols provided" });
      }
      const quotes = await Promise.allSettled(
        symbols.map(s => getStockQuote(s.toUpperCase().trim()))
      );
      const results = quotes
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map(r => r.value);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch batch quotes" });
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

  app.post("/api/predictions/validate", async (_req, res) => {
    try {
      const unvalidated = await storage.getUnvalidatedPredictions();
      if (unvalidated.length === 0) {
        return res.json({ validated: 0, results: [] });
      }

      const now = new Date();
      const results: Array<{ id: number; symbol: string; wasCorrect: boolean }> = [];

      const symbolGroups = new Map<string, typeof unvalidated>();
      for (const pred of unvalidated) {
        let expiryTime: Date;
        if (pred.targetExpiryAt) {
          expiryTime = new Date(pred.targetExpiryAt);
        } else {
          const parsed = new Date(pred.targetDate);
          if (isNaN(parsed.getTime())) continue;
          expiryTime = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 21, 0, 0));
        }
        if (expiryTime > now) continue;

        if (!symbolGroups.has(pred.symbol)) {
          symbolGroups.set(pred.symbol, []);
        }
        symbolGroups.get(pred.symbol)!.push(pred);
      }

      for (const [symbol, preds] of Array.from(symbolGroups.entries())) {
        try {
          const quote = await getStockQuote(symbol);
          const currentPrice = quote.price;

          for (const pred of preds) {
            if (!pred.currentPrice) continue;

            const priceDiff = Math.abs(currentPrice - pred.currentPrice);
            const priceDiffPct = (priceDiff / pred.currentPrice) * 100;
            if (priceDiffPct < 0.01) {
              log(`Skipping validation for prediction #${pred.id} (${symbol}): price unchanged ($${currentPrice} vs $${pred.currentPrice}), market likely closed`);
              continue;
            }

            const actualDirection = currentPrice > pred.currentPrice ? "up" : "down";
            const wasCorrect = actualDirection === pred.direction ? 1 : 0;

            await storage.updatePredictionOutcome(pred.id, actualDirection, wasCorrect, currentPrice);
            results.push({
              id: pred.id,
              symbol: pred.symbol,
              wasCorrect: wasCorrect === 1,
            });

            log(`Validated prediction #${pred.id} for ${symbol}: predicted=${pred.direction}, actual=${actualDirection}, correct=${wasCorrect === 1}`);
          }
        } catch (err: any) {
          log(`Failed to validate predictions for ${symbol}: ${err.message}`);
        }
      }

      res.json({ validated: results.length, results });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to validate predictions" });
    }
  });

  return httpServer;
}
