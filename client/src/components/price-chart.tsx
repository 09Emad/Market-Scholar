import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart as LineChartIcon, Eye, EyeOff, Maximize2, Minimize2, SlidersHorizontal } from "lucide-react";
import { TIME_RANGES, formatCurrency } from "@/lib/constants";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
} from "@/components/ui/dropdown-menu";
import {
  createChart,
  ColorType,
  LineStyle,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  LineSeries
} from "lightweight-charts";

interface PriceChartProps {
  data: Array<{ date: string; close: number; open: number; high: number; low: number; volume: number }> | null;
  isLoading: boolean;
  symbol: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

const CANDLE_GREEN = "#26a69a";
const CANDLE_RED = "#ef5350";
const MA20_COLOR = "#f7a21b";
const MA50_COLOR = "#2962ff";
const RSI_LINE_COLOR = "#7b61ff";

interface ChartEntry {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Helpers for calculations
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

export function PriceChart({
  data,
  isLoading,
  symbol,
  timeRange,
  onTimeRangeChange,
}: PriceChartProps) {
  const { isDark, language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  const [showMA20, setShowMA20] = useState(false);
  const [showMA50, setShowMA50] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [viewType, setViewType] = useState<"candles" | "glow">("candles");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [prevTimeRange, setPrevTimeRange] = useState<string | null>(null);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setPrevTimeRange(timeRange);
      setIsFullscreen(true);
      onTimeRangeChange("6m");
    } else {
      setIsFullscreen(false);
      if (prevTimeRange) {
        onTimeRangeChange(prevTimeRange);
      }
    }
  };

  // OHLC, MA, and RSI values display state
  const [hoveredOhlc, setHoveredOhlc] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);
  const [hoveredMA20, setHoveredMA20] = useState<number | null>(null);
  const [hoveredMA50, setHoveredMA50] = useState<number | null>(null);
  const [hoveredRSI, setHoveredRSI] = useState<number | null>(null);

  // Parse and sort unique data points
  const getProcessedData = (): ChartEntry[] => {
    if (!data || data.length === 0) return [];
    const formatted = data
      .map((d) => ({
        time: Math.floor(new Date(d.date).getTime() / 1000) as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }))
      .sort((a, b) => a.time - b.time);

    const unique: ChartEntry[] = [];
    const seen = new Set<number>();
    for (const item of formatted) {
      if (!seen.has(item.time)) {
        seen.add(item.time);
        unique.push(item);
      }
    }
    return unique;
  };

  const chartData = getProcessedData();
  const lastPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;
  const currentOhlc = hoveredOhlc || (chartData.length > 0 ? chartData[chartData.length - 1] : null);

