import type { StockQuote, NewsArticle } from "@shared/schema";

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance";
const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const STOCK_DETAILS: Record<string, { name: string; basePrice: number }> = {
  AAPL: { name: "Apple Inc.", basePrice: 180.50 },
  MSFT: { name: "Microsoft Corporation", basePrice: 415.20 },
  GOOGL: { name: "Alphabet Inc.", basePrice: 172.30 },
  AMZN: { name: "Amazon.com, Inc.", basePrice: 185.10 },
  TSLA: { name: "Tesla, Inc.", basePrice: 174.60 },
  META: { name: "Meta Platforms, Inc.", basePrice: 475.40 },
  NVDA: { name: "NVIDIA Corporation", basePrice: 915.00 },
  JPM: { name: "JPMorgan Chase & Co.", basePrice: 195.80 },
  V: { name: "Visa Inc.", basePrice: 275.30 },
  JNJ: { name: "Johnson & Johnson", basePrice: 155.20 },
  WMT: { name: "Walmart Inc.", basePrice: 60.40 },
  PG: { name: "Procter & Gamble Co.", basePrice: 162.10 },
  MA: { name: "Mastercard Incorporated", basePrice: 450.80 },
  UNH: { name: "UnitedHealth Group Inc.", basePrice: 490.50 },
  DIS: { name: "The Walt Disney Company", basePrice: 112.30 },
  NFLX: { name: "Netflix, Inc.", basePrice: 610.50 },
  AMD: { name: "Advanced Micro Devices, Inc.", basePrice: 165.40 },
  INTC: { name: "Intel Corporation", basePrice: 30.20 },
  BA: { name: "The Boeing Company", basePrice: 175.50 },
  PYPL: { name: "PayPal Holdings, Inc.", basePrice: 65.20 },
};

function generateMockQuote(symbol: string): StockQuote {
  const upperSymbol = symbol.toUpperCase();
  const details = STOCK_DETAILS[upperSymbol] || { name: `${upperSymbol} Inc.`, basePrice: 150.00 };
  const randomFactor = (Math.random() - 0.48) * 2;
  const change = parseFloat((details.basePrice * 0.015 * randomFactor).toFixed(2));
  const price = parseFloat((details.basePrice + change).toFixed(2));
  const changePercent = parseFloat(((change / details.basePrice) * 100).toFixed(2));
  const prevClose = details.basePrice;
  const high = parseFloat((Math.max(price, prevClose) + Math.random() * 2).toFixed(2));
  const low = parseFloat((Math.min(price, prevClose) - Math.random() * 2).toFixed(2));
  
  return {
    symbol: upperSymbol,
    name: details.name,
    price,
    change,
    changePercent,
    open: parseFloat((prevClose + (Math.random() - 0.5) * 1.5).toFixed(2)),
    high,
    low,
    previousClose: prevClose,
    volume: Math.floor(1000000 + Math.random() * 5000000),
    marketCap: Math.floor(50000000000 + Math.random() * 1500000000000),
    week52High: parseFloat((details.basePrice * 1.25).toFixed(2)),
    week52Low: parseFloat((details.basePrice * 0.8).toFixed(2)),
  };
}

