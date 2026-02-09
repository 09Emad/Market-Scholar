import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart as LineChartIcon } from "lucide-react";
import { TIME_RANGES, formatCurrency } from "@/lib/constants";

interface PriceChartProps {
  data: Array<{ date: string; close: number; open: number; high: number; low: number; volume: number }> | null;
  isLoading: boolean;
  symbol: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

const CANDLE_GREEN = "#26a69a";
const CANDLE_RED = "#ef5350";

interface ChartEntry {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
}

function CandlestickSVG({
  data,
  width,
  height,
  hoveredIndex,
  onHover,
}: {
  data: ChartEntry[];
  width: number;
  height: number;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}) {
  const margin = { top: 10, right: 60, bottom: 30, left: 10 };
  const volumeHeight = height * 0.18;
  const priceHeight = height - margin.top - margin.bottom - volumeHeight - 8;
  const chartWidth = width - margin.left - margin.right;

  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const pMin = Math.min(...lows);
  const pMax = Math.max(...highs);
  const padding = (pMax - pMin) * 0.05 || 1;
  const domainMin = pMin - padding;
  const domainMax = pMax + padding;
  const vMax = Math.max(...data.map(d => d.volume), 1);

  const priceScale = (val: number) => margin.top + ((domainMax - val) / (domainMax - domainMin)) * priceHeight;
  const volBottom = margin.top + priceHeight + 8 + volumeHeight;
  const volScale = (val: number) => volBottom - (val / vMax) * volumeHeight;

  const barGap = chartWidth / data.length;
  const candleWidth = Math.max(1, barGap * 0.6);

  const labelCount = Math.max(1, Math.floor(chartWidth / 80));
  const step = Math.max(1, Math.floor(data.length / labelCount));
  const xLabels: { index: number; label: string }[] = [];
  for (let i = 0; i < data.length; i += step) {
    xLabels.push({ index: i, label: data[i].date });
  }

  const priceTicks: number[] = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    priceTicks.push(domainMin + (domainMax - domainMin) * (i / tickCount));
  }

