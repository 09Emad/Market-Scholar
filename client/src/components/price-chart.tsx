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
const MA20_COLOR = "#f7a21b";
const MA50_COLOR = "#2962ff";
const RSI_LINE_COLOR = "#7b61ff";
const RSI_OVERBOUGHT = "#ef5350";
const RSI_OVERSOLD = "#26a69a";

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

function calcMA(data: ChartEntry[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
    return sum / period;
  });
}

function calcRSI(data: ChartEntry[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period + 1) return rsi;

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsi[i + 1] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function CandlestickSVG({
  data,
  width,
  height,
  hoveredIndex,
  onHover,
  lastPrice,
  showMA20,
  showMA50,
  showRSI,
}: {
  data: ChartEntry[];
  width: number;
  height: number;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  lastPrice: number;
  showMA20: boolean;
  showMA50: boolean;
  showRSI: boolean;
}) {
  const margin = { top: 8, right: 70, bottom: 28, left: 8 };
  const rsiHeight = showRSI ? 80 : 0;
  const rsiGap = showRSI ? 6 : 0;
  const volumeHeight = height * 0.12;
  const priceHeight = height - margin.top - margin.bottom - volumeHeight - 4 - rsiHeight - rsiGap;
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

  const ma20 = showMA20 ? calcMA(data, 20) : [];
  const ma50 = showMA50 ? calcMA(data, 50) : [];
  const rsiValues = showRSI ? calcRSI(data, 14) : [];

  const buildMAPath = (maValues: (number | null)[]) => {
    let path = "";
    let started = false;
    for (let i = 0; i < maValues.length; i++) {
      const v = maValues[i];
      if (v === null) continue;
      const x = margin.left + i * barGap + barGap / 2;
      const y = priceScale(v);
      if (!started) {
        path += `M${x},${y}`;
        started = true;
      } else {
        path += `L${x},${y}`;
      }
    }
    return path;
  };

  const rsiTop = volBottom + rsiGap;
  const rsiBottom = rsiTop + rsiHeight;
  const rsiScale = (val: number) => rsiTop + ((100 - val) / 100) * rsiHeight;

  const buildRSIPath = () => {
    let path = "";
    let started = false;
    for (let i = 0; i < rsiValues.length; i++) {
      const v = rsiValues[i];
      if (v === null) continue;
      const x = margin.left + i * barGap + barGap / 2;
      const y = rsiScale(v);
      if (!started) {
        path += `M${x},${y}`;
        started = true;
      } else {
        path += `L${x},${y}`;
      }
    }
    return path;
  };

  const hoveredRSI = hoveredIndex !== null && rsiValues[hoveredIndex] !== null ? rsiValues[hoveredIndex] : null;
  const hoveredMA20 = hoveredIndex !== null && showMA20 && ma20[hoveredIndex] !== null ? ma20[hoveredIndex] : null;
  const hoveredMA50 = hoveredIndex !== null && showMA50 && ma50[hoveredIndex] !== null ? ma50[hoveredIndex] : null;

  const totalBottom = showRSI ? rsiBottom : volBottom;

  return (
    <svg width={width} height={height} className="select-none" style={{ backgroundColor: CHART_BG }}>
      <defs>
        <clipPath id="chartArea">
          <rect x={margin.left} y={margin.top} width={chartWidth} height={priceHeight + 4 + volumeHeight} />
        </clipPath>
        <clipPath id="rsiArea">
          <rect x={margin.left} y={rsiTop} width={chartWidth} height={rsiHeight} />
        </clipPath>
      </defs>

      {priceTicks.map((tick, i) => {
        const y = priceScale(tick);
        if (y < margin.top || y > chartBottom) return null;
        return (
          <g key={`grid-${i}`}>
            <line x1={margin.left} y1={y} x2={chartRight} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
            <text x={chartRight + 8} y={y + 4} fontSize={11} fill={AXIS_COLOR} fontFamily="monospace" textAnchor="start">
              {tick.toFixed(decimals)}
            </text>
          </g>
        );
      })}

      <line x1={chartRight} y1={margin.top} x2={chartRight} y2={totalBottom} stroke={GRID_COLOR} strokeWidth={1} />

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
              <rect x={x - candleWidth / 2} y={volTop} width={candleWidth} height={Math.max(0, volBottom - volTop)} fill={color} opacity={0.4} />
              <line x1={x} y1={wickTop} x2={x} y2={wickBottom} stroke={color} strokeWidth={1} />
              <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyH} fill={color} />
            </g>
          );
        })}

        {showMA20 && ma20.length > 0 && (
          <path d={buildMAPath(ma20)} fill="none" stroke={MA20_COLOR} strokeWidth={1.5} opacity={0.9} />
        )}
        {showMA50 && ma50.length > 0 && (
          <path d={buildMAPath(ma50)} fill="none" stroke={MA50_COLOR} strokeWidth={1.5} opacity={0.9} />
        )}
      </g>

      {showRSI && (
        <g>
          <line x1={margin.left} y1={rsiTop} x2={chartRight} y2={rsiTop} stroke={AXIS_COLOR} strokeWidth={0.5} opacity={0.5} />
          <line x1={margin.left} y1={rsiScale(70)} x2={chartRight} y2={rsiScale(70)} stroke={RSI_OVERBOUGHT} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.5} />
          <line x1={margin.left} y1={rsiScale(30)} x2={chartRight} y2={rsiScale(30)} stroke={RSI_OVERSOLD} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.5} />
          <line x1={margin.left} y1={rsiScale(50)} x2={chartRight} y2={rsiScale(50)} stroke={GRID_COLOR} strokeWidth={0.5} strokeDasharray="2 2" />
          <line x1={margin.left} y1={rsiBottom} x2={chartRight} y2={rsiBottom} stroke={GRID_COLOR} strokeWidth={0.5} />

          <text x={chartRight + 8} y={rsiScale(70) + 4} fontSize={9} fill={RSI_OVERBOUGHT} fontFamily="monospace" opacity={0.7}>70</text>
          <text x={chartRight + 8} y={rsiScale(50) + 4} fontSize={9} fill={AXIS_COLOR} fontFamily="monospace" opacity={0.7}>50</text>
          <text x={chartRight + 8} y={rsiScale(30) + 4} fontSize={9} fill={RSI_OVERSOLD} fontFamily="monospace" opacity={0.7}>30</text>

          <text x={margin.left + 4} y={rsiTop + 12} fontSize={10} fill={RSI_LINE_COLOR} fontFamily="monospace" opacity={0.8}>RSI(14)</text>

          <g clipPath="url(#rsiArea)">
            <path d={buildRSIPath()} fill="none" stroke={RSI_LINE_COLOR} strokeWidth={1.5} />
          </g>
        </g>
      )}

      {data.map((_, i) => {
        const x = margin.left + i * barGap;
        return (
          <rect key={`hover-${i}`} x={x} y={0} width={barGap} height={height} fill="transparent" onMouseEnter={() => onHover(i)} />
        );
      })}

      <line x1={margin.left} y1={currentPriceY} x2={chartRight} y2={currentPriceY} stroke={currentPriceColor} strokeWidth={1} strokeDasharray="2 2" opacity={0.7} pointerEvents="none" />
      <rect x={chartRight} y={currentPriceY - 10} width={margin.right - 2} height={20} rx={2} fill={currentPriceColor} pointerEvents="none" />
      <text x={chartRight + (margin.right - 2) / 2} y={currentPriceY + 4} fontSize={10} fill="#fff" fontFamily="monospace" fontWeight="bold" textAnchor="middle" pointerEvents="none">
        {lastPrice.toFixed(2)}
      </text>

      {hoveredIndex !== null && hoveredEntry && (
        <g pointerEvents="none">
          <line x1={hoveredX} y1={margin.top} x2={hoveredX} y2={totalBottom} stroke={CROSSHAIR_COLOR} strokeWidth={0.5} strokeDasharray="4 3" opacity={0.7} />
          <line x1={margin.left} y1={hoveredY} x2={chartRight} y2={hoveredY} stroke={CROSSHAIR_COLOR} strokeWidth={0.5} strokeDasharray="4 3" opacity={0.7} />
          <rect x={chartRight} y={hoveredY - 10} width={margin.right - 2} height={20} rx={2} fill="#363a45" />
          <text x={chartRight + (margin.right - 2) / 2} y={hoveredY + 4} fontSize={10} fill="#d1d4dc" fontFamily="monospace" textAnchor="middle">
            {hoveredEntry.close.toFixed(2)}
          </text>

          {showRSI && hoveredRSI !== null && (
            <>
              <line x1={hoveredX} y1={rsiTop} x2={hoveredX} y2={rsiBottom} stroke={CROSSHAIR_COLOR} strokeWidth={0.5} strokeDasharray="4 3" opacity={0.5} />
              <circle cx={hoveredX} cy={rsiScale(hoveredRSI)} r={3} fill={RSI_LINE_COLOR} />
            </>
          )}
        </g>
      )}

      {xLabels.map(({ index, label }) => (
        <text key={`xlabel-${index}`} x={margin.left + index * barGap + barGap / 2} y={height - 6} fontSize={10} fill={AXIS_COLOR} fontFamily="monospace" textAnchor="middle">
          {label}
        </text>
      ))}

      <text x={margin.left + 6} y={margin.top + 14} fontSize={10} fill={AXIS_COLOR} fontFamily="monospace" opacity={0.7}>
        Vol {formatVol(lastEntry.volume)}
      </text>
    </svg>
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
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(false);
  const [showRSI, setShowRSI] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const chartHeight = showRSI ? 540 : 450;

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
            <p className="text-sm" style={{ color: AXIS_COLOR }}>Select a stock to view price history</p>
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

  const hoveredEntry = hoveredIndex !== null ? chartData[hoveredIndex] : null;
  const ohlcDisplay = hoveredEntry || chartData[chartData.length - 1];
  const ohlcUp = ohlcDisplay.close >= ohlcDisplay.open;
  const ohlcColor = ohlcUp ? CANDLE_GREEN : CANDLE_RED;

  const ma20Values = showMA20 ? calcMA(chartData, 20) : [];
  const ma50Values = showMA50 ? calcMA(chartData, 50) : [];
  const rsiValues = showRSI ? calcRSI(chartData, 14) : [];
  const hoveredMA20 = hoveredIndex !== null && showMA20 && ma20Values[hoveredIndex] !== null ? ma20Values[hoveredIndex] : null;
  const hoveredMA50 = hoveredIndex !== null && showMA50 && ma50Values[hoveredIndex] !== null ? ma50Values[hoveredIndex] : null;
  const hoveredRSI = hoveredIndex !== null && showRSI && rsiValues[hoveredIndex] !== null ? rsiValues[hoveredIndex] : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-3 flex-wrap">
          <CardTitle className="text-base font-medium">{symbol}</CardTitle>
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
          {hoveredMA20 !== null && (
            <span className="text-xs font-mono" style={{ color: MA20_COLOR }}>MA20: {hoveredMA20.toFixed(2)}</span>
          )}
          {hoveredMA50 !== null && (
            <span className="text-xs font-mono" style={{ color: MA50_COLOR }}>MA50: {hoveredMA50.toFixed(2)}</span>
          )}
          {hoveredRSI !== null && (
            <span className="text-xs font-mono" style={{ color: RSI_LINE_COLOR }}>RSI: {hoveredRSI.toFixed(1)}</span>
          )}
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

      <div className="flex items-center gap-1 px-4 pb-1 flex-wrap">
        <Button
          data-testid="button-indicator-ma20"
          variant={showMA20 ? "default" : "outline"}
          size="sm"
          className="text-xs h-6 px-2"
          onClick={() => setShowMA20(!showMA20)}
          style={showMA20 ? { backgroundColor: MA20_COLOR, borderColor: MA20_COLOR } : {}}
        >
          MA 20
        </Button>
        <Button
          data-testid="button-indicator-ma50"
          variant={showMA50 ? "default" : "outline"}
          size="sm"
          className="text-xs h-6 px-2"
          onClick={() => setShowMA50(!showMA50)}
          style={showMA50 ? { backgroundColor: MA50_COLOR, borderColor: MA50_COLOR } : {}}
        >
          MA 50
        </Button>
        <Button
          data-testid="button-indicator-rsi"
          variant={showRSI ? "default" : "outline"}
          size="sm"
          className="text-xs h-6 px-2"
          onClick={() => setShowRSI(!showRSI)}
          style={showRSI ? { backgroundColor: RSI_LINE_COLOR, borderColor: RSI_LINE_COLOR } : {}}
        >
          RSI
        </Button>
      </div>

      <CardContent className="p-2 pt-0">
        <div
          ref={containerRef}
          className="relative rounded-md"
          style={{ overflow: "hidden", height: chartHeight }}
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
            showMA20={showMA20}
            showMA50={showMA50}
            showRSI={showRSI}
          />
        </div>
      </CardContent>
    </Card>
  );
}