function generateMockHistory(symbol: string, range: string) {
  const upperSymbol = symbol.toUpperCase();
  const details = STOCK_DETAILS[upperSymbol] || { name: `${upperSymbol} Inc.`, basePrice: 150.00 };
  const basePrice = details.basePrice;

  const rangeMap: Record<string, { days: number; intervalMinutes: number }> = {
    "1d": { days: 1, intervalMinutes: 2 },
    "1w": { days: 5, intervalMinutes: 15 },
    "1m": { days: 30, intervalMinutes: 1440 },
    "3m": { days: 90, intervalMinutes: 1440 },
    "6m": { days: 180, intervalMinutes: 1440 },
    "1y": { days: 260, intervalMinutes: 1440 },
    "3y": { days: 780, intervalMinutes: 1440 },
  };

  const config = rangeMap[range] || rangeMap["1m"];
  const history: Array<{ date: string; close: number; open: number; high: number; low: number; volume: number }> = [];

  let currentPrice = basePrice * (0.9 + Math.random() * 0.2);
  const now = new Date();

  for (let i = config.days; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    if (config.intervalMinutes === 1440 && (d.getDay() === 0 || d.getDay() === 6)) {
      continue;
    }

    const changePercent = (Math.random() - 0.49) * 0.02;
    const open = currentPrice;
    currentPrice = parseFloat((currentPrice * (1 + changePercent)).toFixed(2));
    const close = currentPrice;
    const high = parseFloat((Math.max(open, close) + Math.random() * (basePrice * 0.015)).toFixed(2));
    const low = parseFloat((Math.min(open, close) - Math.random() * (basePrice * 0.015)).toFixed(2));
    const volume = Math.floor(500000 + Math.random() * 4000000);

    let dateStr: string;
    if (range === "1d" || range === "1w") {
      dateStr = d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } else {
      dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    history.push({
      date: dateStr,
      close,
      open,
      high,
      low,
      volume,
    });
  }

  return history;
}

function generateMockNews(symbol: string): NewsArticle[] {
  const upperSymbol = symbol.toUpperCase();
  const details = STOCK_DETAILS[upperSymbol] || { name: `${upperSymbol} Inc.`, basePrice: 150.00 };
  
  const headlines = [
    `${details.name} announces impressive Q3 financial results exceeding market expectations`,
    `Tech sector analysis: Why analysts are bullish on ${upperSymbol} this quarter`,
    `Market trends: How global supply chains impact ${details.name} product roadmap`,
    `Institutional investors increase holdings in ${upperSymbol} signaling long-term trust`,
    `Innovation spotlight: ${details.name} launches new AI-driven service line`,
    `Competitor comparison: Can ${upperSymbol} maintain its dominant market share?`,
    `Federal reserve interest rate comments stir tech companies including ${upperSymbol}`,
    `Sustainability initiative: ${details.name} commits to carbon-neutral production by 2030`,
  ];

  return headlines.map((headline, i) => ({
    title: headline,
    description: `Analysis and sentiment outlook for ${details.name} (${upperSymbol}) under current market dynamics.`,
    url: "https://finance.yahoo.com",
    source: i % 2 === 0 ? "Bloomberg" : "Reuters",
    publishedAt: new Date(Date.now() - i * 3 * 3600 * 1000).toISOString(),
  }));
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (res.ok) return res;
      if (i < retries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Failed to fetch after retries");
}

export async function getStockQuote(symbol: string): Promise<StockQuote> {
  const symbolRegex = /^[A-Z0-9.-]+$/;
  if (!symbol || !symbolRegex.test(symbol.toUpperCase())) {
    throw new Error("Invalid stock symbol format");
  }
  try {
    const url = `${YAHOO_CHART_BASE}/${symbol}?interval=1d&range=5d`;
    const res = await fetchWithRetry(url);
    const data = await res.json();

    const result = data.chart?.result?.[0];
    if (!result) throw new Error(`No data found for ${symbol}`);

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];

    const lastClose = quotes?.close?.filter((v: number | null) => v !== null).pop() ?? meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? lastClose;
    const change = lastClose - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    const allHighs = quotes?.high?.filter((v: number | null) => v !== null) ?? [];
    const allLows = quotes?.low?.filter((v: number | null) => v !== null) ?? [];
    const allOpens = quotes?.open?.filter((v: number | null) => v !== null) ?? [];
    const allVolumes = quotes?.volume?.filter((v: number | null) => v !== null) ?? [];

    return {
      symbol: meta.symbol || symbol.toUpperCase(),
      name: meta.longName || meta.shortName || symbol.toUpperCase(),
      price: lastClose,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      open: allOpens[allOpens.length - 1] ?? lastClose,
      high: allHighs[allHighs.length - 1] ?? lastClose,
      low: allLows[allLows.length - 1] ?? lastClose,
      previousClose: prevClose,
      volume: allVolumes[allVolumes.length - 1] ?? 0,
      marketCap: meta.marketCap,
      week52High: meta.fiftyTwoWeekHigh,
      week52Low: meta.fiftyTwoWeekLow,
    };
  } catch (error: any) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    console.log(`Using mock quote fallback for ${symbol}`);
    return generateMockQuote(symbol);
  }
}

