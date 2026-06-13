import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { History, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, ChevronDown, Timer, DollarSign, Target, BarChart3, Lock, RefreshCw, Search } from "lucide-react";
import type { Prediction } from "@shared/schema";
import { useTheme } from "@/components/theme-toggle";
import { translations } from "@/lib/translations";

interface PredictionHistoryProps {
  predictions: Prediction[] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

function getTimeInfo(targetDateStr: string, predictionDate: Date | string | null, targetExpiryAt?: string | null, t?: any) {
  const now = new Date();
  let target: Date;
  if (targetExpiryAt) {
    target = new Date(targetExpiryAt);
  } else {
    const parsed = new Date(targetDateStr);
    if (isNaN(parsed.getTime())) return { isExpired: false, label: "", detail: "" };
    target = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 21, 0, 0));
  }
  if (isNaN(target.getTime())) return { isExpired: false, label: "", detail: "" };

  const diffMs = target.getTime() - now.getTime();
  const isExpired = diffMs <= 0;

  const getT = t || ((k: string) => k);
  const formattedDate = target.toLocaleDateString(t ? (getT("accuracy") === "Accuracy" ? "en-US" : "tr-TR") : "en-US", { month: "short", day: "numeric", year: "numeric" });

  if (isExpired) {
    const elapsed = Math.abs(diffMs);
    const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
    const hours = Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let label = "";
    
    const isEn = getT("accuracy") === "Accuracy";
    if (isEn) {
      if (days > 0) {
        label = `Expired ${days}d ${hours}h ago`;
      } else if (hours > 0) {
        label = `Expired ${hours}h ago`;
      } else {
        const mins = Math.floor(elapsed / (1000 * 60));
        label = `Expired ${mins}m ago`;
      }
    } else {
      if (days > 0) {
        label = `${days}g ${hours}s önce süresi doldu`;
      } else if (hours > 0) {
        label = `${hours}s önce süresi doldu`;
      } else {
        const mins = Math.floor(elapsed / (1000 * 60));
        label = `${mins}dk önce süresi doldu`;
      }
    }
    
    return { isExpired: true, label, detail: `${isEn ? "Target" : "Hedef"}: ${formattedDate}` };
  } else {
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    let label = "";
    const isEn = getT("accuracy") === "Accuracy";
    if (isEn) {
      if (days > 0) {
        label = `${days}d ${hours}h remaining`;
      } else if (hours > 0) {
        label = `${hours}h ${mins}m remaining`;
      } else {
        label = `${mins}m remaining`;
      }
    } else {
      if (days > 0) {
        label = `${days}g ${hours}s kaldı`;
      } else if (hours > 0) {
        label = `${hours}s ${mins}dk kaldı`;
      } else {
        label = `${mins}dk kaldı`;
      }
    }
    return { isExpired: false, label, detail: `${getT("validUntil")} ${formattedDate}` };
  }
}

