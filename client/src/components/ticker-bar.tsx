import { useQuery } from "@tanstack/react-query";
import { formatPercent } from "@/lib/constants";
import type { StockQuote } from "@shared/schema";

const TICKER_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM", "NFLX", "AMD"];

export function TickerBar({ onSelectStock }: { onSelectStock?: (symbol: string) => void }) {
  const { data: quotes } = useQuery<StockQuote[]>({
    queryKey: ["/api/stock/batch-quotes", TICKER_SYMBOLS.join(",")],
    queryFn: async () => {
      const res = await fetch(`/api/stock/batch-quotes?symbols=${TICKER_SYMBOLS.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });

  if (!quotes || quotes.length === 0) return null;

  const items = [...quotes, ...quotes];

  return (
    <div
      className="border-b overflow-hidden bg-card dark:bg-[#0f1117]"
      data-testid="ticker-bar"
    >
      <div className="ticker-scroll flex items-center gap-6 py-1.5 px-4 whitespace-nowrap">
        {items.map((q, i) => {
          const isPositive = q.change >= 0;
          return (
            <button
              key={`${q.symbol}-${i}`}
              className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none p-0"
              onClick={() => onSelectStock?.(q.symbol)}
              data-testid={`ticker-item-${q.symbol}-${i}`}
            >
              <span className="text-xs font-semibold text-foreground">{q.symbol}</span>
              <span className="text-xs font-mono text-muted-foreground">
                {Number.isFinite(q.price) ? `$${q.price.toFixed(2)}` : "N/A"}
              </span>
              <span
                className="text-xs font-mono font-medium"
                style={{ color: isPositive ? "#26a69a" : "#ef5350" }}
              >
                {formatPercent(q.changePercent)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