const historyCache = new Map<string, { timestamp: number; data: any }>();

export async function getStockHistory(
  symbol: string,
  range: string
): Promise<Array<{ date: string; close: number; open: number; high: number; low: number; volume: number }>> {
  const symbolRegex = /^[A-Z0-9.-]+$/;
  if (!symbol || !symbolRegex.test(symbol.toUpperCase())) {
    throw new Error("Invalid stock symbol format");
  }
  const cacheKey = `${symbol}:${range}`;
  const cached = historyCache.get(cacheKey);
  const now = Date.now();
  const ttl = range === "1d" ? 60 * 1000 : 30 * 60 * 1000; // 1 minute for intraday, 30 minutes for daily history

  if (cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  const rangeMap: Record<string, { range: string; interval: string }> = {
    "1d": { range: "1d", interval: "2m" },
    "1w": { range: "5d", interval: "15m" },
    "1m": { range: "1mo", interval: "1d" },
    "3m": { range: "3mo", interval: "1d" },
    "6m": { range: "6mo", interval: "1d" },
    "1y": { range: "1y", interval: "1d" },
    "3y": { range: "3y", interval: "1d" },
  };

  const config = rangeMap[range] || rangeMap["1m"];

  try {
    const url = `${YAHOO_CHART_BASE}/${symbol}?interval=${config.interval}&range=${config.range}`;
    const res = await fetchWithRetry(url);
    const data = await res.json();

    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    const history = timestamps.map((ts: number, i: number) => {
      const d = new Date(ts * 1000);
      let dateStr: string;
      if (range === "1d" || range === "1w") {
        dateStr = d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      } else {
        dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }

      return {
        date: dateStr,
        close: quotes.close?.[i] ?? 0,
        open: quotes.open?.[i] ?? 0,
        high: quotes.high?.[i] ?? 0,
        low: quotes.low?.[i] ?? 0,
        volume: quotes.volume?.[i] ?? 0,
      };
    }).filter((d: any) => d.close > 0);

    historyCache.set(cacheKey, { timestamp: now, data: history });
    return history;
  } catch (error: any) {
    console.error(`Error fetching history for ${symbol}:`, error.message);
    console.log(`Using mock history fallback for ${symbol}`);
    return generateMockHistory(symbol, range);
  }
}

export async function getStockNews(symbol: string): Promise<NewsArticle[]> {
  const symbolRegex = /^[A-Z0-9.-]+$/;
  if (!symbol || !symbolRegex.test(symbol.toUpperCase())) {
    throw new Error("Invalid stock symbol format");
  }
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=10&quotesCount=0`;
    const res = await fetchWithRetry(url);
    const data = await res.json();

    const news = data.news || [];

    return news.slice(0, 10).map((item: any) => ({
      title: item.title || "Untitled",
      description: item.publisher ? `Source: ${item.publisher}` : undefined,
      url: item.link || item.url || "#",
      source: item.publisher || "Unknown",
      publishedAt: item.providerPublishTime
        ? new Date(item.providerPublishTime * 1000).toISOString()
        : new Date().toISOString(),
    }));
  } catch (error: any) {
    console.error(`Error fetching news for ${symbol}:`, error.message);
    console.log(`Using mock news fallback for ${symbol}`);
    return generateMockNews(symbol);
  }
}

export function getMarketStatus(): { status: string; label: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const timeInMinutes = hour * 60 + minute;

  if (weekday === "Sat" || weekday === "Sun") {
    return { status: "closed", label: "Market Closed (Weekend)" };
  }

  if (timeInMinutes >= 570 && timeInMinutes < 960) {
    return { status: "open", label: "Market Open" };
  }

  if (timeInMinutes >= 240 && timeInMinutes < 570) {
    return { status: "pre-market", label: "Pre-Market" };
  }

  if (timeInMinutes >= 960 && timeInMinutes < 1200) {
    return { status: "after-hours", label: "After Hours" };
  }

  return { status: "closed", label: "Market Closed" };
}
