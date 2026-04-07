export const POPULAR_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "UNH", name: "UnitedHealth Group" },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "AMD", name: "AMD Inc." },
  { symbol: "INTC", name: "Intel Corp." },
  { symbol: "BA", name: "Boeing Co." },
  { symbol: "PYPL", name: "PayPal Holdings" },
];

export const TIME_RANGES = [
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
];

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatCurrency(value: number | null | undefined): string {
  const n = toFiniteNumber(value);
  if (n === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatLargeNumber(value: number | null | undefined): string {
  const n = toFiniteNumber(value);
  if (n === null) return "N/A";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

export function formatPercent(value: number | null | undefined): string {
  const n = toFiniteNumber(value);
  if (n === null) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function getMarketStatus(): { status: "open" | "closed" | "pre-market" | "after-hours"; label: string } {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const day = nyTime.getDay();
  const timeInMinutes = hours * 60 + minutes;

  if (day === 0 || day === 6) {
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
