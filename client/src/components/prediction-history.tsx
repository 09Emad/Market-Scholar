import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock } from "lucide-react";
import type { Prediction } from "@shared/schema";

interface PredictionHistoryProps {
  predictions: Prediction[] | null;
  isLoading: boolean;
}

export function PredictionHistory({ predictions, isLoading }: PredictionHistoryProps) {
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

        <ScrollArea className="h-[300px]">
          <div className="space-y-1.5 pr-3">
            {predictions.map((pred) => {
              const isUp = pred.direction === "up";
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
                  className="flex items-center gap-3 p-2.5 rounded-md bg-muted/40"
                  data-testid={`row-prediction-${pred.id}`}
                >
                  <div className="flex-shrink-0">{statusIcon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
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
                      {pred.actualDirection && (
                        <span className="text-xs text-muted-foreground">
                          Actual: <span className={pred.actualDirection === "up" ? "text-emerald-500" : "text-red-500"}>{pred.actualDirection === "up" ? "Up" : "Down"}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pred.predictionDate
                        ? new Date(pred.predictionDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : ""}
                      {" → "}
                      {pred.targetDate}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
