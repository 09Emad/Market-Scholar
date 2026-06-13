import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getStockQuote, getStockHistory, getStockNews } from "./stock-service";
import { analyzeSentiment, generatePrediction } from "./prediction-service";
import { getMarketCloseUTC } from "./market-holidays";
import { log } from "./index";
import { generateAIChatResponse } from "./llm-explainer";
import { hashPassword } from "./auth";
import { Resend } from "resend";
import crypto from "crypto";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;


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

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }
    next();
  };

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      const recentActivity = await storage.getRecentActivity(15);
      res.json({ stats, recentActivity });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch admin stats" });
    }
  });

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

  // مسار لمعرفة حد الاستخدام للشات بوت
  app.get("/api/ai/chat-limit", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.user as any).id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const MAX_CHAT_LIMIT = parseInt(process.env.MAX_DAILY_CHAT_LIMIT || "10", 10);
      const todayString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const currentCount = user.lastChatDate === todayString ? user.chatCount : 0;
      res.json({
        count: currentCount,
        limit: MAX_CHAT_LIMIT,
        remaining: Math.max(0, MAX_CHAT_LIMIT - currentCount),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch chat limit" });
    }
  });

  // مسار الـ AI Chatbot
  app.post("/api/ai/chat", requireAuth, async (req, res) => {
    try {
      const { message, chatHistory, symbol } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      const user = await storage.getUser((req.user as any).id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const MAX_CHAT_LIMIT = parseInt(process.env.MAX_DAILY_CHAT_LIMIT || "10", 10);
      const todayString = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const currentCount = user.lastChatDate === todayString ? user.chatCount : 0;

      if (currentCount >= MAX_CHAT_LIMIT) {
        return res.status(403).json({ message: "LIMIT_EXCEEDED", limit: MAX_CHAT_LIMIT });
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
                sentimentScore: article.sentimentScore,
              })),
            };
          }
        } catch (err) {
          console.error(`Error gathering stock context for RAG chatbot:`, err);
        }
      } else {
        try {
          const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "DIS", "NFLX", "AMD", "INTC", "BA", "PYPL"];
          const predictionsList = await storage.getPredictions(undefined, 50).catch(() => []);
          const latestBySymbol: Record<string, any> = {};
          for (const pred of predictionsList) {
            if (!latestBySymbol[pred.symbol]) {
              latestBySymbol[pred.symbol] = pred;
            }
          }
          
          const summaryLines = [];
          for (const sym of symbols) {
            const pred = latestBySymbol[sym];
            if (pred) {
              summaryLines.push(`- ${sym}: Price at prediction $${pred.currentPrice || "N/A"}, LSTM prediction direction: ${pred.direction.toUpperCase()} (Confidence: ${(pred.confidence * 100).toFixed(1)}%), News sentiment score: ${pred.sentimentScore !== null ? (pred.sentimentScore * 100).toFixed(0) + '%' : "N/A"}`);
            }
          }
          
          if (summaryLines.length > 0) {
            stockContext = {
              isGeneralMarket: true,
              summary: summaryLines.join("\n")
            };
          }
        } catch (err) {
          console.error("Error gathering general market context for chatbot:", err);
        }
      }

      const response = await generateAIChatResponse(
        message,
        chatHistory || [],
        stockContext
      );

      // Increment count ONLY on successful generation
      const newCount = user.lastChatDate === todayString ? user.chatCount + 1 : 1;
      await storage.updateUserChatLimit(user.id, newCount, todayString);

      res.json({ response, remainingMessages: Math.max(0, MAX_CHAT_LIMIT - newCount) });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate chat response" });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists by email
      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!user) {
        // For security, don't reveal that the user does not exist.
        return res.json({ message: "RESET_LINK_SENT", simulated: false });
      }

      // Generate cryptographically secure token
      const token = crypto.randomBytes(20).toString("hex");
      const expires = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token and expiration to DB
      await storage.updateUserResetToken(user.id, token, expires);

      // Construct reset URL
      const host = req.get("host");
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const resetUrl = `${protocol}://${host}/reset-password?token=${token}`;

      let sent = false;
      let simulatedLink = null;

      if (resend) {
        try {
          const htmlContent = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #4f46e5; font-size: 24px; font-weight: bold; margin-bottom: 20px;">StockVision AI Password Reset</h2>
              <p style="font-size: 14px; color: #4a5568; line-height: 1.6;">Hello ${user.username},</p>
              <p style="font-size: 14px; color: #4a5568; line-height: 1.6;">You are receiving this email because you (or someone else) requested to reset the password for your account.</p>
              <p style="font-size: 14px; color: #4a5568; line-height: 1.6;">Please click the button below or copy and paste the link into your browser to reset your password:</p>
              <div style="margin: 25px 0;">
                <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
              </div>
              <p style="font-size: 12px; color: #718096; line-height: 1.6; word-break: break-all;">${resetUrl}</p>
              <p style="font-size: 14px; color: #4a5568; line-height: 1.6; margin-top: 25px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
              <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
              <p style="font-size: 11px; color: #a0aec0;">StockVision AI - Academic Research graduation project | Istanbul Topkapi University</p>
            </div>
          `;

          await resend.emails.send({
            from: "StockVision AI <onboarding@resend.dev>",
            to: [user.email || email],
            subject: "StockVision AI - Reset Your Password",
            html: htmlContent,
          });

          sent = true;
          log(`Password reset email sent to ${email} (via Resend)`);
        } catch (mailErr: any) {
          console.error("Failed to send email via Resend API:", mailErr);
        }
      }

      // If mail wasn't sent (or Resend API is not configured), fall back to simulation
      if (!sent) {
        simulatedLink = resetUrl;
        log(`[SIMULATION] Password reset link for user ${user.username} (${email}): ${resetUrl}`);
      }

      res.json({ 
        message: "RESET_LINK_SENT", 
        simulated: !sent, 
        link: simulatedLink
      });

    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process forgot password" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Token is required" });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Verify expiration time
      if (!user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash password using auth helper scrypt
      const passwordHash = await hashPassword(password);

      // Update password and clear token columns in DB
      await storage.updateUserPassword(user.id, passwordHash);
      await storage.updateUserResetToken(user.id, null, null);

      log(`Password successfully reset for user: ${user.username}`);
      res.json({ message: "PASSWORD_RESET_SUCCESS" });

    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to reset password" });
    }
  });

  return httpServer;
}
