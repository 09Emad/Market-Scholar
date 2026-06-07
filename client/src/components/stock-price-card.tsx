import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity, BarChart3, DollarSign, Layers } from "lucide-react";
import { formatCurrency, formatLargeNumber, formatPercent } from "@/lib/constants";
import type { StockQuote } from "@shared/schema";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";

interface StockPriceCardProps {
  quote: StockQuote | null;
  isLoading: boolean;
}

export function StockPriceCard({ quote, isLoading }: StockPriceCardProps) {
  const { language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };
  if (isLoading) {
    return <StockPriceCardSkeleton />;
  }

  if (!quote) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("selectStockSymbol")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = quote.change >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold" data-testid="text-stock-symbol">
                {quote.symbol}
              </h2>
              <Badge variant="secondary" className="text-xs">
                US
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-stock-name">
              {quote.name}
            </p>
          </div>
          <Badge
            variant={isPositive ? "default" : "destructive"}
            className={`text-xs gap-1 ${isPositive ? "bg-emerald-600 dark:bg-emerald-700" : ""}`}
            data-testid="badge-price-change"
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {formatPercent(quote.changePercent)}
          </Badge>
        </div>

        <div className="mb-5">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-bold font-mono tracking-tight" data-testid="text-current-price">
              {formatCurrency(quote.price)}
            </span>
            <span
              className={`text-sm font-medium font-mono ${
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
              }`}
              data-testid="text-price-change-value"
            >
              {isPositive ? "+" : ""}
              {formatCurrency(quote.change)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricItem
            icon={<DollarSign className="h-3.5 w-3.5" />}
            label={t("open")}
            value={formatCurrency(quote.open)}
            testId="text-open-price"
          />
          <MetricItem
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label={t("high")}
            value={formatCurrency(quote.high)}
            testId="text-high-price"
          />
          <MetricItem
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label={t("low")}
            value={formatCurrency(quote.low)}
            testId="text-low-price"
          />
          <MetricItem
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label={t("volume")}
            value={formatLargeNumber(quote.volume)}
            testId="text-volume"
          />
          <MetricItem
            icon={<Layers className="h-3.5 w-3.5" />}
            label={t("prevClose")}
            value={formatCurrency(quote.previousClose)}
            testId="text-prev-close"
          />
          {quote.week52High !== undefined && (
            <MetricItem
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label={t("week52High")}
              value={formatCurrency(quote.week52High)}
              testId="text-52w-high"
            />
          )}
          {quote.week52Low !== undefined && (
            <MetricItem
              icon={<TrendingDown className="h-3.5 w-3.5" />}
              label={t("week52Low")}
              value={formatCurrency(quote.week52Low)}
              testId="text-52w-low"
            />
          )}
          {quote.marketCap !== undefined && (
            <MetricItem
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label={t("marketCap")}
              value={formatLargeNumber(quote.marketCap)}
              testId="text-market-cap"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricItem({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-2 rounded-md bg-muted/40">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-medium font-mono" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

function StockPriceCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <Skeleton className="h-6 w-20 mb-1" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-9 w-32 mb-5" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