function PredictionDetailPanel({ pred }: { pred: Prediction }) {
  const { language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isFetchingLive, setIsFetchingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const fetchLivePrice = async () => {
    setIsFetchingLive(true);
    setLiveError(null);
    try {
      const res = await fetch(`/api/stock/quote/${pred.symbol}`);
      if (!res.ok) throw new Error("Failed to fetch price");
      const data = await res.json();
      if (typeof data?.price === "number") {
        setLivePrice(data.price);
      } else {
        throw new Error("Invalid response");
      }
    } catch (err: any) {
      setLiveError(err.message || "Error");
    } finally {
      setIsFetchingLive(false);
    }
  };

  const timeInfo = getTimeInfo(pred.targetDate, pred.predictionDate, pred.targetExpiryAt, t);
  const isUp = pred.direction === "up";

  const statusLabel =
    pred.wasCorrect === 1
      ? t("correct")
      : pred.wasCorrect === 0
        ? t("incorrect")
        : timeInfo.isExpired
          ? t("awaitingValidation")
          : t("active");

  const statusColor =
    pred.wasCorrect === 1
      ? "text-emerald-600 dark:text-emerald-400"
      : pred.wasCorrect === 0
        ? "text-red-600 dark:text-red-400"
        : timeInfo.isExpired
          ? "text-amber-600 dark:text-amber-400"
          : "text-blue-600 dark:text-blue-400";

  const statusBg =
    pred.wasCorrect === 1
      ? "bg-emerald-50 dark:bg-emerald-950/30"
      : pred.wasCorrect === 0
        ? "bg-red-50 dark:bg-red-950/30"
        : timeInfo.isExpired
          ? "bg-amber-50 dark:bg-amber-950/30"
          : "bg-blue-50 dark:bg-blue-950/30";

  return (
    <div className="mt-2 p-3 rounded-md bg-muted/20 border border-border/50 space-y-3" data-testid={`detail-prediction-${pred.id}`}>
      <div className={`flex items-center gap-2 p-2 rounded-md ${statusBg}`}>
        {!timeInfo.isExpired ? (
          <Timer className={`h-4 w-4 ${statusColor} flex-shrink-0`} />
        ) : pred.wasCorrect !== null ? (
          pred.wasCorrect === 1 ? (
            <CheckCircle className={`h-4 w-4 ${statusColor} flex-shrink-0`} />
          ) : (
            <XCircle className={`h-4 w-4 ${statusColor} flex-shrink-0`} />
          )
        ) : (
          <Clock className={`h-4 w-4 ${statusColor} flex-shrink-0`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${statusColor}`} data-testid={`text-status-${pred.id}`}>{statusLabel}</p>
          <p className="text-xs text-muted-foreground">{timeInfo.label}</p>
        </div>
      </div>

      <div className="grid gap-2 grid-cols-3">
        <div className="p-2 rounded-md bg-muted/40">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t("priceAtPrediction")}</span>
          </div>
          <p className="text-sm font-mono font-medium" data-testid={`text-pred-price-${pred.id}`}>
            {pred.currentPrice != null ? `$${pred.currentPrice.toFixed(2)}` : "N/A"}
          </p>
        </div>

        {pred.actualPrice != null ? (
          <div className="p-2 rounded-md bg-muted/40">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("priceAtExpiry")}</span>
            </div>
            <p className="text-sm font-mono font-medium" data-testid={`text-actual-price-${pred.id}`}>
              ${pred.actualPrice.toFixed(2)}
            </p>
            {pred.currentPrice != null && (() => {
              const change = pred.actualPrice! - pred.currentPrice;
              const changePct = (change / pred.currentPrice) * 100;
              const isPositive = change >= 0;
              return (
                <p className={`text-xs font-mono mt-0.5 ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {isPositive ? "+" : ""}{change.toFixed(2)} ({isPositive ? "+" : ""}{changePct.toFixed(2)}%)
                </p>
              );
            })()}
          </div>
        ) : (
          <div className="p-2 rounded-md bg-muted/40 flex flex-col justify-between min-h-[58px]">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1">
                <Timer className="h-3 w-3 text-muted-foreground animate-pulse" />
                <span className="text-[10px] text-muted-foreground font-medium">{t("liveMarket")}</span>
              </div>
              {livePrice !== null && (
                <button
                  onClick={fetchLivePrice}
                  disabled={isFetchingLive}
                  className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  title="Refresh live price"
                >
                  <RefreshCw className={`h-3 w-3 ${isFetchingLive ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
            
            {livePrice === null ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isFetchingLive}
                onClick={fetchLivePrice}
                className="h-6 w-full text-[9px] font-semibold bg-background/50 hover:bg-primary/5 hover:text-primary transition-all active:scale-95 py-0 px-1"
              >
                {isFetchingLive ? (
                  <>
                    <RefreshCw className="h-2.5 w-2.5 animate-spin mr-1" />
                    {t("analyzing")}
                  </>
                ) : (
                  t("comparePrice")
                )}
              </Button>
            ) : (
              <div>
                <p className="text-xs font-mono font-bold leading-none">
                  ${livePrice.toFixed(2)}
                </p>
                {pred.currentPrice != null && (() => {
                  const change = livePrice - pred.currentPrice;
                  const changePct = (change / pred.currentPrice) * 100;
                  const isPositive = change >= 0;
                  const isTrendingCorrect = (pred.direction === "up" && isPositive) || (pred.direction === "down" && !isPositive);
                  
                  return (
                    <div className="flex items-center justify-between gap-1 mt-1 flex-wrap">
                      <span className={`text-[9px] font-mono leading-none ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                        {isPositive ? "+" : ""}{change.toFixed(1)} ({isPositive ? "+" : ""}{changePct.toFixed(1)}%)
                      </span>
                      <span className={`text-[8px] font-extrabold uppercase px-1 rounded bg-muted/60 ${isTrendingCorrect ? "text-emerald-500" : "text-red-500"}`}>
                        {isTrendingCorrect ? "Win" : "Loss"}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
            {liveError && (
              <p className="text-[8px] text-red-500 mt-1 truncate">{liveError}</p>
            )}
          </div>
        )}

        <div className="p-2 rounded-md bg-muted/40">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t("predictedDirection")}</span>
          </div>
          <p className={`text-sm font-medium flex items-center gap-1 ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isUp ? t("up") : t("down")} ({(pred.confidence * 100).toFixed(1)}%)
          </p>
        </div>
      </div>

      {pred.actualDirection && (
        <div className={`p-2 rounded-md ${pred.wasCorrect === 1 ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
          <div className="flex items-center gap-2">
            {pred.wasCorrect === 1 ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${pred.wasCorrect === 1 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {pred.wasCorrect === 1 ? t("predictionWasCorrect") : t("predictionWasWrong")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("actual")}: {pred.actualDirection === "up" ? t("up") : t("down")} | {t("predicted")}: {isUp ? t("up") : t("down")}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <span>{timeInfo.detail}</span>
        {pred.sentimentScore != null && (
          <span className="ml-3">{t("sentimentScore")}: {pred.sentimentScore > 0 ? "+" : ""}{pred.sentimentScore.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}

type StatusFilter = "all" | "active" | "correct" | "incorrect";

export function PredictionHistory({ predictions, isLoading, isAuthenticated }: PredictionHistoryProps) {
  const { language } = useTheme();
  const t = (key: keyof typeof translations.en) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  if (!isAuthenticated) {
    return (
      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            {t("predictionHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2 text-center flex flex-col items-center justify-center min-h-[300px] relative z-10">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">
            {t("privatePredictionHistory")}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-5 leading-relaxed">
            {t("historyPlaceholder")}
          </p>
          <Button
            onClick={() => setLocation("/auth")}
            size="sm"
            className="font-semibold px-6 shadow-sm shadow-primary/10 hover:shadow-primary/20 transition-all duration-200 active:scale-95"
          >
            {t("signInToAccount")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            {t("predictionHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            {t("predictionHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("noPredictionsLogged")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPredictions = predictions.length;
  const correctPredictions = predictions.filter((p) => p.wasCorrect === 1).length;
  const incorrectPredictions = predictions.filter((p) => p.wasCorrect === 0).length;
  const pendingPredictions = predictions.filter((p) => p.wasCorrect === null || p.wasCorrect === undefined).length;
  const validatedCount = correctPredictions + incorrectPredictions;
  const accuracy = validatedCount > 0
    ? (correctPredictions / validatedCount) * 100
    : 0;

  // Helper to extract technical and sentiment scores safely
  const getScores = (p: Prediction) => {
    let tech: number | undefined;
    let sent: number | undefined;
    if (p.factors && typeof p.factors === "object") {
      const f = p.factors as any;
      tech = typeof f.technicalScore === "number" ? f.technicalScore : undefined;
      sent = typeof f.sentimentScore === "number" ? f.sentimentScore : undefined;
    }
    return { tech, sent };
  };

  const validated = predictions.filter((p) => p.wasCorrect === 1 || p.wasCorrect === 0);

  // Technical Indicators Accuracy calculation
  const techPreds = validated.filter((p) => {
    const { tech } = getScores(p);
    return tech !== undefined && (tech > 0.52 || tech < 0.48);
  });
  const techCorrect = techPreds.filter((p) => p.wasCorrect === 1).length;
  const techAccuracy = techPreds.length > 0 ? (techCorrect / techPreds.length) * 100 : 0;

  // Sentiment Indicators Accuracy calculation
  const sentPreds = validated.filter((p) => {
    const { sent } = getScores(p);
    return sent !== undefined && (sent > 0.52 || sent < 0.48);
  });
  const sentCorrect = sentPreds.filter((p) => p.wasCorrect === 1).length;
  const sentAccuracy = sentPreds.length > 0 ? (sentCorrect / sentPreds.length) * 100 : 0;

  // Filter logic
  const filteredPredictions = predictions.filter((p) => {
    const matchesSearch = searchQuery === "" || p.symbol.toUpperCase().includes(searchQuery.toUpperCase().trim());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "correct" && p.wasCorrect === 1) ||
      (statusFilter === "incorrect" && p.wasCorrect === 0) ||
      (statusFilter === "active" && (p.wasCorrect === null || p.wasCorrect === undefined));
    return matchesSearch && matchesStatus;
  });

  const filterChips: { label: string; value: StatusFilter; count: number; color: string; activeColor: string }[] = [
    { label: t("all"), value: "all", count: totalPredictions, color: "bg-muted/60 text-muted-foreground hover:bg-muted", activeColor: "bg-primary text-primary-foreground" },
    { label: t("active"), value: "active", count: pendingPredictions, color: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50", activeColor: "bg-amber-500 text-white" },
    { label: t("correct"), value: "correct", count: correctPredictions, color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50", activeColor: "bg-emerald-500 text-white" },
    { label: t("wrong"), value: "incorrect", count: incorrectPredictions, color: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50", activeColor: "bg-red-500 text-white" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          {t("predictionHistory")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="p-2 rounded-md bg-muted/40 text-center">
            <p className="text-lg font-bold font-mono" data-testid="text-total-predictions">
              {totalPredictions}
            </p>
            <p className="text-xs text-muted-foreground">{t("total")}</p>
          </div>
          <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-center">
            <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400" data-testid="text-correct-predictions">
              {correctPredictions}
            </p>
            <p className="text-xs text-muted-foreground">{t("correct")}</p>
          </div>
          <div className="p-2 rounded-md bg-red-50 dark:bg-red-950/20 text-center">
            <p className="text-lg font-bold font-mono text-red-600 dark:text-red-400" data-testid="text-incorrect-predictions">
              {incorrectPredictions}
            </p>
            <p className="text-xs text-muted-foreground">{t("wrong")}</p>
          </div>
          <div className="p-2 rounded-md bg-muted/40 text-center">
            <p className="text-lg font-bold font-mono" data-testid="text-accuracy-rate">
              {validatedCount > 0 ? `${accuracy.toFixed(1)}%` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">{t("accuracy")}</p>
          </div>
        </div>

        {/* Indicators vs Sentiment Accuracy Split */}
        {validatedCount > 0 && (
          <div className="p-3 mb-4 rounded-xl border bg-muted/20 space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              {language === "en" ? "Analysis Signal Accuracy Breakdown" : "Analiz Sinyali Doğruluk Dağılımı"}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Technical indicators */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" />
                    {t("technicalAccuracy")}
                  </span>
                  <span className="font-mono font-bold text-indigo-400">
                    {techPreds.length > 0 ? `${techAccuracy.toFixed(1)}%` : "N/A"}
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                    style={{ width: `${techPreds.length > 0 ? techAccuracy : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {language === "en" 
                    ? `Based on ${techPreds.length} high-confidence technical signals` 
                    : `${techPreds.length} yüksek güvenli teknik sinyal üzerinden`}
                </p>
              </div>

              {/* News sentiment */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    {t("sentimentAccuracy")}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {sentPreds.length > 0 ? `${sentAccuracy.toFixed(1)}%` : "N/A"}
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${sentPreds.length > 0 ? sentAccuracy : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {language === "en" 
                    ? `Based on ${sentPreds.length} strong sentiment/news signals` 
                    : `${sentPreds.length} güçlü haber duyarlılık sinyali üzerinden`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="history-search-input"
              placeholder={t("searchBySymbol")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/40"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                id={`filter-chip-${chip.value}`}
                onClick={() => setStatusFilter(chip.value)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all duration-150 active:scale-95 ${
                  statusFilter === chip.value ? chip.activeColor : chip.color
                }`}
              >
                {chip.label}
                <span className={`text-[10px] font-mono px-1 rounded-full ${
                  statusFilter === chip.value ? "bg-white/20" : "bg-muted/60 dark:bg-muted/30"
                }`}>{chip.count}</span>
              </button>
            ))}
          </div>
        </div>

        {pendingPredictions > 0 && statusFilter === "all" && searchQuery === "" && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20">
            <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400" data-testid="text-pending-count">
              {language === "en" ? (
                `${pendingPredictions} prediction${pendingPredictions > 1 ? "s" : ""} awaiting validation`
              ) : (
                `Doğrulama bekleyen ${pendingPredictions} tahmin var`
              )}
            </p>
          </div>
        )}

        <ScrollArea className="h-[310px]">
          <div className="space-y-1.5 pr-3">
            {filteredPredictions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">{t("noPredictionsMatch")}</p>
                <button onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} className="text-xs text-primary mt-1 hover:underline">{t("clearFilters")}</button>
              </div>
            ) : filteredPredictions.map((pred) => {
              const isUp = pred.direction === "up";
              const isExpanded = expandedId === pred.id;
              const statusIcon =
                pred.wasCorrect === 1 ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                ) : pred.wasCorrect === 0 ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                );

              return (
                <div
                  key={pred.id}
                  className="rounded-md bg-muted/40 transition-colors"
                  data-testid={`row-prediction-${pred.id}`}
                >
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 p-2.5 text-left cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : pred.id)}
                    data-testid={`button-expand-${pred.id}`}
                  >
                    <div className="flex-shrink-0">{statusIcon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {pred.symbol}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs">
                          {isUp ? (
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          {isUp ? t("up") : t("down")}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {(pred.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pred.predictionDate
                          ? new Date(pred.predictionDate).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : ""}
                        {" → "}
                        {pred.targetDate}
                      </p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && <div className="px-2.5 pb-2.5"><PredictionDetailPanel pred={pred} /></div>}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