  return (
    <svg width={width} height={height} className="select-none">
      {priceTicks.map((tick, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={margin.left}
            y1={priceScale(tick)}
            x2={width - margin.right}
            y2={priceScale(tick)}
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
            strokeWidth={0.5}
          />
          <text
            x={width - margin.right + 5}
            y={priceScale(tick) + 4}
            fontSize={10}
            fill="hsl(var(--muted-foreground))"
            textAnchor="start"
          >
            ${tick.toFixed(tick >= 100 ? 0 : 2)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const x = margin.left + i * barGap + barGap / 2;
        const color = d.isUp ? CANDLE_GREEN : CANDLE_RED;

        const bodyTop = priceScale(d.isUp ? d.close : d.open);
        const bodyBottom = priceScale(d.isUp ? d.open : d.close);
        const bodyH = Math.max(1, bodyBottom - bodyTop);

        const wickTop = priceScale(d.high);
        const wickBottom = priceScale(d.low);

        const volTop = volScale(d.volume);

        return (
          <g key={`candle-${i}`}>
            <rect
              x={x - barGap / 2}
              y={margin.top}
              width={barGap}
              height={height - margin.bottom - margin.top}
              fill="transparent"
              onMouseEnter={() => onHover(i)}
            />
            <rect
              x={x - candleWidth / 2}
              y={volTop}
              width={candleWidth}
              height={Math.max(0, volBottom - volTop)}
              fill={color}
              opacity={0.3}
              pointerEvents="none"
            />
            <line
              x1={x}
              y1={wickTop}
              x2={x}
              y2={wickBottom}
              stroke={color}
              strokeWidth={1}
              pointerEvents="none"
            />
            <rect
              x={x - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyH}
              fill={color}
              stroke={color}
              strokeWidth={0.5}
              pointerEvents="none"
            />
          </g>
        );
      })}

      {hoveredIndex !== null && (
        <line
          x1={margin.left + hoveredIndex * barGap + barGap / 2}
          y1={margin.top}
          x2={margin.left + hoveredIndex * barGap + barGap / 2}
          y2={margin.top + priceHeight}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={0.5}
          strokeDasharray="3 3"
          opacity={0.5}
          pointerEvents="none"
        />
      )}

      {xLabels.map(({ index, label }) => (
        <text
          key={`xlabel-${index}`}
          x={margin.left + index * barGap + barGap / 2}
          y={height - 8}
          fontSize={10}
          fill="hsl(var(--muted-foreground))"
          textAnchor="middle"
        >
          {label}
        </text>
      ))}

      <text
        x={margin.left + 2}
        y={margin.top + priceHeight + 14}
        fontSize={9}
        fill="hsl(var(--muted-foreground))"
        opacity={0.5}
      >
        Vol
      </text>
    </svg>
  );
}

function ChartTooltip({ data, x, chartWidth }: { data: ChartEntry; x: number; chartWidth: number }) {
  const isUp = data.close >= data.open;
  const changePercent = ((data.close - data.open) / data.open * 100).toFixed(2);
  const tooltipLeft = x > chartWidth / 2;

  return (
    <div
      className="absolute bg-popover border border-popover-border rounded-md p-3 shadow-lg min-w-[175px] pointer-events-none z-50"
      style={{
        top: 20,
        ...(tooltipLeft ? { right: chartWidth - x + 15 } : { left: x + 15 }),
      }}
    >
      <p className="text-xs text-muted-foreground mb-1.5">{data.date}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        <span className="text-muted-foreground">Open</span>
        <span className="font-mono text-foreground text-right">{formatCurrency(data.open)}</span>
        <span className="text-muted-foreground">High</span>
        <span className="font-mono text-foreground text-right">{formatCurrency(data.high)}</span>
        <span className="text-muted-foreground">Low</span>
        <span className="font-mono text-foreground text-right">{formatCurrency(data.low)}</span>
        <span className="text-muted-foreground">Close</span>
        <span className={`font-mono text-right font-medium ${isUp ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
          {formatCurrency(data.close)}
        </span>
        <span className="text-muted-foreground">Change</span>
        <span className={`font-mono text-right ${isUp ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
          {isUp ? "+" : ""}{changePercent}%
        </span>
        <span className="text-muted-foreground">Volume</span>
        <span className="font-mono text-foreground text-right">
          {data.volume >= 1e6 ? `${(data.volume / 1e6).toFixed(1)}M` : data.volume >= 1e3 ? `${(data.volume / 1e3).toFixed(0)}K` : data.volume}
        </span>
      </div>
    </div>
  );
}

export function PriceChart({
  data,
  isLoading,
  symbol,
  timeRange,
  onTimeRangeChange,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 380 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
          <Skeleton className="h-[380px] w-full rounded-md" />
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
          <div className="h-[380px] flex flex-col items-center justify-center text-center">
            <LineChartIcon className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Select a stock to view price history
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData: ChartEntry[] = data.map((d) => ({
    ...d,
    isUp: d.close >= d.open,
  }));

  const margin = { top: 10, right: 60, bottom: 30, left: 10 };
  const chartWidth = dimensions.width - margin.left - margin.right;
  const barGap = chartWidth / chartData.length;

  const tooltipData = hoveredIndex !== null ? chartData[hoveredIndex] : null;
  const tooltipX = hoveredIndex !== null ? margin.left + hoveredIndex * barGap + barGap / 2 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base font-medium">
          {symbol} Price Chart
        </CardTitle>
        <div className="flex gap-1 flex-wrap">
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
        <div
          ref={containerRef}
          className="h-[380px] relative"
          data-testid="candlestick-chart"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <CandlestickSVG
            data={chartData}
            width={dimensions.width}
            height={dimensions.height}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
          />
          {tooltipData && (
            <ChartTooltip data={tooltipData} x={tooltipX} chartWidth={dimensions.width} />
          )}
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: CANDLE_GREEN }} />
            Bullish (Close &gt; Open)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: CANDLE_RED }} />
            Bearish (Close &lt; Open)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