  useEffect(() => {
    if (chartData.length === 0 || !chartContainerRef.current) return;

    const computedBg = isDark ? "#0b111e" : "#edf0f5";
    const computedBorder = isDark ? "#131825" : "#dfe2e7";

    const themeColors = {
      bg: computedBg,
      grid: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
      text: isDark ? "#a1a1aa" : "#374151",
      border: computedBorder,
    };

    // 1. Create Main Price Chart
    const priceChart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: themeColors.bg },
        textColor: themeColors.text,
        fontFamily: "monospace",
      },
      grid: {
        vertLines: { color: themeColors.grid },
        horzLines: { color: themeColors.grid },
      },
      timeScale: {
        borderColor: themeColors.border,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: themeColors.border,
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
    });

    // 2. Add Main Price Series (Candlesticks or Glow Line)
    let mainSeries: ISeriesApi<"Candlestick"> | ISeriesApi<"Area">;
    if (viewType === "candles") {
      const series = priceChart.addSeries(CandlestickSeries, {
        upColor: CANDLE_GREEN,
        downColor: CANDLE_RED,
        borderUpColor: CANDLE_GREEN,
        borderDownColor: CANDLE_RED,
        wickUpColor: CANDLE_GREEN,
        wickDownColor: CANDLE_RED,
      });
      series.setData(chartData);
      mainSeries = series;
    } else {
      const series = priceChart.addSeries(AreaSeries, {
        topColor: isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.3)",
        bottomColor: "rgba(99, 102, 241, 0.0)",
        lineColor: "#6366f1",
        lineWidth: 2,
      });
      series.setData(
        chartData.map((d) => ({ time: d.time, value: d.close }))
      );
      mainSeries = series;
    }

    // 3. Add Volume Series Overlay
    const volumeSeries = priceChart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "", // Overlay on main chart
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.7, // Place at bottom 30% of main chart
        bottom: 0,
      },
    });
    volumeSeries.setData(
      chartData.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? "rgba(38, 166, 154, 0.18)" : "rgba(239, 83, 80, 0.18)",
      }))
    );

    // 4. Add MA Series Line Overlays
    const ma20Data = calcMA(chartData, 20)
      .map((val, idx) => ({ time: chartData[idx].time, value: val }))
      .filter((item): item is { time: UTCTimestamp; value: number } => item.value !== null);

    const ma50Data = calcMA(chartData, 50)
      .map((val, idx) => ({ time: chartData[idx].time, value: val }))
      .filter((item): item is { time: UTCTimestamp; value: number } => item.value !== null);

    let ma20Series: ISeriesApi<"Line"> | null = null;
    if (showMA20) {
      const series = priceChart.addSeries(LineSeries, {
        color: MA20_COLOR,
        lineWidth: 2,
        title: "MA 20",
      });
      series.setData(ma20Data);
      ma20Series = series;
    }

    let ma50Series: ISeriesApi<"Line"> | null = null;
    if (showMA50) {
      const series = priceChart.addSeries(LineSeries, {
        color: MA50_COLOR,
        lineWidth: 2,
        title: "MA 50",
      });
      series.setData(ma50Data);
      ma50Series = series;
    }

    // 5. Create RSI Sub-Chart (if enabled)
    let rsiChart: IChartApi | null = null;
    let rsiSeries: ISeriesApi<"Line"> | null = null;

    if (showRSI && rsiContainerRef.current) {
      rsiChart = createChart(rsiContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: themeColors.bg },
          textColor: themeColors.text,
          fontFamily: "monospace",
        },
        grid: {
          vertLines: { color: themeColors.grid },
          horzLines: { color: themeColors.grid },
        },
        timeScale: {
          borderColor: themeColors.border,
          visible: true,
          timeVisible: true,
        },
        rightPriceScale: {
          borderColor: themeColors.border,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        width: rsiContainerRef.current.clientWidth,
        height: 120,
      });

      const series = rsiChart.addSeries(LineSeries, {
        color: RSI_LINE_COLOR,
        lineWidth: 2,
        title: "RSI (14)",
      });

      const rsiData = calcRSI(chartData, 14)
        .map((val, idx) => ({ time: chartData[idx].time, value: val }))
        .filter((item): item is { time: UTCTimestamp; value: number } => item.value !== null);

      series.setData(rsiData);
      rsiSeries = series;

      // Add boundary lines for RSI (70 & 30)
      const rsiOverboughtLine = rsiChart.addSeries(LineSeries, {
        color: "rgba(239, 83, 80, 0.4)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });
      rsiOverboughtLine.setData(chartData.map((d) => ({ time: d.time, value: 70 })));

      const rsiOversoldLine = rsiChart.addSeries(LineSeries, {
        color: "rgba(38, 166, 154, 0.4)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
      });
      rsiOversoldLine.setData(chartData.map((d) => ({ time: d.time, value: 30 })));

      // Synchronize visible ranges
      priceChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range && rsiChart) rsiChart.timeScale().setVisibleLogicalRange(range);
      });
      rsiChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) priceChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    // 6. Subscribe to Crosshair / Hover Events to show OHLC & Indicators
    priceChart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHoveredOhlc(null);
        setHoveredMA20(null);
        setHoveredMA50(null);
        return;
      }

      // Extract Price OHLC
      const priceVal = param.seriesData.get(mainSeries as any);
      if (priceVal) {
        if ("open" in priceVal) {
          setHoveredOhlc({
            open: priceVal.open as number,
            high: priceVal.high as number,
            low: priceVal.low as number,
            close: priceVal.close as number,
          });
        } else if ("value" in priceVal) {
          const val = priceVal.value as number;
          setHoveredOhlc({ open: val, high: val, low: val, close: val });
        }
      }

      // Extract MA values
      if (ma20Series) {
        const ma20Val = param.seriesData.get(ma20Series as any) as { value: number } | undefined;
        setHoveredMA20(ma20Val?.value ?? null);
      }
      if (ma50Series) {
        const ma50Val = param.seriesData.get(ma50Series as any) as { value: number } | undefined;
        setHoveredMA50(ma50Val?.value ?? null);
      }
    });

    if (rsiChart && rsiSeries) {
      rsiChart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          setHoveredRSI(null);
          return;
        }
        const rsiVal = param.seriesData.get(rsiSeries as any) as { value: number } | undefined;
        setHoveredRSI(rsiVal?.value ?? null);
      });
    }

    // 7. Handle Responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const containerHeight = chartContainerRef.current?.clientHeight || 380;
        if (width > 0) {
          priceChart.resize(width, containerHeight);
          if (rsiChart && rsiContainerRef.current) {
            const rsiHeight = rsiContainerRef.current.clientHeight || 120;
            rsiChart.resize(width, rsiHeight);
          }
        }
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    // Clean up instances on unmount/re-render
    return () => {
      resizeObserver.disconnect();
      priceChart.remove();
      if (rsiChart) rsiChart.remove();
    };
  }, [data, viewType, showMA20, showMA50, showRSI, isDark, isFullscreen]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base font-medium">{t("priceChart")}</CardTitle>
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
          <CardTitle className="text-base font-medium">{t("priceChart")}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div
            className="h-[450px] flex flex-col items-center justify-center text-center rounded-lg"
            style={{ backgroundColor: isDark ? "#0b111e" : "#edf0f5" }}
          >
            <LineChartIcon className="h-10 w-10 mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("selectStockPriceHistory")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ohlcColor = currentOhlc
    ? currentOhlc.close >= currentOhlc.open
      ? CANDLE_GREEN
      : CANDLE_RED
    : CANDLE_GREEN;

  return (
    <Card
      className={cn(
        "transition-all duration-300",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-none bg-background p-6 overflow-y-auto flex flex-col space-y-4"
      )}
    >
      {/* Header showing Stock, OHLC metrics, and Indicator status */}
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <CardTitle className="text-base font-medium">{symbol}</CardTitle>

          {currentOhlc && (
            <div className="flex items-center gap-1.5 text-xs font-mono select-none">
              <span className="text-muted-foreground">O</span>
              <span style={{ color: ohlcColor }}>{currentOhlc.open.toFixed(2)}</span>
              <span className="text-muted-foreground">H</span>
              <span style={{ color: ohlcColor }}>{currentOhlc.high.toFixed(2)}</span>
              <span className="text-muted-foreground">L</span>
              <span style={{ color: ohlcColor }}>{currentOhlc.low.toFixed(2)}</span>
              <span className="text-muted-foreground">C</span>
              <span style={{ color: ohlcColor }} className="font-bold">
                {currentOhlc.close.toFixed(2)}
              </span>
            </div>
          )}

          {/* Indicator Values */}
          {showMA20 && hoveredMA20 !== null && (
            <span className="text-xs font-mono" style={{ color: MA20_COLOR }}>
              MA20: {hoveredMA20.toFixed(2)}
            </span>
          )}
          {showMA50 && hoveredMA50 !== null && (
            <span className="text-xs font-mono" style={{ color: MA50_COLOR }}>
              MA50: {hoveredMA50.toFixed(2)}
            </span>
          )}
          {showRSI && hoveredRSI !== null && (
            <span className="text-xs font-mono" style={{ color: RSI_LINE_COLOR }}>
              RSI: {hoveredRSI.toFixed(1)}
            </span>
          )}
        </div>

        {/* Controls Container: Timeframe + settings (mobile) + maximize */}
        <div className="flex gap-1 items-center self-end md:self-auto flex-wrap">
          <div className="flex gap-1">
            {TIME_RANGES.map((r) => (
              <Button
                key={r.value}
                variant={timeRange === r.value ? "default" : "ghost"}
                size="sm"
                className="text-xs h-8 px-2.5 rounded-lg"
                onClick={() => onTimeRangeChange(r.value)}
              >
                {r.label}
              </Button>
            ))}
          </div>

          {/* Mobile settings dropdown: hidden on desktop, visible on mobile */}
          <div className="md:hidden ml-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-border/40"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {language === "tr" ? "Grafik Ayarları" : "Chart Settings"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Indicators checkboxes */}
                <DropdownMenuCheckboxItem
                  checked={showMA20}
                  onCheckedChange={setShowMA20}
                  className="text-xs"
                >
                  MA 20
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showMA50}
                  onCheckedChange={setShowMA50}
                  className="text-xs"
                >
                  MA 50
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showRSI}
                  onCheckedChange={setShowRSI}
                  className="text-xs"
                >
                  RSI
                </DropdownMenuCheckboxItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {language === "tr" ? "Grafik Tipi" : "Chart Type"}
                </DropdownMenuLabel>
                
                {/* Chart Style Radio Group */}
                <DropdownMenuRadioGroup
                  value={viewType}
                  onValueChange={(val) => setViewType(val as "candles" | "glow")}
                >
                  <DropdownMenuRadioItem value="candles" className="text-xs">
                    {t("candles")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="glow" className="text-xs">
                    {t("futuristicGlow")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg border-border/40 hover:bg-muted ml-1"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Restore" : "Maximize"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {/* Desktop Toggles and Chart Type Selection (hidden on mobile) */}
      <div className="hidden md:flex items-center justify-between px-6 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant={showMA20 ? "default" : "outline"}
            size="sm"
            className="text-xs h-7 px-2.5 rounded-lg gap-1 transition-all"
            onClick={() => setShowMA20(!showMA20)}
            style={showMA20 ? { backgroundColor: MA20_COLOR, borderColor: MA20_COLOR } : {}}
          >
            {showMA20 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            MA 20
          </Button>
          <Button
            variant={showMA50 ? "default" : "outline"}
            size="sm"
            className="text-xs h-7 px-2.5 rounded-lg gap-1 transition-all"
            onClick={() => setShowMA50(!showMA50)}
            style={showMA50 ? { backgroundColor: MA50_COLOR, borderColor: MA50_COLOR } : {}}
          >
            {showMA50 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            MA 50
          </Button>
          <Button
            variant={showRSI ? "default" : "outline"}
            size="sm"
            className="text-xs h-7 px-2.5 rounded-lg gap-1 transition-all"
            onClick={() => setShowRSI(!showRSI)}
            style={showRSI ? { backgroundColor: RSI_LINE_COLOR, borderColor: RSI_LINE_COLOR } : {}}
          >
            {showRSI ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            RSI
          </Button>
        </div>

        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border/40">
          <Button
            variant={viewType === "candles" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-6 px-3 rounded-md font-semibold transition-all"
            onClick={() => setViewType("candles")}
          >
            {t("candles")}
          </Button>
          <Button
            variant={viewType === "glow" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-6 px-3 rounded-md font-semibold transition-all"
            onClick={() => setViewType("glow")}
          >
            {t("futuristicGlow")}
          </Button>
        </div>
      </div>

      {/* Main TradingView Canvas Containers */}
      <CardContent className="p-4 pt-0 space-y-2 flex-1 flex flex-col justify-center">
        <div
          ref={chartContainerRef}
          className={cn(
            "w-full rounded-md border border-border/20 overflow-hidden transition-all duration-300",
            isFullscreen ? "flex-1 min-h-[300px] md:min-h-[400px]" : "h-[380px]"
          )}
        />
        {showRSI && (
          <div
            ref={rsiContainerRef}
            className={cn(
              "w-full rounded-md border border-border/20 overflow-hidden transition-all duration-300",
              isFullscreen ? "h-[140px]" : "h-[120px]"
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
