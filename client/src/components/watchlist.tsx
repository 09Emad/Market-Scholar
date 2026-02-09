import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, X, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { formatPercent, formatCurrency } from "@/lib/constants";
import type { StockQuote } from "@shared/schema";

const STORAGE_KEY = "stockvision-watchlist";

function getStoredWatchlist(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : ["AAPL", "TSLA", "NVDA"];
  } catch {
    return ["AAPL", "TSLA", "NVDA"];
  }
}

function storeWatchlist(symbols: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
}

interface WatchlistProps {
  onSelectStock: (symbol: string) => void;
  currentSymbol: string;
}

export function Watchlist({ onSelectStock, currentSymbol }: WatchlistProps) {
  const [symbols, setSymbols] = useState<string[]>(getStoredWatchlist);
  const [addInput, setAddInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    storeWatchlist(symbols);
  }, [symbols]);

  const { data: quotes, isLoading } = useQuery<StockQuote[]>({
    queryKey: ["/api/stock/batch-quotes", "watchlist", symbols.join(",")],
    queryFn: async () => {
      if (symbols.length === 0) return [];
      const res = await fetch(`/api/stock/batch-quotes?symbols=${symbols.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: symbols.length > 0,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const addSymbol = useCallback(() => {
    const s = addInput.toUpperCase().trim();
    if (s && !symbols.includes(s) && s.length <= 10) {
      setSymbols(prev => [...prev, s]);
      setAddInput("");
      setShowAdd(false);
    }
  }, [addInput, symbols]);

  const removeSymbol = useCallback((sym: string) => {
    setSymbols(prev => prev.filter(s => s !== sym));
  }, []);

  return (
    <Card data-testid="watchlist-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Star className="h-4 w-4" />
          Watchlist
        </CardTitle>
        <Button
          data-testid="button-add-watchlist"
          variant="ghost"
          size="icon"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {showAdd && (
          <div className="flex gap-1 mb-3">
            <Input
              data-testid="input-watchlist-symbol"
              placeholder="Symbol (e.g. MSFT)"
              value={addInput}
              onChange={(e) => setAddInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addSymbol()}
              className="h-8 text-xs"
            />
            <Button
              data-testid="button-confirm-add"
              size="sm"
              className="h-8 px-3"
              onClick={addSymbol}
              disabled={!addInput.trim()}
            >
              Add
            </Button>
          </div>
        )}

        {isLoading && symbols.length > 0 && (
          <div className="space-y-2">
            {symbols.map((s) => (
              <Skeleton key={s} className="h-12 w-full rounded-md" />
            ))}
          </div>
        )}

        {symbols.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Your watchlist is empty</p>
            <p className="text-xs mt-1">Click + to add stocks</p>
          </div>
        )}

        {quotes && quotes.length > 0 && (
          <div className="space-y-1">
            {symbols.map((sym) => {
              const q = quotes.find(quote => quote.symbol === sym);
              if (!q) return null;
              const isPositive = q.change >= 0;
              const isSelected = currentSymbol === q.symbol;

              return (
                <div
                  key={q.symbol}
                  data-testid={`watchlist-item-${q.symbol}`}
                  className={`flex items-center justify-between gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    isSelected ? "bg-accent/50" : "hover-elevate"
                  }`}
                  onClick={() => onSelectStock(q.symbol)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex-shrink-0">
                      {isPositive ? (
                        <TrendingUp className="h-3.5 w-3.5" style={{ color: "#26a69a" }} />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" style={{ color: "#ef5350" }} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{q.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{q.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium">${q.price.toFixed(2)}</p>
                      <p
                        className="text-xs font-mono"
                        style={{ color: isPositive ? "#26a69a" : "#ef5350" }}
                      >
                        {formatPercent(q.changePercent)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      style={{ opacity: 0.4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSymbol(q.symbol);
                      }}
                      data-testid={`button-remove-${q.symbol}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
