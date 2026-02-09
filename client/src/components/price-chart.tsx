import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { TIME_RANGES, formatCurrency } from "@/lib/constants";

interface PriceChartProps {
  data: Array<{ date: string; close: number; open: number; high: number; low: number; volume: number }> | null;
  isLoading: boolean;
  symbol: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export function PriceChart({
  data,
  isLoading,
  symbol,
  timeRange,
  onTimeRangeChange,
}: PriceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base font-medium">Price Chart</CardTitle>
          <div className="flex gap-1">
            {TIME_RANGES.map((r) => (
              <Skeleton key={r.value} className="h-8 w-9" />
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <Skeleton className="h-[300px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Price Chart</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <LineChartIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a stock to view price history
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const firstPrice = data[0]?.close ?? 0;
  const lastPrice = data[data.length - 1]?.close ?? 0;
  const isPositive = lastPrice >= firstPrice;
  const gradientId = `priceGradient-${symbol}`;
  const strokeColor = isPositive ? "#10B981" : "#EF4444";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base font-medium">
          {symbol} Price Chart
        </CardTitle>
        <div className="flex gap-1">
          {TIME_RANGES.map((r) => (
            <Button
              key={r.value}
              data-testid={`button-range-${r.value}`}
              variant={timeRange === r.value ? "default" : "ghost"}
              size="sm"
              className="text-xs px-2.5"
              onClick={() => onTimeRangeChange(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
                width={65}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border border-popover-border rounded-md p-3 shadow-lg">
                      <p className="text-xs text-muted-foreground mb-1">{d.date}</p>
                      <p className="text-sm font-medium font-mono">{formatCurrency(d.close)}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                        <span>O: <span className="font-mono text-foreground">{formatCurrency(d.open)}</span></span>
                        <span>H: <span className="font-mono text-foreground">{formatCurrency(d.high)}</span></span>
                        <span>L: <span className="font-mono text-foreground">{formatCurrency(d.low)}</span></span>
                        <span>V: <span className="font-mono text-foreground">{(d.volume / 1e6).toFixed(1)}M</span></span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: strokeColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
