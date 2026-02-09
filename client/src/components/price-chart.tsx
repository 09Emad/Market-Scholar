import { useState, useRef, useEffect } from "react";
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
const CHART_BG = "#131722";
const GRID_COLOR = "#1e222d";
const AXIS_COLOR = "#787b86";
const CROSSHAIR_COLOR = "#9598a1";

interface ChartEntry {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
}

function formatVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function getNiceTickInterval(range: number, targetTicks: number): number {
  const rough = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / magnitude;
  let nice: number;
  if (residual <= 1.5) nice = 1;
  else if (residual <= 3) nice = 2;
  else if (residual <= 7) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

function CandlestickSVG({
  data,
  width,
  height,
  hoveredIndex,
  onHover,
  lastPrice,
}: {
  data: ChartEntry[];
  width: number;
  height: number;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  lastPrice: number;
}) {
  const margin = { top: 8, right: 70, bottom: 28, left: 8 };
  const volumeHeight = height * 0.15;
  const priceHeight = height - margin.top - margin.bottom - volumeHeight - 4;
  const chartWidth = width - margin.left - margin.right;

  if (chartWidth <= 0 || priceHeight <= 0) return null;

  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const pMin = Math.min(...lows);
  const pMax = Math.max(...highs);
  const pRange = pMax - pMin || 1;
  const padding = pRange * 0.06;
  const domainMin = pMin - padding;
  const domainMax = pMax + padding;
  const vMax = Math.max(...data.map(d => d.volume), 1);

  const priceScale = (val: number) => margin.top + ((domainMax - val) / (domainMax - domainMin)) * priceHeight;
  const volBottom = margin.top + priceHeight + 4 + volumeHeight;
  const volScale = (val: number) => volBottom - (val / vMax) * volumeHeight;

  const barGap = chartWidth / data.length;
  const candleWidth = Math.max(1, Math.min(barGap * 0.6, 14));

  const labelCount = Math.max(1, Math.floor(chartWidth / 90));
  const step = Math.max(1, Math.floor(data.length / labelCount));
  const xLabels: { index: number; label: string }[] = [];
  for (let i = 0; i < data.length; i += step) {
    xLabels.push({ index: i, label: data[i].date });
  }

  const tickInterval = getNiceTickInterval(domainMax - domainMin, Math.floor(priceHeight / 40));
  const priceTicks: number[] = [];
  const firstTick = Math.ceil(domainMin / tickInterval) * tickInterval;
  for (let t = firstTick; t <= domainMax; t += tickInterval) {
    priceTicks.push(t);
  }

  const lastEntry = data[data.length - 1];
  const isLastUp = lastEntry.close >= lastEntry.open;
  const currentPriceY = priceScale(lastPrice);
  const currentPriceColor = isLastUp ? CANDLE_GREEN : CANDLE_RED;

  const hoveredEntry = hoveredIndex !== null ? data[hoveredIndex] : null;
  const hoveredX = hoveredIndex !== null ? margin.left + hoveredIndex * barGap + barGap / 2 : 0;
  const hoveredY = hoveredEntry ? priceScale(hoveredEntry.close) : 0;

  const chartRight = margin.left + chartWidth;
  const chartBottom = margin.top + priceHeight;

  const decimals = tickInterval < 1 ? 2 : tickInterval < 10 ? 2 : 0;

  return (
    <svg width={width} height={height} className="select-none" style={{ backgroundColor: CHART_BG }}>
      <defs>
        <clipPath id="chartArea">
          <rect x={margin.left} y={margin.top} width={chartWidth} height={priceHeight + 4 + volumeHeight} />
        </clipPath>
      </defs>

      {priceTicks.map((tick, i) => {
        const y = priceScale(tick);
        if (y < margin.top || y > chartBottom) return null;
        return (
          <g key={`grid-${i}`}>
            <line
              x1={margin.left}
              y1={y}
              x2={chartRight}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
            <text
              x={chartRight + 8}
              y={y + 4}
              fontSize={11}
              fill={AXIS_COLOR}
              fontFamily="monospace"
              textAnchor="start"
            >
              {tick.toFixed(decimals)}
            </text>
          </g>
        );
      })}

      <line
        x1={chartRight}
        y1={margin.top}
        x2={chartRight}
        y2={volBottom}
        stroke={GRID_COLOR}
        strokeWidth={1}
      />

      <g clipPath="url(#chartArea)">
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
                x={x - candleWidth / 2}
                y={volTop}
                width={candleWidth}
                height={Math.max(0, volBottom - volTop)}
                fill={color}
                opacity={0.4}
              />
              <line
                x1={x}
                y1={wickTop}
                x2={x}
                y2={wickBottom}
                stroke={color}
                strokeWidth={1}
              />
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyH}
                fill={color}
              />
            </g>
          );
        })}
      </g>

      {data.map((_, i) => {
        const x = margin.left + i * barGap;
        return (
          <rect
            key={`hover-${i}`}
            x={x}
            y={0}
            width={barGap}
            height={height}
            fill="transparent"
            onMouseEnter={() => onHover(i)}
          />
        );
      })}

      <line
        x1={margin.left}
        y1={currentPriceY}
        x2={chartRight}
        y2={currentPriceY}
        stroke={currentPriceColor}
        strokeWidth={1}
        strokeDasharray="2 2"
        opacity={0.7}
        pointerEvents="none"
      />
      <rect
        x={chartRight}
        y={currentPriceY - 10}
        width={margin.right - 2}
        height={20}
        rx={2}
        fill={currentPriceColor}
        pointerEvents="none"
      />
      <text
        x={chartRight + (margin.right - 2) / 2}
        y={currentPriceY + 4}
        fontSize={10}
        fill="#fff"
        fontFamily="monospace"
        fontWeight="bold"
        textAnchor="middle"
        pointerEvents="none"
      >
        {lastPrice.toFixed(2)}
      </text>

      {hoveredIndex !== null && hoveredEntry && (
        <g pointerEvents="none">
          <line
            x1={hoveredX}
            y1={margin.top}
            x2={hoveredX}
            y2={volBottom}
            stroke={CROSSHAIR_COLOR}
            strokeWidth={0.5}
            strokeDasharray="4 3"
            opacity={0.7}
          />
          <line
            x1={margin.left}
            y1={hoveredY}
            x2={chartRight}
            y2={hoveredY}
            stroke={CROSSHAIR_COLOR}
            strokeWidth={0.5}
            strokeDasharray="4 3"
            opacity={0.7}
          />
          <rect
            x={chartRight}
            y={hoveredY - 10}
            width={margin.right - 2}
            height={20}
            rx={2}
            fill="#363a45"
          />
          <text
            x={chartRight + (margin.right - 2) / 2}
            y={hoveredY + 4}
            fontSize={10}
            fill="#d1d4dc"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {hoveredEntry.close.toFixed(2)}
          </text>
        </g>
      )}

      {xLabels.map(({ index, label }) => (
        <text
          key={`xlabel-${index}`}
          x={margin.left + index * barGap + barGap / 2}
          y={height - 6}
          fontSize={10}
          fill={AXIS_COLOR}
          fontFamily="monospace"
          textAnchor="middle"
        >
          {label}
        </text>
      ))}

      <text
        x={margin.left + 6}
        y={margin.top + 14}
        fontSize={10}
        fill={AXIS_COLOR}
        fontFamily="monospace"
        opacity={0.7}
      >
        Vol {formatVol(lastEntry.volume)}
      </text>
    </svg>
  );
}

