import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, ChevronDown, Timer, DollarSign, Target, BarChart3 } from "lucide-react";
import type { Prediction } from "@shared/schema";

interface PredictionHistoryProps {
  predictions: Prediction[] | null;
  isLoading: boolean;
}

function getTimeInfo(targetDateStr: string, predictionDate: Date | string | null, targetExpiryAt?: string | null) {
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

  if (isExpired) {
    const elapsed = Math.abs(diffMs);
    const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
    const hours = Math.floor((elapsed % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    let label = "";
    if (days > 0) {
      label = `Expired ${days}d ${hours}h ago`;
    } else if (hours > 0) {
      label = `Expired ${hours}h ago`;
    } else {
      const mins = Math.floor(elapsed / (1000 * 60));
      label = `Expired ${mins}m ago`;
    }
    return { isExpired: true, label, detail: `Target: ${target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` };
  } else {
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    let label = "";
    if (days > 0) {
      label = `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      label = `${hours}h ${mins}m remaining`;
    } else {
      label = `${mins}m remaining`;
    }
    return { isExpired: false, label, detail: `Valid until: ${target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` };
  }
}

function PredictionDetailPanel({ pred }: { pred: Prediction }) {
  const timeInfo = getTimeInfo(pred.targetDate, pred.predictionDate, pred.targetExpiryAt);
  const isUp = pred.direction === "up";

  const statusLabel =
    pred.wasCorrect === 1
      ? "Correct"
      : pred.wasCorrect === 0
        ? "Incorrect"
        : timeInfo.isExpired
          ? "Awaiting Validation"
          : "Active";

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

      <div className={`grid gap-2 ${pred.actualPrice != null ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className="p-2 rounded-md bg-muted/40">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Price at Prediction</span>
          </div>
          <p className="text-sm font-mono font-medium" data-testid={`text-pred-price-${pred.id}`}>
            {pred.currentPrice != null ? `$${pred.currentPrice.toFixed(2)}` : "N/A"}
          </p>
        </div>

        {pred.actualPrice != null && (
          <div className="p-2 rounded-md bg-muted/40">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Price at Expiry</span>
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
        )}

        <div className="p-2 rounded-md bg-muted/40">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Predicted Direction</span>
          </div>
          <p className={`text-sm font-medium flex items-center gap-1 ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isUp ? "Up" : "Down"} ({(pred.confidence * 100).toFixed(1)}%)
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
                {pred.wasCorrect === 1 ? "Prediction was correct" : "Prediction was wrong"}
              </p>
              <p className="text-xs text-muted-foreground">
                Actual: {pred.actualDirection === "up" ? "Up" : "Down"} | Predicted: {isUp ? "Up" : "Down"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <span>{timeInfo.detail}</span>
        {pred.sentimentScore != null && (
          <span className="ml-3">Sentiment: {pred.sentimentScore > 0 ? "+" : ""}{pred.sentimentScore.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}

export function PredictionHistory({ predictions, isLoading }: PredictionHistoryProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Prediction History
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
            Prediction History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No predictions logged yet
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Prediction History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="p-2 rounded-md bg-muted/40 text-center">
            <p className="text-lg font-bold font-mono" data-testid="text-total-predictions">
              {totalPredictions}
            </p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-center">
            <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400" data-testid="text-correct-predictions">
              {correctPredictions}
            </p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div className="p-2 rounded-md bg-red-50 dark:bg-red-950/20 text-center">
            <p className="text-lg font-bold font-mono text-red-600 dark:text-red-400" data-testid="text-incorrect-predictions">
              {incorrectPredictions}
            </p>
            <p className="text-xs text-muted-foreground">Wrong</p>
          </div>
          <div className="p-2 rounded-md bg-muted/40 text-center">
            <p className="text-lg font-bold font-mono" data-testid="text-accuracy-rate">
              {validatedCount > 0 ? `${accuracy.toFixed(1)}%` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        </div>

        {pendingPredictions > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20">
            <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400" data-testid="text-pending-count">
              {pendingPredictions} prediction{pendingPredictions > 1 ? "s" : ""} awaiting validation (target date not reached yet)
            </p>
          </div>
        )}

        <ScrollArea className="h-[350px]">
          <div className="space-y-1.5 pr-3">
            {predictions.map((pred) => {
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
                          {isUp ? "Up" : "Down"}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {(pred.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pred.predictionDate
                          ? new Date(pred.predictionDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : ""}
                        {" \u2192 "}
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
