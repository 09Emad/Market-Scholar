import { useState, useCallback } from "react";
import { Search, TrendingUp, X, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POPULAR_STOCKS } from "@/lib/constants";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";

interface StockSearchProps {
  onSelectStock: (symbol: string) => void;
  currentSymbol?: string;
}

export function StockSearch({ onSelectStock, currentSymbol }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { language } = useTheme();

  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const trimmed = query.trim().toUpperCase();

  const filtered = query.length > 0
    ? POPULAR_STOCKS.filter(
        (s) =>
          s.symbol.toLowerCase().includes(query.toLowerCase()) ||
          s.name.toLowerCase().includes(query.toLowerCase())
      )
    : POPULAR_STOCKS;

  // Show a "direct search" option when the user typed something that's not in the list
  const showDirectSearch =
    trimmed.length > 0 &&
    trimmed.length <= 10 &&
    !POPULAR_STOCKS.some((s) => s.symbol === trimmed);

  const handleSelect = useCallback(
    (symbol: string) => {
      onSelectStock(symbol);
      setQuery("");
      setIsFocused(false);
    },
    [onSelectStock]
  );

  const handleDirectSearch = () => {
    if (trimmed.length > 0) {
      handleSelect(trimmed);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-stock-search"
          type="search"
          placeholder={t("searchPlaceholder")}
          className="pl-10 pr-10 font-mono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && trimmed.length > 0) {
              e.preventDefault();
              handleSelect(trimmed);
            }
          }}
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
          <div className="p-1">
            {/* Direct symbol search — always on top when typing */}
            {showDirectSearch && (
              <button
                data-testid={`button-stock-direct-${trimmed}`}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary/10 cursor-pointer text-left border border-dashed border-primary/30 mb-1 group"
                onMouseDown={(e) => { e.preventDefault(); handleDirectSearch(); }}
              >
                <Badge
                  variant="outline"
                  className="font-mono text-xs min-w-[52px] justify-center text-primary border-primary/40"
                >
                  {trimmed}
                </Badge>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
                  {t("searchFor")} <span className="font-semibold text-foreground">{trimmed}</span> {t("directly")}
                  <ArrowRight className="h-3 w-3 ml-1 opacity-60" />
                </span>
              </button>
            )}

            {/* Popular stocks list */}
            {filtered.length > 0 ? (
              <>
                {!query && (
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3" />
                    {t("popularStocks")}
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
              </>
            ) : (
              !showDirectSearch && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {t("noStocksFound")} "{query}"
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