function ChartTooltip({ data, x, chartWidth }: { data: ChartEntry; x: number; chartWidth: number }) {
  const isUp = data.close >= data.open;
  const changePercent = ((data.close - data.open) / data.open * 100).toFixed(2);
  const tooltipLeft = x > chartWidth * 0.6;

  return (
    <div
      className="absolute pointer-events-none z-50 rounded-md p-3 shadow-xl min-w-[185px] border"
      style={{
        top: 40,
        backgroundColor: "#1e222d",
        borderColor: "#2a2e39",
        color: "#d1d4dc",
        ...(tooltipLeft ? { right: chartWidth - x + 15 } : { left: x + 15 }),
      }}
    >
      <p className="text-xs mb-1.5" style={{ color: AXIS_COLOR }}>{data.date}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        <span style={{ color: AXIS_COLOR }}>O</span>
        <span className="font-mono text-right" style={{ color: "#d1d4dc" }}>{data.open.toFixed(2)}</span>
        <span style={{ color: AXIS_COLOR }}>H</span>
        <span className="font-mono text-right" style={{ color: "#d1d4dc" }}>{data.high.toFixed(2)}</span>
        <span style={{ color: AXIS_COLOR }}>L</span>
        <span className="font-mono text-right" style={{ color: "#d1d4dc" }}>{data.low.toFixed(2)}</span>
        <span style={{ color: AXIS_COLOR }}>C</span>
        <span className="font-mono text-right font-medium" style={{ color: isUp ? CANDLE_GREEN : CANDLE_RED }}>
          {data.close.toFixed(2)}
        </span>
        <span style={{ color: AXIS_COLOR }}>Chg</span>
        <span className="font-mono text-right" style={{ color: isUp ? CANDLE_GREEN : CANDLE_RED }}>
          {isUp ? "+" : ""}{changePercent}%
        </span>
        <span style={{ color: AXIS_COLOR }}>Vol</span>
        <span className="font-mono text-right" style={{ color: "#d1d4dc" }}>
          {formatVol(data.volume)}
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
  const [dimensions, setDimensions] = useState({ width: 600, height: 450 });
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
          <Skeleton className="h-[450px] w-full rounded-md" />
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
          <div className="h-[450px] flex flex-col items-center justify-center text-center" style={{ backgroundColor: CHART_BG, borderRadius: 6 }}>
            <LineChartIcon className="h-10 w-10 mb-3" style={{ color: AXIS_COLOR }} />
            <p className="text-sm" style={{ color: AXIS_COLOR }}>
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

  const lastPrice = chartData[chartData.length - 1].close;
  const margin = { top: 8, right: 70, bottom: 28, left: 8 };
  const chartWidth = dimensions.width - margin.left - margin.right;
  const barGap = chartWidth / chartData.length;

  const tooltipData = hoveredIndex !== null ? chartData[hoveredIndex] : null;
  const tooltipX = hoveredIndex !== null ? margin.left + hoveredIndex * barGap + barGap / 2 : 0;

  const hoveredEntry = hoveredIndex !== null ? chartData[hoveredIndex] : null;
  const ohlcDisplay = hoveredEntry || chartData[chartData.length - 1];
  const ohlcUp = ohlcDisplay.close >= ohlcDisplay.open;
  const ohlcColor = ohlcUp ? CANDLE_GREEN : CANDLE_RED;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-medium">
            {symbol}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs font-mono" data-testid="ohlc-bar">
            <span style={{ color: AXIS_COLOR }}>O</span>
            <span style={{ color: ohlcColor }}>{ohlcDisplay.open.toFixed(2)}</span>
            <span style={{ color: AXIS_COLOR }}>H</span>
            <span style={{ color: ohlcColor }}>{ohlcDisplay.high.toFixed(2)}</span>
            <span style={{ color: AXIS_COLOR }}>L</span>
            <span style={{ color: ohlcColor }}>{ohlcDisplay.low.toFixed(2)}</span>
            <span style={{ color: AXIS_COLOR }}>C</span>
            <span style={{ color: ohlcColor }} className="font-medium">{ohlcDisplay.close.toFixed(2)}</span>
          </div>
        </div>
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
      <CardContent className="p-2 pt-0">
        <div
          ref={containerRef}
          className="h-[450px] relative rounded-md"
          style={{ overflow: "hidden" }}
          data-testid="candlestick-chart"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <CandlestickSVG
            data={chartData}
            width={dimensions.width}
            height={dimensions.height}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
            lastPrice={lastPrice}
          />
          {tooltipData && (
            <ChartTooltip data={tooltipData} x={tooltipX} chartWidth={dimensions.width} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
