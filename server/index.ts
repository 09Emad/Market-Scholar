import "dotenv/config";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}
import cron from 'node-cron'; // المكتبة التي قمت بتثبيتها الآن
import { performValidationLogic, lastActiveTime } from './routes'; // استيراد الوظائف من الملف الذي عدلناه
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { serveStatic } from "./static";
import { createServer } from "http";
import { spawn, execSync } from "child_process";
import { platform } from "os";
import { waitForMLService, generatePrediction } from "./prediction-service";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

function detectPythonCommand(): string {
  if (process.env.ML_PYTHON_CMD) {
    try {
      execSync(`"${process.env.ML_PYTHON_CMD}" --version`, { stdio: "ignore" });
      return process.env.ML_PYTHON_CMD;
    } catch {}
  }

  const isWindows = platform() === "win32";
  const venvPaths = isWindows
    ? ["venv\\Scripts\\python.exe", ".venv\\Scripts\\python.exe"]
    : ["venv/bin/python", ".venv/bin/python"];
  const globalCmds = isWindows ? ["python", "python3"] : ["python3", "python"];
  const allCmds = [...venvPaths, ...globalCmds];

  for (const cmd of allCmds) {
    try {
      execSync(`"${cmd}" --version`, { stdio: "ignore" });
      return cmd;
    } catch {}
  }
  return globalCmds[0];
}

function startMLService() {
  const pythonCmd = detectPythonCommand();
  log(`Using Python command: ${pythonCmd}`, "ml-service");

  const mlProcess = spawn(pythonCmd, ["python_ml/ml_service.py"], {
    env: { ...process.env, ML_SERVICE_PORT: "5001" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  mlProcess.stdout.on("data", (data: Buffer) => {
    log(data.toString().trim(), "ml-service");
  });

  mlProcess.stderr.on("data", (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg && !msg.includes("WARNING") && !msg.includes("FutureWarning")) {
      log(msg, "ml-service");
    }
  });

  mlProcess.on("close", (code: number | null) => {
    log(`ML service exited with code ${code}`, "ml-service");
    setTimeout(() => {
      log("Restarting ML service...", "ml-service");
      startMLService();
    }, 3000);
  });

  return mlProcess;
}

const POPULAR_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM",
  "V", "JNJ", "WMT", "PG", "MA", "UNH", "DIS", "NFLX", "AMD", "INTC", "BA", "PYPL"
];

async function preWarmCache() {
  log("Starting sequential cache pre-warming for all 20 popular stocks...", "pre-warm");
  for (const symbol of POPULAR_SYMBOLS) {
    try {
      log(`Pre-warming cache for ${symbol}...`, "pre-warm");
      await generatePrediction(symbol);
      log(`Successfully pre-warmed cache for ${symbol}.`, "pre-warm");
    } catch (error: any) {
      log(`Failed to pre-warm cache for ${symbol}: ${error.message}`, "pre-warm");
    }
  }
  log("Cache pre-warming completed for all stocks.", "pre-warm");
}

(async () => {
  startMLService();
  log("Python ML service starting on port 5001...");

  waitForMLService(60).then((ready) => {
    if (ready) {
      log("ML service health check passed - predictions will use real LSTM model");
      preWarmCache();
    } else {
      log("ML service health check failed - predictions will use fallback until service is available");
    }
  });

  setupAuth(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const isReplit = !!process.env.REPL_ID;
  const defaultPort = isReplit ? "5000" : "3000";
  const port = parseInt(process.env.PORT || defaultPort, 10);
  const host = "0.0.0.0";
  const listenOptions: any = { port, host };
  if (isReplit) {
    listenOptions.reusePort = true;
  }
  // إعداد المنبه الذكي لتحديث التوقعات في الخلفية
cron.schedule('*/30 * * * * *', async () => {
  const tenMinutes = 10 * 60 * 1000; // مهلة النشاط (10 دقائق)
  const now = Date.now();

  // فحص المفتاح الذكي: هل هناك مستخدم نشط حالياً؟
  if (now - lastActiveTime < tenMinutes) {
    log("Activity detected on Dashboard. Running background validation...", "cron");
    try {
      const result = await performValidationLogic();
      if (result && result.validated > 0) {
        log(`Successfully validated ${result.validated} predictions.`, "cron");
      }
    } catch (error) {
      log(`Error in background validation: ${error}`, "cron");
    }
  } else {
    // السيرفر في وضع "توفير الموارد" لعدم وجود نشاط
    log("System idle: Skipping background validation.", "cron");
  }
});

// Cron job to pre-warm cache daily at 10:00 PM UTC (safely after US market close, Mon-Fri)
cron.schedule('0 22 * * 1-5', async () => {
  log("Running daily scheduled cache pre-warming...", "cron");
  try {
    await preWarmCache();
  } catch (error) {
    log(`Error during scheduled cache pre-warming: ${error}`, "cron");
  }
});

httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
