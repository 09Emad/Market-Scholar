import type { StockQuote, NewsArticle } from "@shared/schema";

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance";
const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

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
    throw new Error(`Failed to fetch stock data for ${symbol}`);
  }
}

export async function getStockHistory(
  symbol: string,
  range: string
): Promise<Array<{ date: string; close: number; open: number; high: number; low: number; volume: number }>> {
  const rangeMap: Record<string, { range: string; interval: string }> = {
    "1d": { range: "1d", interval: "2m" },
    "1w": { range: "5d", interval: "15m" },
    "1m": { range: "1mo", interval: "1d" },
    "3m": { range: "3mo", interval: "1d" },
    "6m": { range: "6mo", interval: "1d" },
    "1y": { range: "1y", interval: "1d" },
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

    return timestamps.map((ts: number, i: number) => {
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
  } catch (error: any) {
    console.error(`Error fetching history for ${symbol}:`, error.message);
    return [];
  }
}

export async function getStockNews(symbol: string): Promise<NewsArticle[]> {
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
    return [];
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
