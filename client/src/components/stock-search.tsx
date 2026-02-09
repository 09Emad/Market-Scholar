import { useState, useCallback } from "react";
import { Search, TrendingUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POPULAR_STOCKS } from "@/lib/constants";

interface StockSearchProps {
  onSelectStock: (symbol: string) => void;
  currentSymbol?: string;
}

export function StockSearch({ onSelectStock, currentSymbol }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const filtered = query.length > 0
    ? POPULAR_STOCKS.filter(
        (s) =>
          s.symbol.toLowerCase().includes(query.toLowerCase()) ||
          s.name.toLowerCase().includes(query.toLowerCase())
      )
    : POPULAR_STOCKS;

  const handleSelect = useCallback(
    (symbol: string) => {
      onSelectStock(symbol);
      setQuery("");
      setIsFocused(false);
    },
    [onSelectStock]
  );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-stock-search"
          type="search"
          placeholder="Search stocks (e.g., AAPL, Tesla)..."
          className="pl-10 pr-10 font-mono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />
        {query && (
          <Button
            data-testid="button-clear-search"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setQuery("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isFocused && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-popover-border rounded-md shadow-lg max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No stocks found for "{query}"
            </div>
          ) : (
            <div className="p-1">
              {!query && (
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  Popular Stocks
                </div>
              )}
              {filtered.map((stock) => (
                <button
                  key={stock.symbol}
                  data-testid={`button-stock-${stock.symbol}`}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover-elevate cursor-pointer text-left"
                  onClick={() => handleSelect(stock.symbol)}
                >
                  <Badge
                    variant={currentSymbol === stock.symbol ? "default" : "secondary"}
                    className="font-mono text-xs min-w-[52px] justify-center"
                  >
                    {stock.symbol}
                  </Badge>
                  <span className="text-sm truncate">{stock.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
