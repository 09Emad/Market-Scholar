import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getStockQuote, getStockHistory, getStockNews } from "./stock-service";
import { analyzeSentiment, generatePrediction } from "./prediction-service";
import { getMarketCloseUTC } from "./market-holidays";
import { log } from "./index";
import { generateAIChatResponse } from "./llm-explainer";


// متغير لتتبع آخر نشاط للمستخدمين (المفتاح الذكي)
export let lastActiveTime = 0;

/**
 * وظيفة معالجة التحقق من التوقعات (تم فصلها لتسهيل استدعائها من الـ Cron Job)
 */
export async function performValidationLogic() {
  const unvalidated = await storage.getUnvalidatedPredictions();
  if (unvalidated.length === 0) {
    return { validated: 0, results: [] };
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
      expiryTime = getMarketCloseUTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
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
  return { validated: results.length, results };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // --- مسارات الأسهم (Stock Routes) ---
  app.get("/api/stock/quote/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const symbolRegex = /^[A-Z0-9.-]+$/i;
      if (!symbol || symbol.length > 10 || !symbolRegex.test(symbol)) {
        return res.status(400).json({ message: "Invalid stock symbol" });
      }
      const quote = await getStockQuote(symbol.toUpperCase());
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch stock quote" });
    }
  });

  app.get("/api/stock/batch-quotes", async (req, res) => {
    try {
      const symbolRegex = /^[A-Z0-9.-]+$/;
      const symbolsParam = typeof req.query.symbols === "string" ? req.query.symbols : "";
      const symbols = symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0 && s.length <= 10 && symbolRegex.test(s));

      if (symbols.length === 0) {
        return res.json([]);
      }

      const uniqueSymbols = Array.from(new Set(symbols)).slice(0, 25);
      const quotes = await Promise.allSettled(uniqueSymbols.map((symbol) => getStockQuote(symbol)));
      const successfulQuotes = quotes
        .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof getStockQuote>>> => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((q) =>
          typeof q.symbol === "string" &&
          typeof q.name === "string" &&
          Number.isFinite(q.price) &&
          Number.isFinite(q.change) &&
          Number.isFinite(q.changePercent) &&
          Number.isFinite(q.open) &&
          Number.isFinite(q.high) &&
          Number.isFinite(q.low) &&
          Number.isFinite(q.previousClose) &&
          Number.isFinite(q.volume)
        );

      res.json(successfulQuotes);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch batch quotes" });
    }
  });

  app.get("/api/stock/history/:symbol/:range", async (req, res) => {
    try {
      const { symbol, range } = req.params;
      const validRanges = ["1d", "1w", "1m", "3m", "6m", "1y"];
      const symbolRegex = /^[A-Z0-9.-]+$/i;
      if (!symbol || symbol.length > 10 || !symbolRegex.test(symbol) || !validRanges.includes(range)) {
        return res.status(400).json({ message: "Invalid parameters" });
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
      const symbolRegex = /^[A-Z0-9.-]+$/i;
      if (!symbol || symbol.length > 10 || !symbolRegex.test(symbol)) {
        return res.status(400).json({ message: "Invalid stock symbol" });
      }
      const news = await getStockNews(symbol.toUpperCase());
      const analyzed = await analyzeSentiment(news);
      res.json(analyzed);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch news" });
    }
  });

  app.post("/api/stock/predict", requireAuth, async (req, res) => {
    try {
      const { symbol } = req.body;
      const symbolRegex = /^[A-Z0-9.-]+$/i;
      if (!symbol || typeof symbol !== "string" || symbol.length > 10 || !symbolRegex.test(symbol)) {
        return res.status(400).json({ message: "Invalid stock symbol" });
      }
      const prediction = await generatePrediction(symbol.toUpperCase());
      const quote = await getStockQuote(symbol.toUpperCase()).catch(() => null);
      const parsedTarget = new Date(prediction.targetDate);
      const expiryAt = getMarketCloseUTC(parsedTarget.getFullYear(), parsedTarget.getMonth(), parsedTarget.getDate()).toISOString();

      await storage.createPrediction({
        userId: (req.user as any).id,
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

  // --- مسارات التوقعات (Predictions Routes) ---
  app.get("/api/predictions", async (req, res) => {
    try {
      // تحديث وقت النشاط بمجرد جلب البيانات (يستخدمه الـ Cron Job)
      lastActiveTime = Date.now(); 
      if (req.isAuthenticated()) {
        const predictions = await storage.getPredictions((req.user as any).id, 50);
        return res.json(predictions);
      }
      return res.json([]);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch predictions" });
    }
  });

  app.get("/api/predictions/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const symbolRegex = /^[A-Z0-9.-]+$/i;
      if (!symbol || symbol.length > 10 || !symbolRegex.test(symbol)) {
        return res.status(400).json({ message: "Invalid stock symbol" });
      }
      if (req.isAuthenticated()) {
        const predictions = await storage.getPredictionsBySymbol(symbol.toUpperCase(), (req.user as any).id);
        return res.json(predictions);
      }
      return res.json([]);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch predictions" });
    }
  });

  // مسار الـ Validate (الآن يستدعي الوظيفة العامة)
  app.post("/api/predictions/validate", requireAuth, async (_req, res) => {
    try {
      const result = await performValidationLogic();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to validate predictions" });
    }
  });

  // مسار الـ AI Chatbot
  app.post("/api/ai/chat", requireAuth, async (req, res) => {
    try {
      const { message, chatHistory, symbol } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      let stockContext = undefined;
      if (symbol && typeof symbol === "string" && symbol.length <= 10) {
        const uppercaseSymbol = symbol.toUpperCase();
        try {
          const quote = await getStockQuote(uppercaseSymbol).catch(() => null);
          const predictionsList = await storage.getPredictionsBySymbol(uppercaseSymbol, (req.user as any).id).catch(() => []);
          const lastPrediction = predictionsList.length > 0 ? predictionsList[0] : null;
          const news = await getStockNews(uppercaseSymbol).catch(() => []);
          const analyzedNews = await analyzeSentiment(news).catch(() => []);
          
          if (quote) {
            stockContext = {
              symbol: uppercaseSymbol,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              prediction: lastPrediction ? {
                direction: lastPrediction.direction,
                confidence: lastPrediction.confidence,
                targetDate: lastPrediction.targetDate,
              } : null,
              recentNews: analyzedNews.slice(0, 5).map(article => ({
                title: article.title,
                sentiment: article.sentiment,
              })),
            };
          }
        } catch (err) {
          console.error(`Error gathering stock context for RAG chatbot:`, err);
        }
      }

      const response = await generateAIChatResponse(
        message,
        chatHistory || [],
        stockContext
      );

      res.json({ response });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate chat response" });
    }
  });

  return httpServer;
}
